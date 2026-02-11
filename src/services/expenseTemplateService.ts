import { supabase } from './supabaseClient';

export interface ExpenseTemplate {
  id: string;
  user_id: string;
  name: string;
  default_amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const expenseTemplateService = {
  async getTemplates(): Promise<ExpenseTemplate[]> {
    const { data, error } = await supabase
      .from('expense_templates')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading expense templates:', error);
      return [];
    }

    return data || [];
  },

  async saveTemplate(name: string, defaultAmount: number = 0): Promise<ExpenseTemplate | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    // Get current count for sort_order
    const { count } = await supabase
      .from('expense_templates')
      .select('*', { count: 'exact', head: true });

    const { data, error } = await supabase
      .from('expense_templates')
      .insert([
        {
          user_id: userData.user.id,
          name,
          default_amount: defaultAmount,
          sort_order: count || 0
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving expense template:', error);
      return null;
    }

    return data;
  },

  async updateTemplate(id: string, updates: Partial<ExpenseTemplate>): Promise<boolean> {
    const { error } = await supabase
      .from('expense_templates')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating expense template:', error);
      return false;
    }

    return true;
  },

  async deleteTemplate(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('expense_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense template:', error);
      return false;
    }

    return true;
  },

  async reorderTemplates(orderedIds: string[]): Promise<boolean> {
    const updates = orderedIds.map((id, index) => ({
      id,
      sort_order: index
    }));

    const { error } = await supabase
      .from('expense_templates')
      .upsert(updates);

    if (error) {
      console.error('Error reordering templates:', error);
      return false;
    }

    return true;
  },

  async updatePriceByName(name: string, price: number): Promise<boolean> {
    const { error } = await supabase
      .from('expense_templates')
      .update({ default_amount: price })
      .eq('name', name);

    if (error) {
      console.error('Error updating expense price by name:', error);
      return false;
    }
    return true;
  },

  async ensureHardwareItemsExist(): Promise<void> {
    // Default hardware items - only created if they don't already exist in database
    // Users can edit or delete these after they're created
    const hardwareItems = [
      { name: 'Soft-Close Hinge', amount: 5.00 },
      { name: 'Drawer Slide (Pair)', amount: 15.00 },
      { name: 'Adjustable Leg', amount: 2.00 },
      { name: 'Handle/Knob', amount: 4.00 },
      { name: 'Wall Hanger (Pair)', amount: 6.00 },
      { name: 'Installation Nail', amount: 0.10 }
    ];

    const existing = await this.getTemplates();
    for (const item of hardwareItems) {
      if (!existing.find(e => e.name === item.name)) {
        await this.saveTemplate(item.name, item.amount);
      }
    }
  }
};
