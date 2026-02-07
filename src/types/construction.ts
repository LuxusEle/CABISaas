export type PlanViewPlane = 'XZ' | 'XY' | 'YZ';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Opening {
  openingId: string;
  type: 'window' | 'door' | 'column' | 'pipe' | string;
  atDistanceFromFromPoint: number;
  width: number;
  height: number;
  sillHeight: number;
}

export interface Wall {
  wallId: string;
  from: Vec3;
  to: Vec3;
  thickness: number;
  height: number;
  openings?: Opening[];
}

export interface FloorPolygon {
  closed?: boolean;
  points: Vec3[];
}

export interface ConstructionRoom {
  roomId: string;
  name: string;
  floorPolygon: FloorPolygon;
  walls: Wall[];
}

export interface ConstructionObject {
  id: string;
  category: 'cabinet' | string;
  wallId?: string;
  cabinetKind?: string;
  label?: string;
  box?: {
    position?: Vec3;
    size?: {
      length?: number;
      height?: number;
      depth?: number;
    };
  };
}

export interface ConstructionPlanJSON {
  schemaVersion: string;
  project?: {
    projectId: string;
    name: string;
    createdAt?: string;
    notes?: string;
  };
  units?: {
    lengthUnit?: 'm' | 'cm' | 'mm' | 'in' | 'ft' | string;
    planViewPlane?: PlanViewPlane;
    axisConvention?: {
      planViewPlane?: PlanViewPlane;
    };
  };
  room: ConstructionRoom;
  objects?: ConstructionObject[];
}
