import { supabase } from './supabaseClient';
import type { Project } from '../types';

let cachedProjectsList: any[] | null = null;

export const projectService = {
  /**
   * Create a new project in the database
   */
  async createProject(project: Project): Promise<{ data: Project | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    // Enforce project limit
    const { subscriptionService } = await import('./subscriptionService');
    const canCreate = await subscriptionService.canCreateProject();
    if (!canCreate) {
      return { data: null, error: new Error('Project limit reached. Please upgrade to Pro.') };
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: project.name,
        designer: project.designer,
        company: project.company,
        customerName: project.customerName,
        customerAddress: project.customerAddress,
        customerPhone: project.customerPhone,
        settings: project.settings,
        zones: project.zones,
      })
      .select()
      .single();

    if (error) return { data: null, error };

    return {
      data: {
        ...project,
        id: data.id,
      },
      error: null,
    };
  },

  /**
   * Get project metadata for the list view (fast)
   */
  async getProjectsList(): Promise<{ data: any[] | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, designer, company, updated_at, settings, zones')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) return { data: null, error };

    const mappedData = data.map(row => ({
      id: row.id,
      name: row.name,
      designer: row.designer || '',
      company: row.company || '',
      updated_at: row.updated_at,
      settings: row.settings,
      zones: row.zones
    }));

    cachedProjectsList = mappedData;

    return {
      data: mappedData,
      error: null,
    };
  },

  getCachedProjectsList(): any[] | null {
    return cachedProjectsList;
  },

  /**
   * Get all projects for the current user (Full data)
   */
  async getProjects(): Promise<{ data: Project[] | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) return { data: null, error };

    return {
      data: data.map(row => ({
        id: row.id,
        name: row.name,
        designer: row.designer || '',
        company: row.company || '',
        customerName: row.customerName || '',
        customerAddress: row.customerAddress || '',
        customerPhone: row.customerPhone || '',
        settings: row.settings,
        zones: row.zones,
      })),
      error: null,
    };
  },

  /**
   * Get a single project by ID
   */
  async getProject(id: string): Promise<{ data: Project | null; error: any }> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { data: null, error };

    // Ensure quotationStatus exists in settings (for older projects)
    const settings = {
      ...data.settings,
      quotationStatus: data.settings?.quotationStatus || 'quotation',
      quotationApprovedDate: data.settings?.quotationApprovedDate || undefined
    };

    return {
      data: {
        id: data.id,
        name: data.name,
        designer: data.designer || '',
        company: data.company || '',
        customerName: data.customerName || '',
        customerAddress: data.customerAddress || '',
        customerPhone: data.customerPhone || '',
        settings,
        zones: data.zones,
      },
      error: null,
    };
  },

  /**
   * Update an existing project
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<{ data: Project | null; error: any }> {
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: updates.name,
        designer: updates.designer,
        company: updates.company,
        customerName: updates.customerName,
        customerAddress: updates.customerAddress,
        customerPhone: updates.customerPhone,
        settings: updates.settings,
        zones: updates.zones,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error };

    return {
      data: {
        id: data.id,
        name: data.name,
        designer: data.designer || '',
        company: data.company || '',
        customerName: data.customerName || '',
        customerAddress: data.customerAddress || '',
        customerPhone: data.customerPhone || '',
        settings: data.settings,
        zones: data.zones,
      },
      error: null,
    };
  },

  /**
   * Delete a project
   */
  /**
   * Delete a project and all its associated assets (storage captures and material textures)
   */
  async deleteProject(id: string): Promise<{ error: any }> {
    try {
      // 1. Get the project first to find asset URLs
      const { data: project, error: fetchError } = await this.getProject(id);
      if (fetchError || !project) return { error: fetchError || new Error('Project not found') };

      // 2. Collect all potential image URLs
      const urlsToDelete: { bucket: string; url: string }[] = [];

      // Design captures (Folder-based in storageService.uploadDesignCapture)
      // We'll try to list and delete the folder 'projectId/*'
      const { data: captureFiles } = await supabase.storage
        .from('design-captures')
        .list(id);
      
      if (captureFiles && captureFiles.length > 0) {
        const paths = captureFiles.map(f => `${id}/${f.name}`);
        await supabase.storage.from('design-captures').remove(paths);
      }

      // Material textures
      const textures = project.settings.materialSettings?.textureUrls;
      if (textures) {
        Object.values(textures).forEach(url => {
          if (url && typeof url === 'string' && url.includes('cabinet-materials')) {
            urlsToDelete.push({ bucket: 'cabinet-materials', url });
          }
        });
      }

      // Delete material textures
      for (const item of urlsToDelete) {
        const path = this.extractStoragePath(item.url, item.bucket);
        if (path) {
          await supabase.storage.from(item.bucket).remove([path]);
        }
      }

      // 3. Finally delete the database record
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      // Clear cache
      cachedProjectsList = null;

      return { error };
    } catch (err) {
      console.error('Error in deleteProject workflow:', err);
      return { error: err };
    }
  },

  /**
   * Helper to extract storage path from a public URL
   */
  extractStoragePath(url: string, bucket: string): string | null {
    try {
      const parts = url.split(`/${bucket}/`);
      if (parts.length < 2) return null;
      return parts[1];
    } catch (e) {
      return null;
    }
  },

  /**
   * Admin only: Get ALL projects from ALL users
   */
  async getAllProjectsAdmin(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, designer, company, updated_at, user_id, settings, zones')
      .order('updated_at', { ascending: false });

    if (error) return { data: null, error };

    return {
      data: data.map(row => ({
        ...row,
        owner_company: row.company || 'Unknown' // Fallback to project's own company field
      })),
      error: null
    };
  },
};
