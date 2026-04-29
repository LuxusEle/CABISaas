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
  let tallPlaced = false;
  let sinkPlaced = false;
  let cookerPlaced = false;

  const tallWidth = Math.max(250, settings.widthTall || 600);

  // 3.1 Tall Cabinet (High Priority Anchor)
  // Ruby Rules:
  // - In Right Corner mode: Tall unit is placed at X = 0.
  // - In Left Corner mode: Tall unit is placed at X = WallLength - Width.
  for (const zone of zones) {
    if (tallPlaced) break;
    
    // Try X = 0 first (Right Corner mode or Standard)
    if (canPlace(zone, 0, tallWidth, CabinetType.TALL, settings)) {
      // Ruby Rule: If window is close (within 400mm), extend Tall unit to window edge
      const window = zone.obstacles.find(o => o.type === 'window');
      let finalWidth = tallWidth;
      if (window && window.fromLeft > tallWidth && window.fromLeft < tallWidth + 400) {
        finalWidth = window.fromLeft;
      }

      placeUnit(zone, { 
        id: uuid(), 
        preset: PresetType.TALL_UTILITY, 
        type: CabinetType.TALL, 
        width: finalWidth, 
        qty: 1, 
        fromLeft: 0, 
        isAutoFilled: true, 
        label: '' 
      });
      tallPlaced = true;
    } 
    // Then try X = WallLength - TallWidth (Left Corner mode)
    else if (canPlace(zone, zone.totalLength - tallWidth, tallWidth, CabinetType.TALL, settings)) {
      placeUnit(zone, { 
        id: uuid(), 
        preset: PresetType.TALL_UTILITY, 
        type: CabinetType.TALL, 
        width: tallWidth, 
        qty: 1, 
        fromLeft: zone.totalLength - tallWidth, 
        isAutoFilled: true, 
        label: '' 
      });
      tallPlaced = true;
    }
  }

  // 3.2 Sink Unit (Centered under windows)
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
      const startX = wallCornerOffset ? (wallCornerOffset.fromLeft + wallCornerOffset.width) : 0;
      
      let xSink = windowStart; // Try left snap first
      const leftGap = xSink - startX;
      
      if (leftGap > 0 && leftGap < ABSOLUTE_MIN_WIDTH) {
        // Left snap leaves a tiny gap! Try snapping to the right side of the window
        const rightX = windowEnd - sw;
        const rightGap = rightX - startX;
        if (rightGap >= ABSOLUTE_MIN_WIDTH || rightGap === 0) {
          xSink = rightX;
        }
      }

      const windowGap = gaps.find(g => xSink >= g.start && xSink + sw <= g.end);
      
      if (windowGap) {
        if (canPlace(zone, xSink, sw, CabinetType.BASE, settings)) {
          placeUnit(zone, { id: uuid(), preset: PresetType.SINK_UNIT, type: CabinetType.BASE, width: sw, qty: 1, fromLeft: xSink, isAutoFilled: true, label: '' });
          sinkPlaced = true;
        }
      }
    }
  }

  // 3.3 Cooker Unit
  for (const zone of zones) {
    if (cookerPlaced) break;
    const cookerWidth = 1000;
    const gaps = findGaps(zone, CabinetType.BASE, settings);
    for (const gap of gaps) {
      if (gap.length >= cookerWidth) {
        let x = gap.start + (gap.length - cookerWidth) / 2;
        
        // Ruby Rule: Avoid leaving small unfillable gaps. 
        // If centering leaves gaps < 250mm, snap to one side to preserve a larger gap for standard units.
        const leftGap = x - gap.start;
        const rightGap = gap.end - (x + cookerWidth);
        
        if (leftGap > 0 && leftGap < MIN_FILL_WIDTH) {
          x = gap.start;
        } else if (rightGap > 0 && rightGap < MIN_FILL_WIDTH) {
          x = Math.max(gap.start, gap.end - cookerWidth);
        }

        placeUnit(zone, { id: uuid(), preset: PresetType.BASE_DRAWER_3, type: CabinetType.BASE, width: cookerWidth, qty: 1, fromLeft: x, isAutoFilled: true, label: '' });
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

  // 4. Fill Remaining Space
  zones.forEach((zone, zIdx) => {
    fillRemaining(zone, CabinetType.BASE, settings);
    fillRemaining(zone, CabinetType.WALL, settings);
    absorbRemainder(zone, settings); // Ruby Rule: Absorb small gaps into corners
    
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
const STANDARD_WIDTHS = [1000, 900, 600, 450, 300, 250];
const BASE_CORNER_WIDTH = 1050;
const WALL_CORNER_WIDTH = 750;
const MIN_FILL_WIDTH = 400; // Ruby Rule: Avoid cabinets < 400mm unless absolutely necessary
const ABSOLUTE_MIN_WIDTH = 250; // Still allowed if no other choice

// --- Helper Functions ---

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

function fillRemaining(zone: Zone, type: CabinetType, settings: ProjectSettings) {
  const gaps = findGaps(zone, type, settings);
  const preset = type === CabinetType.BASE ? PresetType.BASE_DOOR : PresetType.WALL_STD;

  for (const gap of gaps) {
    let currentX = gap.start;
    let remainingLength = gap.length;

    // Use standard widths in descending order
    while (remainingLength >= ABSOLUTE_MIN_WIDTH) {
      const width = STANDARD_WIDTHS.find(w => w <= remainingLength);
      if (width) {
        const leftover = remainingLength - width;
        
        // Absorption Logic: If leftover is small (< 400), absorb it
        if (leftover > 0 && leftover < MIN_FILL_WIDTH) {
          const totalWidth = width + leftover;
          if (totalWidth > 1000) {
            const half = totalWidth / 2;
            placeUnit(zone, { id: uuid(), preset, type, width: half, qty: 1, fromLeft: currentX, isAutoFilled: true, label: '' });
            placeUnit(zone, { id: uuid(), preset, type, width: half, qty: 1, fromLeft: currentX + half, isAutoFilled: true, label: '' });
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
      } else {
        break;
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
          // Priority 1: Corner Cabinet
          const cornerPreset = type === CabinetType.BASE ? PresetType.BASE_CORNER : PresetType.WALL_CORNER;
          let target = findAdjacent(zone, type, gap, c => c.preset === cornerPreset);
          
          // Priority 2: Standard Cabinet (Avoid resizing Cooker/Sink)
          if (!target) {
            target = findAdjacent(zone, type, gap, c => 
              c.preset !== PresetType.SINK_UNIT && 
              c.preset !== PresetType.BASE_DRAWER_3 && 
              c.preset !== PresetType.HOOD_UNIT
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
