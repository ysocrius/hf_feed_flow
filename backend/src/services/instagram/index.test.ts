import { describe, it, expect, beforeEach } from 'vitest';
import { SimAdapter, getInstagramService } from './index';

describe('SimAdapter', () => {
  let adapter: SimAdapter;

  beforeEach(() => {
    adapter = new SimAdapter();
  });

  it('connects and disconnects', async () => {
    const session = await adapter.connect('test_user', 'password');
    expect(session).toBeDefined();
    expect(session.username).toBe('test_user');
    await adapter.disconnect();
    expect(adapter.getRelevanceScore()).toBe(0.5);
  });

  it('likeByTopic returns results with correct structure', async () => {
    await adapter.connect('test', 'pass');
    const results = await adapter.likeByTopic('fitness', 3);
    expect(results).toHaveLength(3);
    results.forEach(r => {
      expect(r.actionType).toBe('like');
      expect(r.topic).toBe('fitness');
      expect(typeof r.success).toBe('boolean');
      expect(r.timestamp).toBeDefined();
    });
  });

  it('followByTopic returns results with correct structure', async () => {
    await adapter.connect('test', 'pass');
    const results = await adapter.followByTopic('travel', 2);
    expect(results).toHaveLength(2);
    results.forEach(r => {
      expect(r.actionType).toBe('follow');
      expect(r.topic).toBe('travel');
    });
  });

  it('searchHashtag returns relevant hashtags', async () => {
    await adapter.connect('test', 'pass');
    const hashtags = await adapter.searchHashtag('fitness');
    expect(Array.isArray(hashtags)).toBe(true);
    expect(hashtags.length).toBeGreaterThan(0);
    hashtags.forEach(h => expect(h).toMatch(/^#/));
  });

  it('getProfileSnapshot returns valid profile', async () => {
    await adapter.connect('test_user', 'pass');
    const profile = await adapter.getProfileSnapshot();
    expect(profile.username).toBe('test_user');
    expect(typeof profile.followerCount).toBe('number');
    expect(typeof profile.followingCount).toBe('number');
    expect(typeof profile.postCount).toBe('number');
  });

  it('relevance score increases with successful actions', async () => {
    await adapter.connect('test', 'pass');
    const initialScore = adapter.getRelevanceScore();
    await adapter.likeByTopic('fitness', 10);
    const finalScore = adapter.getRelevanceScore();
    expect(finalScore).toBeGreaterThanOrEqual(initialScore);
  });
});

describe('getInstagramService factory', () => {
  it('returns SimAdapter for sim mode', () => {
    const service = getInstagramService('sim');
    expect(service).toBeInstanceOf(SimAdapter);
  });

  it('returns PrivateApiAdapter for live mode', () => {
    const service = getInstagramService('live');
    expect(service.constructor.name).toBe('PrivateApiAdapter');
  });
});
