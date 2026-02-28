import React, { useState, useEffect } from 'react';
import { SheetType, sheetTypeService } from '../services/sheetTypeService';
import { Layers, Box, Circle, Square, Settings2, ChevronDown, ChevronUp } from 'lucide-react';

interface MaterialAllocationPanelProps {
  settings: ProjectSettings;
  onUpdate: (settings: Partial<ProjectSettings>) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const MaterialAllocationPanel: React.FC<MaterialAllocationPanelProps> = ({
  settings,
  onUpdate,
  isExpanded: externalExpanded,
  onToggle
}) => {
  const [sheetTypes, setSheetTypes] = useState<SheetType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // Use external state if provided, otherwise use internal
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  
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
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            <Settings2 className="text-purple-500" /> Material Allocation by Part Type
          </h3>
          <button className="p-2 text-slate-400">
            <ChevronDown size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        onClick={() => {
          if (onToggle) {
            onToggle();
          } else {
            setInternalExpanded(!internalExpanded);
          }
        }}
      >
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
          <Settings2 className="text-purple-500" /> Material Allocation by Part Type
        </h3>
        <button className={`p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown size={20} />
        </button>
      </div>

      {/* Content - Collapsible with animation */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 pt-0">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Assign materials to different cabinet components. Each material type will be optimized separately.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b dark:border-slate-700">
                  <th className="px-3 py-3 text-left font-bold">Component</th>
                  <th className="px-3 py-3 text-left font-bold">Description</th>
                  <th className="px-3 py-3 text-left font-bold">Material</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {/* Carcass Material */}
                <tr className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-blue-500" />
                      <span className="text-slate-900 dark:text-white font-bold">Carcass (Box)</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-500 text-xs">Sides, top, bottom panels</td>
                  <td className="px-3 py-4">
                    <select
                      value={allocation.carcassMaterial}
                      onChange={(e) => handleChange('carcassMaterial', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="">Select material...</option>
                      {sheetTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name} ({type.thickness}mm)
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>

                {/* Door Material */}
                <tr className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <Square className="w-4 h-4 text-green-500" />
                      <span className="text-slate-900 dark:text-white font-bold">Front Doors</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-500 text-xs">Cabinet door fronts</td>
                  <td className="px-3 py-4">
                    <select
                      value={allocation.doorMaterial}
                      onChange={(e) => handleChange('doorMaterial', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="">Select material...</option>
                      {sheetTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name} ({type.thickness}mm)
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>

                {/* Drawer Material */}
                <tr className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-500" />
                      <span className="text-slate-900 dark:text-white font-bold">Drawer Boxes</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-500 text-xs">Drawer bottoms and sides</td>
                  <td className="px-3 py-4">
                    <select
                      value={allocation.drawerMaterial}
                      onChange={(e) => handleChange('drawerMaterial', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="">Select material...</option>
                      {sheetTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name} ({type.thickness}mm)
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>

                {/* Back Panel Material */}
                <tr className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4 text-purple-500" />
                      <span className="text-slate-900 dark:text-white font-bold">Back Panels</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-500 text-xs">Cabinet back panels</td>
                  <td className="px-3 py-4">
                    <select
                      value={allocation.backMaterial}
                      onChange={(e) => handleChange('backMaterial', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="">Select material...</option>
                      {sheetTypes.filter(t => t.thickness <= 6).map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name} ({type.thickness}mm)
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>

                {/* Shelf Material */}
                <tr className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-500" />
                      <span className="text-slate-900 dark:text-white font-bold">Shelves</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-500 text-xs">Adjustable and fixed shelves</td>
                  <td className="px-3 py-4">
                    <select
                      value={allocation.shelfMaterial}
                      onChange={(e) => handleChange('shelfMaterial', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="">Select material...</option>
                      <option value="">Same as Carcass ({allocation.carcassMaterial || 'Not set'})</option>
                      {sheetTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name} ({type.thickness}mm)
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <h4 className="text-sm font-black text-purple-900 dark:text-purple-400 mb-2 uppercase tracking-wide">
              How This Works
            </h4>
            <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
              <li>• BOM will group parts by material type</li>
              <li>• Cut optimization runs separately for each material</li>
              <li>• Sheet counts and costs calculated per material</li>
              <li>• Individual cabinet settings override these defaults</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

import { ProjectSettings } from '../types';
