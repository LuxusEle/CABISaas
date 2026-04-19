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
      placeUnit(zone, { 
        id: uuid(), 
        preset: PresetType.TALL_UTILITY, 
        type: CabinetType.TALL, 
        width: tallWidth, 
        qty: 1, 
        fromLeft: 0, 
        isAutoFilled: true, 
        label: 'TALL' 
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
        label: 'TALL' 
      });
      tallPlaced = true;
    }
  }

  // 3.2 Sink Unit (Centered under windows)
  for (const zone of zones) {
    if (sinkPlaced) break;
    const window = zone.obstacles.find(o => o.type === 'window');
    if (window) {
      const sinkWidth = 900;
      const x = Math.max(0, window.fromLeft + (window.width - sinkWidth) / 2);
      if (canPlace(zone, x, sinkWidth, CabinetType.BASE, settings)) {
        placeUnit(zone, { id: uuid(), preset: PresetType.SINK_UNIT, type: CabinetType.BASE, width: sinkWidth, qty: 1, fromLeft: x, isAutoFilled: true, label: 'SINK' });
        sinkPlaced = true;
      }
    }
  }

  // 3.3 Cooker Unit
  for (const zone of zones) {
    if (cookerPlaced) break;
    const cookerWidth = 900;
    const gaps = findGaps(zone, CabinetType.BASE, settings);
    for (const gap of gaps) {
      if (gap.length >= cookerWidth) {
        const x = gap.start + (gap.length - cookerWidth) / 2;
        placeUnit(zone, { id: uuid(), preset: PresetType.BASE_DRAWER_3, type: CabinetType.BASE, width: cookerWidth, qty: 1, fromLeft: x, isAutoFilled: true, label: 'COOK' });
        if (canPlace(zone, x, cookerWidth, CabinetType.WALL, settings)) {
          placeUnit(zone, { id: uuid(), preset: PresetType.HOOD_UNIT, type: CabinetType.WALL, width: cookerWidth, qty: 1, fromLeft: x, isAutoFilled: true, label: 'HOOD' });
        }
        cookerPlaced = true;
        break;
      }
    }
  }

  // 4. Fill Remaining Space
  for (const zone of zones) {
    fillRemaining(zone, CabinetType.BASE, settings);
    fillRemaining(zone, CabinetType.WALL, settings);
    absorbRemainder(zone, settings); // Ruby Rule: Absorb small gaps into corners
    zone.cabinets.sort((a,b) => a.fromLeft - b.fromLeft);
  }

  return { project: newProject, warnings };
};

// --- Ruby Design Rules Constants ---
const STANDARD_WIDTHS = [900, 600, 450, 300, 250];
const BASE_CORNER_WIDTH = 1050;
const WALL_CORNER_WIDTH = 750;
const BASE_CORNER_OFFSET = 625;
const MIN_FILL_WIDTH = 250;

// --- Helper Functions ---

function injectCorners(current: Zone, next: Zone, settings: ProjectSettings) {
  const depth = settings.depthBase;
  const wDepth = settings.depthWall;
  
  // Base Corner
  current.cabinets.push({
    id: uuid(), 
    preset: PresetType.BASE_CORNER, 
    type: CabinetType.BASE, 
    width: BASE_CORNER_WIDTH, 
    qty: 1, 
    fromLeft: current.totalLength - BASE_CORNER_WIDTH, 
    isAutoFilled: true, 
    label: 'BC',
    advancedSettings: { 
      blindPanelWidth: BASE_CORNER_OFFSET, 
      blindCornerSide: 'right', 
      cabinetType: 'corner' 
    }
  });
  
  // Base Offset for next wall
  next.obstacles.push({ 
    id: 'corner_base_offset', 
    type: 'column', 
    fromLeft: 0, 
    width: BASE_CORNER_OFFSET, 
    height: settings.baseHeight + (settings.toeKickHeight || 100), 
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
    label: 'WC',
    advancedSettings: { 
      blindPanelWidth: wallCornerOffset, 
      blindCornerSide: 'right', 
      cabinetType: 'wall_corner' 
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
    while (remainingLength >= MIN_FILL_WIDTH) {
      const width = STANDARD_WIDTHS.find(w => w <= remainingLength);
      if (width) {
        placeUnit(zone, { 
          id: uuid(), 
          preset, 
          type, 
          width: width, 
          qty: 1, 
          fromLeft: currentX, 
          isAutoFilled: true, 
          label: `${type.charAt(0)}${zone.cabinets.length + 1}` 
        });
        currentX += width;
        remainingLength -= width;
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
          
          // Priority 3: Any Cabinet (Final resort)
          if (!target) {
            target = findAdjacent(zone, type, gap, () => true);
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
