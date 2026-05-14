import { supabase } from './supabaseClient';

/**
 * Handles all file storage operations with Supabase Storage.
 */
export const storageService = {
  /**
   * Uploads a base64 image (captured from Three.js canvas) to Supabase Storage.
   */
  async uploadDesignCapture(projectId: string, base64Data: string): Promise<string | null> {
    try {
      // 1. Convert base64 to Blob
      const base64Content = base64Data.split(',')[1];
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // 2. Generate unique filename
      const timestamp = new Date().getTime();
      const fileName = `${projectId}/${timestamp}.jpg`;

      // 3. Upload to 'design-captures' bucket
      const { data, error } = await supabase.storage
        .from('design-captures')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('Storage upload error:', error);
        return null;
      }

      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('design-captures')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Failed to upload capture:', err);
      return null;
    }
  },
  /**
   * Deletes a captured design image from storage.
   * @param url The public URL of the image to delete.
   */
  async deleteDesignCapture(url: string): Promise<boolean> {
    try {
      // Extract the path from the public URL
      // Format usually: .../storage/v1/object/public/design-captures/path/to/file.jpg
      const parts = url.split('/design-captures/');
      if (parts.length < 2) return false;
      
      const filePath = parts[1];
      const { error } = await supabase.storage
        .from('design-captures')
        .remove([filePath]);

      if (error) {
        console.error('Storage delete error:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Failed to delete capture:', err);
      return false;
    }
  }
};
