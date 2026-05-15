import { describe, it, expect } from 'vitest';
import { Project, CabinetType, PresetType } from '../types';
import { generateProjectBOM } from '../services/bomService';

describe('BOM Calculation Logic', () => {
  const mockProject: Project = {
    id: 'test-project',
    name: 'Test',
    designer: 'Antigravity',
    company: 'Refactor Lab',
    settings: {
      currency: 'USD',
      baseHeight: 870,
      wallHeight: 720,
      tallHeight: 2100,
      depthBase: 560,
      depthWall: 300,
      depthTall: 580,
      widthBase: 600,
      widthWall: 600,
      widthTall: 600,
      thickness: 18,
      counterThickness: 40,
      toeKickHeight: 100,
      kerf: 3,
      doorToDoorGap: 2,
      doorToPanelGap: 2,
      drawerToDrawerGap: 2,
      doorOuterGap: 3,
      doorInnerGap: 3,
      doorSideClearance: 3,
      grooveDepth: 5,
      backPanelThickness: 6,
      doorMaterialThickness: 18,
      wallCabinetElevation: 450,
      nailHoleDiameter: 3,
      nailHoleDepth: 10,
      shelfHoleDiameter: 5,
      nailHoleShelfDistance: 20,
      golaLCutoutHeight: 55,
      golaLCutoutDepth: 20,
      golaCCutoutHeight: 73.5,
      golaCutoutDepth: 20,
      drawerBackClearance: 20,
      costs: {
        pricePerSheet: 50,
        pricePerHardwareUnit: 5,
        laborCost: 100,
        marginPercent: 20,
        transportCost: 50
      }
    },
    zones: [
      {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [],
        cabinets: [
          {
            id: 'cab-1',
            type: CabinetType.BASE,
            width: 600,
            qty: 1,
            fromLeft: 0,
            preset: PresetType.BASE_DOOR
          }
        ]
      }
    ]
  };

  it('should calculate correct side panel dimensions for a standard base cabinet', () => {
    const { groups } = generateProjectBOM(mockProject);
    const bom = groups.flatMap(g => g.items);
    // In this app, side panels are named "Left Panel" and "Right Panel"
    const leftPanel = bom.find(p => p.name === 'Left Panel');
    
    // Height (870) - ToeKick (100) - Thickness (18) = 752
    expect(leftPanel?.length).toBe(752);
    expect(leftPanel?.width).toBe(mockProject.settings.depthBase);
  });

  it('should include correct quantity of carcass panels', () => {
    const { groups } = generateProjectBOM(mockProject);
    const bom = groups.flatMap(g => g.items);
    const sidePanels = bom.filter(p => p.name.includes('Panel') && p.category === 'carcass');
    
    // Standard cabinet has: Left Panel, Right Panel, Bottom Panel = 3 carcass panels
    // (Back Panel is category 'back')
    expect(sidePanels.length).toBe(3);
  });
});
