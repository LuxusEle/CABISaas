import { Project, Zone, CabinetUnit, PresetType, CabinetType, ProjectSettings, Obstacle } from '../types';
import { v4 as uuid } from 'uuid';

export interface LayoutResult {
  project: Project;
  warnings: string[];
}

export const generateRubyLayout = (project: Project): LayoutResult => {
  const warnings: string[] = [];
  const settings = project.settings;
  
  // 1. Initial State: Clear auto-fill units and corners
  const newProject: Project = { 
    ...project, 
    zones: project.zones.map(z => ({ 
      ...z, 
      cabinets: [],
      obstacles: z.obstacles.filter(o => !o.id.startsWith('corner_'))
    })) 
  };
  
  const zones = newProject.zones;
  
  // 2. Corner Injection (Highest Priority)
  for (let i = 0; i < zones.length; i++) {
    const currentZone = zones[i];
    const nextZone = i < zones.length - 1 ? zones[i + 1] : null;
    if (nextZone) {
      injectCorners(currentZone, nextZone, settings);
    }
  }

  // 2.1 Alignment Units (Ruby Rule: Align wall units with base corner)
  // Place these BEFORE anchors so anchors don't "steal" the alignment space
  zones.forEach((zone) => {
    const wallCornerOffset = zone.obstacles.find(o => o.id === 'corner_wall_offset');
    if (wallCornerOffset) {
      const baseOffset = settings.depthBase + 25;
      const wallOffset = settings.depthWall + 25;
      const alignWidth = baseOffset - wallOffset;
      const x = wallCornerOffset.fromLeft + wallCornerOffset.width;
      if (canPlace(zone, x, alignWidth, CabinetType.WALL, settings)) {
        placeUnit(zone, {
          id: uuid(),
          preset: PresetType.WALL_STD,
          type: CabinetType.WALL,
          width: alignWidth,
          qty: 1,
          fromLeft: x,
          isAutoFilled: true,
          label: '',
          advancedSettings: { showDoors: false }
        });
      }
    }
  });

  // 3. Anchor Units - Global Search (Tall, Sink, Cooker)
  const prefs = settings.layoutPreferences || { includeTall: true, includeSink: true, includeCooker: true, includeDrawers: true };
  let tallPlaced = !prefs.includeTall;
  let sinkPlaced = !prefs.includeSink;
  let cookerPlaced = !prefs.includeCooker;

  const tallWidth = Math.max(250, settings.widthTall || 600);

  // 3.1 Tall Cabinet (High Priority Anchor)
  // Ruby Rules:
  // - In Right Corner mode: Tall unit is placed at X = 0.
  // - In Left Corner mode: Tall unit is placed at X = WallLength - Width.
  if (prefs.includeTall) {
    for (const zone of zones) {
      if (tallPlaced) break;
      
      const gaps = findGaps(zone, CabinetType.TALL, settings);
      const potentialSpots: { x: number; score: number }[] = [];

      for (const gap of gaps) {
        if (gap.length < tallWidth) continue;

        // Check start of gap
        const effectiveStart = zone.startLimit || 0;
        const effectiveEnd = zone.endLimit || zone.totalLength;

        const isStartWallEdge = Math.abs(gap.start - effectiveStart) < 10;
        const isStartDoorEdge = zone.obstacles.some(o => o.type === 'door' && Math.abs(o.fromLeft + o.width - gap.start) < 10);
        
        if (isStartWallEdge) potentialSpots.push({ x: gap.start, score: 2 }); // Highest priority: Wall Edge
        else if (isStartDoorEdge) potentialSpots.push({ x: gap.start, score: 1 }); // Secondary priority: Door Edge

        // Check end of gap
        const isEndWallEdge = Math.abs(gap.end - effectiveEnd) < 10;
        const isEndDoorEdge = zone.obstacles.some(o => o.type === 'door' && Math.abs(o.fromLeft - gap.end) < 10);
        
        if (isEndWallEdge) potentialSpots.push({ x: gap.end - tallWidth, score: 2 });
        else if (isEndDoorEdge) potentialSpots.push({ x: gap.end - tallWidth, score: 1 });
      }

      // Pick best spot in this zone
      const bestSpot = potentialSpots.sort((a, b) => b.score - a.score)[0];

      if (bestSpot) {
        let finalWidth = tallWidth;
        const x = bestSpot.x;

        // Ruby Rule: If window is close (within 400mm), extend Tall unit to window edge
        const window = zone.obstacles.find(o => o.type === 'window');
        if (window && window.fromLeft > x + tallWidth && window.fromLeft < x + tallWidth + 400) {
          finalWidth = window.fromLeft - x;
        }

        placeUnit(zone, { 
          id: uuid(), 
          preset: PresetType.TALL_UTILITY, 
          type: CabinetType.TALL, 
          width: finalWidth, 
          qty: 1, 
          fromLeft: x, 
          isAutoFilled: true, 
          label: '' 
        });
        tallPlaced = true;
      }
    }
  }

  // 3.2 Sink Unit (Centered under windows)
  if (prefs.includeSink) {
    for (const zone of zones) {
      if (sinkPlaced) break;
      const window = zone.obstacles.find(o => o.type === 'window');
      if (window) {
        const gaps = findGaps(zone, CabinetType.BASE, settings);
        const windowStart = window.fromLeft;
        const windowEnd = window.fromLeft + window.width;
        const windowWidth = window.width;
        
        // Ruby Rule: Choose snap side to avoid tiny unfillable gaps
        const sw = Math.min(1000, windowWidth);
        const wallCornerOffset = zone.obstacles.find(o => o.id === 'corner_base_offset');
        const startX = Math.max(zone.startLimit || 0, wallCornerOffset ? (wallCornerOffset.fromLeft + wallCornerOffset.width) : 0);
        
        // Find all gaps that can fit the sink and overlap with the window
        const potentialGaps = gaps.filter(g => g.length >= sw && g.end > windowStart && g.start < windowEnd);
        
        if (potentialGaps.length > 0) {
          // Prefer the gap that contains windowStart, otherwise just the first one
          const gap = potentialGaps.find(g => windowStart >= g.start && windowStart <= g.end) || potentialGaps[0];
          
          let targetX = Math.max(gap.start, windowStart);
          if (targetX + sw > gap.end) {
            targetX = gap.end - sw;
          }
          
          // Ruby Rule: Choose snap side to avoid tiny unfillable gaps
          const leftGap = targetX - startX;
          if (leftGap > 0 && leftGap < ABSOLUTE_MIN_WIDTH) {
            // Try snapping to the right side of the window IF it fits in the SAME gap
            const rightX = Math.min(gap.end - sw, windowEnd - sw);
            const rightGap = rightX - startX;
            if (rightGap >= ABSOLUTE_MIN_WIDTH || rightGap === 0) {
              targetX = rightX;
            } else if (gap.start === startX) {
              // If the gap starts at startX, just snap to startX to avoid splinter
              targetX = startX;
            }
          }

          if (canPlace(zone, targetX, sw, CabinetType.BASE, settings)) {
            placeUnit(zone, { id: uuid(), preset: PresetType.SINK_UNIT, type: CabinetType.BASE, width: sw, qty: 1, fromLeft: targetX, isAutoFilled: true, label: '' });
            sinkPlaced = true;
          }
        }
      }
    }
  }

  // 3.3 Cooker Unit
  if (prefs.includeCooker) {
    for (const zone of zones) {
      if (cookerPlaced) break;
      const cookerWidth = 600;
      const gaps = findGaps(zone, CabinetType.BASE, settings);
      
      // Ruby Rule: Try to keep cooker as 2nd cabinet (leave space for a lead cabinet)
      // Preference: Snap the [Cooker] [Drawer] block to the right so the Lead cabinet absorbs extra space
      let targetX = -1;
      const seqWidth = 1200; // Cooker (600) + Special Drawer (600)
      const minLead = 250;
      
      const sequenceGap = gaps.find(g => g.length >= seqWidth + minLead);
      if (sequenceGap) {
        // Position cooker so that exactly 600mm is left for the special drawer at the end
        targetX = sequenceGap.end - seqWidth;
      } else {
        const minGap = gaps.find(g => g.length >= cookerWidth);
        if (minGap) {
          // Try to avoid placing immediately next to door/window
          const isNearOpening = (x: number) => zone.obstacles.some(o => 
            (o.type === 'door' || o.type === 'window') && 
            (Math.abs(o.fromLeft + o.width - x) < 5 || Math.abs(o.fromLeft - (x + cookerWidth)) < 5)
          );
          
          if (isNearOpening(minGap.start) && minGap.length >= cookerWidth + 300) {
            targetX = minGap.start + 300;
          } else {
            targetX = minGap.start;
          }
        }
      }

      if (targetX !== -1) {
        placeUnit(zone, { 
          id: uuid(), 
          preset: PresetType.COOKER_HOB, 
          type: CabinetType.BASE, 
          width: cookerWidth, 
          qty: 1, 
          fromLeft: targetX, 
          isAutoFilled: true, 
          label: '',
          advancedSettings: {
            showDrawers: true,
            numDrawers: 3
          }
        });
        if (canPlace(zone, targetX, cookerWidth, CabinetType.WALL, settings)) {
          const wallHeight = settings.wallHeight || 720;
          placeUnit(zone, { 
            id: uuid(), 
            preset: PresetType.HOOD_UNIT, 
            type: CabinetType.WALL, 
            width: cookerWidth, 
            qty: 1, 
            fromLeft: targetX, 
            isAutoFilled: true, 
            label: '',
            advancedSettings: {
              height: wallHeight - 150,
              elevationOffset: 150
            }
          });
        }
        cookerPlaced = true;
        break;
      }

      // Fallback: Position in largest gap, snapping to left to avoid fragmented space
      for (const gap of gaps) {
        if (gap.length >= cookerWidth) {
          // Snap to left, but try to leave space for exactly one lead cabinet (prefer 600)
          const candidates = [600, 500, 450, 400, 300, 250, 0];
          let x = gap.start;
          
          for (const offset of candidates) {
            const candidateX = gap.start + offset;
            if (candidateX + cookerWidth > gap.end) continue;
            
            const nearOpening = zone.obstacles.some(o => 
              (o.type === 'door' || o.type === 'window') && 
              (Math.abs(o.fromLeft + o.width - candidateX) < 5 || Math.abs(o.fromLeft - (candidateX + cookerWidth)) < 5)
            );
            
            if (!nearOpening) {
              x = candidateX;
              break;
            }
          }

          placeUnit(zone, { 
            id: uuid(), 
            preset: PresetType.COOKER_HOB, 
            type: CabinetType.BASE, 
            width: cookerWidth, 
            qty: 1, 
            fromLeft: x, 
            isAutoFilled: true, 
            label: '',
            advancedSettings: {
              showDrawers: true,
              numDrawers: 3
            }
          });
          if (canPlace(zone, x, cookerWidth, CabinetType.WALL, settings)) {
            const wallHeight = settings.wallHeight || 720;
            placeUnit(zone, { 
              id: uuid(), 
              preset: PresetType.HOOD_UNIT, 
              type: CabinetType.WALL, 
              width: cookerWidth, 
              qty: 1, 
              fromLeft: x, 
              isAutoFilled: true, 
              label: '',
              advancedSettings: {
                height: wallHeight - 150,
                elevationOffset: 150
              }
            });
          }
          cookerPlaced = true;
          break;
        }
      }
    }
  }

  // 3.4 Special Base Unit (No Doors, Drawers Enabled)
  if (prefs.includeDrawers) {
    let specialPlaced = false;

    // Attempt 1: Place immediately after cooker to maintain the "Normal -> Cooker -> Drawer" flow
    if (cookerPlaced && prefs.includeCooker) {
      for (const zone of zones) {
        if (specialPlaced) break;
        const cooker = zone.cabinets.find(c => c.preset === PresetType.COOKER_HOB && c.isAutoFilled);
        if (cooker) {
          const nextX = cooker.fromLeft + cooker.width;
          // Try 600mm then 500mm immediately after cooker
          if (canPlace(zone, nextX, 600, CabinetType.BASE, settings)) {
            placeUnit(zone, {
              id: uuid(),
              preset: PresetType.BASE_DOOR,
              type: CabinetType.BASE,
              width: 600,
              qty: 1,
              fromLeft: nextX,
              isAutoFilled: true,
              label: '',
              advancedSettings: { showDoors: false, showDrawers: true }
            });
            specialPlaced = true;
          } else if (canPlace(zone, nextX, 500, CabinetType.BASE, settings)) {
            placeUnit(zone, {
              id: uuid(),
              preset: PresetType.BASE_DOOR,
              type: CabinetType.BASE,
              width: 500,
              qty: 1,
              fromLeft: nextX,
              isAutoFilled: true,
              label: '',
              advancedSettings: { showDoors: false, showDrawers: true }
            });
            specialPlaced = true;
          }
        }
      }
    }

    // Attempt 2: Move cooker to make space for the Drawer unit immediately after it
    if (!specialPlaced && cookerPlaced && prefs.includeCooker) {
      for (const zone of zones) {
        if (specialPlaced) break;
        const cooker = zone.cabinets.find(c => c.preset === PresetType.BASE_DRAWER_3 && c.isAutoFilled);
        if (cooker) {
          const cookerX = cooker.fromLeft;
          const cookerW = cooker.width;
          const hood = zone.cabinets.find(c => c.preset === PresetType.HOOD_UNIT && Math.abs(c.fromLeft - cookerX) < 1);
          
          zone.cabinets = zone.cabinets.filter(c => c.id !== cooker.id && (!hood || c.id !== hood.id));
          const gaps = findGaps(zone, CabinetType.BASE, settings);
          const gap = gaps.find(g => cookerX >= g.start && (cookerX + cookerW) <= g.end);
          
          if (gap && gap.length >= (cookerW + 600)) {
            // Snap the [Cooker] [Drawer] block to the right of the gap
            let targetCookerX = gap.end - 1200;
            if (targetCookerX < gap.start) targetCookerX = gap.start;

            let targetSpecialX = targetCookerX + cookerW;
            
            if (!hood || canPlace(zone, targetCookerX, cookerW, CabinetType.WALL, settings)) {
              cooker.fromLeft = targetCookerX;
              zone.cabinets.push(cooker);
              if (hood) {
                hood.fromLeft = targetCookerX;
                zone.cabinets.push(hood);
              }
              placeUnit(zone, {
                id: uuid(),
                preset: PresetType.BASE_DOOR,
                type: CabinetType.BASE,
                width: 600,
                qty: 1,
                fromLeft: targetSpecialX,
                isAutoFilled: true,
                label: '',
                advancedSettings: { showDoors: false, showDrawers: true }
              });
              specialPlaced = true;
            } else {
              // Restore
              zone.cabinets.push(cooker);
              if (hood) zone.cabinets.push(hood);
            }
          } else {
            // Restore
            zone.cabinets.push(cooker);
            if (hood) zone.cabinets.push(hood);
          }
        }
      }
    }

    // Attempt 3: Try 600mm anywhere else
    if (!specialPlaced) {
      for (const zone of zones) {
        if (specialPlaced) break;
        const gaps = findGaps(zone, CabinetType.BASE, settings);
        const gap = gaps.find(g => g.length >= 600);
        if (gap) {
          placeUnit(zone, {
            id: uuid(),
            preset: PresetType.BASE_DOOR,
            type: CabinetType.BASE,
            width: 600,
            qty: 1,
            fromLeft: gap.start,
            isAutoFilled: true,
            label: '',
            advancedSettings: { showDoors: false, showDrawers: true }
          });
          specialPlaced = true;
        }
      }
    }

    // Attempt 4: 500mm fallback anywhere
    if (!specialPlaced) {
      for (const zone of zones) {
        if (specialPlaced) break;
        const gaps = findGaps(zone, CabinetType.BASE, settings);
        const gap = gaps.find(g => g.length >= 500);
        if (gap) {
          placeUnit(zone, {
            id: uuid(),
            preset: PresetType.BASE_DOOR,
            type: CabinetType.BASE,
            width: 500,
            qty: 1,
            fromLeft: gap.start,
            isAutoFilled: true,
            label: '',
            advancedSettings: { showDoors: false, showDrawers: true }
          });
          specialPlaced = true;
        }
      }
    }
  }

  // 4. Fill Remaining Space
  zones.forEach((zone, zIdx) => {
    const getAlignmentPoints = () => {
      const pts = new Set<number>();
      zone.obstacles.forEach(o => { pts.add(o.fromLeft); pts.add(o.fromLeft + o.width); });
      zone.cabinets.forEach(c => { pts.add(c.fromLeft); pts.add(c.fromLeft + c.width); });
      return Array.from(pts).sort((a, b) => a - b);
    };

    // First pass: Fill Base cabinets, aligning with anchors (Sink, Cooker, Tall) and obstacles (Windows, Doors)
    fillRemaining(zone, CabinetType.BASE, settings, getAlignmentPoints());
    
    // Second pass: Fill Wall cabinets, now also aligning with the newly placed Base cabinets
    fillRemaining(zone, CabinetType.WALL, settings, getAlignmentPoints());
    
    absorbRemainder(zone, settings); // Ruby Rule: Absorb small gaps into corners
    
    applyExposedSides(zone, settings);

    // Assign sequential labels with Zone Prefix (e.g., W01B01, W01W01)
    let bIdx = 1;
    let wIdx = 1;
    let tIdx = 1;
    
    const wallPrefix = `W${String(zIdx + 1).padStart(2, '0')}`;
    
    zone.cabinets = [...zone.cabinets].sort((a,b) => a.fromLeft - b.fromLeft).map(c => {
      const typeChar = c.type === CabinetType.BASE ? 'B' : c.type === CabinetType.WALL ? 'W' : 'T';
      const seq = typeChar === 'B' ? bIdx++ : typeChar === 'W' ? wIdx++ : tIdx++;
      return { ...c, label: `${wallPrefix}${typeChar}${String(seq).padStart(2, '0')}` };
    });
  });

  return { project: newProject, warnings };
};

// --- Ruby Design Rules Constants ---
const STANDARD_WIDTHS = [900, 800, 750, 600, 500, 450, 400, 300, 250];
const PREFERRED_WIDTHS = [900, 750, 600, 500];
const BASE_CORNER_WIDTH = 1050;
const WALL_CORNER_WIDTH = 750;
const MIN_FILL_WIDTH = 400; // Ruby Rule: Avoid cabinets < 400mm unless absolutely necessary
const ABSOLUTE_MIN_WIDTH = 250; // Still allowed if no other choice

// --- Helper Functions ---

function applyExposedSides(zone: Zone, settings: ProjectSettings) {
  const thickness = settings.doorMaterialThickness || 18;
  const cabinets = zone.cabinets;
  const obstacles = zone.obstacles;

  // 1. Detection Pass
  cabinets.forEach((unit) => {
    // Only for Base, Wall, Tall
    if (unit.type !== CabinetType.BASE && unit.type !== CabinetType.WALL && unit.type !== CabinetType.TALL) return;
    if (unit.preset === PresetType.BASE_CORNER || unit.preset === PresetType.WALL_CORNER) return;
    if (unit.preset === PresetType.FILLER) return;

    let leftExposed = false;
    let rightExposed = false;

    // A. Wall edges / Limits
    const sLimit = zone.startLimit || 0;
    const eLimit = zone.endLimit || zone.totalLength;
    
    // Check if unit is at the very start or end of the wall
    if (Math.abs(unit.fromLeft - sLimit) < 15) {
       const hasCornerOffset = obstacles.some(o => o.fromLeft < sLimit + 10 && o.id.startsWith('corner_'));
       if (!hasCornerOffset) leftExposed = true;
    }
    if (Math.abs((unit.fromLeft + unit.width) - eLimit) < 15) {
       const hasCornerCabinet = cabinets.some(c => (c.preset === PresetType.BASE_CORNER || c.preset === PresetType.WALL_CORNER) && c.fromLeft > unit.fromLeft);
       if (!hasCornerCabinet) rightExposed = true;
    }

    // B. Obstacles (Door, Window)
    obstacles.forEach(obs => {
      if (obs.type === 'door' || obs.type === 'window') {
        let causesExposure = true;
        if (obs.type === 'window' && unit.type === CabinetType.BASE) {
          const sillHeight = obs.sillHeight || 0;
          if (sillHeight >= (settings.baseHeight || 870)) causesExposure = false;
        }

        if (causesExposure) {
          if (Math.abs(unit.fromLeft - (obs.fromLeft + obs.width)) < 15) leftExposed = true;
          if (Math.abs((unit.fromLeft + unit.width) - obs.fromLeft) < 15) rightExposed = true;
        }
      }
    });

    // C. Neighbor Veto: If there's another cabinet touching this side, it's not exposed
    const getDepth = (c: CabinetUnit) => {
      if (c.depth) return c.depth;
      if (c.type === CabinetType.TALL) return settings.depthTall || 600;
      if (c.type === CabinetType.BASE) return settings.depthBase || 600;
      return settings.depthWall || 300;
    };

    const unitDepth = getDepth(unit);
    const neighbors = cabinets.filter(other => other.id !== unit.id);

    if (unit.type === CabinetType.BASE || unit.type === CabinetType.WALL) {
      const leftNeighbor = neighbors.find(other => 
        (other.type === unit.type || other.type === CabinetType.TALL) &&
        Math.abs((other.fromLeft + other.width) - unit.fromLeft) < 15 &&
        getDepth(other) >= unitDepth - 15
      );
      if (leftNeighbor) leftExposed = false;

      const rightNeighbor = neighbors.find(other => 
        (other.type === unit.type || other.type === CabinetType.TALL) &&
        Math.abs(other.fromLeft - (unit.fromLeft + unit.width)) < 15 &&
        getDepth(other) >= unitDepth - 15
      );
      if (rightNeighbor) rightExposed = false;
    }

    unit.exposedLeft = leftExposed;
    unit.exposedRight = rightExposed;
  });

  // 2. Tall Cabinet Specific Neighbor Logic (Check height-based coverage)
  cabinets.forEach(unit => {
    if (unit.type === CabinetType.TALL) {
      const th = unit.advancedSettings?.height || (settings.baseHeight + (settings.wallCabinetElevation || 450) + settings.wallHeight + 40);
      const unitDepth = unit.depth || settings.depthTall || 600;
      
      unit.leftCoverage = [];
      unit.rightCoverage = [];

      cabinets.filter(c => c.id !== unit.id).forEach(other => {
        if (other.preset === PresetType.FILLER) return;

        const isLeft = Math.abs((other.fromLeft + other.width) - unit.fromLeft) < 15;
        const isRight = Math.abs(other.fromLeft - (unit.fromLeft + unit.width)) < 15;

        if (isLeft || isRight) {
          const bh = settings.baseHeight || 820;
          const wh = settings.wallHeight || 720;
          const ct = settings.counterThickness || 40;
          const wallElev = settings.wallCabinetElevation || 450;
          
          let otherDepth = other.depth;
          if (!otherDepth) {
            if (other.type === CabinetType.BASE) otherDepth = settings.depthBase;
            else if (other.type === CabinetType.WALL) otherDepth = settings.depthWall;
            else if (other.type === CabinetType.TALL) otherDepth = settings.depthTall;
          }
          otherDepth = otherDepth || 600;

          let start = 0;
          let end = 0;
          if (other.type === CabinetType.BASE) {
            start = 0;
            end = bh;
          } else if (other.type === CabinetType.WALL) {
            start = bh + ct + wallElev;
            end = start + wh;
          } else if (other.type === CabinetType.TALL) {
            start = 0;
            end = th;
          }

          if (isLeft) {
            unit.leftCoverage!.push({ start, end, depth: otherDepth });
            if (end < th - 10 || start > 10 || otherDepth < unitDepth - 10) {
              unit.exposedLeft = true;
            } else if (other.type === CabinetType.TALL) {
              unit.exposedLeft = false;
            }
          } else {
            unit.rightCoverage!.push({ start, end, depth: otherDepth });
            if (end < th - 10 || start > 10 || otherDepth < unitDepth - 10) {
              unit.exposedRight = true;
            } else if (other.type === CabinetType.TALL) {
              unit.exposedRight = false;
            }
          }
        }
      });
    }
  });

  // 3. Finalization: No width adjustment pass is needed anymore.
  // Decorative side panels are now counted AS PART OF the nominal width.
  // The 3D component and BOM already shrink the carcass internally to fit them.

  // 3. Collision Resolution & Boundary Enforcement
  const sLimit = zone.startLimit || 0;
  const eLimit = zone.endLimit || zone.totalLength;

  // A. Left-to-Right Pass (Resolve overlaps and snap to left boundary)
  const sorted = [...cabinets].sort((a, b) => a.fromLeft - b.fromLeft);
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    let minLeft = current.fromLeft;
    
    // Snap first unit to sLimit if it was pushed left by exposed panel
    if (i === 0 && minLeft < sLimit) minLeft = sLimit;

    for (let j = 0; j < i; j++) {
      const prev = sorted[j];
      const collide = (current.type === prev.type || current.type === CabinetType.TALL || prev.type === CabinetType.TALL);
      if (collide) {
        const prevRight = prev.fromLeft + prev.width;
        if (prevRight > minLeft) minLeft = prevRight;
      }
    }
    current.fromLeft = minLeft;
  }

  // B. Right-to-Left Pass (Snap to right boundary and push back)
  for (let i = sorted.length - 1; i >= 0; i--) {
    const current = sorted[i];
    const rightEdge = current.fromLeft + current.width;
    if (rightEdge > eLimit + 0.1) {
      const pushback = rightEdge - eLimit;
      current.fromLeft = Math.max(sLimit, current.fromLeft - pushback);
      
      // Push previous cabinets back
      for (let j = i - 1; j >= 0; j--) {
        const prev = sorted[j];
        const collide = (current.type === prev.type || current.type === CabinetType.TALL || prev.type === CabinetType.TALL);
        if (collide) {
          const overlap = (prev.fromLeft + prev.width) - current.fromLeft;
          if (overlap > 0) {
            prev.fromLeft = Math.max(sLimit, prev.fromLeft - overlap);
          }
        }
      }
    }
  }

  // C. Final Compression Pass (If still exceeding limits after pushing, shrink cabinets)
  [CabinetType.BASE, CabinetType.WALL].forEach(type => {
    const levelUnits = sorted.filter(c => c.type === type || c.type === CabinetType.TALL);
    if (levelUnits.length === 0) return;
    
    const lastUnit = levelUnits[levelUnits.length - 1];
    const rightEdge = lastUnit.fromLeft + lastUnit.width;
    
    if (rightEdge > eLimit + 0.1) {
      let debt = rightEdge - eLimit;
      // Shrink auto-filled cabinets to absorb the extra panel thickness
      const shrinkable = levelUnits.filter(c => c.isAutoFilled && c.preset !== PresetType.SINK_UNIT && c.preset !== PresetType.HOOD_UNIT);
      
      if (shrinkable.length > 0) {
        const totalAvailable = shrinkable.reduce((acc, c) => acc + Math.max(0, c.width - ABSOLUTE_MIN_WIDTH), 0);
        if (totalAvailable > 0) {
          const ratio = Math.min(1, debt / totalAvailable);
          shrinkable.forEach(c => {
            const reduction = Math.max(0, c.width - ABSOLUTE_MIN_WIDTH) * ratio;
            c.width -= reduction;
          });
          
          // Re-align this level after shrinking
          for (let i = 0; i < levelUnits.length; i++) {
            if (i === 0) {
               if (levelUnits[i].fromLeft < sLimit) levelUnits[i].fromLeft = sLimit;
            } else {
               const prevRight = levelUnits[i-1].fromLeft + levelUnits[i-1].width;
               if (levelUnits[i].fromLeft < prevRight) levelUnits[i].fromLeft = prevRight;
            }
          }
        }
      }
    }
  });
}

function injectCorners(current: Zone, next: Zone, settings: ProjectSettings) {
  const depth = settings.depthBase;
  const wDepth = settings.depthWall;
  
  // Detect if there's a manual column obstacle at the intersection
  const colInCurrent = current.obstacles.find(o => o.type === 'column' && (o.fromLeft + o.width) >= current.totalLength - 10);
  const colInNext = next.obstacles.find(o => o.type === 'column' && o.fromLeft <= 10);
  
  const hasColumn = !!(colInCurrent || colInNext);
  let cWidth = 0;
  let cDepth = 0;

  if (colInCurrent) {
    cWidth = colInCurrent.width + 25;
    cDepth = (colInCurrent.depth || 0) + 25;
  } else if (colInNext) {
    // If defined on next wall at start, the next wall's width is our depth, and its depth is our width
    cWidth = (colInNext.depth || 0) + 25;
    cDepth = colInNext.width + 25;
  }

  // 2. Base Corner Offset (Usually Depth + 25mm)
  let baseOffset = settings.depthBase + 25;
  
  // Ruby Rule: If window is close to the corner, extend the offset to meet the window start
  const window = next.obstacles.find(o => o.type === 'window');
  if (window && window.fromLeft > baseOffset && window.fromLeft < baseOffset + 400) {
    baseOffset = window.fromLeft;
  }

  current.cabinets.push({
    id: uuid(), 
    preset: PresetType.BASE_CORNER, 
    type: CabinetType.BASE, 
    width: BASE_CORNER_WIDTH, 
    qty: 1, 
    fromLeft: current.totalLength - BASE_CORNER_WIDTH, 
    isAutoFilled: true, 
    label: '',
    advancedSettings: { 
      blindPanelWidth: baseOffset, 
      blindCornerSide: 'right', 
      cabinetType: 'corner',
      enableColumn: hasColumn,
      columnWidth: cWidth,
      columnDepth: cDepth
    }
  });
  
  // Base Offset for next wall
  next.obstacles.push({ 
    id: 'corner_base_offset', 
    type: 'column', 
    fromLeft: 0, 
    width: baseOffset, 
    height: settings.baseHeight, 
    depth 
  });

  // Wall Corner
  const wallCornerOffset = wDepth + 25;
  current.cabinets.push({
    id: uuid(), 
    preset: PresetType.WALL_CORNER, 
    type: CabinetType.WALL, 
    width: WALL_CORNER_WIDTH, 
    qty: 1, 
    fromLeft: current.totalLength - WALL_CORNER_WIDTH, 
    isAutoFilled: true, 
    label: '',
    advancedSettings: { 
      blindPanelWidth: wallCornerOffset, 
      blindCornerSide: 'right', 
      cabinetType: 'wall_corner',
      enableColumn: hasColumn,
      columnWidth: cWidth,
      columnDepth: cDepth
    }
  });

  // Wall Offset for next wall
  next.obstacles.push({ 
    id: 'corner_wall_offset', 
    type: 'column', 
    fromLeft: 0, 
    width: wallCornerOffset, 
    height: settings.wallHeight, 
    elevation: settings.baseHeight + (settings.toeKickHeight || 100) + (settings.counterThickness || 40) + settings.wallCabinetElevation, 
    depth: wDepth 
  });
}

function findGaps(zone: Zone, type: CabinetType, settings: ProjectSettings) {
  let blocked: {start: number, end: number}[] = [];
  
  zone.obstacles.forEach(o => {
    const baseTop = settings.baseHeight + (settings.counterThickness || 0);
    let blocks = (o.type === 'column' || o.type === 'door' || o.type === 'pipe');
    
    // Ruby Rule: Wall cabinets should only be blocked by wall corner offsets, not base corner offsets
    if (o.id === 'corner_base_offset' && type === CabinetType.WALL) blocks = false;
    if (o.id === 'corner_wall_offset' && type === CabinetType.BASE) blocks = false;

    if (o.type === 'window' && (type === CabinetType.TALL || type === CabinetType.WALL)) blocks = true;
    if (o.type === 'window' && type === CabinetType.BASE && (o.sillHeight || 0) < settings.baseHeight) blocks = true;
    if (blocks) blocked.push({ start: o.fromLeft, end: o.fromLeft + o.width });
  });

  // Limits (User defined wall boundaries)
  if (zone.startLimit !== undefined && zone.startLimit > 0) {
    blocked.push({ start: 0, end: zone.startLimit });
  }
  if (zone.endLimit !== undefined && zone.endLimit < zone.totalLength) {
    blocked.push({ start: zone.endLimit, end: zone.totalLength });
  }

  zone.cabinets.forEach(c => {
    if (c.type === type || c.type === CabinetType.TALL || type === CabinetType.TALL) {
      blocked.push({ start: c.fromLeft, end: c.fromLeft + c.width });
    }
  });

  blocked.sort((a,b) => a.start - b.start);
  let merged: {start: number, end: number}[] = [];
  for (let b of blocked) {
    if (merged.length === 0 || merged[merged.length-1].end < b.start) merged.push({...b});
    else merged[merged.length-1].end = Math.max(merged[merged.length-1].end, b.end);
  }

  let gaps: {start: number, end: number, length: number}[] = [];
  let curX = 0;
  for (let b of merged) {
    if (b.start > curX) gaps.push({ start: curX, end: b.start, length: b.start - curX });
    curX = Math.max(curX, b.end);
  }
  if (curX < zone.totalLength) gaps.push({ start: Math.max(0, curX), end: zone.totalLength, length: zone.totalLength - Math.max(0, curX) });
  return gaps;
}

function canPlace(zone: Zone, x: number, w: number, type: CabinetType, settings: ProjectSettings) {
  const gaps = findGaps(zone, type, settings);
  return gaps.some(g => x >= g.start && x + w <= g.end);
}

function placeUnit(zone: Zone, unit: CabinetUnit) {
  zone.cabinets.push(unit);
}

function fillRemaining(zone: Zone, type: CabinetType, settings: ProjectSettings, alignmentPoints: number[] = []) {
  const gaps = findGaps(zone, type, settings);
  const preset = type === CabinetType.BASE ? PresetType.BASE_DOOR : PresetType.WALL_STD;

  for (const gap of gaps) {
    let currentX = gap.start;
    let remainingLength = gap.length;

    // Symmetry check: If gap is long and has no alignment points, calculate a balanced width
    let symmetricWidth = -1;
    const gapPoints = alignmentPoints.filter(p => p > gap.start + 5 && p < gap.end - 5);
    
    if (gapPoints.length === 0 && remainingLength > 1000) {
      const parts = Math.ceil(remainingLength / 900);
      const ideal = remainingLength / parts;
      
      // Try to find a preferred width (500, 600, 750, 900) that fits well
      const bestPreferred = PREFERRED_WIDTHS
        .filter(pw => pw >= ABSOLUTE_MIN_WIDTH && pw <= remainingLength - ABSOLUTE_MIN_WIDTH)
        .sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal))[0];

      if (bestPreferred && Math.abs(bestPreferred - ideal) < 150) {
        symmetricWidth = bestPreferred;
      } else {
        symmetricWidth = Math.round(ideal);
      }
    }

    while (remainingLength >= ABSOLUTE_MIN_WIDTH) {
      let width = -1;

      // 1. Try to align with external points (Obstacles or cabinets in other level)
      const points = alignmentPoints
        .filter(p => {
          const w = p - currentX;
          const left = gap.end - p;
          // Cap at 950mm for alignment to allow slight overlap but favor splitting large spans
          return w >= ABSOLUTE_MIN_WIDTH - 1 && w <= 950 && (left === 0 || left >= ABSOLUTE_MIN_WIDTH - 1);
        })
        .sort((a, b) => a - b);

      if (points.length > 0) {
        width = Math.round(points[0] - currentX);
      }

      // 2. Symmetry Fallback
      if (width === -1 && symmetricWidth > 0) {
        width = Math.min(Math.round(symmetricWidth), remainingLength);
      }

      // 3. Standard Greedy Fallback
      if (width === -1) {
        width = STANDARD_WIDTHS.find(w => w <= remainingLength) || remainingLength;
      }

      // Final safety check: Width must be an integer
      width = Math.round(width);

      const leftover = remainingLength - width;
      
      // Absorption Logic: If leftover is small (< 400), absorb it
      if (leftover > 0 && leftover < MIN_FILL_WIDTH) {
        const totalWidth = Math.round(width + leftover);
        if (totalWidth > 950) {
          const w1 = Math.round(totalWidth / 2);
          const w2 = totalWidth - w1;
          placeUnit(zone, { id: uuid(), preset, type, width: w1, qty: 1, fromLeft: currentX, isAutoFilled: true, label: '' });
          placeUnit(zone, { id: uuid(), preset, type, width: w2, qty: 1, fromLeft: currentX + w1, isAutoFilled: true, label: '' });
        } else {
          placeUnit(zone, { id: uuid(), preset, type, width: totalWidth, qty: 1, fromLeft: currentX, isAutoFilled: true, label: '' });
        }
        remainingLength = 0;
        currentX += totalWidth;
      } else {
        placeUnit(zone, { id: uuid(), preset, type, width: width, qty: 1, fromLeft: currentX, isAutoFilled: true, label: '' });
        remainingLength -= width;
        currentX += width;
      }
    }
  }
}

function absorbRemainder(zone: Zone, settings: ProjectSettings) {
  const types = [CabinetType.BASE, CabinetType.WALL];
  
  for (const type of types) {
    let absorbedInPass = true;
    while (absorbedInPass) {
      absorbedInPass = false;
      const gaps = findGaps(zone, type, settings);
      
      for (const gap of gaps) {
        if (gap.length > 0 && gap.length < MIN_FILL_WIDTH) {
          // Priority 0: Boundary Check (If gap is at startLimit or endLimit, expand the first/last cabinet)
          const isAtStart = Math.abs(gap.start - (zone.startLimit || 0)) < 2;
          const isAtEnd = Math.abs(gap.end - (zone.endLimit || zone.totalLength)) < 2;

          if (isAtStart || isAtEnd) {
            const target = findAdjacent(zone, type, gap, c => 
              c.preset !== PresetType.SINK_UNIT && 
              c.preset !== PresetType.HOOD_UNIT &&
              c.preset !== PresetType.BASE_DRAWER_3
            );
            if (target) {
              if (isAtStart) {
                target.width += gap.length;
                target.fromLeft -= gap.length;
              } else {
                target.width += gap.length;
              }
              absorbedInPass = true;
              break;
            }
          }

          // Priority 1: Corner Cabinet
          const cornerPreset = type === CabinetType.BASE ? PresetType.BASE_CORNER : PresetType.WALL_CORNER;
          let target = findAdjacent(zone, type, gap, c => c.preset === cornerPreset);
          
          // Priority 2: Standard Cabinet (Avoid resizing Cooker/Sink)
          if (!target) {
            target = findAdjacent(zone, type, gap, c => 
              c.preset !== PresetType.SINK_UNIT && 
              c.preset !== PresetType.BASE_DRAWER_3 && 
              c.preset !== PresetType.HOOD_UNIT &&
              !(c.type === CabinetType.BASE && c.advancedSettings?.showDrawers)
            );
          }
          
          // Priority 3: Any Cabinet (Final resort) - Still prefer avoiding anchor units
          if (!target) {
            target = findAdjacent(zone, type, gap, c => 
              c.preset !== PresetType.SINK_UNIT && 
              c.preset !== PresetType.BASE_DRAWER_3 && 
              c.preset !== PresetType.HOOD_UNIT
            );
          }
          
          if (target) {
            if (Math.abs(target.fromLeft - (gap.start + gap.length)) < 2) {
              target.width += gap.length;
              target.fromLeft -= gap.length;
            } else {
              target.width += gap.length;
            }
            absorbedInPass = true;
            break; // Re-calculate gaps after modification
          }
        }
      }
    }
  }
}

function findAdjacent(zone: Zone, type: CabinetType, gap: {start: number, end: number, length: number}, predicate: (c: CabinetUnit) => boolean) {
  return zone.cabinets.find(c => 
    c.type === type && 
    predicate(c) &&
    (Math.abs(c.fromLeft - (gap.start + gap.length)) < 2 || Math.abs((c.fromLeft + c.width) - gap.start) < 2)
  );
}


function allocateCabinets(zone: Zone, type: CabinetType, count: number, preset: PresetType, settings: ProjectSettings, warnings: string[]) {
  const defaultWidth = 
    type === CabinetType.BASE ? (settings.widthBase || 600) :
    type === CabinetType.WALL ? (settings.widthWall || 600) :
    (settings.widthTall || 600);
  
  const gaps = findGaps(zone, type, settings);
  gaps.sort((a, b) => b.length - a.length);
  
  if (gaps.length === 0 || gaps[0].length < count * defaultWidth) {
    warnings.push(`${zone.id} (${type}): Insufficient space.`);
  }

  let remainingCount = count;
  let gapIdx = 0;
  while (remainingCount > 0 && gapIdx < gaps.length) {
      const gap = gaps[gapIdx];
      const countForGap = Math.min(remainingCount, Math.floor(gap.length / defaultWidth));
      if (countForGap > 0) {
          for (let i = 0; i < countForGap; i++) {
              placeUnit(zone, { id: uuid(), preset, type, qty: 1, width: defaultWidth, fromLeft: gap.start + (i * defaultWidth), isAutoFilled: true, label: `${type.charAt(0)}${zone.cabinets.length + 1}` });
          }
          remainingCount -= countForGap;
      }
      gapIdx++;
  }
}
