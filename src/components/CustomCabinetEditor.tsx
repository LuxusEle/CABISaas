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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          Customize Cabinet
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Based on: <span className="font-semibold text-amber-600 dark:text-amber-400">{basePreset}</span>
        </p>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Custom Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Custom Base Cabinet"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this custom cabinet..."
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-slate-700 dark:text-white resize-none"
            />
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-3 gap-4">
            {/* Shelves */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Shelves
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNumShelves(Math.max(0, numShelves - 1))}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={numShelves}
                  onChange={(e) => setNumShelves(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="w-16 text-center px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-700 dark:text-white"
                />
                <button
                  onClick={() => setNumShelves(numShelves + 1)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Drawers */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Drawers
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNumDrawers(Math.max(0, numDrawers - 1))}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={numDrawers}
                  onChange={(e) => setNumDrawers(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="w-16 text-center px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-700 dark:text-white"
                />
                <button
                  onClick={() => setNumDrawers(numDrawers + 1)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Doors */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Doors
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNumDoors(Math.max(0, numDoors - 1))}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={numDoors}
                  onChange={(e) => setNumDoors(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="w-16 text-center px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-700 dark:text-white"
                />
                <button
                  onClick={() => setNumDoors(numDoors + 1)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Hardware Preview */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Hardware (Auto-calculated)
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-600 dark:text-slate-400">Hinges:</span>
                <span className="ml-2 font-semibold text-slate-800 dark:text-white">{calculatedHinges}</span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Slides:</span>
                <span className="ml-2 font-semibold text-slate-800 dark:text-white">{calculatedSlides}</span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Handles:</span>
                <span className="ml-2 font-semibold text-slate-800 dark:text-white">{calculatedHandles}</span>
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
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Custom Cabinet
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
