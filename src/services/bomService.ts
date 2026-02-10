
import { Project, Zone, CabinetUnit, BOMGroup, BOMItem, CabinetType, PresetType, ProjectSettings, OptimizationResult, Obstacle } from '../types';
import type { ConstructionPlanJSON } from '../types/construction';

// Helper to generate unique IDs
const uuid = () => Math.random().toString(36).substr(2, 9);

// Hardware Constants
const HW = {
  HINGE: 'Soft-Close Hinge',
  SLIDE: 'Drawer Slide (Pair)',
  LEG: 'Adjustable Leg',
  HANDLE: 'Handle/Knob',
  HANGER: 'Wall Hanger (Pair)',
  NAIL: 'Installation Nail'
};

// Nails per hinge
const NAILS_PER_HINGE = 4;

// --- COLLISION LOGIC ---

export const resolveCollisions = (zone: Zone): Zone => {
  const sortedCabs = [...zone.cabinets].sort((a, b) => a.fromLeft - b.fromLeft);

  for (let i = 0; i < sortedCabs.length - 1; i++) {
    const current = sortedCabs[i];
    const next = sortedCabs[i + 1];

    const currentRight = current.fromLeft + current.width;

    if (currentRight > next.fromLeft) {
      next.fromLeft = currentRight;
    }
  }

  return {
    ...zone,
    cabinets: sortedCabs
  };
};

// --- AUTO FILL ---

const STD_WIDTHS = [900, 800, 600, 500, 450, 400, 300];

/**
 * Intelligent Layout Logic (Hafale Principles)
 * 1. Sinks under Windows.
 * 2. Storage -> Wash -> Prep -> Cook flow.
 */
export const autoFillZone = (zone: Zone, settings: ProjectSettings, wallId: string, confirmMoveCustom: boolean = false): Zone => {
  const manualCabs = zone.cabinets.filter(c => !c.isAutoFilled);
  const obstacles = zone.obstacles;
  const totalLength = zone.totalLength;

  // 1. Identify "Hard" Blocks (Cannot have cabinets)
  // Doors and tall columns take up base and wall space.
  const hardBlocks = obstacles.filter(o => o.type === 'door' || o.type === 'column' || (o.type === 'window' && (o.sillHeight || 0) < 300));

  const newCabinets: CabinetUnit[] = [];

  // 2. Intelligent Placement: Sink under Window
  obstacles.filter(o => o.type === 'window' && (o.sillHeight || 0) >= 300).forEach(win => {
    const sinkWidth = 900;
    const sinkLeft = Math.round((win.fromLeft + (win.width - sinkWidth) / 2) / 25) * 25;

    // Ensure it doesn't overlap a hard block or manual cabinet
    const overlaps = hardBlocks.some(b => sinkLeft < b.fromLeft + b.width && sinkLeft + sinkWidth > b.fromLeft) ||
      manualCabs.some(c => sinkLeft < c.fromLeft + c.width && sinkLeft + sinkWidth > c.fromLeft);

    if (!overlaps && sinkLeft >= 0 && sinkLeft + sinkWidth <= totalLength) {
      newCabinets.push({
        id: uuid(), preset: PresetType.SINK_UNIT, type: CabinetType.BASE,
        width: sinkWidth, qty: 1, isAutoFilled: true, fromLeft: sinkLeft
      });
    }
  });

  // 3. Identify Free Spans for Base and Wall units separately
  const getFreeSpans = (isWall: boolean) => {
    const occupied = [...newCabinets, ...manualCabs].filter(c => isWall ? c.type === CabinetType.WALL : c.type === CabinetType.BASE)
      .map(c => ({ start: c.fromLeft, end: c.fromLeft + c.width }));

    // Add Hard Blocks
    hardBlocks.forEach(b => occupied.push({ start: b.fromLeft, end: b.fromLeft + b.width }));

    // Add Windows for Wall units if sill is too low
    if (isWall) {
      obstacles.filter(o => o.type === 'window' && (o.sillHeight || 0) < 2100)
        .forEach(o => occupied.push({ start: o.fromLeft, end: o.fromLeft + o.width }));
    }

    occupied.sort((a, b) => a.start - b.start);
    const merged: { start: number, end: number }[] = [];
    if (occupied.length > 0) {
      let cur = { ...occupied[0] };
      for (let i = 1; i < occupied.length; i++) {
        if (occupied[i].start < cur.end) cur.end = Math.max(cur.end, occupied[i].end);
        else { merged.push(cur); cur = { ...occupied[i] }; }
      }
      merged.push(cur);
    }

    const free: { start: number, end: number }[] = [];
    let curX = 0;
    merged.forEach(m => {
      if (m.start > curX) free.push({ start: curX, end: m.start });
      curX = Math.max(curX, m.end);
    });
    if (curX < totalLength) free.push({ start: curX, end: totalLength });
    return free;
  };

  const baseSpans = getFreeSpans(false);
  const wallSpans = getFreeSpans(true);

  // 4. Fill Base Spans
  baseSpans.forEach(span => {
    let R = span.end - span.start;
    let x = span.start;
    while (R >= 300) {
      const w = STD_WIDTHS.find(sw => sw <= R) || 300;
      // Hafale Rule: If we have a drawer unit (900/800), treat it as a potential Cooker spot
      const preset = w >= 800 ? PresetType.BASE_DRAWER_3 : PresetType.BASE_DOOR;
      newCabinets.push({ id: uuid(), preset, type: CabinetType.BASE, width: w, qty: 1, isAutoFilled: true, fromLeft: x });
      R -= w; x += w;
    }
    if (R >= 20) newCabinets.push({ id: uuid(), preset: PresetType.FILLER, type: CabinetType.BASE, width: R, qty: 1, isAutoFilled: true, fromLeft: x });
  });

  // 5. Fill Wall Spans (Matching Base widths where possible)
  wallSpans.forEach(span => {
    let R = span.end - span.start;
    let x = span.start;
    while (R >= 300) {
      const w = STD_WIDTHS.find(sw => sw <= R) || 300;
      // Hafale Rule: If below is a Cooker (Drawer >= 800), this Wall unit is a HOOD_UNIT
      const isOverCooker = newCabinets.some(c => c.type === CabinetType.BASE && c.preset === PresetType.BASE_DRAWER_3 && Math.abs(c.fromLeft - x) < 50);
      const preset = isOverCooker ? PresetType.HOOD_UNIT : PresetType.WALL_STD;

      newCabinets.push({ id: uuid(), preset, type: CabinetType.WALL, width: w, qty: 1, isAutoFilled: true, fromLeft: x });
      R -= w; x += w;
    }
    if (R >= 20) newCabinets.push({ id: uuid(), preset: PresetType.FILLER, type: CabinetType.WALL, width: R, qty: 1, isAutoFilled: true, fromLeft: x });
  });

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
  
  const numbered = finalCabs.map(c => {
    let label = c.label; // Preserve existing labels
    if (!label) {
      if (c.type === CabinetType.BASE) label = `B${String(bIdx++).padStart(2, '0')}`;
      else if (c.type === CabinetType.WALL) label = `W${String(wIdx++).padStart(2, '0')}`;
      else label = `T${String(tIdx++).padStart(2, '0')}`;
    }
    return { ...c, label };
  });

  return { ...zone, cabinets: numbered };
};

// --- BOM GENERATION ---

const generateCabinetParts = (unit: CabinetUnit, settings: ProjectSettings, cabIndex: number): BOMItem[] => {
  const parts: BOMItem[] = [];
  const { thickness } = settings;
  const labelPrefix = unit.label ? `${unit.label} ${unit.preset}` : `#${cabIndex + 1} ${unit.preset}`;
  
  // Get materials from cabinet or use defaults
  const materials = unit.materials || {};
  const carcassMaterial = materials.carcassMaterial || `${thickness}mm White`;
  const backPanelMaterial = materials.backPanelMaterial || '6mm MDF';
  const drawerMaterial = materials.drawerMaterial || '16mm White';

  let height = settings.baseHeight;
  let depth = settings.depthBase;

  if (unit.type === CabinetType.WALL) { height = settings.wallHeight; depth = settings.depthWall; }
  else if (unit.type === CabinetType.TALL) { height = settings.tallHeight; depth = settings.depthTall; }

  if (unit.preset === PresetType.FILLER) {
    parts.push({ id: uuid(), name: 'Filler Panel', qty: 1, width: unit.width, length: height, material: carcassMaterial, label: labelPrefix });
    return parts;
  }

  // Carcass
  parts.push({ id: uuid(), name: 'Side Panel', qty: 2, width: depth, length: height, material: carcassMaterial, label: labelPrefix });
  const horizWidth = unit.width - (2 * thickness);
  parts.push({ id: uuid(), name: 'Bottom Panel', qty: 1, width: depth, length: horizWidth, material: carcassMaterial, label: labelPrefix });

  if (unit.type === CabinetType.BASE) {
    parts.push({ id: uuid(), name: 'Top Rail', qty: 2, width: 100, length: horizWidth, material: carcassMaterial, label: labelPrefix });
  } else {
    parts.push({ id: uuid(), name: 'Top Panel', qty: 1, width: depth, length: horizWidth, material: carcassMaterial, label: labelPrefix });
  }

  parts.push({ id: uuid(), name: 'Back Panel', qty: 1, width: unit.width - 2, length: height - 2, material: backPanelMaterial, label: labelPrefix });

  // Check for custom configuration
  if (unit.customConfig) {
    const config = unit.customConfig;

    // Add custom shelves
    if (config.num_shelves > 0) {
      parts.push({ id: uuid(), name: 'Shelf', qty: config.num_shelves, width: depth - 20, length: horizWidth, material: carcassMaterial, label: labelPrefix });
    }

    // Add custom drawers
    if (config.num_drawers > 0) {
      parts.push({ id: uuid(), name: 'Drawer Bottom', qty: config.num_drawers, width: depth - 50, length: horizWidth - 26, material: drawerMaterial, label: labelPrefix });
      parts.push({ id: uuid(), name: 'Drawer Side', qty: config.num_drawers * 2, width: depth - 10, length: 150, material: drawerMaterial, label: labelPrefix });
    }

    // Add custom hardware
    const hinges = config.hinges ?? (config.num_doors > 0 ? (unit.width > 400 ? config.num_doors * 2 : config.num_doors) : 0);
    const slides = config.slides ?? config.num_drawers;
    const handles = config.handles ?? (config.num_doors + config.num_drawers);

    if (hinges > 0) parts.push({ id: uuid(), name: HW.HINGE, qty: hinges, width: 0, length: 0, material: 'Hardware', isHardware: true });
    if (slides > 0) parts.push({ id: uuid(), name: HW.SLIDE, qty: slides, width: 0, length: 0, material: 'Hardware', isHardware: true });
    if (handles > 0) parts.push({ id: uuid(), name: HW.HANDLE, qty: handles, width: 0, length: 0, material: 'Hardware', isHardware: true });

    // Add legs for base cabinets, hangers for wall cabinets
    if (unit.type === CabinetType.BASE || unit.type === CabinetType.TALL) {
      parts.push({ id: uuid(), name: HW.LEG, qty: 4, width: 0, length: 0, material: 'Hardware', isHardware: true });
    } else if (unit.type === CabinetType.WALL) {
      parts.push({ id: uuid(), name: HW.HANGER, qty: 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
    }

    return parts;
  }

  // Preset Hardware
  if (unit.preset === PresetType.BASE_DOOR) {
    parts.push({ id: uuid(), name: 'Shelf', qty: 1, width: depth - 20, length: horizWidth, material: carcassMaterial, label: labelPrefix });
    parts.push({ id: uuid(), name: HW.HINGE, qty: unit.width > 400 ? 4 : 2, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANDLE, qty: unit.width > 400 ? 2 : 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.LEG, qty: 4, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }
  if (unit.preset === PresetType.BASE_DRAWER_3) {
    parts.push({ id: uuid(), name: 'Drawer Bottom', qty: 3, width: depth - 50, length: horizWidth - 26, material: drawerMaterial, label: labelPrefix });
    parts.push({ id: uuid(), name: 'Drawer Side', qty: 6, width: depth - 10, length: 150, material: drawerMaterial, label: labelPrefix });
    parts.push({ id: uuid(), name: HW.SLIDE, qty: 3, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANDLE, qty: 3, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.LEG, qty: 4, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }
  if (unit.preset === PresetType.WALL_STD) {
    parts.push({ id: uuid(), name: 'Shelf', qty: 2, width: depth - 20, length: horizWidth, material: carcassMaterial, label: labelPrefix });
    parts.push({ id: uuid(), name: HW.HINGE, qty: unit.width > 400 ? 4 : 2, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANDLE, qty: unit.width > 400 ? 2 : 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.HANGER, qty: 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }
  if (unit.preset === PresetType.TALL_OVEN) {
    parts.push({ id: uuid(), name: 'Fixed Shelf (Oven)', qty: 2, width: depth, length: horizWidth, material: carcassMaterial, label: labelPrefix });
    parts.push({ id: uuid(), name: HW.LEG, qty: 4, width: 0, length: 0, material: 'Hardware', isHardware: true });
    parts.push({ id: uuid(), name: HW.SLIDE, qty: 2, width: 0, length: 0, material: 'Hardware', isHardware: true });
  }
  if (unit.preset === PresetType.OPEN_BOX) {
    // Open box with 2 shelves - no doors, no hardware
    parts.push({ id: uuid(), name: 'Shelf', qty: 2, width: depth - 20, length: horizWidth, material: carcassMaterial, label: labelPrefix });
    if (unit.type === CabinetType.BASE) {
      parts.push({ id: uuid(), name: HW.LEG, qty: 4, width: 0, length: 0, material: 'Hardware', isHardware: true });
    } else if (unit.type === CabinetType.WALL) {
      parts.push({ id: uuid(), name: HW.HANGER, qty: 1, width: 0, length: 0, material: 'Hardware', isHardware: true });
    }
  }

  return parts;
};

export const generateProjectBOM = (project: Project): { groups: BOMGroup[], hardwareSummary: Record<string, number>, totalArea: number, totalLinearFeet: number, cabinetCount: number } => {
  const groups: BOMGroup[] = [];
  const hardwareSummary: Record<string, number> = {};
  let totalArea = 0;
  let totalLinearFeet = 0;
  let cabinetCount = 0;

  project.zones.filter(z => z.active).forEach(zone => {
    let zoneLen = 0;

    zone.cabinets.forEach((unit, index) => {
      // Only skip filler panels, include other auto-filled cabinets (boxes)
      if (unit.isAutoFilled && unit.preset === PresetType.FILLER) return;
      
      cabinetCount++;
      if (unit.type !== CabinetType.WALL) zoneLen += unit.width;

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
        cabinetName: unit.label ? `${unit.label} - ${unit.preset} (${unit.width}mm)` : `${zone.id} - ${unit.preset} (${unit.width}mm)`,
        items: woodParts
      });
    });

    totalLinearFeet += (zoneLen / 304.8);
  });

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
    cabinetCount
  };
};

export interface CostBreakdown {
  materialCost: number;
  hardwareCost: number;
  laborCost: number;
  subtotal: number;
  margin: number;
  totalPrice: number;
}

export const calculateProjectCost = (
  bomData: ReturnType<typeof generateProjectBOM>,
  nestingData: OptimizationResult,
  settings: ProjectSettings
): CostBreakdown => {
  const { costs } = settings;

  // 1. Material (Sheets) - Uses nested result for accuracy
  const materialCost = nestingData.totalSheets * costs.pricePerSheet;

  // 2. Hardware
  const totalHardwareItems = Object.values(bomData.hardwareSummary).reduce((a, b) => a + b, 0);
  const hardwareCost = totalHardwareItems * costs.pricePerHardwareUnit;

  // 3. Labor
  const totalHours = bomData.cabinetCount * costs.laborHoursPerCabinet;
  const laborCost = totalHours * costs.laborRatePerHour;

  const subtotal = materialCost + hardwareCost + laborCost;
  const margin = subtotal * (costs.marginPercent / 100);

  return {
    materialCost,
    hardwareCost,
    laborCost,
    subtotal,
    margin,
    totalPrice: subtotal + margin
  };
};

export const createNewProject = (): Project => ({
  id: uuid(),
  name: 'New Kitchen',
  designer: 'Me',
  company: 'My Shop',
  settings: {
    currency: 'LKR',
    baseHeight: 720,
    wallHeight: 720,
    tallHeight: 2100,
    depthBase: 560,
    depthWall: 320,
    depthTall: 580,
    thickness: 16,
    counterThickness: 40,
    toeKickHeight: 150,
    sheetWidth: 1220,
    sheetLength: 2440,
    kerf: 4,
    costs: {
      pricePerSheet: 85.00,
      pricePerHardwareUnit: 5.00,
      laborRatePerHour: 60.00,
      laborHoursPerCabinet: 1.5,
      marginPercent: 30
    }
  },
  zones: [
    { id: 'Wall A', active: true, totalLength: 3000, wallHeight: 2400, obstacles: [], cabinets: [] }
  ]
});

// EXCEL (XML Spreadsheet) EXPORT
export const exportToExcel = (groups: BOMGroup[], nestingData: OptimizationResult, project: Project) => {
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
  const materialCounts: Record<string, { sheets: number, wasteSum: number, count: number }> = {};

  nestingData.sheets.forEach(sheet => {
    if (!materialCounts[sheet.material]) {
      materialCounts[sheet.material] = { sheets: 0, wasteSum: 0, count: 0 };
    }
    materialCounts[sheet.material].sheets += 1;
    materialCounts[sheet.material].wasteSum += sheet.waste;
    materialCounts[sheet.material].count += 1;
  });

  let materialRows = '';
  Object.keys(materialCounts).forEach(mat => {
    const data = materialCounts[mat];
    const avgWaste = Math.round(data.wasteSum / data.count);
    const estCost = data.sheets * project.settings.costs.pricePerSheet;

    materialRows += `
    <Row>
      <Cell><Data ss:Type="String">${mat}</Data></Cell>
      <Cell><Data ss:Type="Number">${data.sheets}</Data></Cell>
      <Cell><Data ss:Type="String">${project.settings.sheetLength} x ${project.settings.sheetWidth}</Data></Cell>
      <Cell><Data ss:Type="Number">${avgWaste}</Data></Cell>
      <Cell><Data ss:Type="Number">${estCost}</Data></Cell>
    </Row>`;
  });

  // XML Template
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
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#D97706" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Parts List">
  <Table>
   <Column ss:Width="200"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="60"/>
   <Column ss:Width="150"/>
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
 <Worksheet ss:Name="Material BOM">
  <Table>
   <Column ss:Width="150"/>
   <Column ss:Width="100"/>
   <Column ss:Width="150"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Material</Data></Cell>
    <Cell><Data ss:Type="String">Sheets Required</Data></Cell>
    <Cell><Data ss:Type="String">Sheet Size</Data></Cell>
    <Cell><Data ss:Type="String">Avg Waste %</Data></Cell>
    <Cell><Data ss:Type="String">Est. Cost</Data></Cell>
   </Row>
   ${materialRows}
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
      angleUnit: "deg",
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

export const exportProjectToConstructionJSON = (project: Project) => {
  const data = buildProjectConstructionData(project);

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_construction.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
