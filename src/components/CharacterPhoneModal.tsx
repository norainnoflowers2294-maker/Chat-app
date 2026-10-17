import React, { useEffect, useMemo, useState } from 'react';
import { X, Smartphone, MessageCircle, PhoneCall, Image as ImageIcon, Users, Bell, WalletCards, Heart, StickyNote, LockKeyhole, UnlockKeyhole, Plus, Clock3, Eye, ShieldAlert } from 'lucide-react';
import { addPhoneItem, ensureFictionalPhone, formatPhoneStoryContext, recordPhoneDiscovery, type PhoneSystemState, type FictionalPhone, type FictionalPhoneItem, type FictionalPhoneItemKind } from '../lib/phoneSystem';
import { recordIncomingTransfer, type StoryWallet } from '../lib/wallet';
import type { SocialMediaWorld } from '../lib/socialMedia';
import type { Chat, Character, OpenRouterConfig, Persona, Lorebook, Plugin, StoryMemory } from '../types/roleplay';
import type { AppPreferences } from '../lib/preferences';
import { sendOpenRouterChat } from '../lib/openrouter';
import { buildOpenRouterMessages } from '../utils/promptAssembler';
import { formatPhoneStoryContext } from '../lib/phoneSystem';

type PhoneTab = 'texts' | 'calls' | 'photos' | 'contacts' | 'notifications' | 'money' | 'social' | 'notes' | 'scratchpad' | 'settings';
const tabs: Array<{ id: PhoneTab; label: string; icon: React.ElementType; color: string }> = [
  { id: 'texts', label: 'Texts', icon: MessageCircle, color: '#078FEC' },
  { id: 'calls', label: 'Calls', icon: PhoneCall, color: '#FF3C00' },
  { id: 'photos', label: 'Gallery', icon: ImageIcon, color: '#E50962' },
  { id: 'contacts', label: 'Contacts', icon: Users, color: '#8BAEF2' },
  { id: 'notifications', label: 'Alerts', icon: Bell, color: '#F49405' },
  { id: 'money', label: 'Cash App', icon: WalletCards, color: '#008577' },
  { id: 'social', label: 'Social', icon: Heart, color: '#FF0080' },
  { id: 'notes', label: 'Notes', icon: StickyNote, color: '#AE31A5' },
  { id: 'scratchpad', label: 'Scratchpad', icon: Eye, color: '#37B6A2' },
  { id: 'settings', label: 'Settings', icon: LockKeyhole, color: '#07128F' },
];
const kindForTab: Partial<Record<PhoneTab, FictionalPhoneItemKind>> = { texts: 'text', calls: 'call', photos: 'photo', contacts: 'contact', notifications: 'notification', notes: 'note' };
const controlStyle: React.CSSProperties = { border: '1px solid #ffffff35', borderRadius: 12, background: '#ffffff12', color: '#fff', padding: '10px 12px', outline: 'none', minWidth: 0 };
const buttonStyle: React.CSSProperties = { border: '1px solid #ffffff36', borderRadius: 12, color: '#fff', padding: '10px 13px', fontWeight: 700, cursor: 'pointer' };

export interface CharacterPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  characters: Character[];
  activeCharacters: Character[];
  personaName: string;
  phoneSystem: PhoneSystemState;
  onChange: (state: PhoneSystemState) => void;
  wallet?: StoryWallet;
  onSaveWallet?: (wallet: StoryWallet) => void;
  socialWorld?: SocialMediaWorld;
  openRouterConfig: OpenRouterConfig;
  preferences: AppPreferences;
  persona: Persona | null;
  lorebooks: Lorebook[];
  plugins: Plugin[];
  storyMemories: StoryMemory[];
  socialMediaContext: string;
}
export const CharacterPhoneModal: React.FC<CharacterPhoneModalProps> = ({
  isOpen, onClose, chat, characters, activeCharacters, personaName, phoneSystem, onChange, wallet, onSaveWallet, socialWorld,
}) => {
  const people = useMemo(() => {
    const all = [...characters];
    if (!all.some((person) => person.id === 'emmy' || person.name.toLowerCase() === 'emmy')) {
      all.push({ id: 'emmy', name: 'Emmy', avatar: '', description: '', personality: '', scenario: '', first_mes: '', summary: '', mes_example: '', tags: [], createdAt: '', updatedAt: '' });
    }
    return all;
  }, [characters]);
  const [ownerId, setOwnerId] = useState(activeCharacters[0]?.id || people[0]?.id || 'emmy');
  const [viewerId, setViewerId] = useState(activeCharacters[0]?.id || 'emmy');
  const [activeTab, setActiveTab] = useState<PhoneTab>('texts');
  const [unlockedPhoneId, setUnlockedPhoneId] = useState('');
  const [revealedItems, setRevealedItems] = useState<string[]>([]);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftMediaUrl, setDraftMediaUrl] = useState('');
  const [draftLocked, setDraftLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [accessMessage, setAccessMessage] = useState('');
  const [generatingPhoneEvent, setGeneratingPhoneEvent] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState(personaName || 'Emmy');
  const [transferMemo, setTransferMemo] = useState('');

  const currentState = phoneSystem || { phones: [], scratchpad: [] };
  const owner = people.find((person) => person.id === ownerId) || people[0];
  const ownerName = owner?.name || 'Character';
  const phone = currentState.phones.find((item) => item.chatId === chat.id && item.ownerId === ownerId);
  const isOwner = viewerId === ownerId;
  const hasAccess = isOwner || unlockedPhoneId === phone?.id;

  useEffect(() => {
    if (!isOpen) return;
    let next = currentState;
    for (const person of people) next = ensureFictionalPhone(next, chat.id, person.id, person.name);
    if (next !== currentState) onChange(next);
  }, [isOpen, chat.id, people]);

  useEffect(() => {
    if (!isOpen) return;
    if (isOwner && phone) setUnlockedPhoneId(phone.id);
    else if (phone && unlockedPhoneId !== phone.id) setUnlockedPhoneId('');
  }, [isOpen, ownerId, viewerId, phone?.id]);

  if (!isOpen) return null;

  const updatePhone = (next: PhoneSystemState) => onChange(next);
  const openAccess = () => {
    if (!phone) return;
    if (isOwner) { setUnlockedPhoneId(phone.id); return; }
    if (pinInput.trim() !== phone.pin) {
      const updated = addPhoneItem(currentState, phone.id, {
        kind: 'notification', title: 'Failed unlock attempt',
        body: `Someone tried to open this phone at ${new Date().toLocaleTimeString()}.`,
        from: 'Privacy alert', locked: false,
      });
      updatePhone(updated);
      setAccessMessage('That PIN did not work. A fictional privacy alert was added to the phone.');
      setPinInput('');
      return;
    }
    const withAlert = addPhoneItem(currentState, phone.id, {
      kind: 'notification', title: 'Phone accessed',
      body: `${people.find((person) => person.id === viewerId)?.name || 'Someone'} unlocked this phone during the story.`,
      from: 'Privacy alert', locked: false,
    });
    updatePhone(withAlert);
    setUnlockedPhoneId(phone.id);
    setAccessMessage('Phone unlocked. The access alert is part of this story.');
    setPinInput('');
  };
  const addEntry = () => {
    if (!phone || !draftBody.trim()) return;
    const kind = kindForTab[activeTab] || 'note';
    const title = draftTitle.trim() || (kind === 'text' ? 'Message' : kind === 'call' ? 'Call' : kind === 'photo' ? 'Photo' : kind === 'contact' ? 'Contact' : kind === 'notification' ? 'Notification' : 'Note');
    updatePhone(addPhoneItem(currentState, phone.id, { kind, title, body: draftBody.trim(), from: draftFrom.trim() || undefined, mediaUrl: draftMediaUrl.trim() || undefined, locked: draftLocked }));
    setDraftTitle(''); setDraftBody(''); setDraftFrom(''); setDraftMediaUrl(''); setDraftLocked(false);
  };
  const readItem = (item: FictionalPhoneItem) => {
    if (!phone) return;
    if (item.locked && !revealedItems.includes(item.id)) {
      const code = window.prompt('This item is hidden. Enter the phone PIN to reveal it:');
      if (code !== phone.pin) { setAccessMessage('Hidden item stayed locked.'); return; }
      setRevealedItems((items) => [...items, item.id]);
    }
    updatePhone(recordPhoneDiscovery(currentState, chat.id, viewerId, item, ownerName));
  };
  const addSocialDiscovery = (post: NonNullable<SocialMediaWorld['posts']>[number]) => {
    if (!phone) return;
    let next = currentState;
    let entry = phone.items.find((item) => item.id === post.id);
    if (!entry) {
      next = addPhoneItem(next, phone.id, { kind: 'social', title: 'Social post', body: post.text, from: post.profileId });
      entry = next.phones.find((item) => item.id === phone.id)?.items[0];
    }
    if (entry) updatePhone(recordPhoneDiscovery(next, chat.id, viewerId, entry, ownerName));
    setAccessMessage('Saved to the story scratchpad as seen by ' + (people.find((person) => person.id === viewerId)?.name || 'the viewer') + '.');
  };
  const saveTransfer = () => {
    if (!wallet || !onSaveWallet) return;
    const amountCents = Math.round(Number(transferAmount) * 100);
    try {
      onSaveWallet(recordIncomingTransfer(wallet, {
        eventId: `phone-transfer-${chat.id}-${Date.now()}`,
        sender: ownerName, recipient: transferTo, amountCents, memo: transferMemo || 'Fictional Cash App transfer',
      }));
      setTransferAmount(''); setTransferMemo('');
      setAccessMessage('Fictional transfer saved to this chat’s wallet.');
    } catch (error) { setAccessMessage(error instanceof Error ? error.message : 'Could not save transfer.'); }
  };
  const generatePhoneEvent = async () => {
    if (!phone || generatingPhoneEvent) return;
    setGeneratingPhoneEvent(true);
    setAccessMessage('');
    try {
      const messages = buildOpenRouterMessages({
        characters: activeCharacters,
        persona,
        lorebooks,
        plugins,
        chat,
        preferences,
        storyMemories,
        socialMediaContext,
        phoneContext: formatPhoneStoryContext(currentState, chat.id, activeCharacters.map((character) => character.id)),
      });
      messages.push({
        role: 'user',
        content: 'Create one believable fictional incoming phone event for ' + ownerName + '’s phone: either an SMS or a call/voicemail from another character. Respect the current scene and character knowledge. Do not write any words, thoughts, feelings, actions, or decisions for Emmy or {{user}}. Return only JSON with keys kind ("text" or "call"), title, from, and body. Make body only the incoming sender’s message or voicemail.',
      });
      const raw = await sendOpenRouterChat(openRouterConfig, messages);
      const json = raw.match(/\\{[\\s\\S]*\\}/)?.[0];
      let event: { kind?: string; title?: string; from?: string; body?: string } = {};
      if (json) {
        try { event = JSON.parse(json); } catch { /* Keep the model response as a plain fictional message. */ }
      }
      const body = event.body?.trim() || raw.trim();
      updatePhone(addPhoneItem(currentState, phone.id, {
        kind: event.kind === 'call' ? 'call' : 'text',
        title: event.title?.trim() || (event.kind === 'call' ? 'Incoming call / voicemail' : 'Incoming message'),
        from: event.from?.trim() || 'Unknown caller',
        body,
        locked: false,
      }));
      setAccessMessage('A fictional incoming ' + (event.kind === 'call' ? 'call' : 'text') + ' was saved on ' + ownerName + '’s phone.');
    } catch (error) {
      setAccessMessage(error instanceof Error ? error.message : 'Could not generate a fictional phone event. Check the model connection.');
    } finally {
      setGeneratingPhoneEvent(false);
    }
  };
  const items = phone?.items.filter((item) => {
    const kind = kindForTab[activeTab];
    return kind ? item.kind === kind : activeTab === 'social' ? item.kind === 'social' : false;
  }) || [];
  const peopleName = (id: string) => people.find((person) => person.id === id)?.name || id;
  const storyDiscoveries = currentState.scratchpad.filter((entry) => entry.chatId === chat.id);
  const safeCurrency = (cents: number, currency = wallet?.currency || 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);

  return (
    <div role="dialog" aria-modal="true" aria-label="Fictional character phone" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: '#02091fe8', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center', padding: 12 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 1020px)', height: 'min(92dvh, 850px)', overflow: 'hidden', borderRadius: 28, border: '1px solid #ff00808a', background: 'linear-gradient(150deg, #121323f5, #17101df5 55%, #041d24f5)', boxShadow: '0 0 45px #ff008033, inset 0 1px #ffffff22', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #ffffff24', background: '#ffffff08' }}>
          <div style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 14, color: '#02091f', background: '#FF0080' }}><Smartphone size={22}/></div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Character Phone</div>
            <div style={{ opacity: .72, fontSize: 12 }}>Fictional devices saved with this chat</div>
          </div>
          <button aria-label="Close phone" onClick={onClose} style={{ ...buttonStyle, padding: 8, background: '#07128F' }}><X size={20}/></button>
        </header>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid #ffffff1c' }}>
          <label style={{ flex: '1 1 220px', display: 'grid', gap: 5, fontSize: 11, color: '#ffffffb5' }}>Phone owner
            <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} style={controlStyle}>{people.map((person) => <option key={person.id} value={person.id} style={{ color: '#111' }}>{person.name}’s phone</option>)}</select>
          </label>
          <label style={{ flex: '1 1 220px', display: 'grid', gap: 5, fontSize: 11, color: '#ffffffb5' }}>Story character viewing
            <select value={viewerId} onChange={(event) => setViewerId(event.target.value)} style={controlStyle}>{people.map((person) => <option key={person.id} value={person.id} style={{ color: '#111' }}>{person.name}</option>)}</select>
          </label>
        </div>
        <div style={{ display: 'flex', minHeight: 0, flex: 1 }}>
          <nav aria-label="Phone apps" style={{ width: 90, flex: '0 0 90px', padding: 8, overflowY: 'auto', borderRight: '1px solid #ffffff20', display: 'grid', alignContent: 'start', gap: 7 }}>
            {tabs.map((tab) => { const Icon = tab.icon; const selected = activeTab === tab.id; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} title={tab.label} style={{ display: 'grid', justifyItems: 'center', gap: 4, borderRadius: 14, minHeight: 62, padding: '7px 3px', border: selected ? `1px solid ${tab.color}` : '1px solid #ffffff1b', background: selected ? `${tab.color}35` : '#ffffff08', color: '#fff', cursor: 'pointer', fontSize: 10, fontWeight: 700, boxShadow: selected ? `0 0 16px ${tab.color}45` : 'none' }}><Icon size={19} color={tab.color}/>{tab.label}</button>; })}
          </nav>
          <main style={{ minWidth: 0, flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: 16 }}>
            {!phone ? <div style={{ opacity: .8 }}>Creating fictional phone…</div> : !hasAccess ? <section style={{ maxWidth: 430, margin: '8vh auto', textAlign: 'center', padding: 24, borderRadius: 24, background: '#ffffff0c', border: '1px solid #8BAEF266', boxShadow: '0 0 28px #8BAEF222' }}>
              <LockKeyhole size={34} color="#8BAEF2" style={{ margin: '0 auto 12px' }}/>
              <h2 style={{ margin: '0 0 8px' }}>{ownerName}’s phone is locked</h2>
              <p style={{ opacity: .7, fontSize: 13 }}>Unlocking someone else’s phone can create story consequences. Default fictional PIN: <b>0420</b>.</p>
              <form onSubmit={(event) => { event.preventDefault(); openAccess(); }} style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <input aria-label="Phone PIN" inputMode="numeric" type="password" value={pinInput} onChange={(event) => setPinInput(event.target.value)} placeholder="PIN" style={{ ...controlStyle, width: 110, textAlign: 'center' }}/>
                <button type="submit" style={{ ...buttonStyle, background: '#07128F' }}><UnlockKeyhole size={16}/> Unlock</button>
              </form>
              {accessMessage && <p role="status" style={{ color: '#F579AD' }}>{accessMessage}</p>}
            </section> : <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: '#FF008022', border: '1px solid #FF008099', display: 'grid', placeItems: 'center' }}><Smartphone color="#FF0080"/></div>
                <div style={{ minWidth: 0 }}><h2 style={{ margin: 0, fontSize: 20 }}>{ownerName}’s {tabs.find((tab) => tab.id === activeTab)?.label}</h2><div style={{ opacity: .62, fontSize: 12 }}>Viewed as {peopleName(viewerId)} · {chat.title}</div></div>
              </div>
              {accessMessage && <div role="status" style={{ marginBottom: 12, padding: 10, borderRadius: 12, background: '#F579AD20', color: '#ffd6eb', fontSize: 13 }}>{accessMessage}</div>}
              {(activeTab === 'texts' || activeTab === 'calls') && <button type="button" disabled={generatingPhoneEvent} onClick={() => void generatePhoneEvent()} style={{ ...buttonStyle, background: '#FF3C00', marginBottom: 12, opacity: generatingPhoneEvent ? .65 : 1 }}>{generatingPhoneEvent ? 'Generating fictional phone event…' : '✨ Generate incoming text or call'}</button>}
              {activeTab === 'money' && <section>
                <p style={{ opacity: .72, fontSize: 13 }}>Fictional Cash App activity is shared with the chat wallet.</p>
                {wallet?.transactions.slice(0, 8).map((transaction) => <article key={transaction.id} style={{ padding: 12, borderRadius: 14, marginBottom: 8, background: '#00857724', border: '1px solid #00857770' }}><b>{transaction.sender} → {transaction.recipient}</b><div>{safeCurrency(transaction.amountCents, transaction.currency)} · {transaction.memo}</div><small style={{ opacity: .6 }}>{new Date(transaction.timestamp).toLocaleString()}</small></article>)}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginTop: 12 }}>
                  <input aria-label="Transfer amount" type="number" min="0.01" step="0.01" placeholder="Amount $" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} style={controlStyle}/>
                  <input aria-label="Transfer recipient" placeholder="To" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} style={controlStyle}/>
                  <input aria-label="Transfer memo" placeholder="Memo" value={transferMemo} onChange={(e) => setTransferMemo(e.target.value)} style={controlStyle}/>
                  <button onClick={saveTransfer} style={{ ...buttonStyle, background: '#008577' }}><Plus size={16}/> Fictional transfer</button>
                </div>
              </section>}
              {activeTab === 'social' && <section>
                <p style={{ opacity: .72, fontSize: 13 }}>Fictional social feed. Tap “Seen by {peopleName(viewerId)}” to record what this character knows.</p>
                {(socialWorld?.posts || []).slice().sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,15).map((post) => {
                  const profile = socialWorld?.profiles.find((entry) => entry.id === post.profileId);
                  const read = currentState.scratchpad.some((entry) => entry.chatId === chat.id && entry.discoveredBy.includes(viewerId) && entry.text.endsWith(post.text));
                  return <article key={post.id} style={{ padding: 12, borderRadius: 14, marginBottom: 8, background: '#FF008016', border: '1px solid #FF008055' }}><b>{profile?.name || post.profileId}</b><p style={{ margin: '6px 0' }}>{post.text}</p><button onClick={() => addSocialDiscovery(post)} style={{ ...buttonStyle, padding: '6px 9px', fontSize: 12, background: read ? '#008577' : '#FF0080' }}>{read ? 'Saved as seen' : 'Seen by ' + peopleName(viewerId)}</button></article>;
                })}
              </section>}
              {activeTab === 'scratchpad' && <section>
                <p style={{ opacity: .7, fontSize: 13 }}>Recent phone discoveries; each entry is visible to the AI only for characters listed as discoverers.</p>
                {storyDiscoveries.length ? storyDiscoveries.map((entry) => <article key={entry.id} style={{ padding: 12, borderRadius: 14, marginBottom: 8, background: '#37B6A222', border: '1px solid #37B6A266' }}><div>{entry.text}</div><small style={{ opacity: .6 }}>Seen by {entry.discoveredBy.map(peopleName).join(', ')}</small></article>) : <p style={{ opacity: .62 }}>Nothing has been discovered in this chat yet.</p>}
              </section>}
              {activeTab === 'settings' && <section style={{ maxWidth: 420 }}>
                <p style={{ opacity: .72, fontSize: 13 }}>Set a fictional PIN for {ownerName}’s phone in this chat. The current PIN is private story metadata; default is 0420.</p>
                <form onSubmit={(event) => { event.preventDefault(); if (newPin.trim().length < 4) { setAccessMessage('Choose a PIN with at least four characters.'); return; } updatePhone({ ...currentState, phones: currentState.phones.map((item) => item.id === phone.id ? { ...item, pin: newPin.trim() } : item) }); setNewPin(''); setAccessMessage('Phone PIN updated.'); }} style={{ display: 'flex', gap: 8 }}><input value={newPin} onChange={(event) => setNewPin(event.target.value)} placeholder="New PIN (4+ characters)" style={{ ...controlStyle, flex: 1 }}/><button style={{ ...buttonStyle, background: '#07128F' }}>Save PIN</button></form>
                <div style={{ marginTop: 14, opacity: .72 }}><ShieldAlert size={16} style={{ verticalAlign: 'middle' }}/> Access attempts create an alert for the phone’s owner.</div>
              </section>}
              {kindForTab[activeTab] && <section>
                {items.length ? items.map((item) => {
                  const hidden = item.locked && !revealedItems.includes(item.id);
                  return <article key={item.id} style={{ padding: 13, borderRadius: 15, marginBottom: 9, background: '#ffffff0e', border: '1px solid #ffffff2b', boxShadow: '0 5px 18px #02091f50' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}><div style={{ flex: 1 }}><b>{hidden ? '🔒 Hidden item' : item.title}</b>{item.from && <span style={{ opacity: .65 }}> · {item.from}</span>}<p style={{ margin: '7px 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{hidden ? 'Locked story content' : item.body}</p>{!hidden && item.mediaUrl && <img src={item.mediaUrl} alt={item.title} style={{ width: 'min(100%, 420px)', maxHeight: 320, objectFit: 'contain', borderRadius: 12, border: '1px solid #ffffff35' }}/>} <small style={{ opacity: .58 }}><Clock3 size={12} style={{ verticalAlign: 'middle' }}/> {new Date(item.createdAt).toLocaleString()} · known by {item.discoveredBy.length ? item.discoveredBy.map(peopleName).join(', ') : 'no character yet'}</small></div><button onClick={() => readItem(item)} style={{ ...buttonStyle, padding: '7px 10px', background: '#B0005A' }}><Eye size={15}/>{item.discoveredBy.includes(viewerId) ? ' Seen' : ' Read'}</button></div>
                  </article>;
                }) : <p style={{ opacity: .62 }}>No {tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()} yet. Add fictional content below.</p>}
                <div style={{ marginTop: 16, padding: 13, borderRadius: 16, border: '1px solid #8BAEF255', background: '#8BAEF210', display: 'grid', gap: 8 }}>
                  <b style={{ fontSize: 14 }}>Add fictional {tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()}</b>
                  <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Title / subject" style={controlStyle}/>
                  <input value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} placeholder="From / caller (optional)" style={controlStyle}/>
                  <textarea value={draftBody} onChange={(e) => setDraftBody(e.target.value)} placeholder="Details, message, voicemail, or note" rows={3} style={{ ...controlStyle, resize: 'vertical', fontFamily: 'inherit' }}/>{activeTab === 'photos' && <><input value={draftMediaUrl} onChange={(e) => setDraftMediaUrl(e.target.value)} placeholder="Fictional image URL (optional)" style={controlStyle}/><label style={{ fontSize: 12, opacity: .78 }}>Or add a screenshot/photo<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setDraftMediaUrl(typeof reader.result === 'string' ? reader.result : ''); reader.readAsDataURL(file); }}/></label></>}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" checked={draftLocked} onChange={(e) => setDraftLocked(e.target.checked)}/> Hide behind PIN</label>
                  <button onClick={addEntry} disabled={!draftBody.trim()} style={{ ...buttonStyle, background: tabs.find((tab) => tab.id === activeTab)?.color || '#AE31A5', opacity: draftBody.trim() ? 1 : .55 }}><Plus size={16}/> Save to this phone</button>
                </div>
              </section>}
            </div>}
          </main>
        </div>
        <footer style={{ padding: '8px 16px', borderTop: '1px solid #ffffff20', fontSize: 11, opacity: .6, textAlign: 'center' }}>Fictional roleplay content only · saved with this chat</footer>
      </div>
    </div>
  );
};
