import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './useProjectStore';
import { createNewProject } from '../services/bomService';

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  it('should initialize with a new project', () => {
    const state = useProjectStore.getState();
    expect(state.project).toBeDefined();
    expect(state.isDirty).toBe(false);
  });

  it('should mark project as dirty when settings change', () => {
    const { updateProjectSettings } = useProjectStore.getState();
    
    updateProjectSettings({ currency: 'EUR' });
    
    const state = useProjectStore.getState();
    expect(state.project.settings.currency).toBe('EUR');
    expect(state.isDirty).toBe(true);
  });

  it('should not mark as dirty if only designCaptures change', () => {
    const { updateProjectSettings } = useProjectStore.getState();
    
    updateProjectSettings({ designCaptures: ['data:image/png;base64,123'] });
    
    const state = useProjectStore.getState();
    expect(state.isDirty).toBe(false);
  });

  it('should reset dirty state when marked as saved', () => {
    const { updateProjectSettings, markAsSaved } = useProjectStore.getState();
    
    updateProjectSettings({ currency: 'GBP' });
    expect(useProjectStore.getState().isDirty).toBe(true);
    
    markAsSaved();
    expect(useProjectStore.getState().isDirty).toBe(false);
  });
});
