export enum CabinetType {
  BASE = 'Base',
  WALL = 'Wall',
  TALL = 'Tall'
}

export interface CabinetInput {
  type: CabinetType;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  shelfCount: number;
  hasBack: boolean;
}

export interface Panel {
  name: string;
  qty: number;
  dim1: number;
  dim2: number;
}

export interface BOMResult {
  panels: Panel[];
  totalArea: number; // in m2
  edgebandLength: number; // in mm
  wasteArea: number; // in m2
}

const TOE_KICK_HEIGHT = 100;
const TOE_KICK_DEPTH = 50;

export const calculateBOM = (input: CabinetInput): BOMResult => {
  const panels: Panel[] = [];
  const { type, width, height, depth, thickness, shelfCount, hasBack } = input;
  
  const innerWidth = width - (thickness * 2);

  if (type === CabinetType.BASE) {
    // SIDES
    panels.push({
      name: 'Side Panel',
      qty: 2,
      dim1: height - TOE_KICK_HEIGHT,
      dim2: depth
    });
    // BOTTOM
    panels.push({
      name: 'Bottom Panel',
      qty: 1,
      dim1: innerWidth,
      dim2: depth
    });
    // STRETCHERS/RAILS
    panels.push({
      name: 'Stretcher',
      qty: 2,
      dim1: innerWidth,
      dim2: 100
    });
  } else if (type === CabinetType.WALL) {
    // SIDES
    panels.push({
      name: 'Side Panel',
      qty: 2,
      dim1: height,
      dim2: depth
    });
    // TOP & BOTTOM
    panels.push({
      name: 'Top/Bottom Panel',
      qty: 2,
      dim1: innerWidth,
      dim2: depth
    });
  } else if (type === CabinetType.TALL) {
    // SIDES
    panels.push({
      name: 'Side Panel',
      qty: 2,
      dim1: height,
      dim2: depth
    });
    // TOP & BOTTOM
    panels.push({
      name: 'Top/Bottom Panel',
      qty: 2,
      dim1: innerWidth,
      dim2: depth
    });
    // FIXED SHELF
    panels.push({
      name: 'Fixed Shelf',
      qty: 1,
      dim1: innerWidth,
      dim2: depth - 10
    });
  }

  // SHELVES (Common)
  if (shelfCount > 0) {
    panels.push({
      name: 'Adjustable Shelf',
      qty: shelfCount,
      dim1: innerWidth - 2, // clearance
      dim2: depth - 20 // clearance
    });
  }

  // BACK
  if (hasBack) {
    panels.push({
      name: 'Back Panel',
      qty: 1,
      dim1: height - (type === CabinetType.BASE ? TOE_KICK_HEIGHT : 0),
      dim2: width
    });
  }

  // CALCULATIONS
  let areaMm2 = 0;
  let perimeterMm = 0;

  panels.forEach(p => {
    areaMm2 += p.dim1 * p.dim2 * p.qty;
    // Edgebanding: Assume 2 long edges + 2 short edges for most panels
    // For simplicity: All edges except back
    if (p.name !== 'Back Panel') {
      perimeterMm += (p.dim1 * 2 + p.dim2 * 2) * p.qty;
    }
  });

  const totalArea = areaMm2 / 1000000;
  const wasteArea = totalArea * 1.1; // 10% waste

  return {
    panels,
    totalArea: Number(totalArea.toFixed(2)),
    edgebandLength: Math.round(perimeterMm),
    wasteArea: Number(wasteArea.toFixed(2))
  };
};
