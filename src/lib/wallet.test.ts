import { describe, expect, it } from 'bun:test';
import { createStoryWallet, recordIncomingTransfer } from './wallet';

describe('fictional wallet ledger', () => {
  it('keeps wallets scoped to each chat and persona', () => {
    const first = createStoryWallet('chat-a', 'persona-a');
    const other = createStoryWallet('chat-b', 'persona-a');
    expect(first.id).not.toBe(other.id);
    expect(first.accounts.find((account) => account.type === 'cash')?.balanceCents).toBe(0);
  });
  it('adds an incoming transfer once and updates cash in integer cents', () => {
    const wallet = createStoryWallet('chat-a', 'persona-a');
    const input = { eventId: 'transfer-1', sender: 'Lou', recipient: 'Emmy', amountCents: 75000, memo: 'For you', timestamp: 100 };
    const posted = recordIncomingTransfer(wallet, input);
    expect(posted.accounts.find((account) => account.type === 'cash')?.balanceCents).toBe(75000);
    expect(recordIncomingTransfer(posted, input)).toBe(posted);
    expect(posted.transactions).toHaveLength(1);
  });
  it('rejects invalid balances', () => {
    const wallet = createStoryWallet('chat-a', 'persona-a');
    expect(() => recordIncomingTransfer(wallet, { eventId: 'bad', sender: 'Lou', recipient: 'Emmy', amountCents: 0, memo: '' })).toThrow();
  });
});
