import { supabase } from './supabaseClient';

export interface TextureUploadResult {
  url: string;
  path: string;
}

export const materialService = {
  async uploadTexture(file: File, userId: string, partKey: string, oldUrl?: string): Promise<TextureUploadResult | null> {
    try {
      // 1. Delete old texture if it exists
      if (oldUrl) {
        const oldPath = this.extractPathFromUrl(oldUrl);
        if (oldPath) {
          await supabase.storage.from('cabinet-materials').remove([oldPath]);
        }
      }

      // 2. Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${partKey}-${Date.now()}.${fileExt}`;
      const filePath = `textures/${fileName}`;

      // 3. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('cabinet-materials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading texture:', uploadError);
        return null;
      }

      // 4. Get Public URL
      const { data: urlData } = supabase.storage
        .from('cabinet-materials')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Error in uploadTexture:', error);
      return null;
    }
  },

  extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      const bucketIndex = pathParts.indexOf('cabinet-materials');
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      
      const objectIndex = pathParts.indexOf('object');
      if (objectIndex !== -1 && objectIndex + 2 < pathParts.length) {
        return pathParts.slice(objectIndex + 3).join('/');
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting path from URL:', error);
      return null;
    }
  }
};
