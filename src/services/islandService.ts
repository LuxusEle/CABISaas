import { CabinetUnit, CabinetType, IslandSettings, PresetType, Project, Zone } from '../types';

const uuid = () => Math.random().toString(36).substr(2, 9);

const ISLAND_STD_WIDTHS = [1000, 900, 800, 600, 500, 450, 400, 300, 250];

const FLOOR_WIDTH = 3600;
const FLOOR_DEPTH = 3000;

export const createDefaultIslandSettings = (): IslandSettings => ({
  posX: 1800,
  posZ: 1500,
  rotation: 0,
  islandDepth: 560,
  clearance: 1067,
  frontOverhang: 25,
  backOverhang: 25,
  leftOverhang: 25,
  rightOverhang: 25,
  hasSeating: false,
  seatingSide: 'front',
  seatingOverhang: 300,
});

export const createDefaultIslandZone = (id: string = 'Island', totalLength: number = 1500): Zone => ({
  id,
  zoneType: 'island',
  active: true,
  totalLength,
  wallHeight: 2400,
  obstacles: [],
  cabinets: [],
  islandSettings: createDefaultIslandSettings(),
});

export const createIslandCabinet = (
  type: CabinetType,
  width: number,
  fromLeft: number,
  options?: {
    showDoors?: boolean;
    showDrawers?: boolean;
    numDrawers?: number;
    numShelves?: number;
    showShelves?: boolean;
    showBackPanel?: boolean;
    depth?: number;
    height?: number;
  }
): CabinetUnit => {
  const opts = options || {};
  return {
    id: uuid(),
    preset: '' as PresetType,
    type,
    width,
    qty: 1,
    fromLeft,
    isAutoFilled: false,
    depth: opts.depth,
    height: opts.height,
    advancedSettings: {
      showDoors: opts.showDoors ?? true,
      showDrawers: opts.showDrawers ?? false,
      numDrawers: opts.numDrawers ?? 3,
      numShelves: opts.numShelves ?? 2,
      showShelves: opts.showShelves ?? true,
      showBackPanel: opts.showBackPanel ?? true,
    },
  };
};

export const autoFillIsland = (zone: Zone): Zone => {
  if (zone.zoneType !== 'island') return zone;

  const existingCabs = zone.cabinets.filter(c => !c.isAutoFilled);
  const newCabinets: CabinetUnit[] = [];
  let remaining = zone.totalLength;
  let x = 0;
  const cabDepth = zone.islandSettings?.islandDepth;

  const isOccupied = (start: number, w: number) =>
    existingCabs.some(c => start < c.fromLeft + c.width && start + w > c.fromLeft) ||
    newCabinets.some(c => start < c.fromLeft + c.width && start + w > c.fromLeft);

  while (remaining > 0) {
    let width = ISLAND_STD_WIDTHS.find(w => w <= remaining) || remaining;
    if (width < 200) break;

    if (!isOccupied(x, width)) {
      const useDrawers = newCabinets.length % 3 === 2;
      const cab = useDrawers
        ? createIslandCabinet(CabinetType.BASE, width, x, { showDoors: false, showDrawers: true, numDrawers: 3, showShelves: false, depth: cabDepth })
        : createIslandCabinet(CabinetType.BASE, width, x, { showDoors: true, showDrawers: false, numShelves: 2, showShelves: true, depth: cabDepth });
      cab.isAutoFilled = true;
      newCabinets.push(cab);
    }
    x += width;
    remaining -= width;
  }

  return {
    ...zone,
    cabinets: [...existingCabs, ...newCabinets],
    totalLength: x,
  };
};

export const resolveIslandCollisions = (zone: Zone): Zone => {
  if (zone.zoneType !== 'island') return zone;

  const sorted = zone.cabinets.map(c => ({ ...c })).sort((a, b) => a.fromLeft - b.fromLeft);

  for (let i = 0; i < sorted.length; i++) {
    let maxRight = sorted[i].fromLeft;
    for (let j = 0; j < i; j++) {
      const right = sorted[j].fromLeft + sorted[j].width;
      if (right > maxRight) maxRight = right;
    }
    sorted[i].fromLeft = maxRight;
  }

  return { ...zone, cabinets: sorted };
};

export const getIslandCountertopDimensions = (zone: Zone): { width: number; depth: number } | null => {
  if (zone.zoneType !== 'island' || !zone.islandSettings) return null;
  const isl = zone.islandSettings;
  const cabDepth = isl.islandDepth ?? 560;
  const width = (zone.totalLength ?? 1500) + (isl.leftOverhang ?? 25) + (isl.rightOverhang ?? 25);
  const baseDepth = cabDepth + (isl.frontOverhang ?? 25) + (isl.backOverhang ?? 25);
  const depth = isl.hasSeating
    ? baseDepth + (isl.seatingOverhang ?? 300)
    : baseDepth;
  if (!isFinite(width) || !isFinite(depth)) return null;
  return { width, depth };
};

export const getIslandPosition = (project: Project): { posX: number; posZ: number } => {
  const islandZone = project.zones.find(z => z.zoneType === 'island');
  if (!islandZone?.islandSettings) return { posX: 2000, posZ: 1000 };

  const isl = islandZone.islandSettings;
  const finalX = isFinite(isl.posX) ? Math.max(isl.posX, 500) : 2000;
  const finalZ = isFinite(isl.posZ) ? Math.max(isl.posZ, 500) : 1000;

  return { posX: finalX, posZ: finalZ };
};
