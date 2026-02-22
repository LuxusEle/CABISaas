import { HINGE_SPECS, DrillingPoint, HingeDrillingPattern } from './types';

export const getHingeYPositions = (doorHeight: number, numHinges: number = 2): number[] => {
  const minEdge = 100;
  
  if (numHinges === 2) {
    return [minEdge, doorHeight - minEdge];
  } else if (numHinges === 3) {
    return [minEdge, doorHeight / 2, doorHeight - minEdge];
  } else if (numHinges === 4) {
    return [minEdge, doorHeight * 0.33, doorHeight * 0.67, doorHeight - minEdge];
  }
  
  const positions: number[] = [];
  const spacing = (doorHeight - 2 * minEdge) / (numHinges - 1);
  for (let i = 0; i < numHinges; i++) {
    positions.push(minEdge + i * spacing);
  }
  return positions;
};

export const generateDoorHingePattern = (
  doorWidth: number,
  doorHeight: number,
  hingePositions: number[],
  tab: number = 4,
  isLeftSide: boolean = true
): DrillingPoint[] => {
  const holes: DrillingPoint[] = [];
  const cupOffset = HINGE_SPECS.door.cup.edgeOffset(tab);
  const x = isLeftSide ? cupOffset : doorWidth - cupOffset;
  
  hingePositions.forEach((yPos, index) => {
    holes.push({
      x: x,
      y: yPos,
      diameter: HINGE_SPECS.door.cup.diameter,
      depth: HINGE_SPECS.door.cup.depth,
      type: 'cup',
      label: `Hinge ${index + 1} Cup`
    });
    
    const screwX = isLeftSide ? x + HINGE_SPECS.door.screwOffset : x - HINGE_SPECS.door.screwOffset;
    
    holes.push({
      x: screwX,
      y: yPos + 22.5,
      diameter: 4,
      depth: 14,
      type: 'screw',
      label: `Hinge ${index + 1} Screw T`
    });
    
    holes.push({
      x: screwX,
      y: yPos - 22.5,
      diameter: 4,
      depth: 14,
      type: 'screw',
      label: `Hinge ${index + 1} Screw B`
    });
  });
  
  return holes;
};

export const generateSideMountingPattern = (
  sideWidth: number,
  sideHeight: number,
  hingePositions: number[],
  isLeftSide: boolean = true
): DrillingPoint[] => {
  const holes: DrillingPoint[] = [];
  const setback = HINGE_SPECS.cabinetSide.mounting.setback;
  const spacing = HINGE_SPECS.cabinetSide.mounting.spacing;
  const holeDiameter = HINGE_SPECS.cabinetSide.mounting.holeDiameter;
  
  const x = isLeftSide ? setback : sideWidth - setback;
  
  hingePositions.forEach((yPos, index) => {
    holes.push({
      x: x,
      y: yPos + spacing / 2,
      diameter: holeDiameter,
      depth: 12,
      type: 'mounting',
      label: `Plate ${index + 1} Screw T`
    });
    
    holes.push({
      x: x,
      y: yPos - spacing / 2,
      diameter: holeDiameter,
      depth: 12,
      type: 'mounting',
      label: `Plate ${index + 1} Screw B`
    });
  });
  
  return holes;
};

export const generateHingeDrillingPattern = (
  doorWidth: number,
  doorHeight: number,
  sideWidth: number,
  sideHeight: number,
  numHinges: number = 2,
  tab: number = 4
): HingeDrillingPattern => {
  const hingePositions = getHingeYPositions(doorHeight, numHinges);
  
  return {
    doorHoles: generateDoorHingePattern(doorWidth, doorHeight, hingePositions, tab, true),
    sideHoles: generateSideMountingPattern(sideWidth, sideHeight, hingePositions, true)
  };
};

export const getHinge3DMatrix = (yPos: number, tab: number = 4) => {
  const cupX = 17.5 + tab;

  return {
    doorFaceMatrix: {
      cupCenter: { x: cupX, y: yPos, z: 0 },
      screwTop: { x: cupX + 9.5, y: yPos + 22.5, z: 0 },
      screwBot: { x: cupX + 9.5, y: yPos - 22.5, z: 0 }
    },
    sidePanelMatrix: {
      plateTop: { x: 37, y: yPos + 16, z: 0 },
      plateBot: { x: 37, y: yPos - 16, z: 0 }
    },
    pivotPoint: { x: 0, y: yPos, z: 0 }
  };
};
