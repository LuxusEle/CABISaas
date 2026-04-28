import React from 'react';
import { Box, Layers, Maximize } from 'lucide-react';
import { CabinetType, PresetType, ProjectSettings } from '../types';

interface CabinetPreviewCardProps {
  type: 'base' | 'wall' | 'tall';
  settings: ProjectSettings;
  onClick: () => void;
}

const getCabinetInfo = (type: 'base' | 'wall' | 'tall', settings: ProjectSettings) => {
  switch (type) {
    case 'base':
      return {
        title: 'Base Cabinet',
        icon: Box,
        height: settings.baseHeight || 870,
        depth: settings.depthBase || 560,
        width: settings.widthBase || 600,
        panelThickness: settings.thickness || 18,
        toeKick: settings.toeKickHeight || 100,
        presets: [PresetType.BASE_DOOR, PresetType.BASE_DRAWER_3, PresetType.BASE_CORNER, PresetType.SINK_UNIT],
        color: 'bg-red-500'
      };
    case 'wall':
      return {
        title: 'Wall Cabinet',
        icon: Layers,
        height: settings.wallHeight || 720,
        depth: settings.depthWall || 300,
        width: settings.widthWall || 600,
        panelThickness: settings.thickness || 18,
        elevation: settings.wallCabinetElevation || 450,
        presets: [PresetType.WALL_STD, PresetType.WALL_CORNER, PresetType.HOOD_UNIT, PresetType.OPEN_BOX],
        color: 'bg-green-500'
      };
    case 'tall':
      return {
        title: 'Tall Cabinet',
        icon: Maximize,
        height: settings.tallHeight || 2100,
        depth: settings.depthTall || 600,
        width: settings.widthTall || 450,
        panelThickness: settings.thickness || 18,
        presets: [PresetType.TALL_OVEN, PresetType.TALL_UTILITY],
        color: 'bg-blue-500'
      };
  }
};

const getPresetDisplay = (preset: PresetType, width: number): string => {
  const RUBY_DOOR_THRESHOLD = 599.5;
  switch (preset) {
    case PresetType.BASE_DOOR:
      return width >= RUBY_DOOR_THRESHOLD ? '2 Doors' : '1 Door';
    case PresetType.BASE_DRAWER_3:
      return '3 Drawers';
    case PresetType.BASE_CORNER:
      return 'Corner';
    case PresetType.SINK_UNIT:
      return 'Sink';
    case PresetType.WALL_STD:
      return width >= RUBY_DOOR_THRESHOLD ? '2 Doors' : '1 Door';
    case PresetType.WALL_CORNER:
      return 'Corner';
    case PresetType.HOOD_UNIT:
      return 'Hood';
    case PresetType.OPEN_BOX:
      return 'Open';
    case PresetType.TALL_OVEN:
      return 'Oven';
    case PresetType.TALL_UTILITY:
      return 'Utility';
    default:
      return preset;
  }
};

export const CabinetPreviewCard: React.FC<CabinetPreviewCardProps> = ({ type, settings, onClick }) => {
  const info = getCabinetInfo(type, settings);
  const Icon = info.icon;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${info.color} text-white`}>
          <Icon size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">{info.title}</h3>
          <p className="text-xs text-slate-500">Click to edit</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Height:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{info.height}mm</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Width:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{info.width}mm</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Depth:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{info.depth}mm</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Panel:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{info.panelThickness}mm</span>
        </div>
        
        {type === 'base' && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Toe Kick:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{info.toeKick}mm</span>
          </div>
        )}
        
        {type === 'wall' && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Elevation:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{info.elevation}mm</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 mb-2">Presets:</p>
        <div className="flex flex-wrap gap-1">
          {info.presets.map((preset) => (
            <span
              key={preset}
              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded"
            >
              {getPresetDisplay(preset, info.width)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
