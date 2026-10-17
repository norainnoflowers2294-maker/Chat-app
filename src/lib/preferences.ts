export const DEFAULT_PREFERENCES = {
  theme: 'colorpop', accent: '#ff007f', fontSize: 16, headerFont: 'sans',
  reducedMotion: false, compactMode: false, messageAnimations: true,
  chatSystemPrompt: '',
  autoScroll: true, showTimestamps: true, enterToSend: true, confirmDelete: true,
  cloudSync: true, contextMessages: 40, showDiagnostics: true,
  memoryEnabled: true, memoryDepth: 'balanced', trackWardrobe: true,
  trackLocations: true, npcAutonomy: true, narratorEnabled: true,
  narratorFrequency: 'balanced', notifyReplies: false,
};
export type AppPreferences = typeof DEFAULT_PREFERENCES;
const choices: Record<string, string[]> = {
  theme: ['colorpop', 'light', 'dark'], headerFont: ['sans', 'serif', 'mono'],
  memoryDepth: ['light', 'balanced', 'deep'], narratorFrequency: ['quiet', 'balanced', 'active'],
};
export function normalizePreferences(input: unknown): AppPreferences {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const result: Record<string, unknown> = { ...DEFAULT_PREFERENCES };
  for (const [key, fallback] of Object.entries(DEFAULT_PREFERENCES)) {
    const value = source[key];
    if (typeof value !== typeof fallback) continue;
    if (typeof fallback === 'boolean') result[key] = value;
    else if (choices[key] && choices[key].includes(value as string)) result[key] = value;
    else if (key === 'accent' && /^#[0-9a-f]{6}$/i.test(value as string)) result[key] = value;
    else if (key === 'fontSize' && Number.isFinite(value)) result[key] = Math.round(Math.min(24, Math.max(12, value as number)));
    else if (key === 'contextMessages' && Number.isFinite(value)) result[key] = Math.round(Math.min(200, Math.max(5, value as number)));
  }
  return result as AppPreferences;
}
export function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
