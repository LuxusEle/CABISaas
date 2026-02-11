
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
  HOOD_UNIT = 'Cooker Hood',
  COOKER_HOB = 'Cooker Hob',
  FILLER = 'Filler Panel',
  OPEN_BOX = 'Open Box'
}

export interface CostSettings {
  pricePerSheet: number;
  pricePerHardwareUnit: number;
  laborRatePerHour: number;
  laborHoursPerCabinet: number;
  marginPercent: number;
}

// Global Project Settings
export interface ProjectSettings {
  // Appearance
  currency: string;
  logoUrl?: string;

  // Dimensions
  baseHeight: number;
  wallHeight: number;
  tallHeight: number;
  depthBase: number;
  depthWall: number;
  depthTall: number;
  thickness: 16 | 18 | 19;
  counterThickness: number;
  toeKickHeight: number;

  // Nesting Settings
  sheetWidth: number;
  sheetLength: number;
  kerf: number;

  // Costing
  costs: CostSettings;
}

export interface Obstacle {
  id: string;
  type: 'door' | 'window' | 'column' | 'pipe';
  fromLeft: number;
  width: number;
  height: number;
  sillHeight?: number; // Distance from floor to bottom of window
  depth?: number;
}

export interface CustomCabinetConfig {
  num_shelves: number;
  num_drawers: number;
  num_doors: number;
  shelf_positions?: number[];
  hinges?: number;
  slides?: number;
  handles?: number;
}

export interface CabinetMaterials {
  carcassMaterial?: string;  // e.g., "White Melamine 16mm"
  backPanelMaterial?: string; // e.g., "MDF 6mm"
  drawerMaterial?: string;    // e.g., "White Melamine 16mm"
}

export interface CabinetUnit {
  id: string;
  preset: PresetType;
  type: CabinetType;
  width: number;
  qty: number;
  fromLeft: number;
  isAutoFilled?: boolean;
  label?: string;
  // Custom cabinet support
  customPresetId?: string; // ID of custom preset from database
  customConfig?: CustomCabinetConfig; // Custom configuration
  // Material selection
  materials?: CabinetMaterials;
}

export interface Zone {
  id: string;
  active: boolean;
  totalLength: number;
  wallHeight: number;
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
  label?: string;
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
  waste: number;
}

export interface OptimizationResult {
  sheets: SheetLayout[];
  totalSheets: number;
  totalWaste: number;
}

export enum Screen {
  LANDING = 'landing',
  DASHBOARD = 'dashboard',
  PROJECT_SETUP = 'project_setup',
  WALL_EDITOR = 'wall_editor',
  BOM_REPORT = 'bom_report',
  TOOLS = 'tools',
  PRICING = 'pricing'
}

export interface AutoFillOptions {
  includeSink: boolean;
  includeCooker: boolean;
  includeTall: boolean;
  includeWallCabinets: boolean;
  preferDrawers: boolean;
}

// Subscription Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  description: string;
  features: string[];
  maxProjects: number;
  maxUsers?: number;
  twocheckoutProductId: string | null;
}

export interface UserSubscription {
  id?: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  twocheckout_subscription_id?: string;
  created_at?: string;
  updated_at?: string;
}
