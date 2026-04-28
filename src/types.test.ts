import { describe, it, expect } from 'vitest';
import { CabinetType, PresetType, Zone, CabinetUnit, Obstacle, Project } from './types';

describe('types', () => {
  describe('CabinetType', () => {
    it('should have all required cabinet types', () => {
      expect(CabinetType.BASE).toBe('Base');
      expect(CabinetType.WALL).toBe('Wall');
      expect(CabinetType.TALL).toBe('Tall');
    });
  });

  describe('PresetType', () => {
    it('should have all required presets', () => {
      expect(PresetType.BASE_DOOR).toBe('Base 2-Door');
      expect(PresetType.BASE_DRAWER_3).toBe('Base 3-Drawer');
      expect(PresetType.WALL_STD).toBe('Wall Standard');
      expect(PresetType.SINK_UNIT).toBe('Sink Unit');
      expect(PresetType.FILLER).toBe('Filler Panel');
      expect(PresetType.OPEN_BOX).toBe('Open Box');
    });
  });

  describe('Zone interface', () => {
    it('should accept valid zone objects', () => {
      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [],
        cabinets: []
      };

      expect(zone.id).toBe('Wall A');
      expect(zone.active).toBe(true);
      expect(zone.totalLength).toBe(3000);
    });

    it('should accept cabinets and obstacles', () => {
      const cabinet: CabinetUnit = {
        id: 'cab1',
        preset: PresetType.BASE_DOOR,
        type: CabinetType.BASE,
        width: 600,
        qty: 1,
        fromLeft: 0
      };

      const obstacle: Obstacle = {
        id: 'obs1',
        type: 'window',
        fromLeft: 1500,
        width: 1200,
        height: 1500,
        sillHeight: 900
      };

      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [obstacle],
        cabinets: [cabinet]
      };

      expect(zone.cabinets).toHaveLength(1);
      expect(zone.obstacles).toHaveLength(1);
    });
  });

  describe('Obstacle types', () => {
    it('should accept door obstacle', () => {
      const door: Obstacle = {
        id: 'door1',
        type: 'door',
        fromLeft: 1000,
        width: 800,
        height: 2100
      };

      expect(door.type).toBe('door');
    });

    it('should accept window obstacle with sillHeight', () => {
      const window: Obstacle = {
        id: 'win1',
        type: 'window',
        fromLeft: 500,
        width: 1500,
        height: 1500,
        sillHeight: 900
      };

      expect(window.type).toBe('window');
      expect(window.sillHeight).toBe(900);
    });

    it('should accept column obstacle', () => {
      const column: Obstacle = {
        id: 'col1',
        type: 'column',
        fromLeft: 2000,
        width: 100,
        height: 2400
      };

      expect(column.type).toBe('column');
    });
  });

  describe('CabinetUnit', () => {
    it('should accept auto-filled cabinet', () => {
      const cabinet: CabinetUnit = {
        id: 'cab1',
        preset: PresetType.BASE_DOOR,
        type: CabinetType.BASE,
        width: 600,
        qty: 1,
        fromLeft: 0,
        isAutoFilled: true,
        label: 'B01'
      };

      expect(cabinet.isAutoFilled).toBe(true);
      expect(cabinet.label).toBe('B01');
    });

    it('should handle open box preset', () => {
      const openBox: CabinetUnit = {
        id: 'open1',
        preset: PresetType.OPEN_BOX,
        type: CabinetType.BASE,
        width: 350,
        qty: 1,
        fromLeft: 0
      };

      expect(openBox.preset).toBe(PresetType.OPEN_BOX);
    });
  });

  describe('Project interface', () => {
    it('should create valid project structure', () => {
      const project: Project = {
        id: 'proj1',
        name: 'Test Kitchen',
        designer: 'John Doe',
        company: 'Test Company',
        settings: {
          currency: 'USD',
          baseHeight: 720,
          wallHeight: 720,
          tallHeight: 2100,
          depthBase: 560,
          depthWall: 320,
          depthTall: 580,
          thickness: 16,
          counterThickness: 40,
          toeKickHeight: 150,
          widthBase: 600,
          widthWall: 600,
          widthTall: 600,
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
          kerf: 4,
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
            pricePerSheet: 85,
            pricePerHardwareUnit: 5,
            laborCost: 100,
            marginPercent: 50,
            transportCost: 50
          }
        },
        zones: []
      };

      expect(project.id).toBe('proj1');
      expect(project.settings.currency).toBe('USD');
      expect(project.settings.costs.marginPercent).toBe(50);
    });
  });
});
