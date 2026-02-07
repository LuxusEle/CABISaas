import React from 'react';
import { Zap } from 'lucide-react';
import { CabinetType, CabinetUnit, PresetType, Obstacle } from '../types';

interface SequentialBoxInputProps {
    zone: {
        id: string;
        totalLength: number;
        cabinets: CabinetUnit[];
        obstacles: Obstacle[];
    };
    onAddCabinets: (cabinets: CabinetUnit[]) => void;
}

interface PresetButton {
    label: string;
    preset: PresetType;
    width: number;
    pairedPreset?: PresetType; // Auto-add this to the OTHER row
    pairedWidth?: number;
}

const BASE_PRESETS: PresetButton[] = [
    { label: 'Open 350', preset: PresetType.OPEN_BOX, width: 350 },
    { label: '2-Door 600', preset: PresetType.BASE_DOOR, width: 600 },
    { label: '3-Drawer 600', preset: PresetType.BASE_DRAWER_3, width: 600 },
    { label: 'Sink 900', preset: PresetType.SINK_UNIT, width: 900 },
    { label: 'Cooker Hob 600', preset: PresetType.COOKER_HOB, width: 600, pairedPreset: PresetType.HOOD_UNIT, pairedWidth: 600 },
    { label: 'Corner', preset: PresetType.BASE_CORNER, width: 900 },
];

const WALL_PRESETS: PresetButton[] = [
    { label: 'Open 350', preset: PresetType.OPEN_BOX, width: 350 },
    { label: 'Standard 600', preset: PresetType.WALL_STD, width: 600 },
    { label: 'Standard 900', preset: PresetType.WALL_STD, width: 900 },
    { label: 'Cooker Hood 600', preset: PresetType.HOOD_UNIT, width: 600, pairedPreset: PresetType.COOKER_HOB, pairedWidth: 600 },
];

export const SequentialBoxInput: React.FC<SequentialBoxInputProps> = ({ zone, onAddCabinets }) => {
    // Calculate current positions for BASE and WALL rows
    const getRowInfo = (type: CabinetType) => {
        const cabinets = zone.cabinets.filter(c => c.type === type);
        const obstacles = zone.obstacles.filter(o => o.type === 'door' || o.type === 'column');

        // Find the rightmost occupied point
        let occupiedEnd = 0;
        cabinets.forEach(c => {
            occupiedEnd = Math.max(occupiedEnd, c.fromLeft + c.width);
        });
        obstacles.forEach(o => {
            occupiedEnd = Math.max(occupiedEnd, o.fromLeft + o.width);
        });

        // Find next valid start position (after obstacles)
        let nextStart = occupiedEnd;
        obstacles.forEach(o => {
            if (o.fromLeft <= nextStart && o.fromLeft + o.width > nextStart) {
                nextStart = o.fromLeft + o.width;
            }
        });

        return {
            nextPosition: nextStart,
            remaining: Math.max(0, zone.totalLength - nextStart),
            count: cabinets.length
        };
    };

    const baseInfo = getRowInfo(CabinetType.BASE);
    const wallInfo = getRowInfo(CabinetType.WALL);

    const handleAddBox = (type: CabinetType, preset: PresetButton) => {
        const info = type === CabinetType.BASE ? baseInfo : wallInfo;

        if (preset.width > info.remaining) {
            return; // Not enough space
        }

        const newCabinets: CabinetUnit[] = [];

        // Add the main cabinet
        const mainCabinet: CabinetUnit = {
            id: Math.random().toString(),
            preset: preset.preset,
            type,
            width: preset.width,
            qty: 1,
            fromLeft: info.nextPosition,
            isAutoFilled: false
        };
        newCabinets.push(mainCabinet);

        // Auto-pair: If this has a paired preset (Hood↔Hob), add the paired cabinet
        if (preset.pairedPreset && preset.pairedWidth) {
            const pairedType = type === CabinetType.BASE ? CabinetType.WALL : CabinetType.BASE;
            const pairedInfo = pairedType === CabinetType.BASE ? baseInfo : wallInfo;

            if (preset.pairedWidth <= pairedInfo.remaining) {
                const pairedCabinet: CabinetUnit = {
                    id: Math.random().toString(),
                    preset: preset.pairedPreset,
                    type: pairedType,
                    width: preset.pairedWidth,
                    qty: 1,
                    fromLeft: pairedInfo.nextPosition,
                    isAutoFilled: false
                };
                newCabinets.push(pairedCabinet);
            }
        }

        onAddCabinets(newCabinets);
    };

    const handleFillRemainder = (type: CabinetType) => {
        const info = type === CabinetType.BASE ? baseInfo : wallInfo;
        const standardWidths = [900, 600, 450, 300];
        const newCabinets: CabinetUnit[] = [];

        let remaining = info.remaining;
        let currentPos = info.nextPosition;

        while (remaining >= 150) {
            const bestWidth = standardWidths.find(w => w <= remaining) || remaining;
            if (bestWidth < 100) break;

            newCabinets.push({
                id: Math.random().toString(),
                preset: type === CabinetType.BASE ? PresetType.BASE_DOOR : PresetType.WALL_STD,
                type,
                width: bestWidth,
                qty: 1,
                fromLeft: currentPos,
                isAutoFilled: true
            });

            currentPos += bestWidth;
            remaining -= bestWidth;
        }

        if (newCabinets.length > 0) {
            onAddCabinets(newCabinets);
        }
    };

    return (
        <div className="bg-slate-900 rounded-xl p-4 space-y-4 border border-amber-500/30">
            <div className="flex items-center justify-between">
                <h3 className="text-amber-500 font-bold text-sm flex items-center gap-2">
                    <Zap size={16} /> Sequential Builder
                </h3>
                <span className="text-slate-500 text-xs">Left → Right</span>
            </div>

            {/* WALL ROW */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Top (Wall)</span>
                    <span className="text-xs text-amber-500 font-mono">{wallInfo.remaining}mm left</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                    {WALL_PRESETS.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => handleAddBox(CabinetType.WALL, p)}
                            disabled={p.width > wallInfo.remaining}
                            className={`px-2 py-1.5 text-[10px] font-bold rounded border transition-all ${p.width > wallInfo.remaining
                                ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                                : p.pairedPreset
                                    ? 'border-purple-500 text-purple-400 hover:bg-purple-900/30'
                                    : 'border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-amber-500'
                                }`}
                        >
                            {p.label}
                            {p.pairedPreset && <span className="ml-1 text-purple-300">⚡</span>}
                        </button>
                    ))}
                    <button
                        onClick={() => handleFillRemainder(CabinetType.WALL)}
                        disabled={wallInfo.remaining < 150}
                        className="px-3 py-1.5 text-[10px] font-bold rounded bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Fill Rest
                    </button>
                </div>
            </div>

            {/* BASE ROW */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Bottom (Base)</span>
                    <span className="text-xs text-amber-500 font-mono">{baseInfo.remaining}mm left</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                    {BASE_PRESETS.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => handleAddBox(CabinetType.BASE, p)}
                            disabled={p.width > baseInfo.remaining}
                            className={`px-2 py-1.5 text-[10px] font-bold rounded border transition-all ${p.width > baseInfo.remaining
                                ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                                : p.pairedPreset
                                    ? 'border-purple-500 text-purple-400 hover:bg-purple-900/30'
                                    : 'border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-amber-500'
                                }`}
                        >
                            {p.label}
                            {p.pairedPreset && <span className="ml-1 text-purple-300">⚡</span>}
                        </button>
                    ))}
                    <button
                        onClick={() => handleFillRemainder(CabinetType.BASE)}
                        disabled={baseInfo.remaining < 150}
                        className="px-3 py-1.5 text-[10px] font-bold rounded bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Fill Rest
                    </button>
                </div>
            </div>

            <div className="text-[9px] text-slate-500 pt-2 border-t border-slate-800">
                <span className="text-purple-400">⚡</span> = Auto-pairs Hood ↔ Hob
            </div>
        </div>
    );
};
