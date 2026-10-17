import { describe, expect, it } from 'bun:test';
import { addPhoneItem, ensureFictionalPhone, formatPhoneStoryContext, recordPhoneDiscovery, DEFAULT_PHONE_SYSTEM } from './phoneSystem';

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
