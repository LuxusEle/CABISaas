import { describe, it, expect, vi } from 'vitest';
import { storageService } from './storageService';
import { supabase } from './supabaseClient';

const mockStorage = {
  upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
  remove: vi.fn().mockResolvedValue({ error: null }),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/design-captures/test.jpg' } }))
};

vi.mock('./supabaseClient', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => mockStorage)
    }
  }
}));

describe('Storage Service', () => {
  it('should correctly extract file path from public URL for deletion', async () => {
    const testUrl = 'https://some-project.supabase.co/storage/v1/object/public/design-captures/proj-123/123456.jpg';
    
    await storageService.deleteDesignCapture(testUrl);
    
    expect(mockStorage.remove).toHaveBeenCalledWith(['proj-123/123456.jpg']);
  });

  it('should return false for invalid URLs during deletion', async () => {
    const result = await storageService.deleteDesignCapture('https://google.com');
    expect(result).toBe(false);
  });
});
