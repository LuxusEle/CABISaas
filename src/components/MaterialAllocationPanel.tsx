import React, { useState, useEffect } from 'react';
import { SheetType, sheetTypeService } from '../services/sheetTypeService';
import { Layers, Box, Circle, Square, Save } from 'lucide-react';

interface MaterialAllocationPanelProps {
  settings: ProjectSettings;
  onUpdate: (settings: Partial<ProjectSettings>) => void;
}

export const MaterialAllocationPanel: React.FC<MaterialAllocationPanelProps> = ({
  settings,
  onUpdate
}) => {
  const [sheetTypes, setSheetTypes] = useState<SheetType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [allocation, setAllocation] = useState({
    carcassMaterial: settings.materialSettings?.carcassMaterial || '',
    doorMaterial: settings.materialSettings?.doorMaterial || '',
    drawerMaterial: settings.materialSettings?.drawerMaterial || '',
    backMaterial: settings.materialSettings?.backMaterial || '',
    shelfMaterial: settings.materialSettings?.shelfMaterial || ''
  });

  useEffect(() => {
    loadSheetTypes();
  }, []);

  const loadSheetTypes = async () => {
    setIsLoading(true);
    const types = await sheetTypeService.getSheetTypes();
    setSheetTypes(types);
    setIsLoading(false);
  };

  const handleChange = (field: keyof typeof allocation, value: string) => {
    const newAllocation = { ...allocation, [field]: value };
    setAllocation(newAllocation);
    
    onUpdate({
      materialSettings: {
        ...settings.materialSettings,
        ...newAllocation,
        sheetSpecs: settings.materialSettings?.sheetSpecs || {}
      }
    });
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading materials...</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-amber-500" />
        Material Allocation by Part Type
      </h3>
      
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Assign materials to different cabinet components. Each material type will be optimized separately.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Carcass Material */}
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <Box className="w-4 h-4 text-blue-500" />
            Carcass (Box)
          </label>
          <p className="text-xs text-slate-500 mb-2">Sides, top, bottom panels</p>
          <select
            value={allocation.carcassMaterial}
            onChange={(e) => handleChange('carcassMaterial', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">Select material...</option>
            {sheetTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name} ({type.thickness}mm)
              </option>
            ))}
          </select>
        </div>

        {/* Door Material */}
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <Square className="w-4 h-4 text-green-500" />
            Front Doors
          </label>
          <p className="text-xs text-slate-500 mb-2">Cabinet door fronts</p>
          <select
            value={allocation.doorMaterial}
            onChange={(e) => handleChange('doorMaterial', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">Select material...</option>
            {sheetTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name} ({type.thickness}mm)
              </option>
            ))}
          </select>
        </div>

        {/* Drawer Material */}
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <Layers className="w-4 h-4 text-amber-500" />
            Drawer Boxes
          </label>
          <p className="text-xs text-slate-500 mb-2">Drawer bottoms and sides</p>
          <select
            value={allocation.drawerMaterial}
            onChange={(e) => handleChange('drawerMaterial', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">Select material...</option>
            {sheetTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name} ({type.thickness}mm)
              </option>
            ))}
          </select>
        </div>

        {/* Back Panel Material */}
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <Circle className="w-4 h-4 text-purple-500" />
            Back Panels
          </label>
          <p className="text-xs text-slate-500 mb-2">Cabinet back panels</p>
          <select
            value={allocation.backMaterial}
            onChange={(e) => handleChange('backMaterial', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">Select material...</option>
            {sheetTypes.filter(t => t.thickness <= 6).map((type) => (
              <option key={type.id} value={type.name}>
                {type.name} ({type.thickness}mm)
              </option>
            ))}
          </select>
        </div>

        {/* Shelf Material */}
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg md:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <Layers className="w-4 h-4 text-cyan-500" />
            Shelves
          </label>
          <p className="text-xs text-slate-500 mb-2">Adjustable and fixed shelves</p>
          <select
            value={allocation.shelfMaterial}
            onChange={(e) => handleChange('shelfMaterial', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">Select material...</option>
            <option value="{allocation.carcassMaterial}">Same as Carcass ({allocation.carcassMaterial || 'Not set'})</option>
            {sheetTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name} ({type.thickness}mm)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-400 mb-2">
          How This Works
        </h4>
        <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
          <li>• BOM will group parts by material type</li>
          <li>• Cut optimization runs separately for each material</li>
          <li>• Sheet counts and costs calculated per material</li>
          <li>• Individual cabinet settings override these defaults</li>
        </ul>
      </div>
    </div>
  );
};

import { ProjectSettings } from '../types';
