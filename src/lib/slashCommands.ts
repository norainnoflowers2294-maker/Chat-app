export type NarratorFrequency = 'quiet' | 'balanced' | 'active';
export type SlashCommand =
  | { type: 'wallet'; view: 'dashboard' | 'activity' }
  | { type: 'narrator'; enabled?: boolean; frequency?: NarratorFrequency }
  | { type: 'roll' }
  | { type: 'continue' }
  | { type: 'rewind' }
  | { type: 'tts'; action: 'toggle' | 'play' | 'stop' }
  | { type: 'help' };

export interface SlashCommandSuggestion {
  name: string;
  usage: string;
  description: string;
}

export const SLASH_COMMAND_SUGGESTIONS: SlashCommandSuggestion[] = [
  { name: 'continue', usage: '/continue', description: 'Continue the scene without adding a user message' },
  { name: 'rewind', usage: '/rewind', description: 'Remove the latest character reply' },
  { name: 'nar', usage: '/nar', description: 'Toggle the narrator' },
  { name: 'cash', usage: '/cash', description: 'Open the story wallet' },
  { name: 'cashapp', usage: '/cashapp', description: 'Open wallet activity' },
  { name: 'roll', usage: '/roll', description: 'Roll a d20' },
  { name: 'tts', usage: '/tts', description: 'Read the latest character reply aloud' },
  { name: 'help', usage: '/help', description: 'Show available commands' },
];

export function getSlashCommandSuggestions(input: string): SlashCommandSuggestion[] {
  const trimmed = input.trimStart();
  const match = trimmed.match(/^\/([a-z-]*)$/i);
  if (!match) return [];
  const query = match[1].toLowerCase();
  return SLASH_COMMAND_SUGGESTIONS.filter((command) => command.name.startsWith(query));
}

export function parseSlashCommand(input: string): SlashCommand | null {
  const match = input.trim().match(/^\/([a-z-]+)(?:\s+(.*))?$/i);
  if (!match) return null;
  const name = match[1].toLowerCase();
  const argument = (match[2] || '').trim().toLowerCase();

  if (name === 'cash' && !argument) return { type: 'wallet', view: 'dashboard' };
  if ((name === 'cashapp' || name === 'cash-app') && !argument) return { type: 'wallet', view: 'activity' };
  if (name === 'roll' && !argument) return { type: 'roll' };
  if ((name === 'continue' || name === 'cont') && !argument) return { type: 'continue' };
  if ((name === 'rewind' || name === 'undo') && !argument) return { type: 'rewind' };
  if (name === 'help' && !argument) return { type: 'help' };
  if (name === 'tts') {
    if (!argument) return { type: 'tts', action: 'toggle' };
    if (argument === 'on' || argument === 'play' || argument === 'start') return { type: 'tts', action: 'play' };
    if (argument === 'off' || argument === 'stop') return { type: 'tts', action: 'stop' };
    return null;
  }
  if (name !== 'nar' && name !== 'narrator') return null;
  if (!argument) return { type: 'narrator' };
  if (argument === 'on' || argument === 'enable' || argument === 'enabled') return { type: 'narrator', enabled: true };
  if (argument === 'off' || argument === 'disable' || argument === 'disabled') return { type: 'narrator', enabled: false };
  if (argument === 'quiet' || argument === 'balanced' || argument === 'active') {
    return { type: 'narrator', enabled: true, frequency: argument };
  }
  return null;
}
