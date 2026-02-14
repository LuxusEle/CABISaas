import { supabase } from './supabaseClient';

export interface Feedback {
  id?: string;
  user_id?: string;
  type: 'suggestion' | 'complaint' | 'feature_request' | 'bug_report' | 'other';
  message: string;
  email?: string;
  screenshot_url?: string;
  attachment_url?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  created_at?: string;
  updated_at?: string;
}

export const feedbackService = {
  async submitFeedback(
    feedback: Omit<Feedback, 'id' | 'created_at' | 'updated_at' | 'status' | 'screenshot_url' | 'attachment_url'>,
    screenshot?: Blob,
    attachment?: File
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      let screenshotUrl: string | undefined;
      let attachmentUrl: string | undefined;

      // Upload screenshot if provided
      if (screenshot) {
        console.log('Uploading screenshot, size:', screenshot.size, 'type:', screenshot.type);
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substr(2, 9);
        const fileName = `${timestamp}_${randomStr}.png`;
        
        console.log('Uploading to filename:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-screenshots')
          .upload(fileName, screenshot, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading screenshot:', uploadError);
          return { success: false, error: `Upload failed: ${uploadError.message}` };
        } else {
          console.log('Screenshot uploaded successfully:', uploadData);
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('feedback-screenshots')
            .getPublicUrl(fileName);
          screenshotUrl = urlData.publicUrl;
          console.log('Screenshot URL:', screenshotUrl);
        }
      }

      // Upload attachment if provided
      if (attachment) {
        console.log('Uploading attachment, size:', attachment.size, 'type:', attachment.type);
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substr(2, 9);
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${timestamp}_${randomStr}.${fileExt}`;
        
        console.log('Uploading attachment to filename:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-attachments')
          .upload(fileName, attachment, {
            contentType: attachment.type,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading attachment:', uploadError);
          return { success: false, error: `Attachment upload failed: ${uploadError.message}` };
        } else {
          console.log('Attachment uploaded successfully:', uploadData);
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('feedback-attachments')
            .getPublicUrl(fileName);
          attachmentUrl = urlData.publicUrl;
          console.log('Attachment URL:', attachmentUrl);
        }
      }
      
      const feedbackData = {
        user_id: userData.user?.id || null,
        type: feedback.type,
        message: feedback.message,
        email: feedback.email || userData.user?.email || null,
        screenshot_url: screenshotUrl,
        attachment_url: attachmentUrl,
        status: 'new'
      };

      const { error } = await supabase
        .from('feedback')
        .insert(feedbackData);

      if (error) {
        console.error('Error submitting feedback:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }

      return { success: true };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return { success: false, error: `Exception: ${error}` };
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
