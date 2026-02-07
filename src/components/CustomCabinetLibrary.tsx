import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Loader, Package } from 'lucide-react';
import { customCabinetService, CustomCabinetPreset } from '../services/customCabinetService';

interface CustomCabinetLibraryProps {
  onSelectPreset: (preset: CustomCabinetPreset) => void;
  selectedPresetId?: string;
}

export const CustomCabinetLibrary: React.FC<CustomCabinetLibraryProps> = ({
  onSelectPreset,
  selectedPresetId,
}) => {
  const [presets, setPresets] = useState<CustomCabinetPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPresets = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await customCabinetService.getCustomPresets();

      if (error) {
        setError(error.message || 'Failed to load custom cabinets');
      } else {
        setPresets(data || []);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPresets();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this custom cabinet?')) {
      return;
    }

    try {
      const { error } = await customCabinetService.deleteCustomPreset(id);

      if (error) {
        alert('Failed to delete: ' + error.message);
      } else {
        loadPresets();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (presets.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="mx-auto mb-3 text-slate-400" size={48} />
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          No custom cabinets yet
        </p>
        <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
          Create one by customizing a preset
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        My Custom Cabinets ({presets.length})
      </h3>

      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset)}
            className={`p-3 text-left rounded-lg border transition-all group ${selectedPresetId === preset.id
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 ring-1 ring-amber-500'
              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                  {preset.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Based on: {preset.base_preset}
                </div>
                {preset.description && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {preset.description}
                  </div>
                )}
                <div className="flex gap-3 mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>🗄️ {preset.num_shelves} shelves</span>
                  <span>📦 {preset.num_drawers} drawers</span>
                  <span>🚪 {preset.num_doors} doors</span>
                </div>
              </div>

              <button
                onClick={(e) => handleDelete(preset.id, e)}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
