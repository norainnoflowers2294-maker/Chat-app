import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState } from 'react';
import {
  X,
  Contact,
  Plus,
  Upload,
} from 'lucide-react';
import { Persona } from '../types/roleplay';

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  onSavePersona: (persona: Persona) => void;
  onSelectDefaultPersona: (personaId: string) => void;
}

export const PersonaModal: React.FC<PersonaModalProps> = ({
  isOpen,
  onClose,
  personas,
  onSavePersona,
  onSelectDefaultPersona,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('/colorpop_hero.jpg');
  const [description, setDescription] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [traitInput, setTraitInput] = useState('');
  const [traits, setTraits] = useState<string[]>(['Glamorous', 'Witty']);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPersona: Persona = {
      id: `persona_${Date.now()}`,
      name: name.trim(),
      avatar: avatar || '/colorpop_hero.jpg',
      description: description.trim(),
      speaking_style: speakingStyle.trim(),
      traits,
      is_default: personas.length === 0,
      createdAt: new Date().toISOString(),
    };

    onSavePersona(newPersona);
    setIsCreating(false);
    setName('');
    setDescription('');
    setSpeakingStyle('');
    setTraits(['Glamorous']);
  };

  const addTrait = () => {
    if (traitInput.trim() && !traits.includes(traitInput.trim())) {
      setTraits([...traits, traitInput.trim()]);
      setTraitInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl shadow-[0_0_50px_rgba(255,0,128,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ff3399]/30 bg-[#0d020b]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#9b51e0] to-[#b26ee8] flex items-center justify-center text-white shadow-[0_0_15px_rgba(155,81,224,0.6)]">
              <Contact className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Persona Library</h2>
              <p className="text-xs text-[#ffd6eb]/70">Define who you are in roleplay conversations</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(255,0,128,0.5)] flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'View Personas' : 'New Persona'}</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-[#ffd6eb]/70 hover:text-white rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-[#ffd6eb]">
          {isCreating ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="font-bold text-white block">Persona Avatar</label>
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-[#ff3399]/40 bg-[#1e0818] group">
                    <img src={resolveImageUrl(avatar)} alt="Avatar" className="w-full h-full object-cover" />
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-xs font-bold">
                      <Upload className="w-5 h-5 mb-1" />
                      <span>Upload Avatar</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setAvatar(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-white">Persona Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. The Siren, Empress, Detective..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-[#1e0818] border border-[#ff3399]/40 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-white">Traits</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add trait and press Enter"
                        value={traitInput}
                        onChange={(e) => setTraitInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTrait();
                          }
                        }}
                        className="flex-1 bg-[#1e0818] border border-[#ff3399]/40 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={addTrait}
                        className="px-3 py-1 bg-white/10 rounded-xl text-white font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {traits.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-[#9b51e0]/30 border border-[#b26ee8]/50 text-white font-mono text-[10px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-white">Description &amp; Background</label>
                <textarea
                  rows={3}
                  placeholder="Who are you in the story? Status, appearance, history..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#1e0818] border border-[#ff3399]/40 rounded-xl p-3 text-xs text-white resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-white">Speaking Style &amp; Mannerisms</label>
                <textarea
                  rows={2}
                  placeholder="How does your character talk? Seductive, authoritative, teasing..."
                  value={speakingStyle}
                  onChange={(e) => setSpeakingStyle(e.target.value)}
                  className="w-full bg-[#1e0818] border border-[#ff3399]/40 rounded-xl p-3 text-xs text-white resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ff3399]/20">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-white/10 rounded-xl text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#ff007f] to-[#ff3399] rounded-xl text-white font-bold shadow-md"
                >
                  Save Persona
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {personas.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                    p.is_default
                      ? 'bg-[#ff007f]/15 border-[#ff007f] shadow-[0_0_15px_rgba(255,0,128,0.3)]'
                      : 'bg-[#1a0515] border-[#ff3399]/30 hover:border-[#ff3399]/60'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={resolveImageUrl(p.avatar)}
                      alt={p.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#ff3399]/40 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-bold text-white">{p.name}</h4>
                        {p.is_default && (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] border border-emerald-500/40">
                            Active Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#ffd6eb]/80 leading-relaxed">{p.description}</p>
                      {p.speaking_style && (
                        <p className="text-[11px] text-[#ff99cc] italic">Style: "{p.speaking_style}"</p>
                      )}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.traits.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.2 rounded-md bg-[#9b51e0]/20 border border-[#b26ee8]/30 text-white text-[10px] font-mono"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!p.is_default && (
                    <button
                      onClick={() => onSelectDefaultPersona(p.id)}
                      className="shrink-0 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
