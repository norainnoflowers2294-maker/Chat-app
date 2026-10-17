import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Check,
  Save,
  Download,
  Trash2,
  User,
  Heart,
  Crown,
  FileText,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { Persona } from '../types/roleplay';
import { parsePersonaFile } from '../utils/pngParser';

interface PersonaCreatorViewProps {
  initialPersona?: Persona | null;
  onSavePersona: (persona: Persona) => void;
  onCancel: () => void;
  onSelectDefaultPersona?: (personaId: string) => void;
}

const AVATAR_PRESETS = [
  { name: 'The Muse (Neon Chic)', url: '/colorpop_hero.jpg' },
  { name: 'Lucious Vance (Sovereign)', url: '/lucious.jpg' },
  { name: 'Estates & Glamour', url: '/mansion.jpg' },
  { name: 'Skyfall Penthouse', url: '/penthouse.jpg' },
  { name: 'Midnight Supercar', url: '/roadtrip.jpg' },
];

const TRAIT_SUGGESTIONS = [
  'Charismatic',
  'Mysterious',
  'Seductive',
  'Fierce',
  'Witty',
  'Protective',
  'Playful',
  'Stoic',
  'Aristocratic',
  'Cunning',
  'Empathetic',
  'Rebellious',
  'Calculated',
  'Loyal',
  'Unapologetic',
  'Glamorous',
];

const STYLE_PRESETS = [
  {
    label: 'Sultry & Eloquent',
    text: 'Speaks with a smooth, velvety cadence, effortless elegance, and razor-sharp intellect.',
  },
  {
    label: 'Playful & Sassy',
    text: 'Fast-paced, witty, throws teasing jabs, and holds unbreakable eye contact.',
  },
  {
    label: 'Commanding & Stoic',
    text: 'Direct, composed, rarely raises voice, yet every syllable carries sovereign authority.',
  },
  {
    label: 'Warm & Empathetic',
    text: 'Attentive, emotionally perceptive, comforting, and disarmingly sincere.',
  },
];

export const PersonaCreatorView: React.FC<PersonaCreatorViewProps> = ({
  initialPersona,
  onSavePersona,
  onCancel,
  onSelectDefaultPersona,
}) => {
  const [name, setName] = useState(initialPersona?.name || '');
  const [displayName, setDisplayName] = useState(initialPersona?.display_name || initialPersona?.name || '');
  const [nicknames, setNicknames] = useState(initialPersona?.nicknames || '');
  const [occupation, setOccupation] = useState(initialPersona?.occupation || '');
  const [avatar, setAvatar] = useState(initialPersona?.avatar || '/colorpop_hero.jpg');
  const [customUrl, setCustomUrl] = useState('');
  const [description, setDescription] = useState(initialPersona?.description || '');
  const [appearance, setAppearance] = useState(initialPersona?.appearance || '');
  const [backstory, setBackstory] = useState(initialPersona?.backstory || '');
  const [speakingStyle, setSpeakingStyle] = useState(initialPersona?.speaking_style || '');
  const [traits, setTraits] = useState<string[]>(initialPersona?.traits || ['Charismatic', 'Witty']);
  const [traitInput, setTraitInput] = useState('');
  const [isDefault, setIsDefault] = useState(initialPersona?.is_default ?? true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Sync if editing initialPersona
  useEffect(() => {
    if (initialPersona) {
      setName(initialPersona.name || '');
      setDisplayName(initialPersona.display_name || initialPersona.name || '');
      setNicknames(initialPersona.nicknames || '');
      setOccupation(initialPersona.occupation || '');
      setAvatar(initialPersona.avatar || '/colorpop_hero.jpg');
      setDescription(initialPersona.description || '');
      setAppearance(initialPersona.appearance || '');
      setBackstory(initialPersona.backstory || '');
      setSpeakingStyle(initialPersona.speaking_style || '');
      setTraits(initialPersona.traits || ['Charismatic']);
      setIsDefault(initialPersona.is_default);
    }
  }, [initialPersona]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
        showToast('Photo uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTrait = (trait: string) => {
    const trimmed = trait.trim();
    if (trimmed && !traits.includes(trimmed)) {
      setTraits([...traits, trimmed]);
      setTraitInput('');
    }
  };

  const handleRemoveTrait = (traitToRemove: string) => {
    setTraits(traits.filter((t) => t !== traitToRemove));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast('Please provide at least a Persona name.');
      return;
    }

    const personaId = initialPersona?.id || `persona_${Date.now()}`;
    const persona: Persona = {
      id: personaId,
      name: name.trim(),
      display_name: displayName.trim() || name.trim(),
      nicknames: nicknames.trim(),
      occupation: occupation.trim(),
      avatar: avatar || '/colorpop_hero.jpg',
      description: description.trim(),
      appearance: appearance.trim(),
      backstory: backstory.trim(),
      speaking_style: speakingStyle.trim(),
      traits,
      is_default: isDefault,
      favorite: initialPersona?.favorite ?? false,
      createdAt: initialPersona?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSavePersona(persona);
    if (isDefault && onSelectDefaultPersona) {
      onSelectDefaultPersona(personaId);
    }

    // Also mirror to standalone HTML library localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('colorpop_persona_library') || '[]');
      const filtered = stored.filter((p: any) => p.id !== persona.id);
      filtered.unshift({
        ...persona,
        full_name: persona.name,
      });
      localStorage.setItem('colorpop_persona_library', JSON.stringify(filtered));
      if (isDefault) {
        localStorage.setItem('colorpop_default_persona', persona.id);
      }
    } catch (e) {
      // ignore
    }

    showToast(initialPersona ? 'Persona updated!' : 'New persona saved to library!');
  };

  const handleExportJSON = () => {
    const dataToExport = {
      id: initialPersona?.id || `persona_${Date.now()}`,
      name,
      display_name: displayName,
      nicknames,
      occupation,
      avatar,
      description,
      appearance,
      backstory,
      speaking_style: speakingStyle,
      traits,
      is_default: isDefault,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(displayName || name || 'persona').toLowerCase().replace(/\s+/g, '_')}_card.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Persona JSON exported!');
  };

  const handleImportCard = async (file: File) => {
    if (!file) return;
    try {
      const card = await parsePersonaFile(file);
      setName(card.name || '');
      setDisplayName(card.display_name || card.name || '');
      setNicknames(card.nicknames || '');
      setOccupation(card.occupation || '');
      setAvatar(card.avatar || '/colorpop_hero.jpg');
      setDescription(card.description || '');
      setAppearance(card.appearance || '');
      setBackstory(card.backstory || '');
      setSpeakingStyle(card.speaking_style || '');
      setTraits(card.traits || []);
      setIsDefault(card.is_default ?? false);
      showToast(card.description || card.backstory || card.traits?.length
        ? 'Imported persona card and picture!'
        : 'Imported PNG picture. This file has no embedded persona fields.');
    } catch (err) {
      console.error('Persona import error:', err);
      showToast('Could not read this persona card. Try a JSON or embedded-card PNG.');
    }
  };

  return (
    <div className="cp-page-transition w-full max-w-4xl mx-auto px-4 py-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 bg-gradient-to-r from-[#ff007f] to-[#9b51e0] text-white text-xs font-bold rounded-2xl shadow-[0_0_25px_rgba(255,0,128,0.7)] flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#ff3399]/30">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-[#ffd6eb] hover:text-white transition-all shadow-md"
            title="Return to Persona Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-[#ff007f]" />
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {initialPersona ? 'Edit Roleplay Persona' : 'Persona Creator'}
              </h1>
            </div>
            <p className="text-xs text-[#ffd6eb]/70 mt-0.5">
              Customize who you are in chats, choose your picture, demeanor, and voice tone
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Import JSON or embedded PNG card */}
          <label className="px-3 py-2 bg-white/10 hover:bg-white/20 text-[#ffd6eb] hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5 border border-white/10">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import Card</span>
            <input
              type="file"
              accept=".json,.png"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImportCard(e.target.files[0])}
            />
          </label>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-[#ffd6eb] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border border-white/10"
            title="Export as JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export</span>
          </button>

          {/* Save Persona */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="px-5 py-2.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(255,0,128,0.6)] transition-all hover:scale-105 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{initialPersona ? 'Update Persona' : 'Save to Library'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* SECTION 1: AVATAR / PIC UPLOADER & GALLERY */}
        <div className="p-5 sm:p-6 bg-[#160614]/90 backdrop-blur-md border border-[#ff3399]/40 rounded-3xl shadow-[0_0_30px_rgba(255,0,128,0.2)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-[#ff007f]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Persona Picture & Avatar
              </h2>
            </div>
            <span className="text-[10px] text-[#ffd6eb]/60 font-mono">
              Upload photo or pick a high-fashion preset
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Live Portrait Preview with glowing ring */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden ring-4 ring-[#ff007f] shadow-[0_0_25px_rgba(255,0,128,0.6)] bg-[#0d020b]">
                <img
                  src={resolveImageUrl(avatar || '/colorpop_hero.jpg')}
                  alt="Persona avatar"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {isDefault && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg flex items-center space-x-1">
                  <Crown className="w-2.5 h-2.5 fill-black" />
                  <span>Active</span>
                </div>
              )}

              {/* Upload Hover Overlay */}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-xs font-bold text-center p-2">
                <Upload className="w-6 h-6 mb-1 text-[#ff99cc]" />
                <span>Change Pic</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </label>
            </div>

            {/* Pic Controls & Preset Selector */}
            <div className="flex-1 w-full space-y-3">
              <div className="flex flex-wrap gap-2">
                <label className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer border border-white/10 flex items-center space-x-2 transition-all">
                  <Upload className="w-4 h-4 text-[#ff007f]" />
                  <span>Upload Local Picture</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </label>

                {/* Default Active Persona Toggle */}
                <button
                  type="button"
                  onClick={() => setIsDefault(!isDefault)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                    isDefault
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-white/5 border-white/10 text-[#ffd6eb]/70 hover:text-white'
                  }`}
                >
                  <Crown className={`w-3.5 h-3.5 ${isDefault ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span>{isDefault ? '★ Active Persona in Chats' : 'Set as Active Persona'}</span>
                </button>
              </div>

              {/* Direct Pic URL Input */}
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Or paste an image URL (https://...)"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="flex-1 bg-[#1e0818] border border-[#ff3399]/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#ff007f]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customUrl.trim()) {
                      setAvatar(customUrl.trim());
                      setCustomUrl('');
                      showToast('Avatar URL set!');
                    }
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl"
                >
                  Apply
                </button>
              </div>

              {/* Quick Preset Avatars */}
              <div>
                <p className="text-[11px] font-bold text-[#ff99cc] mb-1.5">ColorPop Signature Avatars:</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => {
                        setAvatar(preset.url);
                        showToast(`Selected preset: ${preset.name}`);
                      }}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        avatar === preset.url
                          ? 'border-[#ff007f] ring-2 ring-[#ff007f] scale-105'
                          : 'border-white/20 hover:border-white/50 opacity-70 hover:opacity-100'
                      }`}
                      title={preset.name}
                    >
                      <img src={resolveImageUrl(preset.url)} alt={preset.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: CORE IDENTITY & ARCHETYPE */}
        <div className="p-5 sm:p-6 bg-[#160614]/90 backdrop-blur-md border border-[#ff3399]/40 rounded-3xl shadow-[0_0_30px_rgba(255,0,128,0.2)] space-y-4">
          <div className="flex items-center space-x-2 mb-2">
            <User className="w-4 h-4 text-[#ff007f]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Identity & Archetype
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#ff99cc] block">
                Persona Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Vivienne St. Claire, Detective Jack Miller"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!displayName) setDisplayName(e.target.value);
                }}
                required
                className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff007f] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#ff99cc] block">
                Display Name / Casual Name
              </label>
              <input
                type="text"
                placeholder="e.g. Vivienne, Jack, The Envoy"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff007f] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#ff99cc] block">
                Nicknames / Code Names
              </label>
              <input
                type="text"
                placeholder="e.g. Vivi, The Empress, Viper"
                value={nicknames}
                onChange={(e) => setNicknames(e.target.value)}
                className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff007f] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#ff99cc] block">
                Occupation / Social Title
              </label>
              <input
                type="text"
                placeholder="e.g. High-Fashion Heiress, Secret Syndicate Broker"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff007f] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: PERSONALITY TRAITS & CHIPS */}
        <div className="p-5 sm:p-6 bg-[#160614]/90 backdrop-blur-md border border-[#ff3399]/40 rounded-3xl shadow-[0_0_30px_rgba(255,0,128,0.2)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#ff007f]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Personality Traits & Tags
              </h2>
            </div>
            <span className="text-[10px] text-[#ffd6eb]/60">Click chips to add or remove</span>
          </div>

          {/* Active Traits */}
          <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-[#10030e] rounded-xl border border-white/10">
            {traits.length === 0 && (
              <span className="text-xs text-white/40 italic">No traits added yet. Click suggestions below or type your own.</span>
            )}
            {traits.map((t) => (
              <span
                key={t}
                onClick={() => handleRemoveTrait(t)}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#ff007f]/40 to-[#9b51e0]/40 border border-[#ff3399]/60 text-white text-xs font-semibold cursor-pointer hover:bg-rose-950/80 transition-all group"
                title="Click to remove"
              >
                <span>{t}</span>
                <span className="text-xs text-white/60 group-hover:text-red-300">×</span>
              </span>
            ))}
          </div>

          {/* Add custom trait input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add custom trait (e.g. Unpredictable, Sarcastic, Protective)"
              value={traitInput}
              onChange={(e) => setTraitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTrait(traitInput);
                }
              }}
              className="flex-1 bg-[#1e0818] border border-[#ff3399]/40 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#ff007f]"
            />
            <button
              type="button"
              onClick={() => handleAddTrait(traitInput)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
            >
              Add
            </button>
          </div>

          {/* Preset Suggestions */}
          <div>
            <p className="text-[11px] text-[#ff99cc] font-bold mb-1.5">Suggestions:</p>
            <div className="flex flex-wrap gap-1.5">
              {TRAIT_SUGGESTIONS.map((sug) => {
                const isSelected = traits.includes(sug);
                return (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => (isSelected ? handleRemoveTrait(sug) : handleAddTrait(sug))}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'bg-[#ff007f] text-white shadow-[0_0_10px_rgba(255,0,128,0.5)]'
                        : 'bg-white/5 text-[#ffd6eb]/80 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {isSelected ? `✓ ${sug}` : `+ ${sug}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 4: SPEAKING STYLE & VOICE */}
        <div className="p-5 sm:p-6 bg-[#160614]/90 backdrop-blur-md border border-[#ff3399]/40 rounded-3xl shadow-[0_0_30px_rgba(255,0,128,0.2)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#ff007f]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Speaking Style & Dialogue Tone
              </h2>
            </div>
          </div>

          {/* Style Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSpeakingStyle(preset.text)}
                className="text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
              >
                <div className="font-bold text-xs text-[#ff99cc] group-hover:text-white">
                  {preset.label}
                </div>
                <div className="text-[11px] text-[#ffd6eb]/70 mt-0.5 line-clamp-2">
                  {preset.text}
                </div>
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            placeholder="Describe how your character talks: rhythm, vocabulary, habits, pauses, vocal intensity..."
            value={speakingStyle}
            onChange={(e) => setSpeakingStyle(e.target.value)}
            className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff007f] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none"
          />
        </div>

        {/* SECTION 5: APPEARANCE & BACKSTORY */}
        <div className="p-5 sm:p-6 bg-[#160614]/90 backdrop-blur-md border border-[#ff3399]/40 rounded-3xl shadow-[0_0_30px_rgba(255,0,128,0.2)] space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#ff99cc] block">
              Physical Appearance & Signature Aesthetic
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Tall, piercing violet eyes, tailored black silk suit, diamond studs, subtle scent of jasmine and vintage sandalwood."
              value={appearance}
              onChange={(e) => setAppearance(e.target.value)}
              className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff007f] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#ff99cc] block">
              Persona Description & Backstory
            </label>
            <textarea
              rows={3}
              placeholder="Who are you in this world? Secrets, motives, power dynamics, relationships..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff007f] rounded-xl p-3 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none"
            />
          </div>
        </div>

        {/* PROMPT PREVIEW ACCORDION */}
        <div className="p-4 bg-black/40 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setShowPromptPreview(!showPromptPreview)}
            className="w-full flex items-center justify-between text-xs font-bold text-[#ffd6eb]/80 hover:text-white"
          >
            <span className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-[#ff007f]" />
              <span>Inspect OpenRouter AI Persona Injection Preview</span>
            </span>
            <span>{showPromptPreview ? '▲ Hide' : '▼ View'}</span>
          </button>

          {showPromptPreview && (
            <div className="mt-3 p-3 bg-[#0d020b] rounded-xl border border-white/10 font-mono text-[11px] text-[#ff99cc] whitespace-pre-wrap leading-relaxed">
              {`### USER ROLEPLAY PERSONA: {{user}}
Name: ${name || 'User'} (${displayName || 'Player'})
Occupation: ${occupation || 'Unknown'}
Traits: ${traits.join(', ') || 'Adaptable'}
Speaking Style: ${speakingStyle || 'Natural'}
Appearance: ${appearance || 'Unspecified'}
Backstory: ${description || 'Not specified'}`}
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex items-center justify-between pt-4 border-t border-[#ff3399]/30">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-[#ff007f] via-[#ff3399] to-[#9b51e0] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white rounded-xl text-sm font-bold shadow-[0_0_25px_rgba(255,0,128,0.7)] transition-all hover:scale-105 flex items-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>{initialPersona ? 'Save Changes' : 'Create & Save Persona'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
