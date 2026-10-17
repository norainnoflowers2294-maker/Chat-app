import { describe, expect, it } from 'bun:test';
import { getSlashCommandSuggestions, parseSlashCommand } from './slashCommands';

describe('parseSlashCommand', () => {
  it('routes wallet and Cash App commands without treating them as chat', () => {
    expect(parseSlashCommand('/cash')).toEqual({ type: 'wallet', view: 'dashboard' });
    expect(parseSlashCommand('/cashapp')).toEqual({ type: 'wallet', view: 'activity' });
  });
  it('supports narrator toggle and detail options', () => {
    expect(parseSlashCommand('/nar')).toEqual({ type: 'narrator' });
    expect(parseSlashCommand('/nar off')).toEqual({ type: 'narrator', enabled: false });
    expect(parseSlashCommand('/nar active')).toEqual({ type: 'narrator', enabled: true, frequency: 'active' });
  });
  it('supports scene, rewind, speech and help commands', () => {
    expect(parseSlashCommand('/continue')).toEqual({ type: 'continue' });
    expect(parseSlashCommand('/rewind')).toEqual({ type: 'rewind' });
    expect(parseSlashCommand('/tts')).toEqual({ type: 'tts', action: 'toggle' });
    expect(parseSlashCommand('/tts stop')).toEqual({ type: 'tts', action: 'stop' });
    expect(parseSlashCommand('/help')).toEqual({ type: 'help' });
  });
  it('offers matching command suggestions while typing', () => {
    expect(getSlashCommandSuggestions('/ca').map((command) => command.name)).toEqual(['cash', 'cashapp']);
    expect(getSlashCommandSuggestions('hello')).toEqual([]);
  });
  it('keeps unknown slash text available for normal chat', () => {
    expect(parseSlashCommand('/something')).toBeNull();
  });
});
