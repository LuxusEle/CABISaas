import { CabinetUnit, ProjectSettings, PresetType, CabinetType } from '../types';
import { 
  DrillingPoint, 
  PanelDrillingPattern, 
  CabinetDrillingPattern,
  getHingeYPositions,
  generateDoorHingePattern,
  generateSideMountingPattern,
  generateCamLockPattern,
  generateCamLockEdgePattern,
  generateConfirmatPattern,
  BOARD_THICKNESS
} from './hardware';

const uuid = () => Math.random().toString(36).substr(2, 9);

const getCabinetDimensions = (unit: CabinetUnit, settings: ProjectSettings) => {
  let height: number;
  let depth: number;
  
  switch (unit.type) {
    case CabinetType.BASE:
      height = settings.baseHeight;
      depth = settings.depthBase;
      break;
    case CabinetType.WALL:
      height = settings.wallHeight;
      depth = settings.depthWall;
      break;
    case CabinetType.TALL:
      height = settings.tallHeight;
      depth = settings.depthTall;
      break;
    default:
      height = settings.baseHeight;
      depth = settings.depthBase;
  }
  
  return { height, depth, width: unit.width };
};

const getNumDoors = (unit: CabinetUnit): number => {
  if (unit.customConfig?.num_doors !== undefined) {
    return unit.customConfig.num_doors;
  }
  
  switch (unit.preset) {
    case PresetType.BASE_DOOR:
    case PresetType.WALL_STD:
      return unit.width > 400 ? 2 : 1;
    case PresetType.TALL_OVEN:
    case PresetType.TALL_UTILITY:
      return 1;
    case PresetType.BASE_DRAWER_3:
    case PresetType.SINK_UNIT:
    case PresetType.OPEN_BOX:
    case PresetType.COOKER_HOB:
    case PresetType.HOOD_UNIT:
    case PresetType.FILLER:
    case PresetType.BASE_CORNER:
      return 0;
    default:
      return 0;
  }
};

const getNumHingesPerDoor = (doorHeight: number): number => {
  if (doorHeight > 1800) return 4;
  if (doorHeight > 1200) return 3;
  return 2;
};

const generateDoorDrillingPattern = (
  doorWidth: number,
  doorHeight: number,
  numHinges: number
): PanelDrillingPattern => {
  const hingePositions = getHingeYPositions(doorHeight, numHinges);
  const holes = generateDoorHingePattern(doorWidth, doorHeight, hingePositions, 4, true);
  
  return {
    panelId: uuid(),
    panelName: 'Door',
    width: doorWidth,
    height: doorHeight,
    holes
  };
};

const generateSideDrillingPattern = (
  sideWidth: number,
  sideHeight: number,
  numHinges: number
): PanelDrillingPattern => {
  const hingePositions = getHingeYPositions(sideHeight, numHinges);
  const holes = generateSideMountingPattern(sideWidth, sideHeight, hingePositions, true);
  
  return {
    panelId: uuid(),
    panelName: 'Side Panel',
    width: sideWidth,
    height: sideHeight,
    holes
  };
};

const generateCabinetConnectorPatterns = (
  dimensions: { width: number; height: number; depth: number },
  hasDoors: boolean
): PanelDrillingPattern[] => {
  const patterns: PanelDrillingPattern[] = [];
  const { width, height, depth } = dimensions;
  
  const sidePattern: PanelDrillingPattern = {
    panelId: uuid(),
    panelName: 'Side Panel (Connectors)',
    width: depth,
    height: height,
    holes: []
  };
  
  const topBottomConnectorCount = height > 800 ? 4 : 2;
  
  sidePattern.holes.push(
    ...generateCamLockEdgePattern(depth, height, topBottomConnectorCount, 0)
  );
  
  patterns.push(sidePattern);
  
  return patterns;
};

export const generateCabinetDrillingPattern = (
  unit: CabinetUnit,
  settings: ProjectSettings
): CabinetDrillingPattern => {
  const dimensions = getCabinetDimensions(unit, settings);
  const numDoors = getNumDoors(unit);
  const panels: PanelDrillingPattern[] = [];
  
  if (numDoors > 0) {
    const doorHeight = dimensions.height - 4;
    const doorWidth = numDoors > 1 
      ? (dimensions.width / numDoors) - 2 
      : dimensions.width - 4;
    const numHingesPerDoor = getNumHingesPerDoor(doorHeight);
    
    for (let i = 0; i < numDoors; i++) {
      panels.push(generateDoorDrillingPattern(doorWidth, doorHeight, numHingesPerDoor));
    }
    
    panels.push(generateSideDrillingPattern(dimensions.depth, dimensions.height, numHingesPerDoor));
  }
  
  const connectorPanels = generateCabinetConnectorPatterns(dimensions, numDoors > 0);
  panels.push(...connectorPanels);
  
  return {
    cabinetId: unit.id,
    cabinetLabel: unit.label || `${unit.preset}`,
    panels
  };
};

export const generateAllCabinetDrillingPatterns = (
  cabinets: CabinetUnit[],
  settings: ProjectSettings
): CabinetDrillingPattern[] => {
  return cabinets.map(cab => generateCabinetDrillingPattern(cab, settings));
};

export const calculateHardwareCounts = (
  unit: CabinetUnit,
  settings: ProjectSettings
): { hinges: number; camLocks: number; confirmats: number } => {
  const dimensions = getCabinetDimensions(unit, settings);
  const numDoors = getNumDoors(unit);
  
  const doorHeight = dimensions.height - 4;
  const numHingesPerDoor = getNumHingesPerDoor(doorHeight);
  const hinges = numDoors * numHingesPerDoor;
  
  const jointsCount = 4;
  const camLocks = jointsCount;
  const confirmats = jointsCount;
  
  return { hinges, camLocks, confirmats };
};

export const calculateTotalHardwareCounts = (
  cabinets: CabinetUnit[],
  settings: ProjectSettings
): { hinges: number; camLocks: number; confirmats: number } => {
  return cabinets.reduce(
    (totals, cab) => {
      const counts = calculateHardwareCounts(cab, settings);
      return {
        hinges: totals.hinges + counts.hinges,
        camLocks: totals.camLocks + counts.camLocks,
        confirmats: totals.confirmats + counts.confirmats
      };
    },
    { hinges: 0, camLocks: 0, confirmats: 0 }
  );
};
