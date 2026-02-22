export interface DrillingPoint {
  x: number;
  y: number;
  diameter: number;
  depth: number;
  type: 'cup' | 'screw' | 'mounting' | 'cam' | 'confirmat' | 'pilot' | 'clearance';
  label?: string;
}

export interface HingeDrillingPattern {
  doorHoles: DrillingPoint[];
  sideHoles: DrillingPoint[];
}

export interface ConnectorDrillingPattern {
  camLocks: DrillingPoint[];
  confirmats: DrillingPoint[];
}

export interface PanelDrillingPattern {
  panelId: string;
  panelName: string;
  width: number;
  height: number;
  holes: DrillingPoint[];
}

export interface CabinetDrillingPattern {
  cabinetId: string;
  cabinetLabel: string;
  panels: PanelDrillingPattern[];
}

export const HINGE_SPECS = {
  door: {
    cup: {
      diameter: 35,
      depth: 12.5,
      edgeOffset: (tab: number) => 17.5 + tab,
    },
    drillingPattern: '45/9.5',
    screwSpacing: 45,
    screwOffset: 9.5
  },
  cabinetSide: {
    mounting: {
      setback: 37,
      spacing: 32,
      holeDiameter: 5
    }
  }
} as const;

export const CONNECTOR_SPECS = {
  camLock: {
    camDiameter: 15,
    camDepth: 12.5,
    boltDiameter: 8,
    boltLength: 34,
    pilotDiameter: 5,
    pilotLength: 12
  },
  confirmat: {
    clearanceDiameter: 7,
    clearanceLength: 18,
    pilotDiameter: 5,
    pilotLength: 40
  }
} as const;

export const BOARD_THICKNESS = 18;
