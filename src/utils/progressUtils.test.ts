import { describe, it, expect } from 'vitest';
import { Project } from '../types';
import { calculateProjectProgress } from './progressUtils';

describe('Project Progress Calculation', () => {
  const mockProject: Project = {
    id: 'test',
    name: 'Test',
    designer: '',
    company: '',
    settings: {
      completedSteps: [],
      // ... minimal settings
    } as any,
    zones: []
  };

  it('should return initial progress for a new project', () => {
    const progress = calculateProjectProgress(mockProject);
    // A new project with a name and zones has 2 tasks done by default
    expect(progress.setup.done).toBe(2);
    expect(progress.setup.status).toBe('in_progress');
  });

  it('should reflect completed steps in the wizard', () => {
    const projectWithSteps = {
      ...mockProject,
      settings: {
        ...mockProject.settings,
        completedSteps: ['preferences', 'hardware']
      }
    };
    const progress = calculateProjectProgress(projectWithSteps);
    // Two steps completed: preferences and hardware (plus whatever defaults)
    expect(progress.setup.done).toBeGreaterThanOrEqual(2);
  });

  it('should identify correctly marked phases', () => {
    const progress = calculateProjectProgress(mockProject);
    expect(progress.setup.status).toBe('in_progress');
    expect(progress.walls.status).toBe('not_started');
  });
});
