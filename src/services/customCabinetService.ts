import { supabase } from './supabaseClient';

export interface CustomCabinetPreset {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  base_preset: string; // Original PresetType this was based on
  base_type: 'Base' | 'Wall' | 'Tall';
  num_shelves: number;
  num_drawers: number;
  num_doors: number;
  shelf_positions?: number[];
  hinges?: number;
  slides?: number;
  handles?: number;
  created_at: string;
  updated_at: string;
}

export type CreateCustomPresetInput = Omit<CustomCabinetPreset, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export const customCabinetService = {
  /**
   * Create a new custom cabinet preset
   */
  async createCustomPreset(preset: CreateCustomPresetInput): Promise<{ data: CustomCabinetPreset | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('custom_cabinet_presets')
      .insert({
        user_id: user.id,
        ...preset,
      })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  },

  /**
   * Get all custom presets for the current user
   */
  async getCustomPresets(): Promise<{ data: CustomCabinetPreset[] | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('custom_cabinet_presets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };
    return { data, error: null };
  },

  /**
   * Update an existing custom preset
   */
  async updateCustomPreset(id: string, updates: Partial<CreateCustomPresetInput>): Promise<{ data: CustomCabinetPreset | null; error: any }> {
    const { data, error } = await supabase
      .from('custom_cabinet_presets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  },

  /**
   * Delete a custom preset
   */
  async deleteCustomPreset(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('custom_cabinet_presets')
      .delete()
      .eq('id', id);

    return { error };
  },
};
