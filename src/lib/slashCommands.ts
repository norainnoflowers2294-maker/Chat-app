export type NarratorFrequency = 'quiet' | 'balanced' | 'active';
export type SlashCommand =
  | { type: 'wallet'; view: 'dashboard' | 'activity' }
  | { type: 'narrator'; enabled?: boolean; frequency?: NarratorFrequency }
  | { type: 'roll' };

export function parseSlashCommand(input: string): SlashCommand | null {
  const match = input.trim().match(/^\/([a-z]+)(?:\s+(.*))?$/i);
  if (!match) return null;
  const name = match[1].toLowerCase();
  const argument = (match[2] || '').trim().toLowerCase();

  if (name === 'cash' && !argument) return { type: 'wallet', view: 'dashboard' };
  if ((name === 'cashapp' || name === 'cash-app') && !argument) return { type: 'wallet', view: 'activity' };
  if (name === 'roll' && !argument) return { type: 'roll' };
  if (name !== 'nar' && name !== 'narrator') return null;
  if (!argument) return { type: 'narrator' };
  if (argument === 'on' || argument === 'enable' || argument === 'enabled') return { type: 'narrator', enabled: true };
  if (argument === 'off' || argument === 'disable' || argument === 'disabled') return { type: 'narrator', enabled: false };
  if (argument === 'quiet' || argument === 'balanced' || argument === 'active') {
    return { type: 'narrator', enabled: true, frequency: argument };
  }
  return null;
}
