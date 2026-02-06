
import { Project, Zone, CabinetUnit, BOMGroup, BOMItem, CabinetType, PresetType, ProjectSettings } from '../types';

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
  // 1. Keep Manual Cabinets and Obstacles
  const manualCabs = zone.cabinets.filter(c => !c.isAutoFilled);
  const obstacles = zone.obstacles;

  // 2. Build Timeline of Occupied Space
  interface Range { start: number; end: number; }
  const occupied: Range[] = [];

  // Add obstacles
  obstacles.forEach(o => occupied.push({ start: o.fromLeft, end: o.fromLeft + o.width }));
  
  // Add manual cabinets
  manualCabs.forEach(c => occupied.push({ start: c.fromLeft, end: c.fromLeft + c.width }));

  // Sort and Merge Overlapping Ranges
  occupied.sort((a, b) => a.start - b.start);
  
  const merged: Range[] = [];
  if (occupied.length > 0) {
    let current = occupied[0];
    for (let i = 1; i < occupied.length; i++) {
      if (occupied[i].start < current.end) {
        // Overlap, extend current
        current.end = Math.max(current.end, occupied[i].end);
      } else {
        // No overlap, push current and start new
        merged.push(current);
        current = occupied[i];
      }
    }
    merged.push(current);
  }

  // 3. Fill Gaps
  const newCabinetList: CabinetUnit[] = [...manualCabs];
  let cursor = 0;

  const fillRange = (start: number, end: number) => {
    let remaining = end - start;
    let currentX = start;

    if (remaining < 300) {
      if (remaining > 50) { // Only fill if gap is usable > 50mm
        newCabinetList.push({ 
          id: uuid(), preset: PresetType.FILLER, type: CabinetType.BASE, 
          width: remaining, qty: 1, isAutoFilled: true, fromLeft: currentX 
        });
      }
      return;
    }

    while (remaining >= 300) {
      const width = STD_WIDTHS.find(w => w <= remaining) || remaining;
      
      if (width >= 300) {
        // Base
        newCabinetList.push({ 
          id: uuid(), preset: PresetType.BASE_DOOR, type: CabinetType.BASE, 
          width: width, qty: 1, isAutoFilled: true, fromLeft: currentX 
        });
        
        // Wall
        newCabinetList.push({ 
          id: uuid(), preset: PresetType.WALL_STD, type: CabinetType.WALL, 
          width: width, qty: 1, isAutoFilled: true, fromLeft: currentX 
        });

        remaining -= width;
        currentX += width;
      } else {
        newCabinetList.push({ 
          id: uuid(), preset: PresetType.FILLER, type: CabinetType.BASE, 
          width: remaining, qty: 1, isAutoFilled: true, fromLeft: currentX 
        });
        remaining = 0;
      }
    }
  };

  merged.forEach(range => {
    if (range.start > cursor) {
      fillRange(cursor, range.start);
    }
    cursor = Math.max(cursor, range.end);
  });

  if (cursor < zone.totalLength) {
    fillRange(cursor, zone.totalLength);
  }

  return {
    ...zone,
    cabinets: newCabinetList.sort((a, b) => a.fromLeft - b.fromLeft)
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

  if (unit.preset === PresetType.BASE_DOOR) {
    parts.push({
      id: uuid(), name: 'Shelf', qty: 1, width: depth - 20, length: horizWidth, 
      material: `${thickness}mm White`, label: labelPrefix
    });
    parts.push({ id: uuid(), name: HW.HINGE, qty: unit.width > 400 ? 4 : 2, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANDLE, qty: unit.width > 400 ? 2 : 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.LEG, qty: 4, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }

  if (unit.preset === PresetType.BASE_DRAWER_3) {
    parts.push({ id: uuid(), name: 'Drawer Bottom', qty: 3, width: depth - 50, length: horizWidth - 26, material: '16mm White', label: labelPrefix });
    parts.push({ id: uuid(), name: 'Drawer Side', qty: 6, width: depth - 10, length: 150, material: '16mm White', label: labelPrefix });
    parts.push({ id: uuid(), name: HW.SLIDE, qty: 3, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANDLE, qty: 3, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.LEG, qty: 4, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }

  if (unit.preset === PresetType.WALL_STD) {
    parts.push({
      id: uuid(), name: 'Shelf', qty: 2, width: depth - 20, length: horizWidth, 
      material: `${thickness}mm White`, label: labelPrefix
    });
    parts.push({ id: uuid(), name: HW.HINGE, qty: unit.width > 400 ? 4 : 2, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANDLE, qty: unit.width > 400 ? 2 : 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANGER, qty: 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }
  
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

export const generateProjectBOM = (project: Project): { groups: BOMGroup[], hardwareSummary: Record<string, number>, totalArea: number, totalLinearFeet: number } => {
  const groups: BOMGroup[] = [];
  const hardwareSummary: Record<string, number> = {};
  let totalArea = 0;
  let totalLinearFeet = 0;

  project.zones.filter(z => z.active).forEach(zone => {
    let zoneLen = 0;
    
    zone.cabinets.forEach((unit, index) => {
      if (unit.type !== CabinetType.WALL) {
        zoneLen += unit.width;
      }

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
    
    totalLinearFeet += (zoneLen / 304.8); 
  });

  return {
    groups,
    hardwareSummary,
    totalArea: parseFloat(totalArea.toFixed(2)),
    totalLinearFeet: parseFloat(totalLinearFeet.toFixed(1))
  };
};

export const createNewProject = (): Project => ({
  id: uuid(),
  name: 'New Kitchen',
  designer: 'Me',
  company: 'My Shop',
  settings: {
    baseHeight: 720,
    wallHeight: 720,
    tallHeight: 2100,
    depthBase: 560,
    depthWall: 320,
    depthTall: 580,
    thickness: 16,
    sheetWidth: 1220,
    sheetLength: 2440,
    kerf: 4
  },
  zones: [
    { id: 'Wall A', active: true, totalLength: 3000, obstacles: [], cabinets: [] }
  ]
});

export const exportToCSV = (groups: BOMGroup[], project: Project) => {
  const headers = ['Cabinet', 'Part Name', 'Material', 'Length (mm)', 'Width (mm)', 'Qty', 'Label'];
  const rows = [headers.join(',')];

  groups.forEach(group => {
    group.items.forEach(item => {
      // Escape quotes in strings
      const safeName = item.name.replace(/"/g, '""');
      const safeMat = item.material.replace(/"/g, '""');
      const safeLabel = (item.label || '').replace(/"/g, '""');
      
      rows.push([
        `"${group.cabinetName}"`,
        `"${safeName}"`,
        `"${safeMat}"`,
        item.length,
        item.width,
        item.qty,
        `"${safeLabel}"`
      ].join(','));
    });
  });

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_bom.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
