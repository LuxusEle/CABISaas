import { Project } from '../types';
import { createNewProject } from '../services/bomService';
import { generateRubyLayout } from '../services/layoutSolver';

/**
 * Creates a "Master Showcase" demo project using the Layout Solver.
 * This ensures all cabinets are logically placed and professionally finished
 * using the system's own design intelligence.
 */
export const createDemoProject = (companyName: string = 'Demo Kitchens'): Project => {
  // 1. Initialize Project Shell
  let project = createNewProject();
  project.name = 'AI-Powered Master Kitchen';
  project.company = companyName;

  // 2. Setup Walls & Obstacles
  // Ensure we have exactly 2 active zones for an L-shape
  project.zones = [
    { id: 'Wall A', active: true, totalLength: 3000, wallHeight: 2400, obstacles: [], cabinets: [] },
    { id: 'Wall B', active: true, totalLength: 2600, wallHeight: 2400, obstacles: [], cabinets: [] }
  ];

  // Add Window on Wall A
  project.zones[0].obstacles = [
    {
      id: 'demo-window',
      type: 'window',
      fromLeft: 900,
      width: 1000,
      height: 900,
      sillHeight: 1050
    }
  ];

  // Add Column on Wall B (showing corner collision handling)
  project.zones[1].obstacles = [
    {
      id: 'demo-column',
      type: 'column',
      fromLeft: 0,
      width: 100,
      height: 2400,
      depth: 100
    },
    {
      id: 'demo-door',
      type: 'door',
      fromLeft: 1800,
      width: 800,
      height: 2100
    }
  ];

  // 3. Set Layout Preferences (The "Instructions" for the AI)
  project.settings.layoutPreferences = {
    includeTall: true,
    includeSink: true,
    includeCooker: true,
    includeDrawers: true
  };

  // 4. Global Styling & Advanced Features
  project.settings.advancedTestingSettings = {
    enableGola: true,
    showDifferentPanelColors: false,
  };

  project.settings.materialSettings = {
    ...project.settings.materialSettings,
    carcassMaterial: 'Anthracite Grey',
    doorMaterial: 'Natural Oak',
    backsplashMaterial: 'White subway tile',
    textureUrls: {
      'Natural Oak': 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=2000',
      'Countertop': 'https://images.unsplash.com/photo-1590274853856-f22d5ee3d228?auto=format&fit=crop&q=80&w=2000', // Marble
      'backsplash': '/tile.jpg'
    }
  };

  // 5. RUN THE LAYOUT SOLVER
  // This automatically places corners, anchors, and fills the rest professionally.
  const result = generateRubyLayout(project);
  project = result.project;

  // 6. Final State: Mark as completed to bypass the wizard
  project.settings.completedSteps = [
    'project', 'room', 'obstacles', 'limits', 'preferences', 
    'materials', 'hardware', 'construction', 'pricing'
  ];

  // 7. Add sample costs for the "Financial WOW"
  project.settings.costs = {
    pricePerSheet: 125,
    pricePerHardwareUnit: 15,
    laborCost: 1500,
    marginPercent: 45,
    transportCost: 350
  };

  return project;
};
