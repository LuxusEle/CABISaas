import { Project, Zone, CabinetUnit, BOMGroup, BOMItem, CabinetType, PresetType, ProjectSettings, OptimizationResult, Obstacle, AutoFillOptions, PartCategory } from '../types';
import { SheetType } from '../types';
import type { ConstructionPlanJSON } from '../types/construction';
import { getCabinetTestingSettings } from '../components/CabinetTestingUtils';
import { exportBaseCabinetDXF } from '../components/BaseCabinetTesting';
import { exportWallCabinetDXF } from '../components/WallCabinetTesting';
import { exportTallCabinetDXF } from '../components/TallCabinetTesting';
import { exportBaseCornerCabinetDXF } from '../components/BaseCornerCabinetTesting';
import { exportWallCornerCabinetDXF } from '../components/WallCornerCabinetTesting';

// Helper to generate unique IDs
const uuid = () => Math.random().toString(36).substr(2, 9);

// Hardware Constants
const HW = {
  HINGE: 'Soft-Close Hinge',
  SLIDE: 'Drawer Slide (Pair)',
  LEG: 'Adjustable Leg',
  HANDLE: 'Handle/Knob',
  HANGER: 'Wall Hanger (Pair)',
  NAIL: 'Installation Nail',
  CAM_LOCK: 'Cam-Lock (Minifix)',
  CONFIRMAT: 'Confirmat Screw'
};

// Nails per hinge
const NAILS_PER_HINGE = 4;

// Ruby CBX Door Calculation Helper
// Returns door configuration based on cabinet width and settings
// Ruby rules: Single door if width < 599.5mm, Double doors if width >= 600mm
const calculateDoors = (cabinetWidth: number, doorHeight: number, settings: ProjectSettings) => {
  const threshold = 599.5; // Ruby threshold in mm
  const outerGap = settings.doorOuterGap || 3;
  const innerGap = settings.doorInnerGap || 3;
  
  const isDoubleDoor = cabinetWidth >= threshold;
  
  if (isDoubleDoor) {
    const doorOpening = cabinetWidth - 2 * outerGap - innerGap;
    const doorWidth = doorOpening / 2;
    return {
      qty: 2,
      width: doorWidth,
      length: doorHeight,
      hinges: 4,
      handles: 2
    };
  } else {
    const doorWidth = cabinetWidth - 2 * outerGap;
    return {
      qty: 1,
      width: doorWidth,
      length: doorHeight,
      hinges: 2,
      handles: 1
    };
  }
};

// --- COLLISION LOGIC ---

export const resolveCollisions = (zone: Zone): Zone => {
  // Preserve WALL_TOP cabinets exactly — they must not be moved by collision resolution
  const wallTops = zone.cabinets
    .filter(c => c.type === CabinetType.WALL_TOP)
    .map(c => ({ ...c }));
  const others = zone.cabinets
    .filter(c => c.type !== CabinetType.WALL_TOP)
    .map(c => ({ ...c }));

  // Sort and create fresh copies to avoid mutating original state
  const sortedCabs = [...others]
    .sort((a, b) => a.fromLeft - b.fromLeft);

  // First pass: Push right to resolve overlaps
  for (let i = 0; i < sortedCabs.length; i++) {
    const next = sortedCabs[i];
    let maxRight = next.fromLeft;

    // Check collisions with preceding cabinets
    for (let j = 0; j < i; j++) {
      const current = sortedCabs[j];
      const collideVertically =
        current.type === next.type ||
        current.type === CabinetType.TALL ||
        next.type === CabinetType.TALL;

      if (collideVertically) {
        const currentRight = current.fromLeft + current.width;
        if (currentRight > maxRight) {
          maxRight = currentRight;
        }
      }
    }
    next.fromLeft = maxRight;
  }

  // Second pass: Enforce wall boundary (right to left)
  const wallLimit = zone.totalLength;
  const limits: Record<string, number> = {
    [CabinetType.BASE]: wallLimit,
    [CabinetType.WALL]: wallLimit,
    [CabinetType.TALL]: wallLimit
  };

  // Process from right to left to push back or shrink
  for (let i = sortedCabs.length - 1; i >= 0; i--) {
    const cab = sortedCabs[i];
    const type = cab.type;
    
    // Determine the relevant limit for this cabinet type
    let currentLimit = limits[type];
    if (type === CabinetType.TALL) {
      currentLimit = Math.min(limits[CabinetType.BASE], limits[CabinetType.WALL], limits[CabinetType.TALL]);
    }

    if (cab.fromLeft + cab.width > currentLimit) {
      // If possible, resize to fit
      if (cab.fromLeft < currentLimit - 100) {
        cab.width = currentLimit - cab.fromLeft;
      } else {
        // If too far right, push back and keep min width
        cab.width = Math.min(cab.width, 100);
        cab.fromLeft = Math.max(0, currentLimit - cab.width);
      }
    }

    // Update limits for preceding cabinets
    const nextLimit = cab.fromLeft;
    if (type === CabinetType.TALL) {
      limits[CabinetType.BASE] = nextLimit;
      limits[CabinetType.WALL] = nextLimit;
      limits[CabinetType.TALL] = nextLimit;
    } else {
      limits[type] = nextLimit;
      // Also update TALL limit if this is more restrictive
      if (nextLimit < limits[CabinetType.TALL]) {
        limits[CabinetType.TALL] = nextLimit;
      }
    }
  }

  return {
    ...zone,
    cabinets: [...sortedCabs, ...wallTops].sort((a, b) => a.fromLeft - b.fromLeft)
  };
};

export const resolveLocalCollisions = (zone: Zone, changedIndex: number, settings?: ProjectSettings): Zone => {
  const cabs = [...zone.cabinets].map(c => ({ ...c }));
  const cab = cabs[changedIndex];
  if (!cab) return zone;

  const sortedIndices = cabs.map((_, i) => i).sort((a, b) => cabs[a].fromLeft - cabs[b].fromLeft);
  const posInSorted = sortedIndices.indexOf(changedIndex);

  const isCompatible = (t1: CabinetType, t2: CabinetType) => 
    t1 === t2 || t1 === CabinetType.TALL || t2 === CabinetType.TALL;

  const MIN_WIDTH = 150;
  const ABS_MIN_WIDTH = 10;

  // --- 1. RESOLVE WITH OBSTACLES (Hard Boundaries) ---
  const baseH = settings?.baseHeight || 870;
  const wallH = settings?.wallHeight || 720;
  const tallH = settings?.tallHeight || 2100;
  const tk = settings?.toeKickHeight || 100;
  const ct = settings?.counterThickness || 40;
  const wallElev = settings?.wallCabinetElevation || 450;

  let cabTop = 0;
  let cabBottom = 0;

  if (cab.type === CabinetType.BASE) {
    cabBottom = 0;
    cabTop = tk + baseH + ct;
  } else if (cab.type === CabinetType.WALL) {
    cabBottom = tk + baseH + ct + wallElev;
    cabTop = cabBottom + wallH;
  } else if (cab.type === CabinetType.TALL) {
    cabBottom = 0;
    cabTop = tk + tallH;
  }

  zone.obstacles.forEach(obs => {
    // Vertical check
    let obsBottom = obs.elevation || 0;
    if (obs.type === 'window' && obs.sillHeight !== undefined) obsBottom = obs.sillHeight;
    const obsTop = obsBottom + (obs.height || 2100);

    // If no vertical overlap, skip
    if (cabTop <= obsBottom || cabBottom >= obsTop) return;

    const obsRight = obs.fromLeft + obs.width;
    
    // Check horizontal overlap
    if (cab.fromLeft < obsRight && cab.fromLeft + cab.width > obs.fromLeft) {
      // Determine side of collision based on previous state if possible, 
      // but here we just constrain to the nearest edge
      const midCab = cab.fromLeft + cab.width / 2;
      const midObs = obs.fromLeft + obs.width / 2;

      if (midCab < midObs) {
        // Collision on the right side of cabinet
        cab.width = Math.max(ABS_MIN_WIDTH, obs.fromLeft - cab.fromLeft);
      } else {
        // Collision on the left side of cabinet
        const oldRight = cab.fromLeft + cab.width;
        cab.fromLeft = obsRight;
        cab.width = Math.max(ABS_MIN_WIDTH, oldRight - cab.fromLeft);
      }
    }
  });

  // --- 2. RESOLVE WITH NEIGHBORS (Shrinking/Blocking) ---
  const resolveNeighborsInDirection = (direction: 'left' | 'right') => {
    const isRight = direction === 'right';
    const start = isRight ? posInSorted + 1 : posInSorted - 1;
    const end = isRight ? sortedIndices.length : -1;
    const step = isRight ? 1 : -1;

    // We track immediate neighbors for each compatible level
    const relevantNeighbors: CabinetUnit[] = [];
    const foundLevels = new Set<CabinetType>();
    
    const levelsToFind = cab.type === CabinetType.TALL 
      ? [CabinetType.BASE, CabinetType.WALL, CabinetType.TALL]
      : [cab.type, CabinetType.TALL];

    for (let i = start; i !== end; i += step) {
      const neighbor = cabs[sortedIndices[i]];
      if (levelsToFind.includes(neighbor.type) && !foundLevels.has(neighbor.type)) {
        relevantNeighbors.push(neighbor);
        // If we hit a TALL neighbor, it blocks ALL levels in this direction
        if (neighbor.type === CabinetType.TALL) break;
        foundLevels.add(neighbor.type);
      }
    }

    relevantNeighbors.forEach(next => {
      const isTallPriority = next.type === CabinetType.TALL && cab.type !== CabinetType.TALL;
      
      if (isRight) {
        const overlap = (cab.fromLeft + cab.width) - next.fromLeft;
        if (overlap > 0) {
          if (isTallPriority) {
            cab.width = Math.max(ABS_MIN_WIDTH, next.fromLeft - cab.fromLeft);
          } else if (next.width - overlap >= MIN_WIDTH) {
            next.fromLeft += overlap;
            next.width -= overlap;
          } else {
            const allowedShrink = next.width - MIN_WIDTH;
            next.fromLeft += allowedShrink;
            next.width = MIN_WIDTH;
            cab.width = Math.max(ABS_MIN_WIDTH, next.fromLeft - cab.fromLeft);
          }
        }
      } else {
        const overlap = (next.fromLeft + next.width) - cab.fromLeft;
        if (overlap > 0) {
          if (isTallPriority) {
            const oldRight = cab.fromLeft + cab.width;
            cab.fromLeft = next.fromLeft + next.width;
            cab.width = Math.max(ABS_MIN_WIDTH, oldRight - cab.fromLeft);
          } else if (next.width - overlap >= MIN_WIDTH) {
            next.width -= overlap;
          } else {
            const allowedShrink = next.width - MIN_WIDTH;
            next.width = MIN_WIDTH;
            const excess = overlap - allowedShrink;
            cab.fromLeft += excess;
            cab.width = Math.max(ABS_MIN_WIDTH, cab.width - excess);
          }
        }
      }
    });
  };

  resolveNeighborsInDirection('right');
  resolveNeighborsInDirection('left');

  // 3. Enforce Wall Boundaries for the changed cabinet
  if (cab.fromLeft < 0) {
    const excess = -cab.fromLeft;
    cab.fromLeft = 0;
    cab.width = Math.max(ABS_MIN_WIDTH, cab.width - excess);
  }
  if (cab.fromLeft + cab.width > zone.totalLength) {
    cab.width = Math.max(ABS_MIN_WIDTH, zone.totalLength - cab.fromLeft);
  }

  return {
    ...zone,
    cabinets: cabs
  };
};

// --- AUTO FILL ---

const STD_WIDTHS = [1000, 900, 800, 600, 500, 450, 400, 300, 250];

export const getIntersectingCabinets = (zone: Zone, cabinet: CabinetUnit): CabinetUnit[] => {
  return zone.cabinets.filter(c => {
    if (c.id === cabinet.id) return false;

    // Check vertical group compatibility
    const collideVertically =
      cabinet.type === c.type ||
      cabinet.type === CabinetType.TALL ||
      c.type === CabinetType.TALL;

    if (!collideVertically) return false;

    const cabinetStart = cabinet.fromLeft;
    const cabinetEnd = cabinetStart + cabinet.width;
    const cStart = c.fromLeft;
    const cEnd = cStart + c.width;

    return cabinetStart < cEnd && cabinetEnd > cStart;
  });
};

/**
 * Intelligent Layout Logic (Hafale Principles)
 * 1. Sinks under Windows.
 * 2. Storage -> Wash -> Prep -> Cook flow.
 */
export const autoFillZone = (
  zone: Zone,
  settings: ProjectSettings,
  wallId: string,
  options: AutoFillOptions = { includeSink: true, includeCooker: true, includeTall: false, includeWallCabinets: true, preferDrawers: false }
): Zone => {
  const manualCabs = zone.cabinets.filter(c => !c.isAutoFilled);
  const obstacles = zone.obstacles;
  const totalLength = zone.totalLength;

  // 1. Identify "Hard" Blocks (Cannot have cabinets)
  const hardBlocks = obstacles.filter(o => o.type === 'door' || o.type === 'column' || (o.type === 'window' && (o.sillHeight || 0) < 300));

  const newCabinets: CabinetUnit[] = [];

  // Helper to check if a spot is occupied by manual cabs or hard blocks
  const isOccupied = (x: number, w: number, type: CabinetType) => {
    // Outside limits check
    if (zone.startLimit !== undefined && x < zone.startLimit) return true;
    if (zone.endLimit !== undefined && x + w > zone.endLimit) return true;

    const overlaps = hardBlocks.some(b => x < b.fromLeft + b.width && x + w > b.fromLeft) ||
      manualCabs.some(c => {
        const verticallyCompatible = type === CabinetType.TALL || c.type === CabinetType.TALL || type === c.type;
        return verticallyCompatible && x < c.fromLeft + c.width && x + w > c.fromLeft;
      }) ||
      newCabinets.some(c => {
        const verticallyCompatible = type === CabinetType.TALL || c.type === CabinetType.TALL || type === c.type;
        return verticallyCompatible && x < c.fromLeft + c.width && x + w > c.fromLeft;
      });
    return overlaps;
  };

  // 2. Intelligent Placement: Sink under Window (Exactly One)
  if (options.includeSink && !manualCabs.some(c => c.preset === PresetType.SINK_UNIT)) {
    const windows = obstacles.filter(o => o.type === 'window' && (o.sillHeight || 0) >= 300);
    for (const win of windows) {
      const sinkWidth = 900;
      const sinkLeft = Math.round((win.fromLeft + (win.width - sinkWidth) / 2) / 25) * 25;
      if (!isOccupied(sinkLeft, sinkWidth, CabinetType.BASE) && sinkLeft >= 0 && sinkLeft + sinkWidth <= totalLength) {
        newCabinets.push({
          id: `auto-sink-${sinkLeft}`, preset: PresetType.SINK_UNIT, type: CabinetType.BASE,
          width: sinkWidth, qty: 1, isAutoFilled: true, fromLeft: sinkLeft
        });
        break; // Only one sink
      }
    }
  }

  // 3. Intelligent Placement: Cooker (Exactly One)
  let cookerCabinet: CabinetUnit | null = null;
  const existingCooker = manualCabs.find(c => c.preset === PresetType.COOKER_HOB || c.preset === PresetType.BASE_DRAWER_3);

  if (options.includeCooker && !existingCooker) {
    // Try to place cooker away from sink (working triangle)
    const cookerWidth = 600;
    const effectiveStart = zone.startLimit || 0;
    const effectiveEnd = zone.endLimit || totalLength;
    const effectiveLength = effectiveEnd - effectiveStart;

    const preferredPositions = [
      effectiveStart + Math.floor((effectiveLength - cookerWidth) / 2), // Center
      effectiveStart,                                                  // Left
      effectiveEnd - cookerWidth                                       // Right
    ];

    let bestX = preferredPositions[0];
    const leftGap = bestX - effectiveStart;
    const rightGap = effectiveEnd - (bestX + cookerWidth);
    
    // Ruby Rule: If centering creates gaps < 400mm, snap to one side to merge them
    if ((leftGap > 0 && leftGap < 400) || (rightGap > 0 && rightGap < 400)) {
      if (leftGap <= rightGap) {
        bestX = 0;
      } else {
        bestX = totalLength - cookerWidth;
      }
    }

    if (!isOccupied(bestX, cookerWidth, CabinetType.BASE)) {
      cookerCabinet = {
        id: `auto-cooker-${bestX}`, preset: PresetType.COOKER_HOB, type: CabinetType.BASE,
        width: cookerWidth, qty: 1, isAutoFilled: true, fromLeft: bestX
      };
      newCabinets.push(cookerCabinet);
    }
  } else {
    cookerCabinet = existingCooker || null;
  }

  // 4. Place Hood EXACTLY above Cooker
  if (cookerCabinet && options.includeWallCabinets) {
    const hoodWidth = cookerCabinet.width;
    const hoodLeft = cookerCabinet.fromLeft;
    if (!isOccupied(hoodLeft, hoodWidth, CabinetType.WALL)) {
      newCabinets.push({
        id: `auto-hood-${hoodLeft}`, preset: PresetType.HOOD_UNIT, type: CabinetType.WALL,
        width: hoodWidth, qty: 1, isAutoFilled: true, fromLeft: hoodLeft
      });
    }
  }

  // 5. Fill remaining spans
  const fillSpans = (type: CabinetType) => {
    if (type === CabinetType.WALL && !options.includeWallCabinets) return;
    if (type === CabinetType.TALL && !options.includeTall) return;

    let x = 0;
    while (x < totalLength) {
      let foundSpot = false;
      for (const w of STD_WIDTHS) {
        if (x + w <= totalLength && !isOccupied(x, w, type)) {
          const preset = type === CabinetType.BASE
            ? (options.preferDrawers ? PresetType.BASE_DRAWER_3 : PresetType.BASE_DOOR)
            : (type === CabinetType.WALL ? PresetType.WALL_STD : PresetType.TALL_UTILITY);

          const newUnit = { id: `auto-box-${type}-${x}`, preset, type, width: w, qty: 1, isAutoFilled: true, fromLeft: x };
          
          // Absorption Logic: Check if the remaining space after this unit is tiny (< 400mm)
          let nextGap = 0;
          let checkX = x + w;
          while (checkX < totalLength && !isOccupied(checkX, 1, type)) {
            nextGap++;
            checkX++;
          }
          
          if (nextGap > 0 && nextGap < 400) {
            // Absorb the gap!
            const totalWidth = w + nextGap;
            if (totalWidth > 1000) {
              // Split into two equal cabinets
              const half = totalWidth / 2;
              newCabinets.push({ ...newUnit, width: half });
              newCabinets.push({ ...newUnit, id: `auto-box-${type}-${x}-2`, width: half, fromLeft: x + half });
            } else {
              newCabinets.push({ ...newUnit, width: totalWidth });
            }
            x += totalWidth;
          } else {
            newCabinets.push(newUnit);
            x += w;
          }
          
          foundSpot = true;
          break;
        }
      }
      if (!foundSpot) x += 25;
    }
  };

  fillSpans(CabinetType.BASE);
  fillSpans(CabinetType.TALL);
  fillSpans(CabinetType.WALL);

  // 6. Sequential Numbering (preserve existing labels, assign new ones as needed)
  const finalCabs = [...newCabinets, ...manualCabs].sort((a, b) => a.fromLeft - b.fromLeft);

  // Get existing labels to avoid conflicts
  const getExistingLabels = (type: CabinetType) => {
    const existingLabels = manualCabs
      .filter(c => c.type === type && c.label)
      .map(c => {
        const match = c.label?.match(/([A-Z])(\d+)/);
        return match ? parseInt(match[2]) : 0;
      })
      .filter(num => num > 0);

    return Math.max(0, ...existingLabels);
  };

  let bIdx = getExistingLabels(CabinetType.BASE) + 1;
  let wIdx = getExistingLabels(CabinetType.WALL) + 1;
  let tIdx = getExistingLabels(CabinetType.TALL) + 1;
  let uIdx = getExistingLabels(CabinetType.WALL_TOP) + 1;

  const numbered = finalCabs.map(c => {
    let label = c.label; // Preserve existing labels
    if (!label) {
      const typeChar = c.type === CabinetType.BASE ? 'B' : c.type === CabinetType.WALL ? 'W' : c.type === CabinetType.WALL_TOP ? 'U' : 'T';
      const seq = typeChar === 'B' ? bIdx++ : typeChar === 'W' ? wIdx++ : typeChar === 'U' ? uIdx++ : tIdx++;
      label = `${zone.id}${typeChar}${String(seq).padStart(2, '0')}`;
    }
    return { ...c, label };
  });

  return { ...zone, cabinets: numbered };
};

// --- BOM GENERATION ---

const generateCabinetParts = (unit: CabinetUnit, settings: ProjectSettings, cabIndex: number): BOMItem[] => {
  const parts: BOMItem[] = [];
  const { thickness: globalThickness } = settings;
  const labelPrefix = unit.label ? `${unit.label} ${unit.preset}` : `#${cabIndex + 1} ${unit.preset}`;

  const materials = unit.materials || {};
  const projectMaterials = settings.materialSettings || {
    carcassMaterial: 'Shutter',
    doorMaterial: 'Face',
    drawerMaterial: 'Shutter',
    backMaterial: 'MDF 6mm',
    shelfMaterial: 'Plywood'
  };

  const carcassMaterial = materials.carcassMaterial || projectMaterials.carcassMaterial || 'Shutter';
  const doorMaterial = materials.doorMaterial || projectMaterials.doorMaterial || 'Face';
  const drawerMaterial = materials.drawerMaterial || projectMaterials.drawerMaterial || 'Shutter';
  const backMaterial = materials.backPanelMaterial || projectMaterials.backMaterial || 'MDF 6mm';
  const shelfMaterial = materials.shelfMaterial || projectMaterials.shelfMaterial || carcassMaterial;

  const t = getCabinetTestingSettings(unit, settings);
  const thickness = t.panelThickness;
  const height = t.height;
  const depth = t.depth;
  const width = t.width;
  const innerWidth = width - 2 * thickness;
  const isTall = unit.type === CabinetType.TALL;

  if (unit.preset === PresetType.FILLER) {
    parts.push({
      id: uuid(), name: 'Filler Panel', qty: 1, width: width, length: height,
      material: carcassMaterial, category: 'carcass', label: labelPrefix, cabinetId: unit.id, cabinetLabel: unit.label
    });
    return parts;
  }

  const machiningDataMap: Record<string, any> = {};
  const dataCollector = (data: any) => {
    machiningDataMap[data.name] = data;
  };

  if (unit.preset === PresetType.BASE_CORNER) {
    exportBaseCornerCabinetDXF(t, null, dataCollector);
  } else if (unit.preset === PresetType.WALL_CORNER) {
    exportWallCornerCabinetDXF(t, null, dataCollector);
  } else if (t.cabinetType === 'base') {
    exportBaseCabinetDXF(t, null, dataCollector);
  } else if (t.cabinetType === 'wall' || t.cabinetType === 'wall_top') {
    exportWallCabinetDXF(t, null, dataCollector);
  } else if (t.cabinetType === 'tall') {
    exportTallCabinetDXF(t, null, dataCollector);
  }

  const resolveCategory = (name: string): PartCategory => {
    if (name.startsWith('Shelf')) return 'shelf';
    if (name.startsWith('Drawer_Front')) return 'door';
    if (name.startsWith('Drawer_')) return 'drawer';
    if (name.includes('Door') || name.includes('Exposed')) return 'door';
    if (name.includes('Back_Panel')) return 'back';
    return 'carcass';
  };

  const resolveMaterial = (category: PartCategory) => {
    if (category === 'back') return backMaterial;
    if (category === 'shelf') return shelfMaterial;
    if (category === 'door') return doorMaterial;
    if (category === 'drawer') return drawerMaterial;
    return carcassMaterial;
  };

  Object.values(machiningDataMap).forEach(data => {
    const category = resolveCategory(data.name);
    const material = resolveMaterial(category);
    parts.push({
      id: uuid(),
      name: data.name.replace(/_/g, ' '),
      qty: 1,
      width: Math.round(data.width * 100) / 100,
      length: Math.round(data.height * 100) / 100,
      material,
      category,
      label: labelPrefix,
      cabinetId: unit.id,
      cabinetLabel: unit.label,
      features: [JSON.stringify({ cnc: data })]
    });
  });
  
  // 6. GENERAL HARDWARE
  if (unit.type === CabinetType.BASE || isTall) {
    parts.push({ id: uuid(), name: HW.LEG, qty: isTall ? 6 : 4, width: 0, length: 0, material: 'Hardware', category: 'hardware', isHardware: true });
  }
  if (unit.type === CabinetType.WALL || unit.type === CabinetType.WALL_TOP) {
    parts.push({ id: uuid(), name: HW.HANGER, qty: 1, width: 0, length: 0, material: 'Hardware', category: 'hardware', isHardware: true });
  }

  // Hinges and Handles
  const RUBY_DOOR_THRESHOLD = 599.5;
  let cabinetDoors = 0;
  if (t.showDoors) {
    cabinetDoors += (t.width < RUBY_DOOR_THRESHOLD ? 1 : 2);
  }
  if (unit.type === CabinetType.TALL && t.showLowerDoors) {
    cabinetDoors += 1;
  }

  if (cabinetDoors > 0) {
    parts.push({ id: uuid(), name: 'Soft-Close Hinge', qty: cabinetDoors * 2, width: 0, length: 0, material: 'Hardware', category: 'hardware', isHardware: true });
    parts.push({ id: uuid(), name: 'Handle/Knob', qty: cabinetDoors, width: 0, length: 0, material: 'Hardware', category: 'hardware', isHardware: true });
  }

  const connectorsPerCabinet = isTall ? 12 : 8;
  parts.push({ id: uuid(), name: HW.CAM_LOCK, qty: connectorsPerCabinet, width: 0, length: 0, material: 'Hardware', category: 'hardware', isHardware: true });
  parts.push({ id: uuid(), name: HW.CONFIRMAT, qty: connectorsPerCabinet, width: 0, length: 0, material: 'Hardware', category: 'hardware', isHardware: true });

  // 7. DRAWER SLIDES
  if (t.showDrawers && t.numDrawers > 0) {
    parts.push({ id: uuid(), name: HW.SLIDE, qty: t.numDrawers, width: 0, length: 0, material: 'Hardware', category: 'hardware', isHardware: true });
    parts.push({ id: uuid(), name: 'Handle/Knob', qty: t.numDrawers, width: 0, length: 0, material: 'Hardware', category: 'hardware', isHardware: true });
  }

  return parts;
};

export const generateProjectBOM = (project: Project): { 
  groups: BOMGroup[], 
  hardwareSummary: Record<string, number>, 
  totalArea: number, 
  totalLinearFeet: number, 
  cabinetCount: number,
  totalGraniteSqft: number,
  totalTileAreaMm2: number
} => {
  const groups: BOMGroup[] = [];
  const hardwareSummary: Record<string, number> = {};
  let totalArea = 0;
  let totalLinearFeet = 0;
  let cabinetCount = 0;
  let totalGraniteSqft = 0;
  let totalTileAreaMm2 = 0;

  project.zones.filter(z => z.active).forEach((zone, zIdx) => {
    let zoneLen = 0;
    
    // Sort cabinets by position to ensure sequential labeling matches visual order
    const sortedCabinets = [...zone.cabinets].sort((a, b) => a.fromLeft - b.fromLeft);
    
    let bIdx = 1;
    let wIdx = 1;
    let tIdx = 1;
    let uIdx = 1;

    sortedCabinets.forEach((unit, index) => {
      // Only skip filler panels, include other auto-filled cabinets (boxes)
      if (unit.isAutoFilled && unit.preset === PresetType.FILLER) return;

      cabinetCount++;
      if (unit.type !== CabinetType.WALL && unit.type !== CabinetType.WALL_TOP) zoneLen += unit.width;

      // Assign sequential label for the report: W01B01, W01W01 etc.
      const wallPrefix = `W${String(zIdx + 1).padStart(2, '0')}`;
      let typeChar = 'W';
      if (unit.type === CabinetType.BASE) typeChar = 'B';
      else if (unit.type === CabinetType.TALL) typeChar = 'T';
      else if (unit.type === CabinetType.WALL_TOP) typeChar = 'U';
      
      const seq = typeChar === 'B' ? bIdx++ : typeChar === 'W' ? wIdx++ : typeChar === 'U' ? uIdx++ : tIdx++;
      const effectiveLabel = `${wallPrefix}${typeChar}${String(seq).padStart(2, '0')}`;

      // Temporarily override unit label for part generation
      const unitWithNewLabel = { ...unit, label: effectiveLabel };

      const parts = generateCabinetParts(unitWithNewLabel, project.settings, index);
      const woodParts = parts.filter(p => !p.isHardware);
      const hwParts = parts.filter(p => p.isHardware);

      woodParts.forEach(p => {
        totalArea += (p.width * p.length * p.qty) / 1000000;
      });

      hwParts.forEach(h => {
        hardwareSummary[h.name] = (hardwareSummary[h.name] || 0) + h.qty;
      });

      groups.push({
        cabinetId: unit.id,
        cabinetName: `${effectiveLabel} - ${unit.preset} (${unit.width}mm)`,
        items: parts // Include all parts (wood + hardware)
      });
      
      // Accessory Calculations
      if (unit.type === CabinetType.BASE) {
        const depth = (unit.advancedSettings?.depth || project.settings.depthBase || 560) + 50;
        totalGraniteSqft += (unit.width * depth) / 92903.04;
      }
    });

    // Tile Backsplash
    const backsplashHeight = project.settings.wallCabinetElevation || 450;
    totalTileAreaMm2 += (zone.totalLength * backsplashHeight);

    totalLinearFeet += (zoneLen / 304.8);
  });

  // Merge contiguous WALL_TOP separators into full-length pieces for cut plan
  const wallTopSep = project.settings.wallTopSeparatorThickness ?? (project.settings.enableTopRow ? (project.settings.doorMaterialThickness || 18) : 0);
  if (wallTopSep > 0) {
    const sepDepth = (project.settings.depthTall || 600) + (project.settings.doorMaterialThickness || 18);
    const doorMat = project.settings.materialSettings?.doorMaterial || 'Face';
    project.zones.filter(z => z.active).forEach((zone, zIdx) => {
      const wallTops = zone.cabinets
        .filter(c => c.type === CabinetType.WALL_TOP)
        .sort((a, b) => a.fromLeft - b.fromLeft);

      if (wallTops.length === 0) return;

      const wallPrefix = `W${String(zIdx + 1).padStart(2, '0')}`;
      let merged = {
        fromLeft: wallTops[0].fromLeft,
        right: wallTops[0].fromLeft + wallTops[0].width,
        cabLabels: [`${wallPrefix}U${String(1).padStart(2, '0')}`]
      };
      const mergedPieces: { fromLeft: number; width: number; cabLabels: string[] }[] = [];

      for (let i = 1; i < wallTops.length; i++) {
        const next = wallTops[i];
        const nextLabel = `${wallPrefix}U${String(i + 1).padStart(2, '0')}`;
        if (next.fromLeft <= merged.right + 2) {
          merged.right = Math.max(merged.right, next.fromLeft + next.width);
          merged.cabLabels.push(nextLabel);
        } else {
          mergedPieces.push({ fromLeft: merged.fromLeft, width: merged.right - merged.fromLeft, cabLabels: merged.cabLabels });
          merged = { fromLeft: next.fromLeft, right: next.fromLeft + next.width, cabLabels: [nextLabel] };
        }
      }
      mergedPieces.push({ fromLeft: merged.fromLeft, width: merged.right - merged.fromLeft, cabLabels: merged.cabLabels });

      mergedPieces.forEach(p => {
        const sepArea = (p.width * sepDepth) / 1000000;
        totalArea += sepArea;
        groups.push({
          cabinetId: `sep_z${zIdx + 1}`,
          cabinetName: `Wall Top Separator - ${p.cabLabels.join(',')}`,
          items: [{
            id: uuid(),
            name: 'Wall Top Separator',
            qty: 1,
            width: p.width,
            length: sepDepth,
            material: doorMat,
            category: 'door',
            label: p.cabLabels.join(','),
            cabinetLabel: p.cabLabels.join(','),
          }]
        });
      });
    });
  }

  // Calculate nails based on hinge count (6 nails per hinge)
  const totalHinges = hardwareSummary[HW.HINGE] || 0;
  if (totalHinges > 0) {
    hardwareSummary[HW.NAIL] = totalHinges * NAILS_PER_HINGE;
  }

  return {
    groups,
    hardwareSummary,
    totalArea: parseFloat(totalArea.toFixed(2)),
    totalLinearFeet: parseFloat(totalLinearFeet.toFixed(1)),
    cabinetCount,
    totalGraniteSqft,
    totalTileAreaMm2
  };
};

// --- MATERIAL REQUIREMENTS BY TYPE ---

export interface MaterialBreakdown {
  materialName: string;
  thickness: number;
  parts: BOMItem[];
  totalArea: number;
  estimatedSheets: number;
  cost: number;
}

export const getMaterialRequirements = (
  project: Project,
  sheetTypes: SheetType[] = []
): MaterialBreakdown[] => {
  const allParts: BOMItem[] = [];

  // Collect all parts from all cabinets
  project.zones
    .filter(z => z.active)
    .forEach((zone, zIdx) => {
      let bIdx = 1;
      let wIdx = 1;
      let tIdx = 1;
      let uIdx = 1;
      const sortedCabinets = [...zone.cabinets].sort((a, b) => a.fromLeft - b.fromLeft);

      sortedCabinets.forEach((unit, index) => {
        if (unit.isAutoFilled && unit.preset === PresetType.FILLER) return;
        
        const wallPrefix = `W${String(zIdx + 1).padStart(2, '0')}`;
        let typeChar = 'W';
        if (unit.type === CabinetType.BASE) typeChar = 'B';
        else if (unit.type === CabinetType.TALL) typeChar = 'T';
        else if (unit.type === CabinetType.WALL_TOP) typeChar = 'U';
        
        const seq = typeChar === 'B' ? bIdx++ : typeChar === 'W' ? wIdx++ : typeChar === 'U' ? uIdx++ : tIdx++;
        const effectiveLabel = `${wallPrefix}${typeChar}${String(seq).padStart(2, '0')}`;
        
        const parts = generateCabinetParts({ ...unit, label: effectiveLabel }, project.settings, index);
        allParts.push(...parts.filter(p => !p.isHardware));
      });
    });

  // Merge contiguous WALL_TOP separators into full-length pieces for easier CNC
  const wallTopSep = project.settings.wallTopSeparatorThickness ?? (project.settings.enableTopRow ? (project.settings.doorMaterialThickness || 18) : 0);
  if (wallTopSep > 0) {
    const sepDepth = (project.settings.depthTall || 600) + (project.settings.doorMaterialThickness || 18);
    const doorMat = project.settings.materialSettings?.doorMaterial || 'Face';
    project.zones.filter(z => z.active).forEach((zone, zIdx) => {
      const wallTops = zone.cabinets
        .filter(c => c.type === CabinetType.WALL_TOP)
        .sort((a, b) => a.fromLeft - b.fromLeft);

      if (wallTops.length === 0) return;

      const wallPrefix = `W${String(zIdx + 1).padStart(2, '0')}`;
      let merged = {
        fromLeft: wallTops[0].fromLeft,
        right: wallTops[0].fromLeft + wallTops[0].width,
        cabLabels: [`${wallPrefix}U${String(1).padStart(2, '0')}`]
      };
      let uSepIdx = 1;
      for (let i = 1; i < wallTops.length; i++) {
        const next = wallTops[i];
        const nextLabel = `${wallPrefix}U${String(++uSepIdx).padStart(2, '0')}`;
        if (next.fromLeft <= merged.right + 2) {
          merged.right = Math.max(merged.right, next.fromLeft + next.width);
          merged.cabLabels.push(nextLabel);
        } else {
          const pieceWidth = merged.right - merged.fromLeft;
          const label = merged.cabLabels.join(',');
          allParts.push({
            id: uuid(),
            name: 'Wall Top Separator',
            qty: 1,
            width: pieceWidth,
            length: sepDepth,
            material: doorMat,
            category: 'door',
            label,
            cabinetLabel: label,
          });
          merged = { fromLeft: next.fromLeft, right: next.fromLeft + next.width, cabLabels: [nextLabel] };
        }
      }
      const pieceWidth = merged.right - merged.fromLeft;
      const label = merged.cabLabels.join(',');
      allParts.push({
        id: uuid(),
        name: 'Wall Top Separator',
        qty: 1,
        width: pieceWidth,
        length: sepDepth,
        material: doorMat,
        category: 'door',
        label,
        cabinetLabel: label,
      });
    });
  }

  // Group parts by material
  const materialGroups = allParts.reduce((acc, part) => {
    const material = part.material;
    if (!acc[material]) {
      acc[material] = [];
    }
    acc[material].push(part);
    return acc;
  }, {} as Record<string, BOMItem[]>);

  // Calculate requirements for each material
  const breakdowns: MaterialBreakdown[] = Object.entries(materialGroups).map(
    ([materialName, parts]) => {
      const totalArea = parts.reduce(
        (sum, p) => sum + (p.width * p.length * p.qty) / 1000000,
        0
      );

      // Estimate sheets needed using material-specific size
      const matched = sheetTypes.find(st => 
        materialName.toLowerCase().includes(st.name.toLowerCase()) || 
        st.name.toLowerCase().includes(materialName.toLowerCase())
      );
      const sheetWidth = matched?.width || 1220;
      const sheetLength = matched?.length || 2440;
      const sheetArea = (sheetWidth * sheetLength) / 1000000;
      const estimatedSheets = Math.ceil(totalArea / (sheetArea * 0.85)); // 85% efficiency

      // Get thickness from first part or default
      const thickness = parts[0]?.material?.match(/(\d+)mm/)?.[1]
        ? parseInt(parts[0].material.match(/(\d+)mm/)![1])
        : project.settings.thickness;

      // Calculate cost
      const pricePerSheet = project.settings.costs?.pricePerSheet || 85;
      const cost = estimatedSheets * pricePerSheet;

      return {
        materialName,
        thickness,
        parts,
        totalArea: parseFloat(totalArea.toFixed(2)),
        estimatedSheets,
        cost: parseFloat(cost.toFixed(2))
      };
    }
  );

  // Sort by material name
  return breakdowns.sort((a, b) => a.materialName.localeCompare(b.materialName));
};

export interface CostBreakdown {
  materialCost: number;
  hardwareCost: number;
  laborCost: number;
  transportCost: number;
  otherCost: number;
  subtotal: number;
  margin: number;
  totalPrice: number;
}

export const calculateProjectCost = (
  bomData: ReturnType<typeof generateProjectBOM>,
  nestingData: OptimizationResult,
  settings: ProjectSettings,
  calculatedHardwareCost?: number,
  sheetTypes: SheetType[] = []
): CostBreakdown => {
  const { costs } = settings;

  // Helper to find price for a material
  const findSheetPrice = (materialName: string): number => {
    // 1. Try project-specific sheetSpecs snapshot first
    if (settings.materialSettings?.sheetSpecs?.[materialName]) {
      const spec = settings.materialSettings.sheetSpecs[materialName];
      if (spec.pricePerSheet > 0) return spec.pricePerSheet;
    }

    // 2. Fallback to global sheetTypes list if provided
    const matched = sheetTypes.find(st =>
      materialName.toLowerCase().includes(st.name.toLowerCase()) ||
      st.name.toLowerCase().includes(materialName.toLowerCase())
    );
    if (matched && matched.price_per_sheet > 0) {
      return matched.price_per_sheet;
    }

    // 3. Final fallback to project-wide default
    return costs.pricePerSheet;
  };

  // 1. Material (Sheets) - Calculate per material type using individual prices
  const materialCostMap: Record<string, number> = {};
  nestingData.sheets.forEach(sheet => {
    if (!materialCostMap[sheet.material]) {
      materialCostMap[sheet.material] = 0;
    }
    materialCostMap[sheet.material] += findSheetPrice(sheet.material);
  });
  const materialCost = Object.values(materialCostMap).reduce((sum, price) => sum + price, 0);

  // 2. Hardware - Prioritize individual item prices from expenses snapshot
  let hardwareCost = 0;
  if (calculatedHardwareCost !== undefined) {
    hardwareCost = calculatedHardwareCost;
  } else {
    // Look up prices for each hardware type in the summary
    Object.entries(bomData.hardwareSummary).forEach(([name, qty]) => {
      // 1. Try project-specific hardwareSpecs snapshot
      const spec = settings.materialSettings?.hardwareSpecs?.[name];
      if (spec && spec.price > 0) {
        hardwareCost += (spec.price * qty);
      } else {
        // 2. Fallback to costs.expenses (for legacy projects or manual overrides)
        const expenseItem = costs.expenses?.find(e => e.name.toLowerCase() === name.toLowerCase());
        if (expenseItem) {
          hardwareCost += (expenseItem.amount * qty);
        } else {
          // 3. Final fallback to flat rate per unit
          hardwareCost += (qty * (costs.pricePerHardwareUnit || 0));
        }
      }
    });
  }

  // 3. Additional Expenses (Labor, Transport + Custom)
  let laborCost = 0;
  let transportCost = 0;
  let otherCost = 0;

  if (costs.expenses && costs.expenses.length > 0) {
    costs.expenses.forEach(exp => {
      const name = exp.name.toLowerCase();
      if (name.includes('labor') || name.includes('labour')) {
        laborCost += exp.amount;
      } else if (name.includes('transport') || name.includes('logistics')) {
        transportCost += exp.amount;
      } else {
        otherCost += exp.amount;
      }
    });
  } else {
    laborCost = costs.laborCost || 0;
    transportCost = costs.transportCost || 0;
  }

  const subtotal = materialCost + hardwareCost + laborCost + transportCost + otherCost;
  const margin = subtotal * (costs.marginPercent / 100);

  return {
    materialCost,
    hardwareCost,
    laborCost,
    transportCost,
    otherCost,
    subtotal,
    margin,
    totalPrice: subtotal + margin
  };
};

/**
 * Snapshots global material and hardware prices into a project's local settings.
 * This ensures that project-specific overrides are preserved and projects aren't
 * affected by future global price changes.
 */
export const snapshotGlobalLayer = (
  project: Project, 
  globalSheets: SheetType[], 
  globalHardware: any[]
): Project => {
  const updatedProject = { ...project };
  const sheetSpecs: Record<string, any> = { ...project.settings.materialSettings?.sheetSpecs };

  // 1. Snapshot Sheet Prices
  globalSheets.forEach(sheet => {
    sheetSpecs[sheet.name] = {
      width: sheet.width || 1220,
      length: sheet.length || 2440,
      thickness: sheet.thickness,
      pricePerSheet: sheet.price_per_sheet
    };
  });

  // 2. Snapshot Hardware Prices
  const hardwareSpecs: Record<string, { price: number }> = { ...project.settings.materialSettings?.hardwareSpecs };
  globalHardware.forEach(hw => {
    hardwareSpecs[hw.name] = {
      price: hw.default_amount || 0
    };
  });

  updatedProject.settings = {
    ...project.settings,
    materialSettings: {
      ...project.settings.materialSettings!,
      sheetSpecs,
      hardwareSpecs
    }
  };

  return updatedProject;
};

/**
 * Ensures all required project settings exist, merging with defaults if necessary.
 * This prevents crashes when loading older projects with missing configuration fields.
 */
export const ensureProjectSettings = (project: Project): Project => {
  const defaults = createNewProject();

  return {
    ...project,
    settings: {
      ...defaults.settings,
      ...project.settings,
      // Migration: Snap old 2100mm default to new 2080mm aligned standard
      tallHeight: project.settings?.tallHeight === 2100 ? 2080 : (project.settings?.tallHeight || defaults.settings.tallHeight),
      costs: {
        ...defaults.settings.costs,
        ...(project.settings?.costs || {})
      },
      materialSettings: {
        ...defaults.settings.materialSettings,
        ...(project.settings?.materialSettings || {})
      },
      workflowMode: project.settings?.workflowMode || 'traditional'
    },
    zones: (project.zones || []).map(zone => ({
      ...zone,
      cabinets: (zone.cabinets || []).map(cab => ({
        ...cab,
        materials: cab.materials || {}
      }))
    }))
  };
};

export const createNewProject = (logoUrl?: string, currency: string = '$'): Project => ({
  id: uuid(),
  name: '',
  designer: 'Me',
  company: 'My Shop',
  settings: {
    currency: currency,
    logoUrl: logoUrl,
    // Dimensions - Updated to match Ruby CBX defaults
    baseHeight: 870,    // Ruby: 870mm (includes plinth)
    wallHeight: 720,    // Ruby: 720mm
    tallHeight: 2080,  // Ruby: 2080mm (aligned)
    depthBase: 560,    // Ruby: 560mm
    depthWall: 300,    // Ruby: 300mm
    depthTall: 560,    // Ruby: 560mm
    widthBase: 600,   // Default base cabinet width
    widthWall: 600,   // Default wall cabinet width
    widthTall: 450,  // Default tall cabinet width (Ruby standard)
    thickness: 18,     // Ruby: 18mm
    counterThickness: 40,
    toeKickHeight: 100, // Ruby: 100mm plinth
    kerf: 4,
    // Ruby CBX Design Rules - Gap & Clearance Settings
    doorToDoorGap: 2.0,      // Ruby: 2.0mm
    doorToPanelGap: 2.0,     // Ruby: 2.0mm
    drawerToDrawerGap: 2.0,  // Ruby: 2.0mm
    doorOuterGap: 3.0,        // Ruby: 3.0mm
    doorInnerGap: 3.0,        // Ruby: 3.0mm
    doorSideClearance: 3.0,   // Ruby: 3.0mm
    grooveDepth: 5,           // Ruby: 5mm
    backPanelThickness: 6,    // Ruby: 6mm
    doorMaterialThickness: 18, // Ruby: 18mm
    wallCabinetElevation: 450, // Gap from counter top to wall cabinet bottom - default: 450mm
    nailHoleDiameter: 3,
    nailHoleDepth: 10,
    shelfHoleDiameter: 5,
    nailHoleShelfDistance: 20,
    golaLCutoutHeight: 55,
    golaLCutoutDepth: 20,
    golaCCutoutHeight: 73.5,
    golaCutoutDepth: 20,
    drawerBackClearance: 20,
    costs: {
      pricePerSheet: 0.00,
      pricePerHardwareUnit: 0.00,
      laborCost: 0,
      marginPercent: 65,
      transportCost: 0
    },
    materialSettings: {
      carcassMaterial: 'Shutter',
      doorMaterial: 'Face',
      drawerMaterial: 'Shutter',
      backMaterial: 'MDF 6mm',
      shelfMaterial: 'Plywood',
      backsplashMaterial: 'White Tile',
      sheetSpecs: {}
    },
    quotationApprovedDate: undefined,
    layoutPreferences: {
      includeTall: true,
      includeDrawers: true,
      includeSink: true,
      includeCooker: true
    },
    workflowMode: 'traditional',
    progress: {
      dxfDownloaded: false,
      excelDownloaded: false,
      reportViewed: false,
      quotationGenerated: false
    }
  },
  zones: [
    { id: 'Wall A', active: true, totalLength: 0, wallHeight: 2400, obstacles: [], cabinets: [] }
  ]
});

// EXCEL (XML Spreadsheet) EXPORT
export const exportToExcel = (groups: BOMGroup[], nestingData: OptimizationResult, project: Project, bomData?: any, accessories: any[] = [], sheetTypes: any[] = []) => {
  const timestamp = new Date().toISOString().slice(0, 10);

  // 1. Prepare Data for Sheets

  // Sheet 1: Parts List
  let partsRows = '';
  groups.forEach(group => {
    group.items.forEach(item => {
      partsRows += `
      <Row>
        <Cell><Data ss:Type="String">${group.cabinetName}</Data></Cell>
        <Cell><Data ss:Type="String">${item.name}</Data></Cell>
        <Cell><Data ss:Type="String">${item.material}</Data></Cell>
        <Cell><Data ss:Type="Number">${item.length}</Data></Cell>
        <Cell><Data ss:Type="Number">${item.width}</Data></Cell>
        <Cell><Data ss:Type="Number">${item.qty}</Data></Cell>
        <Cell><Data ss:Type="String">${item.label || ''}</Data></Cell>
      </Row>`;
    });
  });

  // Sheet 2: Material BOM (Sheets Count)
  const materialCounts: Record<string, { sheets: number, wasteSum: number, count: number, width: number, length: number }> = {};

    nestingData.sheets.forEach(sheet => {
    if (!materialCounts[sheet.material]) {
      materialCounts[sheet.material] = { 
        sheets: 0, 
        wasteSum: 0, 
        count: 0, 
        width: sheet.width || 1220, 
        length: sheet.length || 2440 
      };
    }
    materialCounts[sheet.material].sheets += 1;
    materialCounts[sheet.material].wasteSum += sheet.waste;
    materialCounts[sheet.material].count += 1;
  });

  // 2. Prepare Sheet Materials Report Rows
  let sheetReportRows = '';
  let totalSheetCost = 0;
  let rowIdx = 1;

  Object.keys(materialCounts).forEach(mat => {
    const data = materialCounts[mat];
    const findSheetPrice = (materialName: string): number => {
      const matched = sheetTypes.find(st =>
        materialName.toLowerCase().includes(st.name.toLowerCase()) ||
        st.name.toLowerCase().includes(materialName.toLowerCase())
      );
      return matched?.price_per_sheet || project.settings.costs.pricePerSheet || 85.00;
    };

    const unitPrice = findSheetPrice(mat);
    const lineCost = data.sheets * unitPrice;
    totalSheetCost += lineCost;

    const isEven = rowIdx % 2 === 0;
    const rowStyle = isEven ? ' ss:StyleID="EvenRow"' : '';
    const currStyle = isEven ? 'ss:StyleID="EvenCurrency"' : 'ss:StyleID="Currency"';
    const numStyle = isEven ? 'ss:StyleID="EvenLeftAlign"' : 'ss:StyleID="LeftAlign"';

    sheetReportRows += `
    <Row>
      <Cell ${numStyle}><Data ss:Type="Number">${rowIdx++}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String">${mat}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String">Color ${mat} - ${data.length}x${data.width}</Data></Cell>
      <Cell ${numStyle}><Data ss:Type="Number">${data.sheets}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String">Sheet</Data></Cell>
      <Cell ${currStyle}><Data ss:Type="Number">${unitPrice}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="Number">1</Data></Cell>
      <Cell ${currStyle}><Data ss:Type="Number">${lineCost}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String"></Data></Cell>
    </Row>`;
  });

  // 3. Prepare Other Costs Report Rows
  let otherReportRows = '';
  let totalOtherCost = 0;
  let oRowIdx = 1;

  const hwSummary: Record<string, number> = bomData?.hardwareSummary || {};
  const findPrice = (name: string, def: number) => {
    const acc = accessories.find(a => 
      a.name.toLowerCase() === name.toLowerCase() || 
      a.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(a.name.toLowerCase())
    );
    return acc?.default_amount || def;
  };

    const tileAcc = accessories.find(a => a.name.toLowerCase().includes('tile'));
    const tWidth = tileAcc?.width || 600;
    const tLength = tileAcc?.length || 600;
    const tUnit = tileAcc?.unit || 'mm2';
    const totalTileAreaMm2 = bomData?.totalTileAreaMm2 || 0;
    
    let tQty = 0;
    if (tUnit === 'sqft') {
      const tileAreaSqft = tWidth * tLength; // Dimensions are in FEET
      const totalAreaSqft = totalTileAreaMm2 / 92903.04;
      tQty = tileAreaSqft > 0 ? Math.ceil(totalAreaSqft / tileAreaSqft) : 0;
    } else {
      const singleTileAreaMm2 = tWidth * tLength;
      tQty = singleTileAreaMm2 > 0 ? Math.ceil(totalTileAreaMm2 / singleTileAreaMm2) : 0;
    }
    const tPrice = tileAcc?.default_amount || 0;
    const defaultPrice = project.settings.costs.pricePerHardwareUnit;

    const itemsToReport = [
      { name: 'Soft-Close Hinges', qty: hwSummary['Soft-Close Hinge'] || 0, price: findPrice('hinge', defaultPrice), unit: 'Unit' },
      { name: 'Handle/Knob Set', qty: hwSummary['Handle/Knob'] || 0, price: findPrice('handle', defaultPrice), unit: 'Unit' },
      { name: 'Drawer Slides (Pairs)', qty: hwSummary[HW.SLIDE] || 0, price: findPrice('slide', defaultPrice), unit: 'Pair' },
      { name: 'Granite Countertop (Sqft)', qty: bomData?.totalGraniteSqft || 0, price: findPrice('granite', 3000), unit: 'Sqft' },
      { name: 'Tile Backsplash', qty: tQty, price: tPrice, unit: 'Pcs' },
      { name: 'Adjustable Legs', qty: hwSummary[HW.LEG] || 0, price: findPrice('leg', 350), unit: 'Unit' }
    ];

  // Add remaining hardware (Cam-Locks, etc.)
  Object.entries(hwSummary).forEach(([name, qty]) => {
    const lower = name.toLowerCase();
    if (!lower.includes('hinge') && !lower.includes('handle') && !lower.includes('slide') && !lower.includes('leg')) {
      itemsToReport.push({ name, qty, price: findPrice(name, defaultPrice), unit: 'Unit' });
    }
  });

  itemsToReport.forEach(item => {
    if (item.qty <= 0) return;
    const lineAmount = item.qty * item.price;
    totalOtherCost += lineAmount;
    
    const isEven = oRowIdx % 2 === 0;
    const rowStyle = isEven ? ' ss:StyleID="EvenRow"' : '';
    const currStyle = isEven ? 'ss:StyleID="EvenCurrency"' : 'ss:StyleID="Currency"';
    const numStyle = isEven ? 'ss:StyleID="EvenLeftAlign"' : 'ss:StyleID="LeftAlign"';

    otherReportRows += `
    <Row>
      <Cell ${numStyle}><Data ss:Type="Number">${oRowIdx++}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String">${item.name}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String"></Data></Cell>
      <Cell ${numStyle}><Data ss:Type="Number">${item.name.includes('Sqft') ? item.qty.toFixed(2) : item.qty}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String">${item.unit}</Data></Cell>
      <Cell ${currStyle}><Data ss:Type="Number">${item.price}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="Number">1</Data></Cell>
      <Cell ${currStyle}><Data ss:Type="Number">${lineAmount}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String"></Data></Cell>
    </Row>`;
  });

  // 4. Prepare Extra Costs (Labour, Transport, Others)
  let extraCostsRows = '';
  let totalExtraCost = 0;
  let eRowIdx = 1;

  const costSettings = project.settings.costs;
  const expenses = (costSettings.expenses && costSettings.expenses.length > 0) ? costSettings.expenses : [
    { id: 'labor', name: 'Labour', amount: costSettings.laborCost || 0 },
    { id: 'transport', name: 'Transport', amount: costSettings.transportCost || 0 }
  ];

  expenses.forEach(exp => {
    if (exp.amount <= 0) return;
    
    totalExtraCost += exp.amount;
    const isEven = eRowIdx % 2 === 0;
    const rowStyle = isEven ? ' ss:StyleID="EvenRow"' : '';
    const currStyle = isEven ? 'ss:StyleID="EvenCurrency"' : 'ss:StyleID="Currency"';
    const numStyle = isEven ? 'ss:StyleID="EvenLeftAlign"' : 'ss:StyleID="LeftAlign"';
    
    extraCostsRows += `
    <Row>
      <Cell ${numStyle}><Data ss:Type="Number">${eRowIdx++}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String">${exp.name}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String">Project Expense</Data></Cell>
      <Cell ${numStyle}><Data ss:Type="Number">1</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String">Project</Data></Cell>
      <Cell ${currStyle}><Data ss:Type="Number">${exp.amount}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="Number">1</Data></Cell>
      <Cell ${currStyle}><Data ss:Type="Number">${exp.amount}</Data></Cell>
      <Cell ${rowStyle}><Data ss:Type="String"></Data></Cell>
    </Row>`;
  });

  // 5. GENERATE XML
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>${project.company}</Author>
  <Created>${timestamp}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#0D9488"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Vertical="Center" ss:Horizontal="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0D9488" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="SectionHeader">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F766E"/>
   <Interior ss:Color="#CCFBF1" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="Total">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0D9488" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="SectionTotal">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F766E"/>
   <Interior ss:Color="#CCFBF1" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="EvenRow">
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="EvenCurrency">
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="LeftAlign">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="EvenLeftAlign">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
 </Styles>

 <Worksheet ss:Name="BOM Report">
  <Table ss:ExpandedColumnCount="9">
   <Column ss:Width="30"/>
   <Column ss:Width="150"/>
   <Column ss:Width="200"/>
   <Column ss:Width="60"/>
   <Column ss:Width="50"/>
   <Column ss:Width="80"/>
   <Column ss:Width="50"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>

   <!-- Company Info Header -->
   <Row ss:Height="30">
    <Cell ss:MergeAcross="2"><Data ss:Type="String">${project.company}</Data></Cell>
    <Cell ss:Index="4" ss:MergeAcross="2"><Data ss:Type="String">COST ESTIMATE</Data></Cell>
    <Cell ss:Index="8" ss:MergeAcross="1"><Data ss:Type="String">Order Code: ${project.id.slice(0, 8)}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:Index="4" ss:MergeAcross="2"><Data ss:Type="String">Customer: ${project.name}</Data></Cell>
    <Cell ss:Index="8" ss:MergeAcross="1"><Data ss:Type="String">Date: ${timestamp}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:Index="4" ss:MergeAcross="2"><Data ss:Type="String">Address: ${project.customerAddress || '-'}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:Index="4" ss:MergeAcross="2"><Data ss:Type="String">Phone: ${project.customerPhone || '-'}</Data></Cell>
   </Row>
   <Row ss:Height="10"/>

   <!-- Main Header -->
   <Row ss:Height="20">
    <Cell ss:StyleID="Header"><Data ss:Type="String">No.</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Type</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Description</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Quantity</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Unit</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Unit Price</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Factor</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Amount</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Total Amount</Data></Cell>
   </Row>

   <!-- SHEET SECTION -->
   <Row>
    <Cell ss:MergeAcross="7" ss:StyleID="SectionHeader"><Data ss:Type="String">SHEET</Data></Cell>
    <Cell ss:StyleID="SectionTotal"><Data ss:Type="Number">${totalSheetCost}</Data></Cell>
   </Row>
   ${sheetReportRows}

   <!-- OTHER COSTS SECTION -->
   <Row>
     <Cell ss:MergeAcross="7" ss:StyleID="SectionHeader"><Data ss:Type="String">HARDWARE &amp; ACCESSORIES</Data></Cell>
     <Cell ss:StyleID="SectionTotal"><Data ss:Type="Number">${totalOtherCost}</Data></Cell>
   </Row>
   ${otherReportRows}

   <!-- OTHER COSTS SECTION -->
   <Row>
     <Cell ss:MergeAcross="7" ss:StyleID="SectionHeader"><Data ss:Type="String">OTHER COSTS</Data></Cell>
     <Cell ss:StyleID="SectionTotal"><Data ss:Type="Number">${totalExtraCost}</Data></Cell>
   </Row>
   ${extraCostsRows}

   <!-- TOTAL COST SECTION -->
   <Row ss:Height="25">
    <Cell ss:MergeAcross="7" ss:StyleID="Total"><Data ss:Type="String">TOTAL COST</Data></Cell>
    <Cell ss:StyleID="Total"><Data ss:Type="Number">${totalSheetCost + totalOtherCost + totalExtraCost}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <Worksheet ss:Name="Parts List">
  <Table>
   <Column ss:Width="150"/>
   <Column ss:Width="150"/>
   <Column ss:Width="120"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="50"/>
   <Column ss:Width="100"/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Cabinet</Data></Cell>
    <Cell><Data ss:Type="String">Part Name</Data></Cell>
    <Cell><Data ss:Type="String">Material</Data></Cell>
    <Cell><Data ss:Type="String">Length</Data></Cell>
    <Cell><Data ss:Type="String">Width</Data></Cell>
    <Cell><Data ss:Type="String">Qty</Data></Cell>
    <Cell><Data ss:Type="String">Label</Data></Cell>
   </Row>
   ${partsRows}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_bom.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * EXPORT CONSTRUCTION JSON
 * Maps project data to the specialized construction schema (Meters, 3D structure).
 */
export const buildProjectConstructionData = (project: Project): ConstructionPlanJSON => {
  const mmToM = (val: number) => Number((val / 1000).toFixed(3));

  const data: ConstructionPlanJSON = {
    schemaVersion: "1.0.0",
    project: {
      projectId: project.id,
      name: project.name,
      createdAt: new Date().toISOString().split('T')[0],
      notes: "Auto-generated from CABENGINE Pro Construction Export"
    },
    units: {
      lengthUnit: "m",
      axisConvention: {
        x: "right", y: "up", z: "forward",
        planViewPlane: "XZ",
        elevationUpAxis: "Y"
      }
    },
    site: {
      floorLevelY: 0,
      ceilingHeight: mmToM(2400)
    },
    room: {
      roomId: "kitchen",
      name: "Kitchen",
      floorPolygon: {
        closed: true,
        points: [
          { x: 0, y: 0, z: 0 },
          { x: mmToM(project.zones[0].totalLength), y: 0, z: 0 },
          { x: mmToM(project.zones[0].totalLength), y: 0, z: mmToM(3600) },
          { x: 0, y: 0, z: mmToM(3600) }
        ]
      },
      walls: project.zones.map((zone) => ({
        wallId: zone.id,
        from: { x: 0, y: 0, z: 0 },
        to: { x: mmToM(zone.totalLength), y: 0, z: 0 },
        thickness: mmToM(project.settings.thickness * 10), // Wall thickness vs material 
        height: mmToM(2400),
        openings: zone.obstacles.map(o => ({
          openingId: o.id,
          type: o.type,
          atDistanceFromFromPoint: mmToM(o.fromLeft),
          width: mmToM(o.width),
          height: mmToM(o.height || 2100),
          sillHeight: mmToM(o.sillHeight || 0)
        }))
      }))
    },
    objects: project.zones.flatMap(zone => zone.cabinets.map(unit => {
      let kind = unit.type.toLowerCase();
      if (unit.preset === PresetType.SINK_UNIT) kind = 'sink_base';
      if (unit.preset === PresetType.HOOD_UNIT) kind = 'hood_unit';

      return {
        id: unit.id,
        category: "cabinet",
        wallId: zone.id,
        cabinetKind: kind,
        label: unit.label || unit.preset,
        box: {
          position: {
            x: mmToM(unit.fromLeft),
            y: unit.type === CabinetType.WALL ? mmToM(1400) : 0,
            z: 0
          },
          size: {
            length: mmToM(unit.width),
            height: mmToM(unit.type === CabinetType.WALL ? project.settings.wallHeight : unit.type === CabinetType.TALL ? project.settings.tallHeight : project.settings.baseHeight),
            depth: mmToM(unit.type === CabinetType.WALL ? project.settings.depthWall : unit.type === CabinetType.TALL ? project.settings.depthTall : project.settings.depthBase)
          },
          rotation: { yaw: 0, pitch: 0, roll: 0 },
          origin: "bottom-left-back"
        },
        params: {
          toeKickHeight: mmToM(project.settings.toeKickHeight),
          countertopThickness: mmToM(project.settings.counterThickness)
        },
        fixtures: unit.preset === PresetType.SINK_UNIT ? {
          sink: { type: "unit_bowl", bowlWidth: mmToM(unit.width - 100), bowlDepth: mmToM(400) },
          faucet: { type: "standard" }
        } : undefined
      };
    }))
  };

  return data;
};


