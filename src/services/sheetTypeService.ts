import { supabase } from './supabaseClient';

export interface SheetType {
  id: string;
  user_id: string;
  name: string;
  thickness: number;
  price_per_sheet: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const sheetTypeService = {
  async getSheetTypes(): Promise<SheetType[]> {
    const { data, error } = await supabase
      .from('sheet_types')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading sheet types:', error);
      return [];
    }

    return data || [];
  },

  async saveSheetType(name: string, thickness: number, pricePerSheet: number): Promise<SheetType | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from('sheet_types')
      .insert([
        {
          user_id: userData.user.id,
          name,
          thickness,
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

    return data;
  },

  async updateSheetType(id: string, updates: Partial<SheetType>): Promise<boolean> {
    const { error } = await supabase
      .from('sheet_types')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating sheet type:', error);
      return false;
    }

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

    return true;
  }
};
