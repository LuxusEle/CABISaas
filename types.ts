
export enum ZoneId {
  WALL_A = 'Wall A',
  WALL_B = 'Wall B',
  WALL_C = 'Wall C',
  ISLAND = 'Island'
}

export enum CabinetType {
  BASE = 'Base',
  WALL = 'Wall',
  TALL = 'Tall'
}

export enum PresetType {
  BASE_DOOR = 'Base 2-Door',
  BASE_DRAWER_3 = 'Base 3-Drawer',
  BASE_CORNER = 'Base Corner',
  WALL_STD = 'Wall Standard',
  TALL_OVEN = 'Tall Oven/Micro',
  TALL_UTILITY = 'Tall Utility',
  SINK_UNIT = 'Sink Unit',
  FILLER = 'Filler Panel'
}

// Global Project Settings
export interface ProjectSettings {
  baseHeight: number;
  wallHeight: number;
  tallHeight: number;
  depthBase: number;
  depthWall: number;
  depthTall: number;
  thickness: 16 | 18 | 19;
  // Nesting Settings
  sheetWidth: number;  // e.g., 1220
  sheetLength: number; // e.g., 2440
  kerf: number;        // e.g., 3
}

export interface Obstacle {
  id: string;
  type: 'door' | 'window' | 'column' | 'pipe';
  fromLeft: number; // Distance from left
  width: number;
  height?: number; // Height of object
  elevation?: number; // Off floor (for windows)
  depth?: number; // Protrusion depth (columns)
}

export interface CabinetUnit {
  id: string;
  preset: PresetType;
  type: CabinetType;
  width: number;
  qty: number; 
  fromLeft: number; // Absolute X Position
  isAutoFilled?: boolean;
}

export interface Zone {
  id: string;
  active: boolean;
  totalLength: number;
  obstacles: Obstacle[];
  cabinets: CabinetUnit[];
}

export interface Project {
  id: string;
  name: string;
  designer: string;
  company: string;
  settings: ProjectSettings;
  zones: Zone[];
}

export interface BOMItem {
  id: string;
  name: string;
  qty: number;
  width: number;
  length: number;
  material: string;
  label?: string; // e.g., "Cab #1 - Side"
  isHardware?: boolean;
}

export interface BOMGroup {
  cabinetId: string;
  cabinetName: string;
  items: BOMItem[];
}

// Nesting Types
export interface PlacedPart {
  x: number;
  y: number;
  width: number;
  length: number;
  rotated: boolean;
  partId: string;
  label: string;
}

export interface SheetLayout {
  id: string;
  material: string;
  width: number;
  length: number;
  parts: PlacedPart[];
  waste: number; // percentage
}

export interface OptimizationResult {
  sheets: SheetLayout[];
  totalSheets: number;
  totalWaste: number;
}

export enum Screen {
  HOME = 'home',
  PROJECT_SETUP = 'project_setup',
  WALL_EDITOR = 'wall_editor',
  BOM_REPORT = 'bom_report',
  TOOLS = 'tools'
}
