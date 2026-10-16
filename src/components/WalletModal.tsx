import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, Building2, Car, Clock3, CreditCard, Gem, Landmark, PiggyBank, Plus, Wallet as WalletIcon, X } from 'lucide-react';
import { formatWalletMoney, recordIncomingTransfer, type StoryWallet, type StoryWalletAccount } from '../lib/wallet';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  view: 'dashboard' | 'activity';
  onChangeView: (view: 'dashboard' | 'activity') => void;
  wallet: StoryWallet;
  personaName: string;
  characterName: string;
  onSaveWallet: (wallet: StoryWallet) => void;
}

function accountIcon(account: StoryWalletAccount) {
  if (account.type === 'credit') return <CreditCard className="h-5 w-5" />;
  if (account.type === 'bank') return <Landmark className="h-5 w-5" />;
  if (account.type === 'vault') return <PiggyBank className="h-5 w-5" />;
  return <WalletIcon className="h-5 w-5" />;
}

function dateLabel(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(timestamp);
}

export function WalletModal({ isOpen, onClose, view, onChangeView, wallet, personaName, characterName, onSaveWallet }: WalletModalProps) {
  const [amount, setAmount] = useState('');
  const [sender, setSender] = useState(characterName);
  const [memo, setMemo] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    setAmount('');
    setMemo('');
    setSender(characterName);
    setStatus('');
  }, [isOpen, wallet.id, characterName]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const liquidCents = wallet.accounts.filter((account) => account.type !== 'credit').reduce((sum, account) => sum + account.balanceCents, 0);
  const transactions = [...wallet.transactions].sort((a, b) => b.timestamp - a.timestamp);

  const recordTransfer = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000000) {
      setStatus('Enter a valid fictional amount up to $10,000,000.');
      return;
    }
    const eventId = 'story-transfer-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    try {
      const next = recordIncomingTransfer(wallet, {
        eventId,
        sender: sender || characterName,
        recipient: personaName,
        amountCents: Math.round(parsedAmount * 100),
        memo,
      });
      onSaveWallet(next);
      setAmount('');
      setMemo('');
      setStatus('Fictional transfer added to this story wallet.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not record that transfer.');
    }
  };

  return <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={view === 'activity' ? 'Fictional Cash App feed' : 'Fictional wallet'} className="w-full sm:max-w-2xl max-h-[94dvh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[#ff66b2]/40 bg-[#140410] text-[#ffe5f1] shadow-[0_20px_80px_rgba(0,0,0,.7)]">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#0d020b] px-5 py-4">
        <div>
          <p className="text-[10px] font-bold tracking-[.22em] text-[#9be3d5]">FICTIONAL STORY WALLET</p>
          <h2 className="mt-1 text-xl font-bold">{view === 'activity' ? 'Cash App' : personaName + '’s wallet'}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close wallet" className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
      </header>
      <nav className="flex gap-2 border-b border-white/10 px-4 py-3">
        <button type="button" onClick={() => onChangeView('dashboard')} aria-pressed={view === 'dashboard'} className={'rounded-xl px-4 py-2 text-sm font-semibold ' + (view === 'dashboard' ? 'bg-[#ff007f] text-white' : 'bg-white/5 text-white/70')}>Wallet</button>
        <button type="button" onClick={() => onChangeView('activity')} aria-pressed={view === 'activity'} className={'rounded-xl px-4 py-2 text-sm font-semibold ' + (view === 'activity' ? 'bg-[#ff007f] text-white' : 'bg-white/5 text-white/70')}>Cash App</button>
      </nav>
      <div className="max-h-[calc(94dvh-148px)] overflow-y-auto p-4 sm:p-6">
        {view === 'dashboard' ? <>
          <section className="rounded-2xl border border-[#ff66b2]/30 bg-gradient-to-br from-[#35102b] to-[#141019] p-5">
            <p className="text-xs text-white/65">Fictional available balance</p>
            <p className="mt-2 text-3xl font-black">{formatWalletMoney(liquidCents, wallet.currency)}</p>
            <p className="mt-2 text-xs text-white/55">For {personaName} · {wallet.transactions.length} story transfers</p>
          </section>
          <h3 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wider text-white/70">Accounts</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {wallet.accounts.map((account) => <article key={account.id} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <div className="flex items-center gap-3 text-[#9be3d5]">{accountIcon(account)}<span className="text-sm font-semibold text-white">{account.name}</span></div>
              <p className="mt-4 text-xl font-bold">{formatWalletMoney(account.balanceCents, wallet.currency)}</p>
              <p className="mt-1 text-xs text-white/55">{account.type === 'credit' ? 'Current card balance · credit, not cash' : account.type === 'bank' ? 'Fictional bank balance' : account.type === 'vault' ? 'Fictional private vault' : 'Available story cash'}</p>
              {account.type === 'credit' && account.creditLimitCents != null && <p className="mt-1 text-[11px] text-white/40">Fictional limit {formatWalletMoney(account.creditLimitCents, wallet.currency)}</p>}
            </article>)}
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/70">Story assets</h3>
            {wallet.assets.length ? <div className="grid gap-3 sm:grid-cols-2">{wallet.assets.map((asset) => <div key={asset.id} className="flex gap-3 rounded-xl bg-white/[.04] p-3">
              <span className="mt-0.5 text-[#ff83bc]">{asset.type === 'property' ? <Building2 className="h-4 w-4" /> : asset.type === 'vehicle' ? <Car className="h-4 w-4" /> : <Gem className="h-4 w-4" />}</span>
              <span><span className="block text-sm font-semibold">{asset.title}</span><span className="block text-xs text-white/55">{asset.description || asset.type}</span></span>
            </div>)}</div> : <p className="text-sm text-white/50">No story assets recorded yet.</p>}
          </div>
          <button type="button" onClick={() => onChangeView('activity')} className="mt-5 w-full rounded-xl bg-[#ff007f] px-4 py-3 text-sm font-bold text-white">Open Cash App activity</button>
        </> : <>
          <form onSubmit={recordTransfer} className="rounded-2xl border border-[#ff66b2]/30 bg-white/[.03] p-4">
            <div className="mb-3 flex items-center gap-2"><ArrowDownLeft className="h-5 w-5 text-[#9be3d5]" /><h3 className="font-bold">Record a fictional payment</h3></div>
            <p className="mb-4 text-xs leading-5 text-white/55">This only changes the selected character story wallet. It never sends real money.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-white/65">From<input value={sender} onChange={(event) => setSender(event.target.value)} maxLength={80} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff66b2]" /></label>
              <label className="text-xs text-white/65">Amount in {wallet.currency}<input type="number" min="0.01" max="10000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff66b2]" /></label>
            </div>
            <label className="mt-3 block text-xs text-white/65">Note<input value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={240} placeholder="A note for this story payment" className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff66b2]" /></label>
            <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ff007f] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add to story wallet</button>
            {status && <p role="status" className="mt-3 text-xs text-[#9be3d5]">{status}</p>}
          </form>
          <div className="mt-5 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/70"><Clock3 className="h-4 w-4" />Payment activity</h3>
            {transactions.length ? transactions.map((transaction) => <article key={transaction.eventId} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff007f]/20 text-[#ff83bc]"><ArrowDownLeft className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">{transaction.sender} <span className="font-normal text-white/45">sent {transaction.recipient}</span></p><p className="font-bold text-[#9be3d5]">+{formatWalletMoney(transaction.amountCents, transaction.currency)}</p></div><p className="mt-1 break-words text-sm text-white/75">{transaction.memo}</p><p className="mt-2 text-[11px] text-white/40">{dateLabel(transaction.timestamp)}</p></div>
            </article>) : <p className="rounded-xl bg-white/[.04] p-4 text-sm text-white/50">No fictional transfers yet.</p>}
          </div>
        </>}
      </div>
    </section>
  </div>;
}
