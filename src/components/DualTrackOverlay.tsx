import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState, useEffect } from 'react';
import {
  X,
  Home,
  MessageSquare,
  Users,
  BookOpen,
  UserCheck,
  Puzzle,
  FileText,
  Bookmark,
  Sparkles,
  Settings,
  GitBranch,
  Dices,
  Heart,
  ChevronRight,
  ExternalLink,
  Plus,
  ArrowRight,
  CloudMoon,
  Briefcase,
  Layers,
  Activity,
  Check,
} from 'lucide-react';
import {
  Chat,
  Character,
  Persona,
  Lorebook,
  Plugin,
  ConnectionDiagnostic,
  OpenRouterConfig,
} from '../types/roleplay';

interface DualTrackOverlayProps {
  isOpen: boolean;
  onClose: () => void; // Hitting X backs out of both sides
  activeChat: Chat | null;
  chats: Chat[];
  characters: Character[];
  personas: Persona[];
  lorebooks: Lorebook[];
  plugins: Plugin[];
  diagnostic: ConnectionDiagnostic;
  openRouterConfig: OpenRouterConfig;
  onSelectChat: (chatId: string) => void;
  onOpenChatScreen: () => void; // Hit the chat screen and act out on both sides
  onOpenHome: () => void;
  onOpenCharacterModal: () => void;
  onOpenLorebookModal: () => void;
  onOpenPersonaModal: () => void;
  onOpenPluginModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenStoryNotesModal: () => void;
  onOpenSavedMessagesModal: () => void;
  onOpenSceneGeneratorModal: () => void;
  onOpenGitHubSyncModal: () => void;
  onTogglePlugin: (pluginId: string) => void;
  onBoostAffinity?: () => void;
}

export const DualTrackOverlay: React.FC<DualTrackOverlayProps> = ({
  isOpen,
  onClose,
  activeChat,
  chats,
  characters,
  personas,
  lorebooks,
  plugins,
  diagnostic,
  openRouterConfig,
  onSelectChat,
  onOpenChatScreen,
  onOpenHome,
  onOpenCharacterModal,
  onOpenLorebookModal,
  onOpenPersonaModal,
  onOpenPluginModal,
  onOpenSettingsModal,
  onOpenStoryNotesModal,
  onOpenSavedMessagesModal,
  onOpenSceneGeneratorModal,
  onOpenGitHubSyncModal,
  onTogglePlugin,
  onBoostAffinity,
}) => {
  const [diceResult, setDiceResult] = useState<string | null>(null);
  const [quickNote, setQuickNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [activeTrack, setActiveTrack] = useState<'left' | 'right'>('left');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Roll dice
  const handleRollDice = (sides: number = 20) => {
    const roll = Math.floor(Math.random() * sides) + 1;
    let label = `Rolled ${roll} (d${sides})`;
    if (sides === 20) {
      if (roll === 20) label = `★ Natural 20! Critical Triumph! ★`;
      else if (roll === 1) label = `⚠ Natural 1! Critical Fumble! ⚠`;
      else if (roll >= 15) label = `Great Success! Rolled ${roll}`;
      else if (roll >= 10) label = `Passed Check: Rolled ${roll}`;
      else label = `Failed Check: Rolled ${roll}`;
    }
    setDiceResult(label);
    setTimeout(() => setDiceResult(null), 4000);
  };

  const handleQuickSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    setNoteSaved(true);
    setTimeout(() => {
      setQuickNote('');
      setNoteSaved(false);
    }, 1500);
  };

  // Active chat entities
  const activeChar = characters.find((c) => activeChat?.characterIds.includes(c.id)) || characters[0];
  const activePersona = personas.find((p) => p.id === activeChat?.personaId) || personas[0];
  const activeLorebooks = lorebooks.filter((l) => activeChat?.lorebookIds.includes(l.id)).slice(0, 3);
  const activePlugins = plugins.filter((p) => activeChat?.pluginIds.includes(p.id)).slice(0, 5);

  return (
    <div
      className={`fixed inset-0 z-40 transition-all duration-300 ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Darkened Backdrop: Clicking backs out both sides */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Center Floating Master Close Action Pill: "X Back Out Both Sides" */}
      <div
        className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center space-x-2 bg-[#12040e]/95 border-2 border-[#ff3399] rounded-full px-4 py-1.5 shadow-[0_0_25px_rgba(255,0,128,0.7)] backdrop-blur-md">
          <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#ff99cc] to-[#ff3399]">
            Dual Track Mode
          </span>
          <div className="flex items-center gap-1 sm:hidden">
            <button onClick={() => setActiveTrack('left')} aria-pressed={activeTrack === 'left'} className={`px-2 py-1 rounded-full text-[10px] font-bold ${activeTrack === 'left' ? 'bg-white text-[#9b125c]' : 'bg-white/10 text-white'}`}>Left</button>
            <button onClick={() => setActiveTrack('right')} aria-pressed={activeTrack === 'right'} className={`px-2 py-1 rounded-full text-[10px] font-bold ${activeTrack === 'right' ? 'bg-white text-[#9b125c]' : 'bg-white/10 text-white'}`}>Right</button>
          </div>
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#ff007f] hover:bg-[#ff1a8c] text-white rounded-full text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,0,128,0.8)]"
            title="Back out of both sides (X)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close (X)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LEFT TRACK: Navigation, Libraries, Recent Chats, and Screen Direct Links */}
      {/* Pops up and slides over from the left edge */}
      {/* ========================================================================= */}
      <aside
        className={`absolute top-0 bottom-0 left-0 w-screen sm:w-96 bg-[#12030e]/95 border-r-2 border-[#ff3399]/60 backdrop-blur-xl shadow-[10px_0_40px_rgba(255,51,153,0.35)] flex flex-col z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isOpen && activeTrack === 'left' ? 'max-sm:translate-x-0' : 'max-sm:-translate-x-full'}`}
      >
        {/* Left Track Header with X */}
        <div className="p-4 border-b border-[#ff3399]/30 flex items-center justify-between bg-[#190514]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff007f] to-[#ff3399] flex items-center justify-center text-white shadow-[0_0_12px_rgba(255,0,128,0.5)]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3
                className="text-sm font-bold text-white tracking-wide"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Left Track: Navigation
              </h3>
              <p className="text-[10px] text-[#ff99cc]">Pretty Little Fantasies</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-[#ff007f] text-white transition-all group"
            title="Back out of both sides (X)"
          >
            <X className="w-4 h-4 group-hover:scale-110" />
          </button>
        </div>

        {/* Scrollable Links Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-[#ffd6eb]">
          {/* Prominent "Hit The Chat Screen" Action Button */}
          <div className="p-3 bg-gradient-to-r from-[#ff007f]/30 to-[#9b51e0]/30 border border-[#ff3399]/60 rounded-2xl space-y-2 shadow-[0_0_20px_rgba(255,0,128,0.25)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#ff66b2]" />
                Active Chat Screen
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ready
              </span>
            </div>

            <button
              onClick={() => {
                onOpenChatScreen();
                // Keeps tracks active or user can back out with X
              }}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(255,0,128,0.7)] transition-all hover:scale-[1.02]"
            >
              <span>Hit The Chat Screen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation Links */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#ff99cc] tracking-wider pl-1">
              Core Screens &amp; Hubs
            </span>

            <button
              onClick={() => {
                onOpenHome();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white transition-all text-left"
            >
              <div className="flex items-center space-x-2.5">
                <Home className="w-4 h-4 text-[#ff66b2]" />
                <span className="font-semibold">Home Dashboard</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#ffd6eb]/40" />
            </button>

            <button
              onClick={() => {
                onOpenCharacterModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white transition-all text-left"
            >
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold">Character Library &amp; Creator</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">
                {characters.length}
              </span>
            </button>

            <button
              onClick={() => {
                onOpenLorebookModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white transition-all text-left"
            >
              <div className="flex items-center space-x-2.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">Lorebook Library &amp; Creator</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-amber-300">
                {lorebooks.length}
              </span>
            </button>

            <button
              onClick={() => {
                onOpenPersonaModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white transition-all text-left"
            >
              <div className="flex items-center space-x-2.5">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span className="font-semibold">Persona Studio &amp; Profile</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-purple-300">
                {personas.length}
              </span>
            </button>

            <button
              onClick={() => {
                onOpenPluginModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white transition-all text-left"
            >
              <div className="flex items-center space-x-2.5">
                <Puzzle className="w-4 h-4 text-fuchsia-400" />
                <span className="font-semibold">Plugin Hub (5 Slots)</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-fuchsia-300">
                {plugins.filter((p) => p.enabled).length} Active
              </span>
            </button>
          </div>

          {/* Roleplay Features & Utilities */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#ff99cc] tracking-wider pl-1">
              Roleplay Tools &amp; Media
            </span>

            <button
              onClick={() => {
                onOpenStoryNotesModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white transition-all text-left"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold">Story Notes &amp; Memories</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#ffd6eb]/40" />
            </button>

            <button
              onClick={() => {
                onOpenSavedMessagesModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white transition-all text-left"
            >
              <div className="flex items-center space-x-2.5">
                <Bookmark className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">Saved Messages &amp; Quotes</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#ffd6eb]/40" />
            </button>

            <button
              onClick={() => {
                onOpenSceneGeneratorModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white transition-all text-left"
            >
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold">Scene Image Generator</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#ffd6eb]/40" />
            </button>

            <button
              onClick={() => {
                onOpenSettingsModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white transition-all text-left"
            >
              <div className="flex items-center space-x-2.5">
                <Settings className="w-4 h-4 text-[#ff3399]" />
                <span className="font-semibold">OpenRouter &amp; Diagnostics</span>
              </div>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  diagnostic.status === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {diagnostic.status === 'connected' ? 'Connected' : 'Configure'}
              </span>
            </button>

            <button
              onClick={() => {
                onOpenGitHubSyncModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white transition-all text-left"
            >
              <div className="flex items-center space-x-2.5">
                <GitBranch className="w-4 h-4 text-sky-400" />
                <span className="font-semibold">GitHub Push &amp; Backup</span>
              </div>
              <span className="text-[9px] font-mono text-[#ff99cc]">main</span>
            </button>
          </div>

          {/* Recent Chats Carousel List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pl-1">
              <span className="text-[10px] uppercase font-bold text-[#ff99cc] tracking-wider">
                Recent Chats
              </span>
              <span className="text-[10px] text-[#ffd6eb]/60">{chats.length} Total</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {chats.map((c) => {
                const isSelected = activeChat?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectChat(c.id);
                      onOpenChatScreen();
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#ff007f]/20 border-[#ff3399] shadow-[0_0_12px_rgba(255,0,128,0.3)]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <img
                        src={resolveImageUrl(c.bgImage || '/penthouse.jpg')}
                        alt={c.title}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-[#ff007f]"
                      />
                      <div className="truncate">
                        <h5 className="font-bold text-white text-xs truncate">{c.title}</h5>
                        <p className="text-[10px] text-[#ffd6eb]/70 truncate">
                          {c.messages[c.messages.length - 1]?.content.slice(0, 30) || 'Started chat'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#ff66b2] shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Left Track Footer */}
        <div className="p-3 border-t border-[#ff3399]/30 bg-[#160412] flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-2 truncate">
            <img
              src={resolveImageUrl(activePersona?.avatar || '/colorpop_hero.jpg')}
              alt={activePersona?.name}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-[#ff007f]"
            />
            <span className="truncate text-white font-medium">{activePersona?.name}</span>
          </div>

          <button
            onClick={() => {
              window.open('https://chub.ai', '_blank');
            }}
            className="text-[10px] text-cyan-300 hover:text-white flex items-center gap-1 font-mono"
          >
            <span>Chub AI</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. RIGHT TRACK: Roleplay HUD, Affinity Heart, 3 Lorebooks, 5 Plugins, Dice */}
      {/* Pops up and slides over from the right edge */}
      {/* ========================================================================= */}
      <aside
        className={`absolute top-0 bottom-0 right-0 w-screen sm:w-96 bg-[#12030e]/95 border-l-2 border-[#ff3399]/60 backdrop-blur-xl shadow-[-10px_0_40px_rgba(255,51,153,0.35)] flex flex-col z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isOpen && activeTrack === 'right' ? 'max-sm:translate-x-0' : 'max-sm:translate-x-full'}`}
      >
        {/* Right Track Header with X */}
        <div className="p-4 border-b border-[#ff3399]/30 flex items-center justify-between bg-[#190514]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#9b51e0] to-[#ff007f] flex items-center justify-center text-white shadow-[0_0_12px_rgba(155,81,224,0.5)]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3
                className="text-sm font-bold text-white tracking-wide"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Right Track: Roleplay HUD
              </h3>
              <p className="text-[10px] text-[#ff99cc]">Live Stats &amp; Active Mechanics</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-[#ff007f] text-white transition-all group"
            title="Back out of both sides (X)"
          >
            <X className="w-4 h-4 group-hover:scale-110" />
          </button>
        </div>

        {/* Scrollable Right HUD Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-[#ffd6eb]">
          {/* Active Character Dossier & Affinity Heart Bar */}
          <div className="p-3.5 bg-[#1c0617] border border-[#ff3399]/40 rounded-2xl space-y-3 shadow-md">
            <div className="flex items-center space-x-3">
              <img
                src={resolveImageUrl(activeChar?.avatar || '/lucious.jpg')}
                alt={activeChar?.name}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#ff007f] shadow-lg"
              />
              <div className="truncate flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white truncate">{activeChar?.name}</h4>
                  <button
                    onClick={onBoostAffinity}
                    className="p-1 rounded-full bg-[#ff007f]/20 hover:bg-[#ff007f]/40 text-[#ff66b2] transition-colors"
                    title="Boost Relationship Affinity"
                  >
                    <Heart className="w-4 h-4 fill-[#ff007f]" />
                  </button>
                </div>
                <p className="text-[10px] text-[#ffd6eb]/70 truncate">{activeChar?.summary}</p>
              </div>
            </div>

            {/* Affinity Meter Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1 text-[#ff99cc]">
                  <Heart className="w-3.5 h-3.5 fill-[#ff007f] text-[#ff007f]" />
                  <span>Affinity Score</span>
                </span>
                <span className="font-mono text-white font-bold">
                  {activeChat?.relationshipScore ?? 94}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#ff007f] via-[#ff66b2] to-rose-400 transition-all duration-500 shadow-[0_0_10px_#ff007f]"
                  style={{ width: `${activeChat?.relationshipScore ?? 94}%` }}
                />
              </div>
            </div>
          </div>

          {/* 5 Active Roleplay Plugins */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pl-1">
              <span className="text-[10px] uppercase font-bold text-[#ff99cc] tracking-wider flex items-center gap-1.5">
                <Puzzle className="w-3.5 h-3.5 text-cyan-400" />
                Active Plugins (5 Slots)
              </span>
              <button
                onClick={() => {
                  onOpenPluginModal();
                  onClose();
                }}
                className="text-[10px] text-cyan-300 hover:text-white font-semibold"
              >
                Manage
              </button>
            </div>

            <div className="space-y-1.5">
              {plugins.slice(0, 5).map((plugin) => (
                <div
                  key={plugin.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#ff3399]/40 transition-all"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-white text-xs block truncate">
                      {plugin.name}
                    </span>
                    <span className="text-[10px] text-[#ffd6eb]/60 truncate block">
                      {plugin.badge || plugin.description}
                    </span>
                  </div>

                  <button
                    onClick={() => onTogglePlugin(plugin.id)}
                    className={`shrink-0 w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                      plugin.enabled ? 'bg-[#ff007f]' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform ${
                        plugin.enabled ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Active Lorebooks for Chat */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pl-1">
              <span className="text-[10px] uppercase font-bold text-[#ff99cc] tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                Active Lorebooks (3 Slots)
              </span>
              <button
                onClick={() => {
                  onOpenLorebookModal();
                  onClose();
                }}
                className="text-[10px] text-amber-300 hover:text-white font-semibold"
              >
                View
              </button>
            </div>

            <div className="space-y-1.5">
              {activeLorebooks.map((lb) => (
                <div
                  key={lb.id}
                  onClick={() => {
                    onOpenLorebookModal();
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs truncate">{lb.name}</span>
                    <span className="text-[9px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {lb.entries.length} entries
                    </span>
                  </div>
                  <p className="text-[10px] text-[#ffd6eb]/70 truncate mt-0.5">{lb.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive d20 Skill Check Dice Roller */}
          <div className="p-3 bg-[#1e071a] border border-[#ff3399]/40 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Dices className="w-4 h-4 text-emerald-400" />
                Action Dice Roller
              </span>
              <span className="text-[10px] text-emerald-300 font-mono">RPG Check</span>
            </div>

            {diceResult && (
              <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold text-center animate-bounce">
                {diceResult}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleRollDice(20)}
                className="py-1.5 px-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 rounded-xl text-white font-bold text-xs flex items-center justify-center space-x-1 transition-all"
              >
                <Dices className="w-3.5 h-3.5 text-emerald-400" />
                <span>Roll d20</span>
              </button>

              <button
                onClick={() => handleRollDice(100)}
                className="py-1.5 px-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-xl text-white font-bold text-xs flex items-center justify-center space-x-1 transition-all"
              >
                <Dices className="w-3.5 h-3.5 text-purple-400" />
                <span>Roll d100</span>
              </button>
            </div>
          </div>

          {/* Quick Memory Capture */}
          <div className="p-3 bg-[#1c0617] border border-[#ff3399]/30 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-[#ff99cc] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Quick Note / Story Memory
            </span>

            <form onSubmit={handleQuickSaveNote} className="space-y-2">
              <input
                type="text"
                placeholder="Log a quick plot point or quote..."
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                className="w-full bg-[#12040e] border border-white/20 focus:border-[#ff3399] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-400">
                  {noteSaved ? '✓ Saved to Memories!' : ''}
                </span>
                <button
                  type="submit"
                  disabled={!quickNote.trim()}
                  className="px-3 py-1 bg-[#ff007f] hover:bg-[#ff1a8c] disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Track Footer: OpenRouter Live Diagnostic */}
        <div className="p-3 border-t border-[#ff3399]/30 bg-[#160412] flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center space-x-1.5 truncate">
            <div
              className={`w-2 h-2 rounded-full ${
                diagnostic.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="text-white truncate">
              {openRouterConfig.model.split('/').pop()}
            </span>
          </div>

          {diagnostic.latencyMs && (
            <span className="text-emerald-300 font-bold">{diagnostic.latencyMs}ms</span>
          )}

          <button
            onClick={() => {
              onOpenSettingsModal();
              onClose();
            }}
            className="text-[#ff99cc] hover:text-white underline font-sans ml-2"
          >
            Diagnostics
          </button>
        </div>
      </aside>
    </div>
  );
};
