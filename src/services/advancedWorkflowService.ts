import { CabinetUnit, CabinetType, PresetType } from '../types';

/**
 * Recalculates the 'fromLeft' positions for all cabinets in a zone.
 * Cabinets are grouped by type (Base, Wall, Tall) and laid out sequentially 
 * from left to right starting at 0 for each group.
 */
export const recalculateCabinetPositions = (cabinets: CabinetUnit[]): CabinetUnit[] => {
  // 1. Calculate total width of Tall cabinets
  // We assume Tall cabinets are always positioned at the start (fromLeft = 0)
  const tallCabinets = cabinets.filter(c => c.type === CabinetType.TALL);
  const totalTallWidth = tallCabinets.reduce((sum, c) => sum + c.width, 0);

  // 2. Create a mapping of type -> current offset
  // Tall cabinets start at 0, Base and Wall start after the Tall cabinets
  const offsets: Record<string, number> = {
    [CabinetType.TALL]: 0,
    [CabinetType.BASE]: totalTallWidth,
    [CabinetType.WALL]: totalTallWidth
  };

  // 3. Map to new objects with updated positions while preserving array order
  return cabinets.map(cab => {
    const currentX = offsets[cab.type] ?? 0;
    const updatedCab = {
      ...cab,
      fromLeft: currentX
    };
    // Increment offset for this type for the next cabinet
    offsets[cab.type] = currentX + cab.width;
    return updatedCab;
  });
};

/**
 * Calculates the total length required for a zone based on the maximum width 
 * occupied by any cabinet group.
 */
export const calculateTotalZoneLength = (cabinets: CabinetUnit[]): number => {
  const tallWidth = cabinets
    .filter(c => c.type === CabinetType.TALL)
    .reduce((sum, c) => sum + c.width, 0);
    
  const baseWidth = cabinets
    .filter(c => c.type === CabinetType.BASE)
    .reduce((sum, c) => sum + c.width, 0);
    
  const wallWidth = cabinets
    .filter(c => c.type === CabinetType.WALL)
    .reduce((sum, c) => sum + c.width, 0);

  // Total length is the Tall section + the widest of the Base/Wall sections
  return tallWidth + Math.max(baseWidth, wallWidth);
};

/**
 * Creates a new cabinet unit with default advanced settings.
 * Positions it at the end of its respective type row.
 */
export const createAdvancedCabinet = (
  type: CabinetType, 
  existingCabinets: CabinetUnit[], 
  width: number = 600
): CabinetUnit => {
  const sameTypeCabs = existingCabinets.filter(c => c.type === type);
  const typeOffset = sameTypeCabs.reduce((sum, c) => sum + c.width, 0);
  
  let fromLeft = typeOffset;
  if (type === CabinetType.BASE || type === CabinetType.WALL) {
    const tallWidth = existingCabinets
      .filter(c => c.type === CabinetType.TALL)
      .reduce((sum, c) => sum + c.width, 0);
    fromLeft += tallWidth;
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    preset: type === CabinetType.BASE 
      ? PresetType.BASE_DOOR 
      : type === CabinetType.WALL 
        ? PresetType.WALL_STD 
        : PresetType.TALL_UTILITY,
    type,
    width,
    qty: 1,
    fromLeft,
    isAutoFilled: false,
    advancedSettings: {
      showDoors: type !== CabinetType.TALL,
      showShelves: true,
      showDrawers: false,
      numShelves: 2
    }
  };
};
