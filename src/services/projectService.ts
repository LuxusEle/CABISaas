import { supabase } from './supabaseClient';
import type { Project } from '../types';

export const projectService = {
  /**
   * Create a new project in the database
   */
  async createProject(project: Project): Promise<{ data: Project | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: project.name,
        designer: project.designer,
        company: project.company,
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
   * Get all projects for the current user
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

    return {
      data: {
        id: data.id,
        name: data.name,
        designer: data.designer || '',
        company: data.company || '',
        settings: data.settings,
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
        settings: data.settings,
        zones: data.zones,
      },
      error: null,
    };
  },

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    return { error };
  },
};
