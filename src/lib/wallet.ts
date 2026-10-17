export type StoryWalletAccountType = 'vault' | 'cash' | 'bank' | 'credit';
export interface StoryWalletAccount {
  id: string;
  name: string;
  type: StoryWalletAccountType;
  balanceCents: number;
  creditLimitCents?: number;
}
export interface StoryWalletTransaction {
  id: string;
  eventId: string;
  sender: string;
  recipient: string;
  amountCents: number;
  currency: string;
  memo: string;
  timestamp: number;
  accountId: string;
}
export interface StoryWalletAsset {
  id: string;
  type: 'property' | 'vehicle' | 'jewelry' | 'other';
  title: string;
  description?: string;
  valueCents?: number;
}
export interface StoryWallet {
  id: string;
  chatId: string;
  personaId: string;
  currency: string;
  accounts: StoryWalletAccount[];
  transactions: StoryWalletTransaction[];
  assets: StoryWalletAsset[];
}
const seededWallet: StoryWallet = {
  id: 'wallet:persona_siren:chat_lucious_main',
  chatId: 'chat_lucious_main',
  personaId: 'persona_siren',
  currency: 'USD',
  accounts: [
    { id: 'vault', name: 'Private vault', type: 'vault', balanceCents: 14497487 },
    { id: 'cash', name: 'Cash balance', type: 'cash', balanceCents: 56700 },
    { id: 'black-card', name: 'Black card', type: 'credit', balanceCents: 78998, creditLimitCents: 100000000 },
    { id: 'swiss-bank', name: 'Swiss account', type: 'bank', balanceCents: 50000075767 },
  ],
  transactions: [
    { id: 'seed-lucious-5000', eventId: 'seed-lucious-5000', sender: 'Lucious', recipient: 'The Muse', amountCents: 500000, currency: 'USD', memo: 'For being my good girl this morning.', timestamp: 1760556000000, accountId: 'cash' },
    { id: 'seed-lucious-2500', eventId: 'seed-lucious-2500', sender: 'Lucious', recipient: 'The Muse', amountCents: 250000, currency: 'USD', memo: 'Cuz I kept you busy last night 😉', timestamp: 1760469600000, accountId: 'cash' },
    { id: 'seed-lucious-1000', eventId: 'seed-lucious-1000', sender: 'Lucious', recipient: 'The Muse', amountCents: 100000, currency: 'USD', memo: 'Just for looking pretty, baby 💗', timestamp: 1760383200000, accountId: 'cash' },
  ],
  assets: [
    { id: 'skyfall-penthouse', type: 'property', title: 'Skyfall Penthouse', description: 'Glass penthouse above the city' },
    { id: 'black-car', type: 'vehicle', title: 'Black luxury coupe', description: 'Parked at the penthouse' },
    { id: 'diamond-choker', type: 'jewelry', title: 'Diamond choker', description: 'Gift from Lucious' },
  ],
};
export const DEFAULT_WALLETS: StoryWallet[] = [seededWallet];

export function createStoryWallet(chatId: string, personaId: string): StoryWallet {
  if (chatId === seededWallet.chatId && personaId === seededWallet.personaId) return { ...seededWallet, accounts: seededWallet.accounts.map((account) => ({ ...account })), transactions: seededWallet.transactions.map((transaction) => ({ ...transaction })), assets: seededWallet.assets.map((asset) => ({ ...asset })) };
  return {
    id: 'wallet:' + personaId + ':' + chatId,
    chatId,
    personaId,
    currency: 'USD',
    accounts: [
      { id: 'vault', name: 'Private vault', type: 'vault', balanceCents: 0 },
      { id: 'cash', name: 'Cash balance', type: 'cash', balanceCents: 0 },
      { id: 'black-card', name: 'Black card', type: 'credit', balanceCents: 0, creditLimitCents: 100000000 },
      { id: 'checking', name: 'Bank account', type: 'bank', balanceCents: 0 },
    ],
    transactions: [],
    assets: [],
  };
}

export function getWalletForScope(wallets: StoryWallet[], chatId: string, personaId: string): StoryWallet {
  return wallets.find((wallet) => wallet.chatId === chatId && wallet.personaId === personaId) || createStoryWallet(chatId, personaId);
}

export function recordIncomingTransfer(wallet: StoryWallet, input: {
  eventId: string;
  sender: string;
  recipient: string;
  amountCents: number;
  memo: string;
  timestamp?: number;
}): StoryWallet {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error('Enter a transfer amount greater than zero.');
  if (!input.eventId.trim()) throw new Error('A unique transfer ID is required.');
  if (wallet.transactions.some((transaction) => transaction.eventId === input.eventId)) return wallet;
  const cashAccount = wallet.accounts.find((account) => account.type === 'cash') || { id: 'cash', name: 'Cash balance', type: 'cash' as const, balanceCents: 0 };
  const transaction: StoryWalletTransaction = {
    id: input.eventId,
    eventId: input.eventId,
    sender: input.sender.trim() || 'Story character',
    recipient: input.recipient.trim() || 'Persona',
    amountCents: input.amountCents,
    currency: wallet.currency,
    memo: input.memo.trim() || 'Fictional story transfer',
    timestamp: input.timestamp ?? Date.now(),
    accountId: cashAccount.id,
  };
  return {
    ...wallet,
    accounts: wallet.accounts.some((account) => account.id === cashAccount.id)
      ? wallet.accounts.map((account) => account.id === cashAccount.id ? { ...account, balanceCents: account.balanceCents + input.amountCents } : account)
      : [...wallet.accounts, { ...cashAccount, balanceCents: input.amountCents }],
    transactions: [transaction, ...wallet.transactions],
  };
}

export function formatWalletMoney(cents: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return '$' + (cents / 100).toFixed(2);
  }
}
