import { CONNECTOR_SPECS, BOARD_THICKNESS, DrillingPoint, ConnectorDrillingPattern } from './types';

export const getCamLockPositions = (
  panelHeight: number,
  numConnectors: number = 4
): number[] => {
  const minEdge = 50;
  
  if (numConnectors <= 1) {
    return [panelHeight / 2];
  }
  
  const positions: number[] = [];
  const availableHeight = panelHeight - 2 * minEdge;
  const spacing = availableHeight / (numConnectors - 1);
  
  for (let i = 0; i < numConnectors; i++) {
    positions.push(minEdge + i * spacing);
  }
  
  return positions;
};

export const generateCamLockPattern = (
  facePanelWidth: number,
  facePanelHeight: number,
  edgePanelThickness: number = BOARD_THICKNESS,
  numConnectors: number = 4,
  offsetX: number = 0,
  offsetY: number = 0
): DrillingPoint[] => {
  const holes: DrillingPoint[] = [];
  const yPositions = getCamLockPositions(facePanelHeight, numConnectors);
  
  const camOffsetFromEdge = 34;
  
  yPositions.forEach((yRel, index) => {
    const y = yRel + offsetY;
    
    holes.push({
      x: offsetX + camOffsetFromEdge,
      y: y,
      diameter: CONNECTOR_SPECS.camLock.camDiameter,
      depth: CONNECTOR_SPECS.camLock.camDepth,
      type: 'cam',
      label: `Cam ${index + 1}`
    });
    
    holes.push({
      x: offsetX + camOffsetFromEdge - 9,
      y: y,
      diameter: CONNECTOR_SPECS.camLock.pilotDiameter,
      depth: CONNECTOR_SPECS.camLock.pilotLength,
      type: 'pilot',
      label: `Cam ${index + 1} Pilot`
    });
  });
  
  return holes;
};

export const generateCamLockEdgePattern = (
  edgePanelLength: number,
  edgePanelHeight: number,
  numConnectors: number = 4,
  offsetY: number = 0
): DrillingPoint[] => {
  const holes: DrillingPoint[] = [];
  const yPositions = getCamLockPositions(edgePanelHeight, numConnectors);
  
  const xOffset = 9;
  
  yPositions.forEach((yRel, index) => {
    const y = yRel + offsetY;
    
    holes.push({
      x: xOffset,
      y: y,
      diameter: CONNECTOR_SPECS.camLock.boltDiameter,
      depth: CONNECTOR_SPECS.camLock.boltLength,
      type: 'cam',
      label: `Bolt ${index + 1}`
    });
  });
  
  return holes;
};

export const generateConfirmatPattern = (
  facePanelWidth: number,
  facePanelHeight: number,
  numConnectors: number = 4,
  offsetX: number = 0,
  offsetY: number = 0
): DrillingPoint[] => {
  const holes: DrillingPoint[] = [];
  const yPositions = getCamLockPositions(facePanelHeight, numConnectors);
  
  const screwOffsetFromEdge = 9;
  
  yPositions.forEach((yRel, index) => {
    const y = yRel + offsetY;
    
    holes.push({
      x: offsetX + screwOffsetFromEdge,
      y: y,
      diameter: CONNECTOR_SPECS.confirmat.clearanceDiameter,
      depth: CONNECTOR_SPECS.confirmat.clearanceLength,
      type: 'clearance',
      label: `Confirmat ${index + 1} Clear`
    });
    
    holes.push({
      x: offsetX + screwOffsetFromEdge,
      y: y,
      diameter: CONNECTOR_SPECS.confirmat.pilotDiameter,
      depth: CONNECTOR_SPECS.confirmat.pilotLength,
      type: 'confirmat',
      label: `Confirmat ${index + 1} Pilot`
    });
  });
  
  return holes;
};

export const generateConnectorPattern = (
  panelWidth: number,
  panelHeight: number,
  numConnectors: number = 4,
  connectorType: 'cam-lock' | 'confirmat' | 'both' = 'both'
): ConnectorDrillingPattern => {
  return {
    camLocks: connectorType === 'cam-lock' || connectorType === 'both' 
      ? generateCamLockPattern(panelWidth, panelHeight, BOARD_THICKNESS, numConnectors)
      : [],
    confirmats: connectorType === 'confirmat' || connectorType === 'both'
      ? generateConfirmatPattern(panelWidth, panelHeight, numConnectors)
      : []
  };
};

export const calculateJointConnectors = (
  jointType: 'side-to-top' | 'side-to-bottom' | 'side-to-back' | 'shelf',
  panelHeight: number
): { camLocks: number; confirmats: number } => {
  const numConnectors = jointType === 'shelf' ? 4 : 4;
  
  return {
    camLocks: numConnectors,
    confirmats: numConnectors
  };
};
