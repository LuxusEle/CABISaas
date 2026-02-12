import React, { useState, useEffect } from 'react';
import { SheetType, sheetTypeService } from '../services/sheetTypeService';
import { ExpenseTemplate, expenseTemplateService } from '../services/expenseTemplateService';
import { Plus, Trash2, Edit2, Save, X, Settings2, Package, ChevronDown, ChevronUp } from 'lucide-react';

interface SheetTypeManagerProps {
  currency?: string;
  sheetTypesExpanded?: boolean;
  accessoriesExpanded?: boolean;
  onToggleSheetTypes?: () => void;
  onToggleAccessories?: () => void;
}

export const SheetTypeManager: React.FC<SheetTypeManagerProps> = ({ 
  currency = '$',
  sheetTypesExpanded: externalSheetTypesExpanded,
  accessoriesExpanded: externalAccessoriesExpanded,
  onToggleSheetTypes,
  onToggleAccessories
}) => {
  const [sheetTypes, setSheetTypes] = useState<SheetType[]>([]);
  const [accessories, setAccessories] = useState<ExpenseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ name: string; thickness: number; price_per_sheet: number; default_amount?: number }>({ name: '', thickness: 16, price_per_sheet: 0 });
  const [newSheetType, setNewSheetType] = useState({ name: '', thickness: 16, price_per_sheet: 0 });
  const [newAccessory, setNewAccessory] = useState({ name: '', price: 0 });
  const [showAddForm, setShowAddForm] = useState<'sheet' | 'accessory' | null>(null);
  
  // Internal state for standalone usage
  const [internalSheetTypesExpanded, setInternalSheetTypesExpanded] = useState(true);
  const [internalAccessoriesExpanded, setInternalAccessoriesExpanded] = useState(false);
  
  // Use external state if provided, otherwise use internal
  const sheetTypesExpanded = externalSheetTypesExpanded !== undefined ? externalSheetTypesExpanded : internalSheetTypesExpanded;
  const accessoriesExpanded = externalAccessoriesExpanded !== undefined ? externalAccessoriesExpanded : internalAccessoriesExpanded;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    let types = await sheetTypeService.getSheetTypes();
    
    // If no sheet types exist, create defaults
    if (types.length === 0) {
      await createDefaultSheetTypes();
      types = await sheetTypeService.getSheetTypes();
    }
    setSheetTypes(types);

    await expenseTemplateService.ensureHardwareItemsExist();
    const accs = await expenseTemplateService.getTemplates();
    setAccessories(accs);

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

  const handleAddSheet = async () => {
    if (!newSheetType.name.trim()) return;
    
    // Optimistic update - add to local state immediately
    const tempId = 'temp-' + Date.now();
    const optimisticSheet: SheetType = {
      id: tempId,
      user_id: '',
      name: newSheetType.name,
      thickness: newSheetType.thickness,
      price_per_sheet: newSheetType.price_per_sheet,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setSheetTypes(prev => [...prev, optimisticSheet]);
    setNewSheetType({ name: '', thickness: 16, price_per_sheet: 0 });
    setShowAddForm(null);
    
    // Save to database in background
    const result = await sheetTypeService.saveSheetType(newSheetType.name, newSheetType.thickness, newSheetType.price_per_sheet);
    if (result) {
      setSheetTypes(prev => prev.map(s => s.id === tempId ? result : s));
    } else {
      setSheetTypes(prev => prev.filter(s => s.id !== tempId));
      alert('Failed to save sheet type');
    }
  };

  const handleAddAccessory = async () => {
    if (!newAccessory.name.trim()) return;
    
    // Optimistic update - add to local state immediately
    const tempId = 'temp-' + Date.now();
    const optimisticAcc: ExpenseTemplate = {
      id: tempId,
      user_id: '',
      name: newAccessory.name,
      default_amount: newAccessory.price,
      sort_order: accessories.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setAccessories(prev => [...prev, optimisticAcc]);
    setNewAccessory({ name: '', price: 0 });
    setShowAddForm(null);
    
    // Save to database in background
    const result = await expenseTemplateService.saveTemplate(newAccessory.name, newAccessory.price);
    if (result) {
      setAccessories(prev => prev.map(a => a.id === tempId ? result : a));
    } else {
      setAccessories(prev => prev.filter(a => a.id !== tempId));
      alert('Failed to save accessory');
    }
  };

  const startEditingSheet = (sheet: SheetType) => {
    setEditingId(sheet.id);
    setEditFormData({
      name: sheet.name,
      thickness: sheet.thickness,
      price_per_sheet: sheet.price_per_sheet
    });
  };

  const startEditingAccessory = (acc: ExpenseTemplate) => {
    setEditingId(acc.id);
    setEditFormData({
      name: acc.name,
      thickness: 0,
      price_per_sheet: 0,
      default_amount: acc.default_amount
    });
  };

  const handleUpdateSheet = async (id: string) => {
    const originalSheet = sheetTypes.find(s => s.id === id);
    
    // Optimistic update - update local state immediately
    setSheetTypes(prev => prev.map(s => 
      s.id === id 
        ? { ...s, name: editFormData.name, thickness: editFormData.thickness, price_per_sheet: editFormData.price_per_sheet }
        : s
    ));
    setEditingId(null);
    
    // Save to database in background
    const success = await sheetTypeService.updateSheetType(id, {
      name: editFormData.name,
      thickness: editFormData.thickness,
      price_per_sheet: editFormData.price_per_sheet
    });
    
    if (!success && originalSheet) {
      // Revert on failure
      setSheetTypes(prev => prev.map(s => s.id === id ? originalSheet : s));
      alert('Failed to update sheet type');
    }
  };

  const handleUpdateAccessory = async (id: string) => {
    const originalAcc = accessories.find(a => a.id === id);
    
    // Optimistic update - update local state immediately
    setAccessories(prev => prev.map(a => 
      a.id === id 
        ? { ...a, name: editFormData.name, default_amount: editFormData.default_amount || 0 }
        : a
    ));
    setEditingId(null);
    
    // Save to database in background
    const success = await expenseTemplateService.updateTemplate(id, {
      name: editFormData.name,
      default_amount: editFormData.default_amount || 0
    });
    
    if (!success && originalAcc) {
      // Revert on failure
      setAccessories(prev => prev.map(a => a.id === id ? originalAcc : a));
      alert('Failed to update accessory');
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFormData({ name: '', thickness: 16, price_per_sheet: 0 });
  };

  const handleDeleteSheet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sheet type?')) return;
    
    const sheetToDelete = sheetTypes.find(s => s.id === id);
    
    // Optimistic update - remove from local state immediately
    setSheetTypes(prev => prev.filter(s => s.id !== id));
    
    // Delete from database in background
    const success = await sheetTypeService.deleteSheetType(id);
    
    if (!success && sheetToDelete) {
      // Restore on failure
      setSheetTypes(prev => [...prev, sheetToDelete].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      alert('Failed to delete sheet type');
    }
  };

  const handleDeleteAccessory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this accessory?')) return;
    
    const accToDelete = accessories.find(a => a.id === id);
    
    // Optimistic update - remove from local state immediately
    setAccessories(prev => prev.filter(a => a.id !== id));
    
    // Delete from database in background
    const success = await expenseTemplateService.deleteTemplate(id);
    
    if (!success && accToDelete) {
      // Restore on failure
      setAccessories(prev => [...prev, accToDelete].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      alert('Failed to delete accessory');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
              <Settings2 className="text-amber-500" /> Sheet Types & Materials
            </h3>
          </div>
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            <p className="mt-2 text-slate-500 text-sm">Loading sheet types...</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
              <Package className="text-blue-500" /> Hardware & Accessories
            </h3>
          </div>
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-slate-500 text-sm">Loading accessories...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleSheetTypes = () => {
    if (onToggleSheetTypes) {
      onToggleSheetTypes();
    } else {
      setInternalSheetTypesExpanded(prev => !prev);
    }
  };

  const handleToggleAccessories = () => {
    if (onToggleAccessories) {
      onToggleAccessories();
    } else {
      setInternalAccessoriesExpanded(prev => !prev);
    }
  };

  return (
    <div className="space-y-8">
      {/* Sheet Types & Materials - Collapsible */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Header - Always visible */}
        <div 
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          onClick={handleToggleSheetTypes}
        >
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            <Settings2 className="text-amber-500" /> Sheet Types & Materials
          </h3>
          <div className="flex items-center gap-2">
            {sheetTypesExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddForm(showAddForm === 'sheet' ? null : 'sheet');
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20"
              >
                <Plus size={14} /> Add
              </button>
            )}
            <button className={`p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-transform duration-300 ${sheetTypesExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={20} />
            </button>
          </div>
        </div>

        {/* Content - Collapsible with animation */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${sheetTypesExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 pt-0">
            {showAddForm === 'sheet' && (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-900/50 animate-in slide-in-from-top-4">
                <h4 className="text-xs font-black mb-4 text-amber-600 uppercase tracking-widest">Register New Material</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Material Name</label>
                    <input type="text" value={newSheetType.name} onChange={(e) => setNewSheetType({ ...newSheetType, name: e.target.value })} placeholder="e.g., Oak Plywood" className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Thickness (mm)</label>
                    <input type="number" value={newSheetType.thickness} onChange={(e) => setNewSheetType({ ...newSheetType, thickness: Number(e.target.value) })} className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Price per Sheet</label>
                    <input type="number" value={newSheetType.price_per_sheet} onChange={(e) => setNewSheetType({ ...newSheetType, price_per_sheet: Number(e.target.value) })} className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-bold" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleAddSheet} className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 flex items-center gap-2">
                    <Save size={14} /> Save Material
                  </button>
                  <button onClick={() => setShowAddForm(null)} className="px-4 py-2 bg-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-400">Cancel</button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b dark:border-slate-700">
                    <th className="px-3 py-3 text-left font-bold">Material Name</th>
                    <th className="px-3 py-3 text-left font-bold">Thickness</th>
                    <th className="px-3 py-3 text-left font-bold">Price/Sheet</th>
                    <th className="px-3 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sheetTypes.map((sheetType) => (
                    <tr key={sheetType.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${sheetType.id.startsWith('temp-') ? 'opacity-50' : ''}`}>
                      {editingId === sheetType.id ? (
                        <>
                          <td className="px-3 py-3"><input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-white" autoFocus /></td>
                          <td className="px-3 py-3"><input type="number" value={editFormData.thickness} onChange={(e) => setEditFormData({ ...editFormData, thickness: Number(e.target.value) })} className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" /></td>
                          <td className="px-3 py-3"><input type="number" value={editFormData.price_per_sheet} onChange={(e) => setEditFormData({ ...editFormData, price_per_sheet: Number(e.target.value) })} className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" /></td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleUpdateSheet(sheetType.id)} className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Save"><Save size={16} /></button>
                              <button onClick={cancelEditing} className="p-2 text-slate-400 hover:text-slate-600" title="Cancel"><X size={18} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-4 text-slate-900 dark:text-white font-bold">{sheetType.name}</td>
                          <td className="px-3 py-4 text-slate-500 font-mono text-xs">{sheetType.thickness}mm</td>
                          <td className="px-3 py-4 text-slate-900 dark:text-amber-400 font-black">{currency}{sheetType.price_per_sheet.toFixed(2)}</td>
                          <td className="px-3 py-4 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditingSheet(sheetType)} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" title="Edit"><Edit2 size={16} /></button>
                              {!sheetType.is_default && <button onClick={() => handleDeleteSheet(sheetType.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete"><Trash2 size={16} /></button>}
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
        </div>
      </div>

      {/* Hardware & Accessories - Collapsible */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Header - Always visible */}
        <div 
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          onClick={handleToggleAccessories}
        >
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            <Package className="text-blue-500" /> Hardware & Accessories
          </h3>
          <div className="flex items-center gap-2">
            {accessoriesExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddForm(showAddForm === 'accessory' ? null : 'accessory');
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20"
              >
                <Plus size={14} /> Add
              </button>
            )}
            <button className={`p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-transform duration-300 ${accessoriesExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={20} />
            </button>
          </div>
        </div>

        {/* Content - Collapsible with animation */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${accessoriesExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 pt-0">
            {showAddForm === 'accessory' && (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-900/50 animate-in slide-in-from-top-4">
                <h4 className="text-xs font-black mb-4 text-blue-600 uppercase tracking-widest">New Accessory / Accessory Price</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Item Name</label>
                    <input type="text" value={newAccessory.name} onChange={(e) => setNewAccessory({ ...newAccessory, name: e.target.value })} placeholder="e.g., Soft-Close Hinge" className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Default Price (Unit)</label>
                    <input type="number" value={newAccessory.price} onChange={(e) => setNewAccessory({ ...newAccessory, price: Number(e.target.value) })} className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-bold" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleAddAccessory} className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 flex items-center gap-2">
                    <Save size={14} /> Save Accessory
                  </button>
                  <button onClick={() => setShowAddForm(null)} className="px-4 py-2 bg-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-400">Cancel</button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b dark:border-slate-700">
                    <th className="px-3 py-3 text-left font-bold">Item Name</th>
                    <th className="px-3 py-3 text-left font-bold">Price/Unit</th>
                    <th className="px-3 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {accessories.map((acc) => (
                    <tr key={acc.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${acc.id.startsWith('temp-') ? 'opacity-50' : ''}`}>
                      {editingId === acc.id ? (
                        <>
                          <td className="px-3 py-3"><input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-white" autoFocus /></td>
                          <td className="px-3 py-3"><input type="number" value={editFormData.default_amount} onChange={(e) => setEditFormData({ ...editFormData, default_amount: Number(e.target.value) })} className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" /></td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleUpdateAccessory(acc.id)} className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Save"><Save size={16} /></button>
                              <button onClick={cancelEditing} className="p-2 text-slate-400 hover:text-slate-600" title="Cancel"><X size={18} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-4 text-slate-900 dark:text-white font-bold">{acc.name}</td>
                          <td className="px-3 py-4 text-slate-900 dark:text-blue-400 font-black">{currency}{acc.default_amount.toFixed(2)}</td>
                          <td className="px-3 py-4 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditingAccessory(acc)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Edit"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteAccessory(acc.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete"><Trash2 size={16} /></button>
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
        </div>
      </div>
    </div>
  );
};
