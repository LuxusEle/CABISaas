import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveCollisions,
  autoFillZone,
  generateProjectBOM,
  createNewProject,
  calculateProjectCost
} from './bomService';
import { Project, Zone, CabinetType, PresetType, CabinetUnit, Obstacle, ProjectSettings } from '../types';

describe('bomService', () => {
  describe('resolveCollisions', () => {
    it('should resolve overlapping cabinets by pushing the second one', () => {
      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [],
        cabinets: [
          { id: '1', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 },
          { id: '2', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 100 }, // overlaps with first
        ]
      };

      const result = resolveCollisions(zone);

      expect(result.cabinets[0].fromLeft).toBe(0);
      expect(result.cabinets[1].fromLeft).toBe(600);
    });

    it('should not modify non-overlapping cabinets', () => {
      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [],
        cabinets: [
          { id: '1', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 },
          { id: '2', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 700 },
        ]
      };

      const result = resolveCollisions(zone);

      expect(result.cabinets[0].fromLeft).toBe(0);
      expect(result.cabinets[1].fromLeft).toBe(700);
    });

    it('should chain pushes when multiple cabinets overlap', () => {
      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [],
        cabinets: [
          { id: '1', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 },
          { id: '2', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 200 },
          { id: '3', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 400 },
        ]
      };

      const result = resolveCollisions(zone);

      expect(result.cabinets[0].fromLeft).toBe(0);
      expect(result.cabinets[1].fromLeft).toBe(600);
      expect(result.cabinets[2].fromLeft).toBe(1200);
    });

    it('should NOT push cabinets of different types (Base and Wall) if they overlap', () => {
      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [],
        cabinets: [
          { id: 'b1', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0, label: 'B01' },
          { id: 'w1', preset: PresetType.WALL_STD, type: CabinetType.WALL, width: 600, qty: 1, fromLeft: 0, label: 'W01' },
        ]
      };

      const result = resolveCollisions(zone);

      const b01 = result.cabinets.find(c => c.label === 'B01');
      const w01 = result.cabinets.find(c => c.label === 'W01');

      expect(b01?.fromLeft).toBe(0);
      expect(w01?.fromLeft).toBe(0);
    });

    it('should push any cabinet if a Tall cabinet overlaps it', () => {
      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [],
        cabinets: [
          { id: 't1', preset: PresetType.TALL_UTILITY, type: CabinetType.TALL, width: 600, qty: 1, fromLeft: 0, label: 'T01' },
          { id: 'w1', preset: PresetType.WALL_STD, type: CabinetType.WALL, width: 600, qty: 1, fromLeft: 0, label: 'W01' },
        ]
      };

      const result = resolveCollisions(zone);

      const t01 = result.cabinets.find(c => c.label === 'T01');
      const w01 = result.cabinets.find(c => c.label === 'W01');

      expect(t01?.fromLeft).toBe(0);
      expect(w01?.fromLeft).toBe(600);
    });
  });

  describe('createNewProject', () => {
    it('should create a new project with default values', () => {
      const project = createNewProject();

      expect(project.id).toBeDefined();
      expect(project.name).toBe('New Kitchen');
      expect(project.zones).toHaveLength(1);
      expect(project.zones[0].id).toBe('Wall A');
      expect(project.settings.currency).toBe('LKR');
    });

    it('should have valid default settings', () => {
      const project = createNewProject();

      expect(project.settings.baseHeight).toBe(720);
      expect(project.settings.wallHeight).toBe(720);
      expect(project.settings.tallHeight).toBe(2100);
      expect(project.settings.thickness).toBe(16);
      expect(project.settings.sheetWidth).toBe(1220);
      expect(project.settings.sheetLength).toBe(2440);
    });
  });

  describe('generateProjectBOM', () => {
    it('should return empty groups for empty project', () => {
      const project = createNewProject();
      const result = generateProjectBOM(project);

      expect(result.groups).toHaveLength(0);
      expect(result.cabinetCount).toBe(0);
    });

    it('should generate BOM items for a single cabinet', () => {
      const project: Project = {
        ...createNewProject(),
        zones: [{
          id: 'Wall A',
          active: true,
          totalLength: 3000,
          wallHeight: 2400,
          obstacles: [],
          cabinets: [{
            id: '1',
            preset: PresetType.BASE_DOOR,
            type: CabinetType.BASE,
            width: 600,
            qty: 1,
            fromLeft: 0,
            label: 'B01'
          }]
        }]
      };

      const result = generateProjectBOM(project);

      expect(result.cabinetCount).toBe(1);
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].items.length).toBeGreaterThan(0);
    });

    it('should skip filler panels in BOM', () => {
      const project: Project = {
        ...createNewProject(),
        zones: [{
          id: 'Wall A',
          active: true,
          totalLength: 3000,
          wallHeight: 2400,
          obstacles: [],
          cabinets: [
            {
              id: '1',
              preset: PresetType.BASE_DOOR,
              type: CabinetType.BASE,
              width: 600,
              qty: 1,
              fromLeft: 0,
              isAutoFilled: true
            },
            {
              id: '2',
              preset: PresetType.FILLER,
              type: CabinetType.BASE,
              width: 50,
              qty: 1,
              fromLeft: 600,
              isAutoFilled: true
            }
          ]
        }]
      };

      const result = generateProjectBOM(project);

      expect(result.cabinetCount).toBe(1);
      expect(result.groups[0].cabinetName).not.toContain('Filler');
    });

    it('should calculate total area correctly', () => {
      const project: Project = {
        ...createNewProject(),
        zones: [{
          id: 'Wall A',
          active: true,
          totalLength: 3000,
          wallHeight: 2400,
          obstacles: [],
          cabinets: [{
            id: '1',
            preset: PresetType.BASE_DOOR,
            type: CabinetType.BASE,
            width: 600,
            qty: 1,
            fromLeft: 0
          }]
        }]
      };

      const result = generateProjectBOM(project);

      expect(result.totalArea).toBeGreaterThan(0);
      expect(result.totalLinearFeet).toBeGreaterThan(0);
    });
  });

  describe('autoFillZone', () => {
    it('should add cabinets to empty zone', () => {
      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [],
        cabinets: []
      };
      const settings = createNewProject().settings;

      const result = autoFillZone(zone, settings, 'Wall A');

      expect(result.cabinets.length).toBeGreaterThan(0);
    });

    it('should not place cabinets over doors', () => {
      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [
          { id: 'door1', type: 'door', fromLeft: 1000, width: 800, height: 2100 }
        ],
        cabinets: []
      };
      const settings = createNewProject().settings;

      const result = autoFillZone(zone, settings, 'Wall A');

      const door = zone.obstacles[0];
      const hasOverlap = result.cabinets.some(cab =>
        cab.fromLeft < door.fromLeft + door.width && cab.fromLeft + cab.width > door.fromLeft
      );
      expect(hasOverlap).toBe(false);
    });

    it('should preserve existing manual cabinets', () => {
      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [],
        cabinets: [
          { id: 'manual1', preset: PresetType.SINK_UNIT, type: CabinetType.BASE, width: 900, qty: 1, fromLeft: 500, isAutoFilled: false }
        ]
      };
      const settings = createNewProject().settings;

      const result = autoFillZone(zone, settings, 'Wall A');

      expect(result.cabinets.some(c => c.id === 'manual1')).toBe(true);
    });

    it('should assign sequential labels to new cabinets', () => {
      const zone: Zone = {
        id: 'Wall A',
        active: true,
        totalLength: 3000,
        wallHeight: 2400,
        obstacles: [],
        cabinets: []
      };
      const settings = createNewProject().settings;

      const result = autoFillZone(zone, settings, 'Wall A');

      const baseCabs = result.cabinets.filter(c => c.type === CabinetType.BASE);
      const wallCabs = result.cabinets.filter(c => c.type === CabinetType.WALL);

      if (baseCabs.length > 0) {
        expect(baseCabs.every(c => c.label?.startsWith('B'))).toBe(true);
      }
      if (wallCabs.length > 0) {
        expect(wallCabs.every(c => c.label?.startsWith('W'))).toBe(true);
      }
    });
  });

  describe('calculateProjectCost', () => {
    it('should calculate cost breakdown', () => {
      const project = createNewProject();
      const bomResult = generateProjectBOM(project);
      const cutPlan = {
        sheets: [{ id: '1', material: '16mm White', width: 1220, length: 2440, parts: [], waste: 15 }],
        totalSheets: 1,
        totalWaste: 15
      };

      const result = calculateProjectCost(bomResult, cutPlan as any, project.settings);

      expect(result.materialCost).toBeGreaterThanOrEqual(0);
      expect(result.hardwareCost).toBeGreaterThanOrEqual(0);
      expect(result.laborCost).toBeGreaterThanOrEqual(0);
      expect(result.subtotal).toBe(result.materialCost + result.hardwareCost + result.laborCost);
      expect(result.totalPrice).toBe(result.subtotal + result.margin);
    });
  });
});
