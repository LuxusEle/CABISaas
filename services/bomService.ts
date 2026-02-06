import { Project, Zone, CabinetUnit, BOMGroup, BOMItem, CabinetType, PresetType, ProjectSettings, ZoneId } from '../types';

// Helper to generate unique IDs
const uuid = () => Math.random().toString(36).substr(2, 9);

// Hardware Constants
const HW = {
  HINGE: 'Soft-Close Hinge',
  SLIDE: 'Drawer Slide (Pair)',
  LEG: 'Adjustable Leg',
  HANDLE: 'Handle/Knob',
  HANGER: 'Wall Hanger (Pair)'
};

// Standard widths to try for auto-fill
const STD_WIDTHS = [900, 600, 500, 450, 400, 300];

export const autoFillZone = (zone: Zone): Zone => {
  // 1. Sort obstacles
  const sortedObs = [...zone.obstacles].sort((a, b) => a.fromLeft - b.fromLeft);
  
  // 2. Calculate existing cabinet usage (linear assumption for now - user adds cabs, they flow L->R)
  // This is tricky without explicit X positions. 
  // STRATEGY: We will clear existing auto-filled cabs and re-calculate filling for the GAPS.
  
  const manualCabs = zone.cabinets.filter(c => !c.isAutoFilled);
  const newCabinets = [...manualCabs];

  // Logic: "Fill the remainder". 
  // We need to know where the manual cabinets *are*. 
  // If the user hasn't positioned them, we assume manual cabinets come first? 
  // OR, we just fill the END of the wall.
  // Let's assume Manual Cabinets take up space sequentially, skipping obstacles.
  
  let currentCursor = 0;
  
  // Advance cursor past manual cabinets + obstacles
  // Note: This is a simplification. A real solver would need drag-and-drop.
  // For this MVP, "Auto Fill" just adds cabinets to fill the *remaining* length of the wall 
  // assuming all current items are packed to the left.
  
  // Calculate total used width (taking max of obstacle overlap into account is hard purely numerically)
  // Let's rely on the Gap Finder.
  
  // Define Gaps: 0 -> Length. Subtract Obstacles. Subtract Manual Cabs.
  // This is complex. Let's simplify:
  // Auto-fill simply appends cabinets to the end of the list until total width ~= zone length.
  
  let occupiedWidth = 0;
  zone.cabinets.forEach(c => occupiedWidth += c.width);
  zone.obstacles.forEach(o => occupiedWidth += o.width); // Very rough, assumes no overlap
  
  // Better approach for "Line Draw":
  // We simulate the flow.
  let x = 0;
  // We can't easily interleave without position data. 
  // We will just append cabinets that fit the remaining raw math space.
  
  let remaining = zone.totalLength - occupiedWidth;
  
  // Safety buffer
  if (remaining < 300) return zone; // Too small to fill
  
  const filledCabs: CabinetUnit[] = [];
  
  while (remaining >= 300) {
    // Find best fit
    const width = STD_WIDTHS.find(w => w <= remaining) || remaining;
    
    // Create cab
    if (width >= 300) {
      filledCabs.push({
        id: uuid(),
        preset: PresetType.BASE_DOOR,
        type: CabinetType.BASE,
        width: width,
        qty: 1,
        isAutoFilled: true
      });
      remaining -= width;
    } else {
      // Filler
      filledCabs.push({
        id: uuid(),
        preset: PresetType.FILLER,
        type: CabinetType.BASE,
        width: remaining,
        qty: 1,
        isAutoFilled: true
      });
      remaining = 0;
    }
  }

  return {
    ...zone,
    cabinets: [...manualCabs, ...filledCabs]
  };
};

const generateCabinetParts = (unit: CabinetUnit, settings: ProjectSettings, cabIndex: number): BOMItem[] => {
  const parts: BOMItem[] = [];
  const { thickness } = settings;
  const labelPrefix = `#${cabIndex + 1} ${unit.preset}`;
  
  let height = settings.baseHeight;
  let depth = settings.depthBase;
  
  if (unit.type === CabinetType.WALL) {
    height = settings.wallHeight;
    depth = settings.depthWall;
  } else if (unit.type === CabinetType.TALL) {
    height = settings.tallHeight;
    depth = settings.depthTall;
  }
  
  if (unit.preset === PresetType.FILLER) {
    parts.push({
      id: uuid(), name: 'Filler Panel', qty: 1, width: unit.width, length: height, 
      material: `${thickness}mm White`, label: labelPrefix
    });
    return parts;
  }

  // --- CARCASS LOGIC ---
  
  // Sides
  parts.push({
    id: uuid(), name: 'Side Panel', qty: 2, width: depth, length: height, 
    material: `${thickness}mm White`, label: labelPrefix
  });

  // Bottom
  const horizWidth = unit.width - (2 * thickness);
  parts.push({
    id: uuid(), name: 'Bottom Panel', qty: 1, width: depth, length: horizWidth, 
    material: `${thickness}mm White`, label: labelPrefix
  });

  // Top / Rails
  if (unit.type === CabinetType.BASE) {
    parts.push({
      id: uuid(), name: 'Top Rail', qty: 2, width: 100, length: horizWidth, 
      material: `${thickness}mm White`, label: labelPrefix
    });
  } else {
    parts.push({
      id: uuid(), name: 'Top Panel', qty: 1, width: depth, length: horizWidth, 
      material: `${thickness}mm White`, label: labelPrefix
    });
  }

  // Back (Simplified full overlay)
  parts.push({
    id: uuid(), name: 'Back Panel', qty: 1, width: unit.width - 2, length: height - 2, 
    material: '6mm MDF', label: labelPrefix
  });

  // --- PRESET SPECIFIC LOGIC & HARDWARE ---

  // 1. Base 2-Door
  if (unit.preset === PresetType.BASE_DOOR) {
    parts.push({
      id: uuid(), name: 'Shelf', qty: 1, width: depth - 20, length: horizWidth, 
      material: `${thickness}mm White`, label: labelPrefix
    });
    parts.push({ id: uuid(), name: HW.HINGE, qty: unit.width > 400 ? 4 : 2, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANDLE, qty: unit.width > 400 ? 2 : 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.LEG, qty: 4, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }

  // 2. Base 3-Drawer
  if (unit.preset === PresetType.BASE_DRAWER_3) {
    parts.push({ id: uuid(), name: 'Drawer Bottom', qty: 3, width: depth - 50, length: horizWidth - 26, material: '16mm White', label: labelPrefix });
    parts.push({ id: uuid(), name: 'Drawer Side', qty: 6, width: depth - 10, length: 150, material: '16mm White', label: labelPrefix });
    parts.push({ id: uuid(), name: HW.SLIDE, qty: 3, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANDLE, qty: 3, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.LEG, qty: 4, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }

  // 3. Wall Standard
  if (unit.preset === PresetType.WALL_STD) {
    parts.push({
      id: uuid(), name: 'Shelf', qty: 2, width: depth - 20, length: horizWidth, 
      material: `${thickness}mm White`, label: labelPrefix
    });
    parts.push({ id: uuid(), name: HW.HINGE, qty: unit.width > 400 ? 4 : 2, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANDLE, qty: unit.width > 400 ? 2 : 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANGER, qty: 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }
  
  // 4. Tall Oven/Micro
  if (unit.preset === PresetType.TALL_OVEN) {
    parts.push({
      id: uuid(), name: 'Fixed Shelf (Oven)', qty: 2, width: depth, length: horizWidth, 
      material: `${thickness}mm White`, label: labelPrefix
    });
    parts.push({ id: uuid(), name: HW.LEG, qty: 4, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.SLIDE, qty: 2, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }

  return parts;
};

export const generateProjectBOM = (project: Project): { groups: BOMGroup[], hardwareSummary: Record<string, number>, totalArea: number } => {
  const groups: BOMGroup[] = [];
  const hardwareSummary: Record<string, number> = {};
  let totalArea = 0;

  project.zones.filter(z => z.active).forEach(zone => {
    zone.cabinets.forEach((unit, index) => {
      const parts = generateCabinetParts(unit, project.settings, index);
      
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
        cabinetName: `${zone.id} - #${index + 1} ${unit.preset} (${unit.width}mm)`,
        items: woodParts
      });
    });
  });

  return {
    groups,
    hardwareSummary,
    totalArea: parseFloat(totalArea.toFixed(2))
  };
};

export const createNewProject = (): Project => ({
  id: uuid(),
  name: 'New Project',
  settings: {
    baseHeight: 720,
    wallHeight: 720,
    tallHeight: 2100,
    depthBase: 560,
    depthWall: 320,
    depthTall: 580,
    thickness: 16
  },
  zones: [
    { id: ZoneId.WALL_A, active: true, totalLength: 3000, obstacles: [], cabinets: [] },
    { id: ZoneId.WALL_B, active: false, totalLength: 3000, obstacles: [], cabinets: [] },
    { id: ZoneId.WALL_C, active: false, totalLength: 3000, obstacles: [], cabinets: [] },
    { id: ZoneId.ISLAND, active: false, totalLength: 2400, obstacles: [], cabinets: [] },
  ]
});