import type { StoryMemory } from '../types/roleplay';

/** Merge local and cloud memories without resurrecting a newer deletion. */
export function mergeStoryMemories(remote: StoryMemory[] = [], local: StoryMemory[] = []): StoryMemory[] {
  const byId = new Map(remote.map((memory) => [memory.id, memory]));
  const timestamp = (memory: StoryMemory) => {
    const value = memory.updatedAt || memory.deletedAt || memory.createdAt;
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
  };

  for (const localMemory of local) {
    const cloudMemory = byId.get(localMemory.id);
    if (!cloudMemory || timestamp(localMemory) >= timestamp(cloudMemory)) {
      byId.set(localMemory.id, localMemory);
    }
  }
  return [...byId.values()].sort((a, b) => timestamp(b) - timestamp(a));
}
