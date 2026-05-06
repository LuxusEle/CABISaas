import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  company_name: string;
  phone: string;
  logo_url?: string;
  updated_at: string;
}

export const profileService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error code
          console.error('Error fetching profile:', error);
        }
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error in getProfile:', error);
      return null;
    }
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return false;
    }
  }
};
