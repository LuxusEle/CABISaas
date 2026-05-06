import { supabase } from './supabaseClient';
import { SheetType } from '../types';

let cachedSheetTypes: SheetType[] | null = null;
let isInitializingSheets = false;

export const sheetTypeService = {
  getCachedSheetTypes(): SheetType[] | null {
    return cachedSheetTypes;
  },

  async getSheetTypes(): Promise<SheetType[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from('sheet_types')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading sheet types:', error);
      return [];
    }

    cachedSheetTypes = data || [];
    return cachedSheetTypes;
  },

  async saveSheetType(name: string, thickness: number, width: number, length: number, pricePerSheet: number): Promise<SheetType | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from('sheet_types')
      .insert([
        {
          user_id: userData.user.id,
          name,
          thickness,
          width,
          length,
          price_per_sheet: pricePerSheet,
          is_default: false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving sheet type:', error);
      return null;
    }

    cachedSheetTypes = null; // Clear cache
    return data;
  },

  async updateSheetType(id: string, updates: Partial<SheetType>): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { error } = await supabase
      .from('sheet_types')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userData.user.id);

    if (error) {
      console.error('Error updating sheet type:', error);
      return false;
    }

    cachedSheetTypes = null; // Clear cache
    return true;
  },

  async deleteSheetType(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('sheet_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting sheet type:', error);
      return false;
    }

    cachedSheetTypes = null; // Clear cache
    return true;
  },

  async updatePriceByName(name: string, price: number): Promise<boolean> {
    const { error } = await supabase
      .from('sheet_types')
      .update({ price_per_sheet: price })
      .eq('name', name);

    if (error) {
      console.error('Error updating price by name:', error);
      return false;
    }
    cachedSheetTypes = null; // Clear cache
    return true;
  },

  async ensureDefaultSheetsExist(): Promise<void> {
    if (isInitializingSheets) return;
    isInitializingSheets = true;

    try {
      const existing = await this.getSheetTypes();
      
      // Cleanup duplicates (same name and thickness)
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const item of existing) {
        const key = `${item.name}-${item.thickness}`;
        if (seen.has(key)) {
          duplicates.push(item.id);
        } else {
          seen.add(key);
        }
      }

      if (duplicates.length > 0) {
        await Promise.all(duplicates.map(id => this.deleteSheetType(id)));
      }

      const refreshed = duplicates.length > 0 ? await this.getSheetTypes() : existing;
      if (refreshed.length > 0) return;

      const defaults = [
        { name: 'Shutter', thickness: 16, price_per_sheet: 0.00 },
        { name: 'Face', thickness: 18, price_per_sheet: 0.00 },
        { name: 'Plywood', thickness: 18, price_per_sheet: 0.00 },
        { name: 'MDF 6mm', thickness: 6, price_per_sheet: 0.00 }
      ];

      for (const sheetType of defaults) {
        await this.saveSheetType(
          sheetType.name,
          sheetType.thickness,
          1220,
          2440,
          sheetType.price_per_sheet
        );
      }
    } finally {
      isInitializingSheets = false;
    }
  }
};
