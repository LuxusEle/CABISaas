import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Save } from 'lucide-react';
import { ProjectSettings, PresetType, CabinetType } from '../types';
import { SingleCabinetViewer } from './SingleCabinetViewer';

interface CabinetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cabinetType: 'base' | 'wall' | 'tall';
  settings: ProjectSettings;
  onSave: (newSettings: ProjectSettings) => void;
  isDark?: boolean;
}

const PRESETS_BY_TYPE = {
  base: [
    { value: PresetType.BASE_DOOR, label: 'Base 2-Door' },
    { value: PresetType.BASE_DRAWER_3, label: 'Base 3-Drawer' },
    { value: PresetType.BASE_CORNER, label: 'Base Corner' },
    { value: PresetType.SINK_UNIT, label: 'Sink Unit' },
    { value: PresetType.COOKER_HOB, label: 'Cooker Hob' },
  ],
  wall: [
    { value: PresetType.WALL_STD, label: 'Wall Standard' },
    { value: PresetType.WALL_CORNER, label: 'Wall Corner' },
    { value: PresetType.HOOD_UNIT, label: 'Cooker Hood' },
    { value: PresetType.OPEN_BOX, label: 'Open Box' },
  ],
  tall: [
    { value: PresetType.TALL_OVEN, label: 'Tall Oven/Micro' },
    { value: PresetType.TALL_UTILITY, label: 'Tall Utility' },
  ],
};

const getDefaultPreset = (type: 'base' | 'wall' | 'tall'): PresetType => {
  switch (type) {
    case 'base': return PresetType.BASE_DOOR;
    case 'wall': return PresetType.WALL_STD;
    case 'tall': return PresetType.TALL_OVEN;
  }
};

export const CabinetEditModal: React.FC<CabinetEditModalProps> = ({
  isOpen,
  onClose,
  cabinetType,
  settings,
  onSave,
  isDark = true,
}) => {
  const [localSettings, setLocalSettings] = useState<ProjectSettings>(settings);
  const [selectedPreset, setSelectedPreset] = useState<PresetType>(getDefaultPreset(cabinetType));
  const [editingDimension, setEditingDimension] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<number>(0);

  useEffect(() => {
    setLocalSettings(settings);
    setSelectedPreset(getDefaultPreset(cabinetType));
  }, [settings, cabinetType, isOpen]);

  if (!isOpen) return null;

  const handleDimensionClick = (dimension: string) => {
    setEditingDimension(dimension);
    let currentValue = 0;
    switch (dimension) {
      case 'height':
        currentValue = cabinetType === 'tall' ? localSettings.tallHeight : 
                      cabinetType === 'wall' ? localSettings.wallHeight : 
                      localSettings.baseHeight;
        break;
      case 'width':
        currentValue = cabinetType === 'tall' ? localSettings.widthTall :
                      cabinetType === 'wall' ? localSettings.widthWall :
                      localSettings.widthBase;
        break;
      case 'depth':
        currentValue = cabinetType === 'tall' ? localSettings.depthTall :
                      cabinetType === 'wall' ? localSettings.depthWall :
                      localSettings.depthBase;
        break;
      case 'panelThickness':
        currentValue = localSettings.thickness;
        break;
      case 'toeKick':
        currentValue = localSettings.toeKickHeight;
        break;
      case 'wallElevation':
        currentValue = localSettings.wallCabinetElevation;
        break;
    }
    setTempValue(currentValue);
  };

  const handleSaveDimension = () => {
    if (!editingDimension) return;
    
    const newSettings = { ...localSettings };
    switch (editingDimension) {
      case 'height':
        if (cabinetType === 'tall') newSettings.tallHeight = tempValue;
        else if (cabinetType === 'wall') newSettings.wallHeight = tempValue;
        else newSettings.baseHeight = tempValue;
        break;
      case 'width':
        if (cabinetType === 'tall') newSettings.widthTall = tempValue;
        else if (cabinetType === 'wall') newSettings.widthWall = tempValue;
        else newSettings.widthBase = tempValue;
        break;
      case 'depth':
        if (cabinetType === 'tall') newSettings.depthTall = tempValue;
        else if (cabinetType === 'wall') newSettings.depthWall = tempValue;
        else newSettings.depthBase = tempValue;
        break;
      case 'panelThickness':
        newSettings.thickness = tempValue as 16 | 18 | 19;
        break;
      case 'toeKick':
        newSettings.toeKickHeight = tempValue;
        break;
      case 'wallElevation':
        newSettings.wallCabinetElevation = tempValue;
        break;
    }
    setLocalSettings(newSettings);
    setEditingDimension(null);
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setSelectedPreset(getDefaultPreset(cabinetType));
  };

  const title = cabinetType === 'base' ? 'Base Cabinet' : cabinetType === 'wall' ? 'Wall Cabinet' : 'Tall Cabinet';

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-t-[2rem] sm:rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 sm:zoom-in-95 sm:duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {title} Settings
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="h-64 md:h-auto md:w-1/2 p-4 relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
            {/* Dimension Labels around 3D viewer */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-4">
              <button
                onClick={() => handleDimensionClick('height')}
                className={`px-4 py-2 text-sm font-bold rounded shadow ${
                  editingDimension === 'height' 
                    ? 'bg-red-600 text-white ring-2 ring-red-300' 
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                H: {cabinetType === 'tall' ? localSettings.tallHeight : cabinetType === 'wall' ? localSettings.wallHeight : localSettings.baseHeight}mm
              </button>
              <button
                onClick={() => handleDimensionClick('width')}
                className={`px-4 py-2 text-sm font-bold rounded shadow ${
                  editingDimension === 'width' 
                    ? 'bg-red-600 text-white ring-2 ring-red-300' 
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                W: {cabinetType === 'tall' ? localSettings.widthTall : cabinetType === 'wall' ? localSettings.widthWall : localSettings.widthBase}mm
              </button>
            </div>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
              <button
                onClick={() => handleDimensionClick('depth')}
                className={`px-4 py-2 text-sm font-bold rounded shadow ${
                  editingDimension === 'depth' 
                    ? 'bg-red-600 text-white ring-2 ring-red-300' 
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                D: {cabinetType === 'tall' ? localSettings.depthTall : cabinetType === 'wall' ? localSettings.depthWall : localSettings.depthBase}mm
              </button>
            </div>
            {cabinetType === 'base' && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                <button
                  onClick={() => handleDimensionClick('toeKick')}
                  className={`px-4 py-2 text-sm font-bold rounded shadow ${
                    editingDimension === 'toeKick' 
                      ? 'bg-red-600 text-white ring-2 ring-red-300' 
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  Toe: {localSettings.toeKickHeight}mm
                </button>
              </div>
            )}
            {cabinetType === 'wall' && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                <button
                  onClick={() => handleDimensionClick('wallElevation')}
                  className={`px-4 py-2 text-sm font-bold rounded shadow ${
                    editingDimension === 'wallElevation' 
                      ? 'bg-red-600 text-white ring-2 ring-red-300' 
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  Elev: {localSettings.wallCabinetElevation}mm
                </button>
              </div>
            )}
            
            <SingleCabinetViewer
              cabinetType={cabinetType}
              preset={selectedPreset}
              settings={localSettings}
              onDimensionClick={handleDimensionClick}
              showDimensionLabels={false}
              editingDimension={editingDimension}
              lightTheme={!isDark}
            />
            <p className="text-xs text-slate-500 mt-2 text-center">
              Click the dimension buttons to edit
            </p>
          </div>

          <div className="flex-1 md:w-1/2 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Preset Type
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value as PresetType)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  {PRESETS_BY_TYPE[cabinetType].map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              {editingDimension && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Edit {editingDimension === 'wallElevation' ? 'Wall Elevation' : 
                           editingDimension.charAt(0).toUpperCase() + editingDimension.slice(1)}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={tempValue}
                      onChange={(e) => setTempValue(Number(e.target.value))}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    <button
                      onClick={handleSaveDimension}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={() => setEditingDimension(null)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white rounded-lg hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-medium text-slate-900 dark:text-white">Parameters</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Height (mm)</label>
                    <input
                      type="number"
                      value={cabinetType === 'tall' ? localSettings.tallHeight : 
                             cabinetType === 'wall' ? localSettings.wallHeight : 
                             localSettings.baseHeight}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const newSettings = { ...localSettings };
                        if (cabinetType === 'tall') newSettings.tallHeight = v;
                        else if (cabinetType === 'wall') newSettings.wallHeight = v;
                        else newSettings.baseHeight = v;
                        setLocalSettings(newSettings);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Width (mm)</label>
                    <input
                      type="number"
                      value={cabinetType === 'tall' ? localSettings.widthTall :
                             cabinetType === 'wall' ? localSettings.widthWall :
                             localSettings.widthBase}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const newSettings = { ...localSettings };
                        if (cabinetType === 'tall') newSettings.widthTall = v;
                        else if (cabinetType === 'wall') newSettings.widthWall = v;
                        else newSettings.widthBase = v;
                        setLocalSettings(newSettings);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Depth (mm)</label>
                    <input
                      type="number"
                      value={cabinetType === 'tall' ? localSettings.depthTall :
                             cabinetType === 'wall' ? localSettings.depthWall :
                             localSettings.depthBase}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const newSettings = { ...localSettings };
                        if (cabinetType === 'tall') newSettings.depthTall = v;
                        else if (cabinetType === 'wall') newSettings.depthWall = v;
                        else newSettings.depthBase = v;
                        setLocalSettings(newSettings);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Panel Thickness (mm)</label>
                    <input
                      type="number"
                      value={localSettings.thickness}
                      onChange={(e) => setLocalSettings({ ...localSettings, thickness: Number(e.target.value) as 16 | 18 | 19 })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  {cabinetType === 'base' && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Toe Kick (mm)</label>
                      <input
                        type="number"
                        value={localSettings.toeKickHeight}
                        onChange={(e) => setLocalSettings({ ...localSettings, toeKickHeight: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {cabinetType === 'wall' && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Wall Elevation (mm)</label>
                      <input
                        type="number"
                        value={localSettings.wallCabinetElevation}
                        onChange={(e) => setLocalSettings({ ...localSettings, wallCabinetElevation: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
