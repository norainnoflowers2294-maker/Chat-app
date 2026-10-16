import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Upload,
  Download,
  Search,
  Crown,
  Heart,
  Edit2,
  Copy,
  Trash2,
  Sparkles,
  MessageSquare,
  Filter,
  Check,
} from 'lucide-react';
import { Persona } from '../types/roleplay';

interface PersonaLibraryViewProps {
  personas: Persona[];
  onOpenCreator: (personaToEdit?: Persona | null) => void;
  onSavePersona: (persona: Persona) => void;
  onDeletePersona: (personaId: string) => void;
  onSelectDefaultPersona: (personaId: string) => void;
  onStartChatWithPersona?: (persona: Persona) => void;
}

const CARD_COLORS = [
  '#ff007f',
  '#9b51e0',
  '#0094f5',
  '#ff3e00',
  '#34b8a4',
  '#ad31a8',
  '#f39a08',
  '#e60065',
];

export const PersonaLibraryView: React.FC<PersonaLibraryViewProps> = ({
  personas,
  onOpenCreator,
  onSavePersona,
  onDeletePersona,
  onSelectDefaultPersona,
  onStartChatWithPersona,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'fav' | 'active'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'name'>('updated');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activePersona = personas.find((p) => p.is_default) || personas[0];

  // Filtering & Sorting
  const filteredPersonas = personas
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchText = `${p.name} ${p.display_name || ''} ${p.nicknames || ''} ${p.occupation || ''} ${
        p.traits?.join(' ') || ''
      } ${p.description || ''}`.toLowerCase();

      if (!matchText.includes(q)) return false;
      if (filterType === 'fav' && !p.favorite) return false;
      if (filterType === 'active' && !p.is_default) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return (a.display_name || a.name).localeCompare(b.display_name || b.name);
      }
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  const handleToggleFavorite = (persona: Persona) => {
    const updated = { ...persona, favorite: !persona.favorite, updatedAt: new Date().toISOString() };
    onSavePersona(updated);
    showToast(updated.favorite ? 'Marked as favorite!' : 'Removed from favorites.');
  };

  const handleDuplicate = (persona: Persona) => {
    const copy: Persona = {
      ...persona,
      id: `persona_${Date.now()}`,
      name: `${persona.name} (Copy)`,
      display_name: persona.display_name ? `${persona.display_name} (Copy)` : undefined,
      is_default: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSavePersona(copy);
    showToast(`Duplicated "${persona.name}"!`);
  };

  const handleExportSingle = (persona: Persona) => {
    const blob = new Blob([JSON.stringify(persona, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(persona.display_name || persona.name).toLowerCase().replace(/\s+/g, '_')}_persona.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported persona JSON!');
  };

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(personas, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'colorpop-personas.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported all ${personas.length} personas!`);
  };

  const handleImportJSON = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const importedArray = Array.isArray(data) ? data : [data];
        let count = 0;

        importedArray.forEach((item: any) => {
          if (item && (item.name || item.full_name || item.display_name)) {
            const newP: Persona = {
              id: item.id || `persona_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: item.name || item.full_name || 'Imported Persona',
              display_name: item.display_name || item.name || item.full_name,
              nicknames: item.nicknames || '',
              occupation: item.occupation || '',
              avatar: item.avatar || item.avatar_url || '/colorpop_hero.jpg',
              description: item.description || item.personality_description || '',
              appearance: item.appearance || item.physical_description || '',
              backstory: item.backstory || '',
              speaking_style: item.speaking_style || '',
              traits: Array.isArray(item.traits) ? item.traits : ['Alluring'],
              is_default: false,
              favorite: !!item.favorite,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            onSavePersona(newP);
            count++;
          }
        });

        showToast(`Successfully imported ${count} persona(s)!`);
      } catch (err) {
        showToast('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 bg-gradient-to-r from-[#ff007f] to-[#9b51e0] text-white text-xs font-bold rounded-2xl shadow-[0_0_25px_rgba(255,0,128,0.7)] flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#ff3399]/30">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#9b51e0] to-[#ff007f] flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,0,128,0.5)]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                ✧ Persona Library
              </h1>
              <p className="text-xs text-[#ffd6eb]/70 mt-0.5">
                Switch between your roleplay identities, manage pictures, or craft custom profiles
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Create Persona */}
          <button
            onClick={() => onOpenCreator(null)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(255,0,128,0.6)] transition-all hover:scale-105 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>＋ Create Persona</span>
          </button>

          {/* Import JSON */}
          <label className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-[#ffd6eb] hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5 border border-white/10">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImportJSON(e.target.files[0])}
            />
          </label>

          {/* Export All */}
          <button
            onClick={handleExportAll}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-[#ffd6eb] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border border-white/10"
            title="Download full library as colorpop-personas.json"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export All</span>
          </button>
        </div>
      </div>

      {/* ACTIVE PERSONA FEATURE SPOTLIGHT */}
      {activePersona && (
        <div className="mt-6 p-4 sm:p-5 bg-gradient-to-r from-[#200519] via-[#160614] to-[#12040e] border-2 border-amber-500/40 rounded-3xl shadow-[0_0_35px_rgba(245,158,11,0.2)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative shrink-0">
              <img
                src={resolveImageUrl(activePersona.avatar || '/colorpop_hero.jpg')}
                alt={activePersona.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
              />
              <div className="absolute -top-2 -right-2 p-1 bg-amber-500 text-black rounded-full shadow-md">
                <Crown className="w-3.5 h-3.5 fill-black" />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold uppercase tracking-wider">
                  ★ Active Roleplay Persona
                </span>
                {activePersona.favorite && (
                  <Heart className="w-3.5 h-3.5 fill-[#ff007f] text-[#ff007f]" />
                )}
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                {activePersona.display_name || activePersona.name}
              </h2>
              <p className="text-xs text-[#ffd6eb]/70 line-clamp-1">
                {activePersona.nicknames || activePersona.occupation || activePersona.description || 'Primary Identity'}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {activePersona.traits?.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/90 font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => onOpenCreator(activePersona)}
              className="flex-1 sm:flex-initial px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border border-white/15"
            >
              <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Edit Pic & Bio</span>
            </button>

            {onStartChatWithPersona && (
              <button
                onClick={() => onStartChatWithPersona(activePersona)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center justify-center space-x-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat as this Persona</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search, Filter & Sort Controls */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search personas, nicknames, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#180716] border border-[#ff3399]/40 focus:border-[#ff007f] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-[#ff99cc]" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full bg-[#180716] border border-[#ff3399]/40 rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none"
          >
            <option value="all">All Personas ({personas.length})</option>
            <option value="fav">Favorites Only</option>
            <option value="active">Active Only</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-[#ff99cc] whitespace-nowrap">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full bg-[#180716] border border-[#ff3399]/40 rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none"
          >
            <option value="updated">Recently Edited</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Persona Count */}
      <div className="mt-4 flex items-center justify-between text-xs text-[#ffd6eb]/70 px-1">
        <span>
          Showing {filteredPersonas.length} of {personas.length} persona profile(s)
        </span>
      </div>

      {/* PERSONA CARDS GRID */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredPersonas.map((persona, index) => {
          const accentColor = CARD_COLORS[index % CARD_COLORS.length];
          const isCurrentDefault = persona.is_default;

          return (
            <article
              key={persona.id}
              className="group relative rounded-3xl p-4 bg-[#140410]/90 backdrop-blur-md border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between"
              style={{
                borderColor: `${accentColor}70`,
                boxShadow: isCurrentDefault
                  ? `0 0 25px rgba(245, 158, 11, 0.4)`
                  : `0 0 15px ${accentColor}25`,
              }}
            >
              {/* Card Header & Picture */}
              <div>
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#0d020b] border border-white/10 group-hover:border-white/30 transition-all">
                  <img
                    src={resolveImageUrl(persona.avatar || '/colorpop_hero.jpg')}
                    alt={persona.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Active Badge */}
                  {isCurrentDefault && (
                    <div className="absolute top-2 left-2 px-2.5 py-1 bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg flex items-center space-x-1">
                      <Crown className="w-3 h-3 fill-black" />
                      <span>Active</span>
                    </div>
                  )}

                  {/* Favorite Toggle Button */}
                  <button
                    onClick={() => handleToggleFavorite(persona)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all backdrop-blur-sm"
                    title={persona.favorite ? 'Favorited' : 'Add to Favorites'}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        persona.favorite ? 'fill-[#ff007f] text-[#ff007f]' : 'text-white/80'
                      }`}
                    />
                  </button>
                </div>

                {/* Identity Titles */}
                <div className="mt-3">
                  <h3 className="text-base font-bold text-white tracking-wide truncate">
                    {persona.display_name || persona.name}
                  </h3>
                  <p className="text-[11px] text-[#ff99cc] font-medium truncate mt-0.5">
                    {persona.occupation || persona.nicknames || 'Roleplay Persona'}
                  </p>
                </div>

                {/* Description Snippet */}
                <p className="mt-2 text-xs text-[#ffd6eb]/75 line-clamp-2 leading-relaxed">
                  {persona.description || persona.speaking_style || 'No bio specified.'}
                </p>

                {/* Trait Tags */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {persona.traits?.slice(0, 3).map((trait) => (
                    <span
                      key={trait}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/90 border border-white/10"
                    >
                      {trait}
                    </span>
                  ))}
                  {(persona.traits?.length || 0) > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 text-white/50">
                      +{(persona.traits?.length || 0) - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-1">
                {/* Use / Activate Button */}
                <button
                  onClick={() => {
                    onSelectDefaultPersona(persona.id);
                    showToast(`Activated "${persona.name}" as default persona!`);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                    isCurrentDefault
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Make this your active persona for chats"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isCurrentDefault ? 'Active' : 'Use'}</span>
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => onOpenCreator(persona)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 transition-colors"
                  title="Edit Persona"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Duplicate Button */}
                <button
                  onClick={() => handleDuplicate(persona)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#ffd6eb] transition-colors"
                  title="Duplicate Persona"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Export Single */}
                <button
                  onClick={() => handleExportSingle(persona)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 transition-colors"
                  title="Export Persona Card (JSON)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => {
                    if (confirm(`Delete persona "${persona.name}"?`)) {
                      onDeletePersona(persona.id);
                      showToast(`Deleted persona "${persona.name}".`);
                    }
                  }}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-900/40 text-rose-300 transition-colors"
                  title="Delete Persona"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {filteredPersonas.length === 0 && (
        <div className="mt-12 text-center p-10 bg-[#160614]/70 rounded-3xl border border-[#ff3399]/30">
          <UserCheck className="w-12 h-12 text-[#ff007f] mx-auto opacity-70 mb-3" />
          <h3 className="text-base font-bold text-white">No personas found</h3>
          <p className="text-xs text-[#ffd6eb]/70 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No personas matching "${searchQuery}". Try a different keyword.`
              : 'Create your first custom persona to personalize roleplay interactions.'}
          </p>
          <button
            onClick={() => onOpenCreator(null)}
            className="mt-4 px-5 py-2.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] text-white text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(255,0,128,0.5)]"
          >
            ＋ Create New Persona
          </button>
        </div>
      )}
    </div>
  );
};
