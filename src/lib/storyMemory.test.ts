import { describe, expect, it } from 'bun:test';
import { mergeStoryMemories } from './storyMemory';
import type { StoryMemory } from '../types/roleplay';

const memory = (overrides: Partial<StoryMemory> = {}): StoryMemory => ({
  id: 'promise-1', chatId: 'chat-1', title: 'The promise', type: 'note',
  content: 'Meet at the garden gate.', createdAt: '2026-10-01T12:00:00.000Z',
  ...overrides,
});

describe('story memory sync merging', () => {
  it('keeps a newer deletion over a stale local copy', () => {
    const cloud = memory({ deletedAt: '2026-10-02T12:00:00.000Z', updatedAt: '2026-10-02T12:00:00.000Z' });
    const staleDevice = memory();
    expect(mergeStoryMemories([cloud], [staleDevice])).toEqual([cloud]);
    expect(mergeStoryMemories([staleDevice], [cloud])).toEqual([cloud]);
  });

  it('keeps later edits and pin changes over older copies', () => {
    const updated = memory({ content: 'Meet at the library instead.', pinned: true, updatedAt: '2026-10-03T12:00:00.000Z' });
    const old = memory({ updatedAt: '2026-10-02T12:00:00.000Z' });
    expect(mergeStoryMemories([old], [updated])).toEqual([updated]);
  });

  it('allows an explicit newer edit to restore a deleted memory', () => {
    const deleted = memory({ deletedAt: '2026-10-02T12:00:00.000Z', updatedAt: '2026-10-02T12:00:00.000Z' });
    const restored = memory({ content: 'Corrected and restored.', updatedAt: '2026-10-03T12:00:00.000Z' });
    expect(mergeStoryMemories([deleted], [restored])).toEqual([restored]);
  });
});
