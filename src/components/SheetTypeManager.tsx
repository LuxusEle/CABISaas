import React, { useState, useEffect } from 'react';
import { SheetType, sheetTypeService } from '../services/sheetTypeService';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

export const SheetTypeManager: React.FC = () => {
  const [sheetTypes, setSheetTypes] = useState<SheetType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSheetType, setNewSheetType] = useState({ name: '', thickness: 16, price_per_sheet: 0 });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadSheetTypes();
  }, []);

  const loadSheetTypes = async () => {
    setIsLoading(true);
    let types = await sheetTypeService.getSheetTypes();
    
    // If no sheet types exist, create defaults
    if (types.length === 0) {
      await createDefaultSheetTypes();
      types = await sheetTypeService.getSheetTypes();
    }
    
    setSheetTypes(types);
    setIsLoading(false);
  };

  const createDefaultSheetTypes = async () => {
    const defaults = [
      { name: 'White Melamine 16mm', thickness: 16, price_per_sheet: 85.00 },
      { name: 'White Melamine 18mm', thickness: 18, price_per_sheet: 95.00 },
      { name: 'Plywood 18mm', thickness: 18, price_per_sheet: 120.00 },
      { name: 'MDF 6mm', thickness: 6, price_per_sheet: 45.00 }
    ];

    for (const sheetType of defaults) {
      await sheetTypeService.saveSheetType(
        sheetType.name,
        sheetType.thickness,
        sheetType.price_per_sheet
      );
    }
  };

  const handleAdd = async () => {
    if (!newSheetType.name.trim()) return;
    
    const result = await sheetTypeService.saveSheetType(
      newSheetType.name,
      newSheetType.thickness,
      newSheetType.price_per_sheet
    );
    
    if (result) {
      setNewSheetType({ name: '', thickness: 16, price_per_sheet: 0 });
      setShowAddForm(false);
      loadSheetTypes();
    }
  };

  const handleUpdate = async (id: string, updates: Partial<SheetType>) => {
    const success = await sheetTypeService.updateSheetType(id, updates);
    if (success) {
      setEditingId(null);
      loadSheetTypes();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this sheet type?')) {
      const success = await sheetTypeService.deleteSheetType(id);
      if (success) {
        loadSheetTypes();
      }
    }
  };

  if (isLoading) {
    return <div className="p-4 text-slate-500">Loading sheet types...</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sheet Types & Materials</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600"
        >
          <Plus size={16} />
          Add Sheet Type
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
          <h4 className="text-sm font-bold mb-3 text-slate-700 dark:text-slate-300">Add New Sheet Type</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Material Name</label>
              <input
                type="text"
                value={newSheetType.name}
                onChange={(e) => setNewSheetType({ ...newSheetType, name: e.target.value })}
                placeholder="e.g., Oak Plywood"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Thickness (mm)</label>
              <input
                type="number"
                value={newSheetType.thickness}
                onChange={(e) => setNewSheetType({ ...newSheetType, thickness: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Price per Sheet</label>
              <input
                type="number"
                value={newSheetType.price_per_sheet}
                onChange={(e) => setNewSheetType({ ...newSheetType, price_per_sheet: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 flex items-center gap-2"
            >
              <Save size={16} /> Save
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-400 flex items-center gap-2"
            >
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Material Name</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Thickness</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Price/Sheet</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sheetTypes.map((sheetType) => (
              <tr key={sheetType.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                {editingId === sheetType.id ? (
                  <>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        defaultValue={sheetType.name}
                        onBlur={(e) => handleUpdate(sheetType.id, { name: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm"
                        autoFocus
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        defaultValue={sheetType.thickness}
                        onBlur={(e) => handleUpdate(sheetType.id, { thickness: Number(e.target.value) })}
                        className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        defaultValue={sheetType.price_per_sheet}
                        onBlur={(e) => handleUpdate(sheetType.id, { price_per_sheet: Number(e.target.value) })}
                        className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{sheetType.name}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{sheetType.thickness}mm</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">${sheetType.price_per_sheet.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(sheetType.id)}
                          className="text-amber-500 hover:text-amber-700"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        {!sheetType.is_default && (
                          <button
                            onClick={() => handleDelete(sheetType.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
