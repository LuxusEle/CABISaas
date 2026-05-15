import { create } from 'zustand';
import { Project, ProjectSettings } from '../types';
import { createNewProject } from '../services/bomService';

interface ProjectState {
  project: Project;
  lastSavedProject: string;
  isDirty: boolean;
  isSaving: boolean;
  
  // Actions
  setProject: (project: Project | ((prev: Project) => Project)) => void;
  updateProjectSettings: (settings: Partial<ProjectSettings>) => void;
  markAsSaved: () => void;
  setIsSaving: (isSaving: boolean) => void;
  resetProject: () => void;
}

/**
 * Utility to compare project state for dirty checking (ignoring design captures)
 */
const getDesignState = (p: Project) => {
  const { settings, ...rest } = p;
  const { designCaptures, ...restSettings } = settings || {};
  return JSON.stringify({ ...rest, settings: restSettings });
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createNewProject(),
  lastSavedProject: JSON.stringify(createNewProject()),
  isDirty: false,
  isSaving: false,

  setProject: (update) => {
    set((state) => {
      const nextProject = typeof update === 'function' ? update(state.project) : update;
      
      const currentDesignStr = getDesignState(nextProject);
      const lastSavedDesignStr = getDesignState(JSON.parse(state.lastSavedProject));
      
      return { 
        project: nextProject,
        isDirty: currentDesignStr !== lastSavedDesignStr
      };
    });
  },

  updateProjectSettings: (newSettings) => {
    set((state) => {
      const nextProject = {
        ...state.project,
        settings: {
          ...state.project.settings,
          ...newSettings
        }
      };
      
      const currentDesignStr = getDesignState(nextProject);
      const lastSavedDesignStr = getDesignState(JSON.parse(state.lastSavedProject));

      return {
        project: nextProject,
        isDirty: currentDesignStr !== lastSavedDesignStr
      };
    });
  },

  markAsSaved: () => {
    const currentProjectStr = JSON.stringify(get().project);
    set({ 
      lastSavedProject: currentProjectStr,
      isDirty: false,
      isSaving: false
    });
  },

  setIsSaving: (isSaving) => set({ isSaving }),

  resetProject: () => {
    const newProject = createNewProject();
    set({
      project: newProject,
      lastSavedProject: JSON.stringify(newProject),
      isDirty: false
    });
  }
}));
