import { describe, expect, it } from 'bun:test';
import { parseSlashCommand } from './slashCommands';

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
  it('keeps unknown slash text available for normal chat', () => {
    expect(parseSlashCommand('/something')).toBeNull();
  });
});
