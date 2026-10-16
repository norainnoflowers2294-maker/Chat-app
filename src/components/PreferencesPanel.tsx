import React, { useState, useEffect } from 'react';
import { DEFAULT_PREFERENCES, normalizePreferences, downloadJson, type AppPreferences } from '../lib/preferences';
import './preferences.css';

type Props = {
  value: AppPreferences;
  onSave: (value: AppPreferences) => void;
  onClose: () => void;
  onExportData: () => void;
};
const groups = [
  ['Appearance', [
    ['theme', 'Chat & settings theme', ['colorpop', 'light', 'dark']], ['accent', 'Chat accent', 'color'],
    ['fontSize', 'Chat text size', [12, 24, 1]], ['headerFont', 'Header and character-name font', ['sans', 'serif', 'mono']],
    ['compactMode', 'Compact message spacing'], ['reducedMotion', 'Reduce animations'], ['messageAnimations', 'Animate new messages'],
  ]],
  ['Chat', [
    ['autoScroll', 'Scroll to newest message'], ['showTimestamps', 'Show message times'],
    ['enterToSend', 'Enter sends; Shift+Enter adds a line'], ['confirmDelete', 'Confirm message deletion'],
    ['showDiagnostics', 'Show connection status in chat'], ['notifyReplies', 'Desktop reply notifications'],
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
export function PreferencesPanel({ value, onSave, onClose, onExportData }: Props) {
  const [draft, setDraft] = useState(() => normalizePreferences(value));
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState('');
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
      <header><div><small>COLORPOP</small><h2>Make it yours</h2></div><button type="button" onClick={onClose} aria-label="Close app settings">×</button></header>
      <nav aria-label="Settings sections">{groups.map(([title], i) => <button key={title} type="button" aria-pressed={tab === i} onClick={() => setTab(i)}>{title}</button>)}</nav>
      <main><h3>{groups[tab][0]}</h3>
        {groups[tab][1].map((field) => {
          const [key, label] = field;
          const spec = (field as readonly unknown[])[2];
          const current = draft[key as keyof AppPreferences];
          return <label className="cp-setting" key={key}><span>{label}</span>{!spec ? <input type="checkbox" checked={Boolean(current)} onChange={e => update(key, e.target.checked)} />
            : spec === 'color' ? <input type="color" value={String(current)} onChange={e => update(key, e.target.value)} />
            : typeof (spec as any)[0] === 'number' ? <span className="cp-range"><input type="range" min={(spec as number[])[0]} max={(spec as number[])[1]} step={(spec as number[])[2]} value={Number(current)} onChange={e => update(key, Number(e.target.value))} /><output>{current}</output></span>
            : <select value={String(current)} onChange={e => update(key, e.target.value)}>{(spec as string[]).map(v => <option key={v}>{v}</option>)}</select>}</label>;
        })}
        {tab === 2 && <p>Continuity and narrator preferences guide AI replies. Saved notes come from Story Notes; these controls do not create a separate timeline or wardrobe database.</p>}
        {tab === 1 && <p>Notifications show only “A reply is ready,” without chat text. On mobile, browser support varies.</p>}
        {tab === 3 && <><p>Chats always save on this device. Cloud sync only runs while signed in and enabled. Turning it off does not erase existing cloud data. API keys stay out of these exports.</p>
          <div className="cp-data-actions"><button onClick={() => downloadJson('ColorPop_Settings.json', { version: 1, settings: draft })}>Export preferences</button>
          <label>Import preferences<input type="file" accept="application/json,.json" onChange={importSettings} /></label>
          <button onClick={onExportData}>Download chats & libraries backup</button></div>
          <p>No analytics collection or public profile publishing is enabled by this app. Account deletion is managed separately from device preferences.</p></>}
        <details><summary>Features needing additional services</summary><p>Direct Gemini/custom providers, streamed replies, automatic recaps, timeline and relationship databases, AI image generation, and background story alerts are not connected yet. Gemini models can still be selected through OpenRouter using their OpenRouter model ID.</p></details>
      </main>
      <footer><p role="status">{status}</p><div><button onClick={() => { setDraft({ ...DEFAULT_PREFERENCES }); setStatus('Defaults selected. Save to apply.'); }}>Reset preferences</button><button className="cp-primary" onClick={() => { onSave(draft); setStatus('Preferences saved on this device.'); }}>Save preferences</button></div></footer>
    </div>
  </div>;
}
