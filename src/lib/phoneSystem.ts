export type FictionalPhoneItemKind = 'text' | 'call' | 'photo' | 'notification' | 'note' | 'contact' | 'social' | 'transaction';
export interface FictionalPhoneItem {
  id: string;
  kind: FictionalPhoneItemKind;
  title: string;
  body: string;
  createdAt: number;
  from?: string;
  mediaUrl?: string;
  locked?: boolean;
  discoveredBy: string[];
}
export interface FictionalPhone {
  id: string;
  chatId: string;
  ownerId: string;
  ownerName: string;
  pin: string;
  items: FictionalPhoneItem[];
}
export interface PhoneScratchpadEntry {
  id: string;
  chatId: string;
  text: string;
  createdAt: number;
  discoveredBy: string[];
  source: string;
}
export interface PhoneSystemState {
  phones: FictionalPhone[];
  scratchpad: PhoneScratchpadEntry[];
}
export const DEFAULT_PHONE_SYSTEM: PhoneSystemState = { phones: [], scratchpad: [] };

const idFor = (chatId: string, ownerId: string) => `phone:${chatId}:${ownerId}`;
export function ensureFictionalPhone(state: PhoneSystemState | undefined, chatId: string, ownerId: string, ownerName: string): PhoneSystemState {
  const current = state || DEFAULT_PHONE_SYSTEM;
  if (current.phones.some((phone) => phone.id === idFor(chatId, ownerId))) return current;
  return {
    ...current,
    phones: [...current.phones, {
      id: idFor(chatId, ownerId), chatId, ownerId, ownerName, pin: '0420', items: [],
    }],
  };
}
export function addPhoneItem(state: PhoneSystemState, phoneId: string, item: Omit<FictionalPhoneItem, 'id' | 'createdAt' | 'discoveredBy'>): PhoneSystemState {
  const newItem: FictionalPhoneItem = {
    ...item, id: `phone-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(), discoveredBy: [],
  };
  return { ...state, phones: state.phones.map((phone) => phone.id === phoneId ? { ...phone, items: [newItem, ...phone.items] } : phone) };
}
export function recordPhoneDiscovery(state: PhoneSystemState, chatId: string, viewerId: string, item: FictionalPhoneItem, ownerName: string): PhoneSystemState {
  if (item.discoveredBy.includes(viewerId)) return state;
  const phones = state.phones.map((phone) => phone.items.some((entry) => entry.id === item.id)
    ? { ...phone, items: phone.items.map((entry) => entry.id === item.id ? { ...entry, discoveredBy: [...entry.discoveredBy, viewerId] } : entry) }
    : phone);
  const scratchpad = [{
    id: `discovery-${item.id}-${viewerId}`, chatId,
    text: `${ownerName}’s ${item.kind}: ${item.title} — ${item.body}`,
    createdAt: Date.now(), discoveredBy: [viewerId], source: item.id,
  }, ...state.scratchpad.filter((entry) => entry.id !== `discovery-${item.id}-${viewerId}`)];
  return { ...state, phones, scratchpad };
}
export function formatPhoneStoryContext(state: PhoneSystemState | undefined, chatId: string, characterIds: string[]): string {
  const known = new Set(characterIds);
  const entries = (state?.scratchpad || []).filter((entry) => entry.chatId === chatId && entry.discoveredBy.some((id) => known.has(id)));
  if (!entries.length) return '';
  const lines = entries.slice(0, 20).map((entry) => {
    const discoverers = entry.discoveredBy.filter((id) => known.has(id)).join(', ');
    return `- ${entry.text} [actually discovered by: ${discoverers}]`;
  });
  return [
    '[FICTIONAL PHONE DISCOVERIES — LIMITED CHARACTER KNOWLEDGE]',
    'These are the only phone details characters may treat as discovered. Each item names who actually saw it. Characters who did not discover an item must not know or react to it unless the scene establishes how they learned it. This is fictional app data, not a real device.',
    ...lines,
  ].join('\n');
}
