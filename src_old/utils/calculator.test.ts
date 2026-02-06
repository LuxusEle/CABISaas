import { describe, it, expect } from 'vitest';
import { calculateBOM } from './calculator';
import { CabinetType } from '../types';

describe('calculateBOM', () => {
    it('calculates BASE cabinet correctly', () => {
        const input = {
            type: CabinetType.BASE,
            width: 600,
            height: 720,
            depth: 560,
            thickness: 18,
            shelfCount: 1,
            hasBack: true
        };

        const result = calculateBOM(input);

        // Sides: (Height - 100 toe kick) x Depth = 620 x 560
        const side = result.panels.find(p => p.name === 'Side Panel');
        expect(side?.height).toBeUndefined(); // It's dim1 and dim2
        expect(side?.dim1).toBe(620);
        expect(side?.dim2).toBe(560);

        // Bottom: (Width - 2 * thickness) x Depth = (600 - 36) x 560 = 564 x 560
        const bottom = result.panels.find(p => p.name === 'Bottom Panel');
        expect(bottom?.dim1).toBe(564);
        expect(bottom?.dim2).toBe(560);
    });

    it('calculates WALL cabinet correctly', () => {
        const input = {
            type: CabinetType.WALL,
            width: 800,
            height: 600,
            depth: 300,
            thickness: 18,
            shelfCount: 1,
            hasBack: true
        };

        const result = calculateBOM(input);

        // Sides: 600 x 300
        const side = result.panels.find(p => p.name === 'Side Panel');
        expect(side?.dim1).toBe(600);
        expect(side?.dim2).toBe(300);

        // Top/Bottom: (800 - 36) x 300 = 764 x 300
        const topBottom = result.panels.find(p => p.name === 'Top/Bottom Panel');
        expect(topBottom?.qty).toBe(2);
        expect(topBottom?.dim1).toBe(764);
        expect(topBottom?.dim2).toBe(300);
    });

    it('calculates TALL cabinet correctly', () => {
        const input = {
            type: CabinetType.TALL,
            width: 600,
            height: 2100,
            depth: 560,
            thickness: 18,
            shelfCount: 3,
            hasBack: true
        };

        const result = calculateBOM(input);

        // Total panels: 2 Sides + 2 Top/Bottom + 1 Fixed Shelf + 3 Shelves + 1 Back = 9
        expect(result.panels.length).toBe(9);
    });
});
