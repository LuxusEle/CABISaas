import { supabase } from './supabaseClient';

export interface LogoUploadResult {
  url: string;
  path: string;
}

export const logoService = {
  async uploadLogo(file: File, userId: string): Promise<LogoUploadResult | null> {
    try {
      // Get the old logo to delete it later
      const oldLogoUrl = await this.getUserLogo(userId);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading logo:', uploadError);
        return null;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('project-logos')
        .getPublicUrl(filePath);

      // Save to user's profile/settings for persistence across projects
      await this.saveUserLogo(urlData.publicUrl, userId);

      // Delete the old logo from storage if it exists
      if (oldLogoUrl) {
        console.log('Found old logo URL:', oldLogoUrl);
        const oldPath = this.extractPathFromUrl(oldLogoUrl);
        console.log('Extracted old path:', oldPath);
        if (oldPath) {
          console.log('Attempting to delete old logo at path:', oldPath);
          const deleted = await this.deleteLogo(oldPath);
          console.log('Delete result:', deleted);
        } else {
          console.log('Could not extract path from old logo URL, skipping deletion');
        }
      } else {
        console.log('No old logo found to delete');
      }

      return {
        url: urlData.publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Error in uploadLogo:', error);
      return null;
    }
  },

  extractPathFromUrl(url: string): string | null {
    try {
      // Extract path from Supabase storage URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/project-logos/logos/filename.jpg
      // Or: https://xxx.supabase.co/storage/v1/object/sign/project-logos/logos/filename.jpg
      console.log('Extracting path from URL:', url);
      
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      console.log('Path parts:', pathParts);
      
      // Find the index of the bucket name or relevant path segments
      const bucketIndex = pathParts.indexOf('project-logos');
      
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        // The actual file path is everything after the bucket name
        const extractedPath = pathParts.slice(bucketIndex + 1).join('/');
        console.log('Extracted path:', extractedPath);
        return extractedPath;
      }
      
      // Alternative: try to find path after /object/ pattern
      const objectIndex = pathParts.indexOf('object');
      if (objectIndex !== -1 && objectIndex + 2 < pathParts.length) {
        // Skip 'object', 'public' or 'sign', then bucket name
        const extractedPath = pathParts.slice(objectIndex + 3).join('/');
        console.log('Extracted path (alternative):', extractedPath);
        return extractedPath;
      }
      
      console.log('Could not extract path from URL');
      return null;
    } catch (error) {
      console.error('Error extracting path from URL:', error);
      return null;
    }
  },

  async saveUserLogo(logoUrl: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Error saving user logo:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveUserLogo:', error);
      return false;
    }
  },

  async getUserLogo(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('logo_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user logo:', error);
        return null;
      }

      return data?.logo_url || null;
    } catch (error) {
      console.error('Error in getUserLogo:', error);
      return null;
    }
  },

  async deleteLogo(filePath: string): Promise<boolean> {
    try {
      console.log('Deleting logo at path:', filePath);
      
      // Try multiple path formats
      const pathsToTry = [
        filePath,
        filePath.startsWith('/') ? filePath.substring(1) : filePath,
        filePath.startsWith('logos/') ? filePath : `logos/${filePath}`,
      ];
      
      for (const path of pathsToTry) {
        console.log('Trying to delete with path:', path);
        const { data, error } = await supabase.storage
          .from('project-logos')
          .remove([path]);

        if (!error) {
          console.log('Logo deleted successfully with path:', path);
          return true;
        } else {
          console.log('Failed to delete with path:', path, 'Error:', error.message);
        }
      }
      
      console.error('Failed to delete logo with all path formats');
      return false;
    } catch (error) {
      console.error('Error in deleteLogo:', error);
      return false;
    }
  }
};
