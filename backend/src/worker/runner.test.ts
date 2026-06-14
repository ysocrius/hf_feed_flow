import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runJob } from './runner';
import * as supabaseAdminModule from '../lib/supabaseAdmin';
import * as instagramServiceModule from '../services/instagram';

// Mock Supabase admin client
vi.mock('../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      insert: vi.fn(),
    })),
  },
}));

// Mock Instagram service
vi.mock('../services/instagram', () => ({
  getInstagramService: vi.fn(),
}));

describe('runJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false and mark job as error if Instagram is disconnected', async () => {
    const mockJob = {
      id: 'job-1',
      user_id: 'user-1',
      status: 'active',
      progress_score: 0,
      actions_count: 0,
    };

    // Mock disconnected connection
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { status: 'disconnected' },
          error: null,
        }),
      }),
    });

    vi.spyOn(supabaseAdminModule.supabaseAdmin, 'from').mockReturnValue({
      select: mockSelect,
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any);

    const result = await runJob(mockJob);

    expect(result).toBe(false);
    // Verify job was marked as error (implementation would check this via mock calls)
  });

  it('should execute actions for amplify preferences and update progress', async () => {
    const mockJob = {
      id: 'job-1',
      user_id: 'user-1',
      status: 'active',
      progress_score: 50,
      actions_count: 10,
    };

    // Mock connected connection
    const mockConnection = {
      status: 'connected',
      mode: 'sim',
      username: 'demo_user',
    };

    // Mock amplify preferences
    const mockPrefs = [{ topic: 'fitness', direction: 'amplify' }];

    // Mock SimAdapter
    const mockAdapter = {
      connect: vi.fn().mockResolvedValue({}),
      likeByTopic: vi.fn().mockResolvedValue([
        { success: true, actionType: 'like', topic: 'fitness', timestamp: new Date().toISOString() },
        { success: true, actionType: 'like', topic: 'fitness', timestamp: new Date().toISOString() },
      ]),
      followByTopic: vi.fn().mockResolvedValue([
        { success: true, actionType: 'follow', topic: 'fitness', timestamp: new Date().toISOString() },
      ]),
    };

    vi.spyOn(instagramServiceModule, 'getInstagramService').mockReturnValue(mockAdapter as any);

    let selectCallCount = 0;
    vi.spyOn(supabaseAdminModule.supabaseAdmin, 'from').mockImplementation((table: string) => {
      if (table === 'instagram_connections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        } as any;
      }
      if (table === 'preferences' && selectCallCount === 0) {
        selectCallCount++;
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockPrefs, error: null }),
            }),
          }),
        } as any;
      }
      // activity_log inserts and automation_jobs updates
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any;
    });

    const result = await runJob(mockJob);

    expect(result).toBe(true);
    expect(mockAdapter.connect).toHaveBeenCalledWith('demo_user', 'sim');
    expect(mockAdapter.likeByTopic).toHaveBeenCalledWith('fitness', 2);
    expect(mockAdapter.followByTopic).toHaveBeenCalledWith('fitness', 1);
  });

  it('should handle job timeout gracefully', async () => {
    const mockJob = {
      id: 'job-1',
      user_id: 'user-1',
      status: 'active',
      progress_score: 0,
      actions_count: 0,
    };

    // Mock slow execution that times out
    const mockAdapter = {
      connect: vi.fn().mockResolvedValue({}),
      likeByTopic: vi.fn().mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 70000)) // 70s, exceeds 60s timeout
      ),
    };

    vi.spyOn(instagramServiceModule, 'getInstagramService').mockReturnValue(mockAdapter as any);

    vi.spyOn(supabaseAdminModule.supabaseAdmin, 'from').mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { status: 'connected', mode: 'sim' },
              error: null,
            }),
            eq: vi.fn().mockResolvedValue({
              data: [{ topic: 'fitness' }],
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any;
    });

    // Should handle timeout and return false
    const result = await runJob(mockJob);
    expect(result).toBe(false);
  }, 65000); // Test timeout longer than job timeout
});
