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
  numRows: 1,
  facingDirection: 'front',
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
    rowIndex?: number;
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
    rowIndex: opts.rowIndex,
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

  const isl = zone.islandSettings;
  const numRows = isl?.numRows || 1;
  const cabDepth = isl?.islandDepth;
  const rowDepth = numRows === 2 ? (cabDepth || 560) / 2 : cabDepth;

  const existingCabs = zone.cabinets.filter(c => !c.isAutoFilled);
  const newCabinets: CabinetUnit[] = [];
  let remaining = zone.totalLength;
  let x = 0;

  const isOccupied = (start: number, w: number, rowIdx?: number) => {
    const rowMatch = (r?: number) =>
      rowIdx === undefined || r === rowIdx || (rowIdx === 0 && r === undefined);
    return (
      existingCabs.some(c => rowMatch(c.rowIndex) && start < c.fromLeft + c.width && start + w > c.fromLeft) ||
      newCabinets.some(c => rowMatch(c.rowIndex) && start < c.fromLeft + c.width && start + w > c.fromLeft)
    );
  };

  const generateRow = (rowIdx: number): CabinetUnit[] => {
    const row: CabinetUnit[] = [];
    let rx = 0;
    let rem = zone.totalLength;
    while (rem > 0) {
      let width = ISLAND_STD_WIDTHS.find(w => w <= rem) || rem;
      if (width < 200) break;

      if (!isOccupied(rx, width, rowIdx)) {
        const useDrawers = row.length % 3 === 2;
        const cab = useDrawers
          ? createIslandCabinet(CabinetType.BASE, width, rx, { showDoors: false, showDrawers: true, numDrawers: 3, showShelves: false, depth: rowDepth })
          : createIslandCabinet(CabinetType.BASE, width, rx, { showDoors: true, showDrawers: false, numShelves: 2, showShelves: true, depth: rowDepth });
        cab.isAutoFilled = true;
        cab.rowIndex = rowIdx;
        row.push(cab);
      }
      rx += width;
      rem -= width;
    }
    return row;
  };

  const row1 = generateRow(0);
  newCabinets.push(...row1);

  if (numRows === 2) {
    const row2 = generateRow(1);
    newCabinets.push(...row2);
  }

  return {
    ...zone,
    cabinets: [...existingCabs, ...newCabinets],
    totalLength: x + (zone.totalLength > 0 ? zone.totalLength : 0),
  };
};

export const resolveIslandCollisions = (zone: Zone): Zone => {
  if (zone.zoneType !== 'island') return zone;

  const groups = new Map<number, CabinetUnit[]>();
  zone.cabinets.forEach(c => {
    const key = c.rowIndex ?? 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ ...c });
  });

  const result: CabinetUnit[] = [];
  for (const [, cabs] of groups) {
    cabs.sort((a, b) => a.fromLeft - b.fromLeft);
    const origFromLeft = cabs.map(c => c.fromLeft);
    for (let i = 0; i < cabs.length; i++) {
      let maxRight = cabs[i].fromLeft;
      for (let j = 0; j < i; j++) {
        const right = cabs[j].fromLeft + cabs[j].width;
        if (right > maxRight) maxRight = right;
      }
      cabs[i].fromLeft = maxRight;
    }
    // Enforce totalLength: shrink the appropriate cabinet to fit
    if (cabs.length > 0) {
      const last = cabs[cabs.length - 1];
      const rightEdge = last.fromLeft + last.width;
      if (rightEdge > zone.totalLength) {
        if (cabs.length > 1 && last.fromLeft === origFromLeft[cabs.length - 1]) {
          // Rightmost wasn't pushed — it was expanded. Shrink the one to its left.
          const prev = cabs[cabs.length - 2];
          const neededShrink = rightEdge - zone.totalLength;
          prev.width = Math.max(50, prev.width - neededShrink);
          last.fromLeft = prev.fromLeft + prev.width;
        } else {
          // Rightmost was pushed (or is only cabinet). Shrink it.
          last.width = Math.max(50, zone.totalLength - last.fromLeft);
        }
        // Safety net: right-to-left compression to handle cases where
        // even the min-width rightmost still overflows (e.g. large left-side expansion)
        let maxAllowedRight = zone.totalLength;
        for (let i = cabs.length - 1; i >= 0; i--) {
          const c = cabs[i];
          if (c.fromLeft >= maxAllowedRight) {
            c.fromLeft = Math.max(0, maxAllowedRight - 50);
            c.width = 50;
          } else if (c.fromLeft + c.width > maxAllowedRight) {
            c.width = Math.max(50, maxAllowedRight - c.fromLeft);
          }
          maxAllowedRight = c.fromLeft;
        }
      } else if (rightEdge < zone.totalLength) {
        last.width = zone.totalLength - last.fromLeft;
      }
    }
    result.push(...cabs);
  }

  return { ...zone, cabinets: result };
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
