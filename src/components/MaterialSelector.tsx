import React, { useState, useEffect } from 'react';
import { SheetType, sheetTypeService } from '../services/sheetTypeService';
import { CabinetMaterials } from '../types';
import { Layers, ChevronDown } from 'lucide-react';

interface MaterialSelectorProps {
  materials?: CabinetMaterials;
  onChange: (materials: CabinetMaterials) => void;
}

export const MaterialSelector: React.FC<MaterialSelectorProps> = ({ materials = {}, onChange }) => {
  const [sheetTypes, setSheetTypes] = useState<SheetType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadSheetTypes();
  }, []);

  const loadSheetTypes = async () => {
    setIsLoading(true);
    const types = await sheetTypeService.getSheetTypes();
    setSheetTypes(types);
    setIsLoading(false);
  };

  const handleMaterialChange = (field: keyof CabinetMaterials, value: string) => {
    onChange({
      ...materials,
      [field]: value
    });
  };

  // Group sheet types by thickness for better organization
  const groupedTypes = sheetTypes.reduce((acc, type) => {
    if (!acc[type.thickness]) acc[type.thickness] = [];
    acc[type.thickness].push(type);
    return acc;
  }, {} as Record<number, SheetType[]>);

  if (isLoading) {
    return <div className="text-xs text-slate-500">Loading materials...</div>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        <Layers size={16} className="text-amber-500" />
        <span className="hidden sm:inline">Materials</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-4">
            <h4 className="text-sm font-bold mb-3 text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={16} className="text-amber-500" />
              Select Materials
            </h4>

            {/* Carcass Material */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Carcass Material (Sides, Bottom, Top)
              </label>
              <select
                value={(materials as CabinetMaterials).carcassMaterial || ''}
                onChange={(e) => handleMaterialChange('carcassMaterial', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">Auto (based on thickness)</option>
                {Object.entries(groupedTypes).map(([thickness, types]) => (
                  <optgroup key={thickness} label={`${thickness}mm`}>
                    {(types as SheetType[]).map((type) => (
                      <option key={type.id} value={type.name}>
                        {type.name} - ${type.price_per_sheet.toFixed(2)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Back Panel Material */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Back Panel Material
              </label>
              <select
                value={(materials as CabinetMaterials).backPanelMaterial || ''}
                onChange={(e) => handleMaterialChange('backPanelMaterial', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">Auto (6mm MDF)</option>
                {sheetTypes
                  .filter(t => t.thickness <= 6)
                  .map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name} - ${type.price_per_sheet.toFixed(2)}
                    </option>
                  ))}
              </select>
            </div>

            {/* Drawer Material */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Drawer Material
              </label>
              <select
                value={(materials as CabinetMaterials).drawerMaterial || ''}
                onChange={(e) => handleMaterialChange('drawerMaterial', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">Auto (16mm)</option>
                {sheetTypes
                  .filter(t => t.thickness >= 16)
                  .map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name} - ${type.price_per_sheet.toFixed(2)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
