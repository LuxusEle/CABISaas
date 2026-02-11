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
  }
};
