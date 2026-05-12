import { Project, CabinetType, PresetType } from '../types';
import { createNewProject } from '../services/bomService';

/**
 * Creates a pre-configured demo project to showcase the 3D Design Studio
 * without requiring the user to go through the setup wizard.
 */
export const createDemoProject = (companyName: string = 'Demo Kitchens'): Project => {
  // Start with a standard blank project
  const project = createNewProject();
  
  // Basic info
  project.name = 'Quick Start Demo Kitchen';
  project.company = companyName;
  
  // Set up Wall A (3.6 meters)
  const wallA = project.zones[0];
  wallA.active = true;
  wallA.totalLength = 3600;
  
  // Add a Window Obstacle (traditionally placed above the sink)
  wallA.obstacles = [
    {
      id: 'demo-window',
      type: 'window',
      fromLeft: 1350,
      width: 900,
      height: 1000,
      sillHeight: 1150
    }
  ];
  
  // Pre-place a professional kitchen layout
  wallA.cabinets = [
    // Left: Tall Storage
    {
      id: 'demo-tall-1',
      preset: PresetType.TALL_UTILITY,
      type: CabinetType.TALL,
      width: 600,
      qty: 1,
      fromLeft: 0,
      label: 'T01'
    },
    // Prep area
    {
      id: 'demo-base-drawer',
      preset: PresetType.BASE_DRAWER_3,
      type: CabinetType.BASE,
      width: 750,
      qty: 1,
      fromLeft: 600,
      label: 'B01'
    },
    // Washing area (under window)
    {
      id: 'demo-sink',
      preset: PresetType.SINK_UNIT,
      type: CabinetType.BASE,
      width: 900,
      qty: 1,
      fromLeft: 1350,
      label: 'B02'
    },
    // Main prep area
    {
      id: 'demo-base-door',
      preset: PresetType.BASE_DOOR,
      type: CabinetType.BASE,
      width: 750,
      qty: 1,
      fromLeft: 2250,
      label: 'B03'
    },
    // Cooking area
    {
      id: 'demo-cooker',
      preset: PresetType.COOKER_HOB,
      type: CabinetType.BASE,
      width: 600,
      qty: 1,
      fromLeft: 3000,
      label: 'B04'
    },
    // Wall Cabinets (Storage)
    {
      id: 'demo-wall-1',
      preset: PresetType.WALL_STD,
      type: CabinetType.WALL,
      width: 750,
      qty: 1,
      fromLeft: 600,
      label: 'W01'
    },
    {
      id: 'demo-wall-2',
      preset: PresetType.WALL_STD,
      type: CabinetType.WALL,
      width: 750,
      qty: 1,
      fromLeft: 2250,
      label: 'W02'
    },
    // Cooking Hood (exactly above hob)
    {
      id: 'demo-hood',
      preset: PresetType.HOOD_UNIT,
      type: CabinetType.WALL,
      width: 600,
      qty: 1,
      fromLeft: 3000,
      label: 'W03'
    }
  ];

  // Mark wizard as completed to bypass the "Next" buttons and show the full toolbar
  project.settings.completedSteps = [
    'project', 'room', 'obstacles', 'limits', 'preferences', 
    'materials', 'hardware', 'construction', 'pricing'
  ];

  return project;
};
