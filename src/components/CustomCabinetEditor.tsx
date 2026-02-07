import React, { useState } from 'react';
import { X, Save, Plus, Minus } from 'lucide-react';
import { PresetType, CabinetType } from '../types';
import type { CustomCabinetConfig } from '../types';
import { customCabinetService, CreateCustomPresetInput } from '../services/customCabinetService';

interface CustomCabinetEditorProps {
  basePreset: PresetType;
  baseType: 'Base' | 'Wall' | 'Tall';
  initialName?: string;
  initialDescription?: string;
  initialConfig?: CustomCabinetConfig;
  onClose: () => void;
  onSave: () => void;
}

export const CustomCabinetEditor: React.FC<CustomCabinetEditorProps> = ({
  basePreset,
  baseType,
  initialName = '',
  initialDescription = '',
  initialConfig,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [numShelves, setNumShelves] = useState(initialConfig?.num_shelves ?? 1);
  const [numDrawers, setNumDrawers] = useState(initialConfig?.num_drawers ?? 0);
  const [numDoors, setNumDoors] = useState(initialConfig?.num_doors ?? 2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate hardware based on configuration
  const calculatedHinges = numDoors > 0 ? numDoors * 2 : 0;
  const calculatedSlides = numDrawers;
  const calculatedHandles = numDoors + numDrawers;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name for your custom cabinet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const preset: CreateCustomPresetInput = {
        name: name.trim(),
        description: description.trim(),
        base_preset: basePreset,
        base_type: baseType,
        num_shelves: numShelves,
        num_drawers: numDrawers,
        num_doors: numDoors,
        hinges: calculatedHinges,
        slides: calculatedSlides,
        handles: calculatedHandles,
      };

      const { error } = await customCabinetService.createCustomPreset(preset);

      if (error) {
        setError(error.message || 'Failed to save custom cabinet');
      } else {
        onSave();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-20 sm:pb-4">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 relative max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center z-10"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-2 pr-12">
          Customize Cabinet
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 sm:mb-6">
          Based on: <span className="font-semibold text-amber-600 dark:text-amber-400">{basePreset}</span>
        </p>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Custom Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Custom Base Cabinet"
              className="w-full px-4 py-3 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-slate-700 dark:text-white min-h-[48px]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this custom cabinet..."
              rows={2}
              className="w-full px-4 py-3 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-slate-700 dark:text-white resize-none min-h-[64px]"
            />
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Shelves */}
            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Shelves
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNumShelves(Math.max(0, numShelves - 1))}
                  className="p-3 sm:p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 min-w-[48px] min-h-[48px] flex items-center justify-center"
                >
                  <Minus size={20} className="sm:w-4 sm:h-4" />
                </button>
                <input
                  type="number"
                  value={numShelves}
                  onChange={(e) => setNumShelves(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="flex-1 text-center px-2 py-3 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-700 dark:text-white min-h-[48px] text-lg sm:text-base font-semibold"
                />
                <button
                  onClick={() => setNumShelves(numShelves + 1)}
                  className="p-3 sm:p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 min-w-[48px] min-h-[48px] flex items-center justify-center"
                >
                  <Plus size={20} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Drawers */}
            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Drawers
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNumDrawers(Math.max(0, numDrawers - 1))}
                  className="p-3 sm:p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 min-w-[48px] min-h-[48px] flex items-center justify-center"
                >
                  <Minus size={20} className="sm:w-4 sm:h-4" />
                </button>
                <input
                  type="number"
                  value={numDrawers}
                  onChange={(e) => setNumDrawers(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="flex-1 text-center px-2 py-3 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-700 dark:text-white min-h-[48px] text-lg sm:text-base font-semibold"
                />
                <button
                  onClick={() => setNumDrawers(numDrawers + 1)}
                  className="p-3 sm:p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 min-w-[48px] min-h-[48px] flex items-center justify-center"
                >
                  <Plus size={20} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Doors */}
            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Doors
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNumDoors(Math.max(0, numDoors - 1))}
                  className="p-3 sm:p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 min-w-[48px] min-h-[48px] flex items-center justify-center"
                >
                  <Minus size={20} className="sm:w-4 sm:h-4" />
                </button>
                <input
                  type="number"
                  value={numDoors}
                  onChange={(e) => setNumDoors(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="flex-1 text-center px-2 py-3 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-700 dark:text-white min-h-[48px] text-lg sm:text-base font-semibold"
                />
                <button
                  onClick={() => setNumDoors(numDoors + 1)}
                  className="p-3 sm:p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 min-w-[48px] min-h-[48px] flex items-center justify-center"
                >
                  <Plus size={20} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Hardware Preview */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Hardware (Auto-calculated)
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-sm">
              <div className="text-center sm:text-left">
                <span className="text-slate-600 dark:text-slate-400 block sm:inline">Hinges:</span>
                <span className="ml-0 sm:ml-2 font-semibold text-slate-800 dark:text-white text-lg sm:text-base">{calculatedHinges}</span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-slate-600 dark:text-slate-400 block sm:inline">Slides:</span>
                <span className="ml-0 sm:ml-2 font-semibold text-slate-800 dark:text-white text-lg sm:text-base">{calculatedSlides}</span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-slate-600 dark:text-slate-400 block sm:inline">Handles:</span>
                <span className="ml-0 sm:ml-2 font-semibold text-slate-800 dark:text-white text-lg sm:text-base">{calculatedHandles}</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3.5 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[52px] sm:min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-3.5 sm:py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[52px] sm:min-h-[44px]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-base sm:text-sm">Saving...</span>
                </>
              ) : (
                <>
                  <Save size={20} className="sm:w-4 sm:h-4" />
                  <span className="text-base sm:text-sm">Save Custom Cabinet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
