import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_PREFERENCES, normalizePreferences, downloadJson, type AppPreferences } from '../lib/preferences';
import './preferences.css';

type Props = {
  value: AppPreferences;
  onSave: (value: AppPreferences) => void;
  onClose: () => void;
  onExportData: () => void;
  onImportBackup?: (data: unknown) => void;
  onApplyRoleplayDefaults?: (value: AppPreferences) => void;
  activeChatTitle?: string;
  firebaseUser?: { displayName?: string | null; email?: string | null } | null;
  firebaseSyncMessage?: string;
  firebaseLastSync?: string;
};
const groups = [
  ['Appearance', [
    ['theme', 'Chat & settings theme', ['colorpop', 'light', 'dark']], ['accent', 'Chat accent', 'color'],
    ['fontSize', 'Chat text size', [12, 24, 1]], ['headerFont', 'Header and character-name font', ['sans', 'serif', 'mono']],
    ['compactMode', 'Compact message spacing'], ['reducedMotion', 'Reduce animations'], ['messageAnimations', 'Animate new messages'],
  ]],
  ['Chat', [
    ['autoScroll', 'Scroll to newest message'], ['showTimestamps', 'Show message times'],
    
    ['confirmDelete', 'Confirm message deletion'],
    ['showDiagnostics', 'Show connection status in chat'], ['notifyReplies', 'Desktop reply notifications'],
  ]],
  ['AI & roleplay', [
    ['responseLengthTarget', 'Default response length (prose target)', ['short', 'medium', 'long', 'custom']],
    ['customResponseWords', 'Custom target length (words)', [40, 1500, 20]],
    ['dialogueBalance', 'Description balance (0 = mostly dialogue, 100 = mostly description)', [0, 100, 5]],
    ['scenePacing', 'Scene pacing', ['slow_burn', 'balanced', 'fast']],
    ['npcActivity', 'NPC activity / independence', ['low', 'balanced', 'high']],
    ['knowledgeBoundaries', 'Characters only know what they witnessed, were told, or plausibly learned'],
    ['relationshipContinuity', 'Preserve trust, conflict, friendship, and romance changes'],
    ['naturalSpeech', 'Use natural, character-specific speech'],
    ['reduceRepetition', 'Avoid repetitive phrases and emotional beats'],
    ['realisticReactions', 'Use realistic reactions consistent with what characters know'],
    ['defaultPointOfView', 'Default point of view', ['character', 'first_person', 'third_person']],
    ['neverSpeakForUser', 'Never write dialogue, thoughts, or actions for {{user}} (including Emmy)'],
    ['chatSystemPrompt', 'Global instructions / system prompt'],
  ]],
  ['Memory & narrator', [
    ['contextMessages', 'Recent messages sent to AI', [5, 200, 5]],
    ['memoryEnabled', 'Include saved story notes in AI context'], ['memoryDepth', 'Story note detail', ['light', 'balanced', 'deep']],
    ['trackWardrobe', 'Ask AI to preserve wardrobe continuity'], ['trackLocations', 'Ask AI to preserve location continuity'],
    ['npcAutonomy', 'Allow AI to introduce NPC activity'], ['narratorEnabled', 'Allow scene narration'],
    ['narratorFrequency', 'Narration detail', ['quiet', 'balanced', 'active']],
  ]],
  ['Data & privacy', [['cloudSync', 'Sync changes to Firebase when signed in']]],
] as const;
export function PreferencesPanel({ value, onSave, onClose, onExportData, onImportBackup, onApplyRoleplayDefaults, activeChatTitle, firebaseUser, firebaseSyncMessage = '', firebaseLastSync = '' }: Props) {
  const [draft, setDraft] = useState(() => normalizePreferences(value));
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState('');
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(normalizePreferences(value));
  useEffect(() => { tabsRef.current[tab]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }, [tab]);
  const requestClose = () => {
    if (dirty && !window.confirm('Discard unsaved App Settings changes?')) return;
    onClose();
  };
  useEffect(() => { setDraft(normalizePreferences(value)); }, [value]);
  const update = async (key: string, val: unknown) => {
    if (key === 'notifyReplies' && val) {
      if (!('Notification' in window)) { setStatus('Notifications are not supported in this browser.'); return; }
      try {
        if (await Notification.requestPermission() !== 'granted') { setStatus('Notifications were not allowed. Check browser permissions.'); return; }
      } catch { setStatus('This device does not support desktop notifications.'); return; }
    }
    setDraft(prev => normalizePreferences({ ...prev, [key]: val }));
    setStatus('Unsaved changes');
  };
  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 10000000) throw new Error('Choose a backup under 10 MB.');
      const parsed = JSON.parse(await file.text());
      const data = parsed.data ?? parsed;
      if (!Array.isArray(data?.chats) || !Array.isArray(data?.characters) || !Array.isArray(data?.personas)) {
        throw new Error('This file is not a Pretty Little Fantasies app backup.');
      }
      if (!window.confirm('Restore this backup and replace the current chats, characters, personas, lorebooks, and saved story data? Your API key will be kept.')) return;
      onImportBackup?.(data);
      setStatus('Backup restored. Existing API credentials were kept.');
    } catch (error: any) { setStatus(error.message || 'Could not restore this backup.'); }
    event.target.value = '';
  };
  const importSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1000000) throw new Error('Choose a settings JSON under 1 MB.');
      const parsed = JSON.parse(await file.text());
      const source = parsed.settings ?? parsed.appPreferences ?? parsed;
      if (!source || typeof source !== 'object' || Array.isArray(source) || !Object.keys(DEFAULT_PREFERENCES).some(k => k in source)) throw new Error('No supported settings were found.');
      setDraft(normalizePreferences({ ...draft, ...source }));
      setStatus('Imported preferences. Save to apply. API keys and chats were not changed.');
    } catch (e: any) { setStatus(e.message || 'Invalid settings file.'); }
    event.target.value = '';
  };
  return <div className="cp-preferences" role="dialog" aria-modal="true" aria-label="App settings">
    <div className="cp-preferences-card">
      <header><div><small>PRETTY LITTLE FANTASIES</small><h2>Make it yours</h2></div><button type="button" onClick={requestClose} aria-label="Close app settings">×</button></header>
      <nav aria-label="Settings sections">{groups.map(([title], i) => <button key={title} ref={(node) => { tabsRef.current[i] = node; }} type="button" aria-pressed={tab === i} onClick={() => setTab(i)}>{title}</button>)}</nav>
      <main tabIndex={0}><h3>{groups[tab][0]}</h3>
        {groups[tab][1].map((field) => {
          const [key, label] = field;
          const spec = (field as readonly unknown[])[2];
          const current = draft[key as keyof AppPreferences];
          if (key === 'customResponseWords' && draft.responseLengthTarget !== 'custom') return null;
          if (key === 'neverSpeakForUser') return <label className="cp-setting cp-setting-block" key={key}><span>{label}</span><div className="flex items-center gap-3"><input type="checkbox" checked disabled aria-label="Never speak for the user is always enabled" /><small>This rule is always enforced for Emmy and {'{{user}}'}; the setting cannot be disabled.</small></div></label>;
          if (key === 'chatSystemPrompt') return <label className="cp-setting cp-setting-block" key={key}><span>{label}</span><textarea value={String(current || '')} maxLength={6000} rows={7} placeholder="Example: Keep character voices distinct. Never write dialogue, thoughts, or actions for {{user}}." onChange={e => update(key, e.target.value)} /><small>{String(current || '').length}/6000 characters. Added to the global system prompt; character canon and non-negotiable user-agency rules remain higher priority.</small></label>;
          return <label className="cp-setting" key={key}><span>{label}</span>{!spec ? <input type="checkbox" checked={Boolean(current)} onChange={e => update(key, e.target.checked)} />
            : spec === 'color' ? <input type="color" value={String(current)} onChange={e => update(key, e.target.value)} />
            : typeof (spec as any)[0] === 'number' ? <span className="cp-range"><input aria-label={String(label)} type="range" min={(spec as number[])[0]} max={(spec as number[])[1]} step={(spec as number[])[2]} value={Number(current)} onChange={e => update(key, Number(e.target.value))} /><output>{current}</output></span>
            : <select aria-label={String(label)} value={String(current)} onChange={e => update(key, e.target.value)}>{(spec as string[]).map(v => <option key={v} value={v}>{({
              colorpop: 'Pretty Little Fantasies', slow_burn: 'Slow-burn', balanced: 'Balanced', fast: 'Fast',
              first_person: 'First person', third_person: 'Third person',
            } as Record<string, string>)[v] || v.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())}</option>)}</select>}</label>;
        })}
        {tab === 1 && <p>Chat controls here affect app behavior. Chat-specific instructions can be added in Chat Settings. Notifications show only “A reply is ready,” without chat text.</p>}
        {tab === 2 && <>
          <p>These roleplay values are saved as defaults for new chats. The OpenRouter AI tab controls temperature and the maximum output-token limit; this prose target is separate. Global instructions are sent in the system prompt. Character canon and required user-agency rules stay higher priority.</p>
          {activeChatTitle && onApplyRoleplayDefaults && <button type="button" onClick={() => { onApplyRoleplayDefaults(draft); setStatus('AI and roleplay defaults applied to ' + activeChatTitle + '.'); }}>Apply AI defaults to current chat: {activeChatTitle}</button>}
        </>}
        {tab === 3 && <p>Continuity and narrator preferences guide AI replies. Saved notes come from Story Notes; phone discoveries stay limited to characters who actually saw them. No automatic background recap is running.</p>}
        {tab === 4 && <><p>Chats save locally in this browser. Firebase sync: {firebaseUser ? 'signed in as ' + (firebaseUser.email || firebaseUser.displayName || 'your account') : 'not signed in'}. Turning sync off does not erase local or cloud data. API credentials are excluded from ordinary exports.</p>
          <p>Last successful Firebase sync: {firebaseLastSync ? new Date(firebaseLastSync).toLocaleString() : 'not recorded on this device yet'}.</p>
          {firebaseSyncMessage && <p role="status">{firebaseSyncMessage}</p>}
          <div className="cp-data-actions"><button onClick={() => downloadJson('Pretty_Little_Fantasies_Settings.json', { version: 1, settings: draft })}>Export preferences</button>
          <label>Import preferences<input type="file" accept="application/json,.json" onChange={importSettings} /></label>
          <button onClick={onExportData}>Download chats &amp; libraries backup</button>
          {onImportBackup && <label>Restore app backup (replaces saved content after confirmation)<input type="file" accept="application/json,.json" onChange={importBackup} /></label>}</div>
          <p>No analytics collection or public profile publishing is enabled by this app. Account deletion is managed separately from device preferences.</p></>}
        <details><summary>Features needing additional services</summary><p>Direct Gemini/custom providers, streamed replies, automatic recaps, timeline and relationship databases, AI image generation, and background story alerts are not connected yet. Gemini models can still be selected through OpenRouter using their OpenRouter model ID.</p></details>
      </main>
      <footer><p role="status">{status || (dirty ? 'Unsaved changes' : 'All changes saved.')}</p><div><button onClick={requestClose}>Cancel</button><button onClick={() => { setDraft({ ...DEFAULT_PREFERENCES }); setStatus('Defaults selected. Save to apply.'); }}>Reset preferences</button><button className="cp-primary" onClick={() => { onSave(draft); setStatus('Preferences saved.'); }}>Save preferences</button></div></footer>
    </div>
  </div>;
}
