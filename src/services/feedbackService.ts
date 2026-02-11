import { supabase } from './supabaseClient';

export interface Feedback {
  id?: string;
  user_id?: string;
  type: 'suggestion' | 'complaint' | 'feature_request' | 'bug_report' | 'other';
  message: string;
  email?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  created_at?: string;
  updated_at?: string;
}

export const feedbackService = {
  async submitFeedback(feedback: Omit<Feedback, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const feedbackData = {
        user_id: userData.user?.id || null,
        type: feedback.type,
        message: feedback.message,
        email: feedback.email || userData.user?.email || null,
        status: 'new'
      };

      const { error } = await supabase
        .from('feedback')
        .insert(feedbackData);

      if (error) {
        console.error('Error submitting feedback:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  },

  async getUserFeedback(): Promise<Feedback[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback:', error);
      return [];
    }

    return data || [];
  }
};
