import { supabase } from './supabaseClient';
import { SheetType } from '../types';

let cachedSheetTypes: SheetType[] | null = null;

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
  }
};
