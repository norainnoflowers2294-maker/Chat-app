import React, { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Chat, Character, Persona } from '../types/roleplay';

interface Props {
  chat: Chat;
  characters: Character[];
  personas: Persona[];
  onSave: (chat: Chat) => void;
  onClose: () => void;
}

const fieldClass = 'mt-1 w-full rounded-lg border border-white/15 bg-[#1b0817] px-3 py-2 text-sm text-white outline-none focus:border-pink-400';
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-pink-100/75';

export const ChatSettingsPanel: React.FC<Props> = ({ chat, characters, personas, onSave, onClose }) => {
  const [draft, setDraft] = useState<Chat>({ ...chat, characterIds: [...chat.characterIds] });
  const toggleCharacter = (id: string) => setDraft((current) => ({
    ...current,
    characterIds: current.characterIds.includes(id)
      ? current.characterIds.filter((characterId) => characterId !== id)
      : [...current.characterIds, id],
  }));

  const selectClass = fieldClass;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="chat-settings-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-pink-400/30 bg-[#24091d] p-5 text-white shadow-2xl shadow-pink-950/40">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-pink-300" /><h2 id="chat-settings-title" className="text-lg font-bold">Chat settings</h2></div>
          <button type="button" onClick={onClose} aria-label="Close chat settings" className="rounded-lg p-2 text-white/70 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-5">
          <fieldset>
            <legend className={labelClass}>Character profiles</legend>
            <p className="mb-2 mt-1 text-xs text-white/55">Selected profiles are sent to the AI with their saved details and instructions.</p>
            {characters.length ? <div className="grid gap-2 sm:grid-cols-2">{characters.map((character) => (
              <label key={character.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/15 p-2.5 text-sm hover:border-pink-300/40">
                <input type="checkbox" checked={draft.characterIds.includes(character.id)} onChange={() => toggleCharacter(character.id)} className="accent-pink-500" />
                <span className="truncate">{character.name}</span>
              </label>
            ))}</div> : <p className="text-sm text-amber-200">Create a character profile to use one in this chat.</p>}
            {characters.length > 0 && draft.characterIds.length === 0 && <p role="alert" className="mt-2 text-xs text-amber-200">Choose at least one character profile.</p>}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>User persona
              <select className={selectClass} value={draft.personaId || personas[0]?.id || ''} onChange={(event) => setDraft({ ...draft, personaId: event.target.value })}>
                {personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.display_name || persona.name}</option>)}
                {!personas.length && <option value="">No personas created</option>}
              </select>
            </label>
            <label className={labelClass}>Reply style
              <select className={selectClass} value={draft.replyStyle || 'immersive'} onChange={(event) => setDraft({ ...draft, replyStyle: event.target.value as Chat['replyStyle'] })}>
                <option value="immersive">Immersive prose</option><option value="balanced">Balanced</option><option value="dialogue">Dialogue-forward</option><option value="screenplay">Screenplay</option>
              </select>
            </label>
            <label className={labelClass}>Reply length
              <select className={selectClass} value={draft.replyLength || 'medium'} onChange={(event) => setDraft({ ...draft, replyLength: event.target.value as Chat['replyLength'] })}>
                <option value="short">Short</option><option value="medium">Medium</option><option value="long">Long</option>
              </select>
            </label>
            <label className={labelClass}>Point of view
              <select className={selectClass} value={draft.replyPointOfView || 'character'} onChange={(event) => setDraft({ ...draft, replyPointOfView: event.target.value as Chat['replyPointOfView'] })}>
                <option value="character">Follow character profile</option><option value="first_person">First person</option><option value="third_person">Third person</option>
              </select>
            </label>
            <label className={labelClass}>Scene mood
              <select className={selectClass} value={draft.replyMood || 'story'} onChange={(event) => setDraft({ ...draft, replyMood: event.target.value as Chat['replyMood'] })}>
                <option value="story">Follow the story</option><option value="playful">Playful</option><option value="romantic">Romantic</option><option value="dramatic">Dramatic</option><option value="cozy">Cozy</option><option value="suspenseful">Suspenseful</option><option value="comedic">Comedic</option>
              </select>
            </label>
            <label className={labelClass}>Creativity <span className="normal-case text-white/60">{(draft.creativity ?? 0.85).toFixed(1)}</span>
              <input className="mt-3 w-full accent-pink-500" type="range" min="0" max="2" step="0.1" value={draft.creativity ?? 0.85} onChange={(event) => setDraft({ ...draft, creativity: Number(event.target.value) })} />
              <span className="mt-1 flex justify-between text-[10px] font-normal normal-case text-white/45"><span>Focused</span><span>Surprising</span></span>
            </label>
          </div>

          <label className={labelClass}>Extra prompt for this chat
            <textarea className={`${fieldClass} min-h-28 resize-y`} value={draft.promptInstructions || ''} maxLength={3000} placeholder="Example: Keep the pacing slow, use more banter, and let the mystery unfold gradually…" onChange={(event) => setDraft({ ...draft, promptInstructions: event.target.value })} />
            <span className="mt-1 block text-right text-[10px] font-normal normal-case text-white/45">{(draft.promptInstructions || '').length}/3000</span>
          </label>
        </div>

        <footer className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/70 hover:bg-white/10">Cancel</button>
          <button type="button" disabled={characters.length > 0 && draft.characterIds.length === 0} onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })} className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40">Save chat settings</button>
        </footer>
      </section>
    </div>
  );
};
