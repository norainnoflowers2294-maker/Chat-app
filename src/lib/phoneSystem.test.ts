import { describe, expect, it } from 'bun:test';
import { addPhoneItem, addPhoneThreadMessage, ensureFictionalPhone, formatPhoneStoryContext, mergePhoneSystemData, recordPhoneDiscovery, DEFAULT_PHONE_SYSTEM } from './phoneSystem';

describe('fictional phone discovery access', () => {
  it('keeps Lucious and Emmy phone discoveries distinct in both access directions', () => {
    let state = ensureFictionalPhone(DEFAULT_PHONE_SYSTEM, 'chat-1', 'emmy', 'Emmy');
    state = ensureFictionalPhone(state, 'chat-1', 'lucious', 'Lucious');
    const emmyPhone = state.phones.find((phone) => phone.ownerId === 'emmy')!;
    const luciousPhone = state.phones.find((phone) => phone.ownerId === 'lucious')!;

    state = addPhoneItem(state, emmyPhone.id, { kind: 'text', title: 'Vic message', body: 'Meet me at the garden gate at nine.' });
    const emmyItem = state.phones.find((phone) => phone.id === emmyPhone.id)!.items[0];
    state = recordPhoneDiscovery(state, 'chat-1', 'lucious', emmyItem, 'Emmy');

    state = addPhoneItem(state, luciousPhone.id, { kind: 'text', title: 'Private message', body: 'The blue folder is in my office.' });
    const luciousItem = state.phones.find((phone) => phone.id === luciousPhone.id)!.items[0];
    state = recordPhoneDiscovery(state, 'chat-1', 'emmy', luciousItem, 'Lucious');

    const luciousKnows = formatPhoneStoryContext(state, 'chat-1', ['lucious']);
    const emmyKnows = formatPhoneStoryContext(state, 'chat-1', ['emmy']);
    expect(luciousKnows).toContain('Meet me at the garden gate at nine.');
    expect(luciousKnows).not.toContain('The blue folder is in my office.');
    expect(emmyKnows).toContain('The blue folder is in my office.');
    expect(emmyKnows).not.toContain('Meet me at the garden gate at nine.');
  });

  it('does not expose undiscovered items or discoveries from another chat', () => {
    let state = ensureFictionalPhone(DEFAULT_PHONE_SYSTEM, 'chat-1', 'emmy', 'Emmy');
    const phone = state.phones[0];
    state = addPhoneItem(state, phone.id, { kind: 'text', title: 'Unread', body: 'This remains private.' });
    expect(formatPhoneStoryContext(state, 'chat-1', ['lucious'])).toBe('');
    const item = state.phones[0].items[0];
    state = recordPhoneDiscovery(state, 'chat-1', 'lucious', item, 'Emmy');
    expect(formatPhoneStoryContext(state, 'chat-2', ['lucious'])).toBe('');
  });
});

describe('fictional phone conversation threads', () => {
  it('keeps outgoing and incoming text-mode messages together in the correct chat phone', () => {
    let state = addPhoneThreadMessage(
      DEFAULT_PHONE_SYSTEM, 'chat-text', 'emmy', 'Emmy', 'lucious', 'Lucious',
      { senderId: 'user', senderName: 'Emmy', content: 'Are you home?', direction: 'outgoing', timestamp: 100 },
    );
    state = addPhoneThreadMessage(
      state, 'chat-text', 'emmy', 'Emmy', 'lucious', 'Lucious',
      { senderId: 'lucious', senderName: 'Lucious', content: 'Just got in.', direction: 'incoming', timestamp: 200 },
    );
    const emmyPhone = state.phones.find((phone) => phone.ownerId === 'emmy')!;
    expect(emmyPhone.threads).toHaveLength(1);
    expect(emmyPhone.threads![0].participantName).toBe('Lucious');
    expect(emmyPhone.threads![0].messages.map((message) => message.senderName + ' - ' + message.content)).toEqual([
      'Emmy - Are you home?',
      'Lucious - Just got in.',
    ]);
    expect(state.phones.some((phone) => phone.ownerId === 'lucious')).toBe(false);
  });

  it('merges phone thread messages across Firebase and local state', () => {
    const remote = addPhoneThreadMessage(
      DEFAULT_PHONE_SYSTEM, 'chat-thread-merge', 'emmy', 'Emmy', 'lucious', 'Lucious',
      { senderId: 'user', senderName: 'Emmy', content: 'Cloud message', direction: 'outgoing', id: 'cloud-message', timestamp: 100 },
    );
    const local = addPhoneThreadMessage(
      DEFAULT_PHONE_SYSTEM, 'chat-thread-merge', 'emmy', 'Emmy', 'lucious', 'Lucious',
      { senderId: 'lucious', senderName: 'Lucious', content: 'Device reply', direction: 'incoming', id: 'local-message', timestamp: 200 },
    );
    const merged = mergePhoneSystemData(remote, local);
    expect(merged.phones[0].threads![0].messages.map((message) => message.id)).toEqual(['cloud-message', 'local-message']);
  });
});

describe('fictional phone cloud merge', () => {
  it('preserves phone items and discoveries from both Firebase and this device', () => {
    let remote = ensureFictionalPhone(DEFAULT_PHONE_SYSTEM, 'chat-merge', 'emmy', 'Emmy');
    const remotePhone = remote.phones[0];
    remote = addPhoneItem(remote, remotePhone.id, { kind: 'text', title: 'Cloud message', body: 'Cloud detail.' });
    remote = recordPhoneDiscovery(remote, 'chat-merge', 'lucious', remote.phones[0].items[0], 'Emmy');

    let local = ensureFictionalPhone(DEFAULT_PHONE_SYSTEM, 'chat-merge', 'emmy', 'Emmy');
    const localPhone = local.phones[0];
    local = addPhoneItem(local, localPhone.id, { kind: 'note', title: 'Device note', body: 'Local detail.' });
    local = recordPhoneDiscovery(local, 'chat-merge', 'emmy', local.phones[0].items[0], 'Emmy');

    const merged = mergePhoneSystemData(remote, local);
    expect(merged.phones[0].items).toHaveLength(2);
    expect(formatPhoneStoryContext(merged, 'chat-merge', ['lucious'])).toContain('Cloud detail.');
    expect(formatPhoneStoryContext(merged, 'chat-merge', ['emmy'])).toContain('Local detail.');
  });
});
