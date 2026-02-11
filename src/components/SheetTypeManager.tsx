import React, { useState, useEffect } from 'react';
import { SheetType, sheetTypeService } from '../services/sheetTypeService';
import { ExpenseTemplate, expenseTemplateService } from '../services/expenseTemplateService';
import { Plus, Trash2, Edit2, Save, X, Settings2, Package } from 'lucide-react';

interface SheetTypeManagerProps {
  currency?: string;
}

export const SheetTypeManager: React.FC<SheetTypeManagerProps> = ({ currency = '$' }) => {
  const [sheetTypes, setSheetTypes] = useState<SheetType[]>([]);
  const [accessories, setAccessories] = useState<ExpenseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSheetType, setNewSheetType] = useState({ name: '', thickness: 16, price_per_sheet: 0 });
  const [newAccessory, setNewAccessory] = useState({ name: '', price: 0 });
  const [showAddForm, setShowAddForm] = useState<'sheet' | 'accessory' | null>(null);

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
    const result = await sheetTypeService.saveSheetType(newSheetType.name, newSheetType.thickness, newSheetType.price_per_sheet);
    if (result) {
      setNewSheetType({ name: '', thickness: 16, price_per_sheet: 0 });
      setShowAddForm(null);
      loadData();
    }
  };

  const handleAddAccessory = async () => {
    if (!newAccessory.name.trim()) return;
    const result = await expenseTemplateService.saveTemplate(newAccessory.name, newAccessory.price);
    if (result) {
      setNewAccessory({ name: '', price: 0 });
      setShowAddForm(null);
      loadData();
    }
  };

  const handleUpdateSheet = async (id: string, updates: Partial<SheetType>) => {
    const success = await sheetTypeService.updateSheetType(id, updates);
    if (success) { setEditingId(null); loadData(); }
  };

  const handleUpdateAccessory = async (id: string, updates: Partial<ExpenseTemplate>) => {
    const success = await expenseTemplateService.updateTemplate(id, { name: updates.name, default_amount: updates.default_amount });
    if (success) { setEditingId(null); loadData(); }
  };

  const handleDeleteSheet = async (id: string) => {
    if (confirm('Are you sure you want to delete this sheet type?')) {
      const success = await sheetTypeService.deleteSheetType(id);
      if (success) loadData();
    }
  };

  const handleDeleteAccessory = async (id: string) => {
    if (confirm('Are you sure you want to delete this accessory?')) {
      const success = await expenseTemplateService.deleteTemplate(id);
      if (success) loadData();
    }
  };

  if (isLoading) {
    return <div className="p-4 text-slate-500">Loading sheet types...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            <Settings2 className="text-amber-500" /> Sheet Types & Materials
          </h3>
          <button
            onClick={() => setShowAddForm(showAddForm === 'sheet' ? null : 'sheet')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus size={18} /> Add Sheet
          </button>
        </div>

        {showAddForm === 'sheet' && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-900/50 animate-in slide-in-from-top-4">
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
                <tr key={sheetType.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  {editingId === sheetType.id ? (
                    <>
                      <td className="px-3 py-3"><input type="text" defaultValue={sheetType.name} onBlur={(e) => handleUpdateSheet(sheetType.id, { name: e.target.value })} className="w-full px-2 py-1 border dark:border-slate-600 rounded text-sm font-bold" autoFocus /></td>
                      <td className="px-3 py-3"><input type="number" defaultValue={sheetType.thickness} onBlur={(e) => handleUpdateSheet(sheetType.id, { thickness: Number(e.target.value) })} className="w-20 px-2 py-1 border dark:border-slate-600 rounded text-sm" /></td>
                      <td className="px-3 py-3"><input type="number" defaultValue={sheetType.price_per_sheet} onBlur={(e) => handleUpdateSheet(sheetType.id, { price_per_sheet: Number(e.target.value) })} className="w-24 px-2 py-1 border dark:border-slate-600 rounded text-sm" /></td>
                      <td className="px-3 py-3 text-right"><button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={18} /></button></td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-4 text-slate-900 dark:text-white font-bold">{sheetType.name}</td>
                      <td className="px-3 py-4 text-slate-500 font-mono text-xs">{sheetType.thickness}mm</td>
                      <td className="px-3 py-4 text-slate-900 dark:text-amber-400 font-black">{currency}{sheetType.price_per_sheet.toFixed(2)}</td>
                      <td className="px-3 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingId(sheetType.id)} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"><Edit2 size={16} /></button>
                          {!sheetType.is_default && <button onClick={() => handleDeleteSheet(sheetType.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16} /></button>}
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

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            <Package className="text-blue-500" /> Hardware & Accessories
          </h3>
          <button
            onClick={() => setShowAddForm(showAddForm === 'accessory' ? null : 'accessory')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} /> Add Accessory
          </button>
        </div>

        {showAddForm === 'accessory' && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-900/50 animate-in slide-in-from-top-4">
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
                <tr key={acc.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  {editingId === acc.id ? (
                    <>
                      <td className="px-3 py-3"><input type="text" defaultValue={acc.name} onBlur={(e) => handleUpdateAccessory(acc.id, { name: e.target.value })} className="w-full px-2 py-1 border dark:border-slate-600 rounded text-sm font-bold" autoFocus /></td>
                      <td className="px-3 py-3"><input type="number" defaultValue={acc.default_amount} onBlur={(e) => handleUpdateAccessory(acc.id, { default_amount: Number(e.target.value) })} className="w-24 px-2 py-1 border dark:border-slate-600 rounded text-sm" /></td>
                      <td className="px-3 py-3 text-right"><button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={18} /></button></td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-4 text-slate-900 dark:text-white font-bold">{acc.name}</td>
                      <td className="px-3 py-4 text-slate-900 dark:text-blue-400 font-black">{currency}{acc.default_amount.toFixed(2)}</td>
                      <td className="px-3 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingId(acc.id)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteAccessory(acc.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16} /></button>
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
  );
};
