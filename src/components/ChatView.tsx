import type { AppPreferences } from '../lib/preferences';
import type { StoryMemory } from '../types/roleplay';
import { sendOpenRouterChat } from '../lib/openrouter';
import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  ArrowLeft,
  Settings,
  Heart,
  CloudMoon,
  Dices,
  RefreshCw,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  Users,
  BookOpen,
  Puzzle,
  User,
  Plus,
  Bookmark,
  PanelLeft,
  PanelRight,
  Columns,
  Image as ImageIcon,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  Chat,
  Character,
  Lorebook,
  Persona,
  Plugin,
  ChatMessage,
  OpenRouterConfig,
  ConnectionDiagnostic,
} from '../types/roleplay';
import { buildOpenRouterMessages } from '../utils/promptAssembler';
import { parseSlashCommand } from '../lib/slashCommands';
import { DualTrackOverlay } from './DualTrackOverlay';

interface ChatViewProps {
  preferences: AppPreferences;
  storyMemories: StoryMemory[];
  chat: Chat;
  allChats: Chat[];
  characters: Character[];
  personas: Persona[];
  lorebooks: Lorebook[];
  plugins: Plugin[];
  openRouterConfig: OpenRouterConfig;
  diagnostic: ConnectionDiagnostic;
  onUpdateChat: (updatedChat: Chat) => void;
  onSelectChat: (chatId: string) => void;
  onBackToDashboard: () => void;
  onOpenSettings: () => void;
  onOpenPlugins: () => void;
  onOpenCharacterModal: () => void;
  onOpenLorebookModal: () => void;
  onOpenPersonaModal: () => void;
  onOpenStoryNotesModal: () => void;
  onOpenSavedMessagesModal: () => void;
  onOpenSceneGeneratorModal: () => void;
  onOpenGitHubSyncModal: () => void;
  onOpenWallet: (view: 'dashboard' | 'activity') => void;
  onUpdatePreferences: (value: AppPreferences) => void;
  onTogglePlugin: (pluginId: string) => void;
  onBookmarkMessage: (msg: ChatMessage) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  preferences, storyMemories,
  chat,
  allChats,
  characters,
  personas,
  lorebooks,
  plugins,
  openRouterConfig,
  diagnostic,
  onUpdateChat,
  onSelectChat,
  onBackToDashboard,
  onOpenSettings,
  onOpenPlugins,
  onOpenCharacterModal,
  onOpenLorebookModal,
  onOpenPersonaModal,
  onOpenStoryNotesModal,
  onOpenSavedMessagesModal,
  onOpenSceneGeneratorModal,
  onOpenGitHubSyncModal,
  onOpenWallet,
  onUpdatePreferences,
  onTogglePlugin,
  onBookmarkMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ message: string; suggestedFix?: string } | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [diceResult, setDiceResult] = useState<string | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [commandNotice, setCommandNotice] = useState<string | null>(null);

  // Dual Track Screen State (Left and Right Slide-over Panels)
  const [isDualTrackOpen, setIsDualTrackOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active entities in this chat
  const activeCharacters = characters.filter((c) => chat.characterIds.includes(c.id));
  const activePersona = personas.find((p) => p.id === chat.personaId) || personas[0] || null;
  const activeLorebooks = lorebooks.filter((l) => chat.lorebookIds.includes(l.id)).slice(0, 3);
  const activePlugins = plugins.filter((p) => chat.pluginIds.includes(p.id)).slice(0, 5);

  const scrollToBottom = () => {
    if (preferences.autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: preferences.reducedMotion ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, loading, preferences.autoScroll, preferences.reducedMotion]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    setErrorDetails(null);
    const command = parseSlashCommand(inputText.trim());
    if (command) {
      setInputText('');
      if (command.type === 'wallet') {
        onOpenWallet(command.view);
        return;
      }
      if (command.type === 'narrator') {
        const enabled = command.enabled ?? !preferences.narratorEnabled;
        const nextPreferences = { ...preferences, narratorEnabled: enabled, ...(command.frequency ? { narratorFrequency: command.frequency } : {}) };
        onUpdatePreferences(nextPreferences);
        const detail = command.frequency ? ' Narration detail: ' + command.frequency + '.' : '';
        setCommandNotice('Narrator ' + (enabled ? 'enabled.' : 'disabled.') + detail);
        setTimeout(() => setCommandNotice(null), 3500);
        return;
      }
      if (command.type === 'roll') {
        const roll = Math.floor(Math.random() * 20) + 1;
        const result = roll >= 18 ? 'Critical Success! (Natural ' + roll + ')' : roll >= 10 ? 'Success (Rolled ' + roll + ')' : 'Failure (Rolled ' + roll + ')';
        setDiceResult(result);
        setTimeout(() => setDiceResult(null), 4000);
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      senderId: 'user',
      senderName: activePersona ? activePersona.name : 'You',
      avatar: activePersona?.avatar || '/colorpop_hero.jpg',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...chat.messages, userMessage];
    const updatedChat: Chat = {
      ...chat,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
      relationshipScore: Math.min(100, (chat.relationshipScore || 85) + 1),
    };

    onUpdateChat(updatedChat);
    setInputText('');
    setLoading(true);

    try {
      const apiMessages = buildOpenRouterMessages({
        characters: activeCharacters,
        persona: activePersona,
        lorebooks: activeLorebooks,
        plugins: activePlugins,
        chat: updatedChat,
        preferences, storyMemories,
      });

      const botReply = await sendOpenRouterChat(openRouterConfig, apiMessages);
      const responder = activeCharacters[0] || { id: 'char_bot', name: 'Roleplay' };

      const replyMessage: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        senderId: responder.id,
        senderName: responder.name,
        avatar: responder.avatar,
        content: botReply,
        timestamp: Date.now(),
        swipes: [botReply],
        currentSwipeIndex: 0,
      };

      if (preferences.notifyReplies && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification('ColorPop', { body: 'A reply is ready.' }); } catch { /* Unsupported notification constructor on some mobile browsers. */ }
      }
      onUpdateChat({
        ...updatedChat,
        messages: [...updatedMessages, replyMessage],
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setErrorDetails({
        message: err.message || 'Network connection failed while reaching OpenRouter.',
        suggestedFix: err.suggestedFix || 'Verify your internet connection and openrouter.ai server status.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Roll d20 quick action
  const handleQuickDiceRoll = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const res =
      roll >= 18
        ? `★ D20 Critical Success: ${roll}!`
        : roll >= 10
        ? `✓ D20 Check Passed: ${roll}`
        : `✗ D20 Check Failed: ${roll}`;
    setDiceResult(res);
    setInputText((prev) =>
      prev ? `${prev} *rolls d20: ${roll}*` : `*rolls d20 for charisma/action check: ${roll}*`
    );
    setTimeout(() => setDiceResult(null), 4000);
  };

  const handleSaveQuote = (msg: ChatMessage) => {
    onBookmarkMessage(msg);
    setSavedSuccessMsg(`Saved quote from ${msg.senderName}!`);
    setTimeout(() => setSavedSuccessMsg(null), 2500);
  };

  return (
    <div data-compact={preferences.compactMode} data-bubble-motion={preferences.messageAnimations && !preferences.reducedMotion} className="cp-chat relative w-full h-screen max-h-screen flex flex-col bg-[#0d020b] text-[#ffd6eb] overflow-hidden select-none">
      {/* Background Ambience with chat.bgImage */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none filter blur-sm transition-all duration-700"
        style={{ backgroundImage: `url(${resolveImageUrl(chat.bgImage || '/penthouse.jpg')})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d020b]/95 via-[#0d020b]/80 to-[#0d020b]/95 pointer-events-none" />

      {/* Top Chat Bar */}
      <header className="relative px-3 sm:px-5 py-2.5 bg-[#140410]/95 backdrop-blur-md border-b border-[#ff3399]/40 flex items-center justify-between z-30 shadow-[0_0_25px_rgba(255,0,128,0.3)]">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Back to Dashboard */}
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl bg-white/10 hover:bg-[#ff007f] text-white transition-all flex items-center space-x-1.5 shadow"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-bold hidden md:inline">Dashboard</span>
          </button>

          {/* DUAL TRACK SCREEN TOGGLE (Slide Over Both Sides) */}
          <button
            onClick={() => setIsDualTrackOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 text-xs font-bold transition-all shadow-md ${
              isDualTrackOpen
                ? 'bg-[#ff007f] border-[#ff66b2] text-white shadow-[0_0_15px_rgba(255,0,128,0.8)] scale-105'
                : 'bg-[#ff007f]/20 border-[#ff3399]/60 hover:bg-[#ff007f]/40 text-[#ffd6eb]'
            }`}
            title="Toggle Dual Track Screen (Pops up Left & Right tracks)"
          >
            <Columns className="w-4 h-4 text-[#ff99cc]" />
            <span className="hidden sm:inline">Dual Track Screen</span>
          </button>

          {/* Active Characters */}
          <div className="flex items-center space-x-2 pl-1">
            <div className="flex -space-x-2 overflow-hidden">
              {activeCharacters.map((c) => (
                <img
                  key={c.id}
                  src={resolveImageUrl(c.avatar)}
                  alt={c.name}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-[#ff007f] object-cover"
                />
              ))}
            </div>

            <div className="hidden xs:block">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-wide truncate max-w-[120px] sm:max-w-xs">
                  {chat.title}
                </h2>
                <span hidden={!preferences.showDiagnostics} className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {openRouterConfig.model.split('/').pop()}
                </span>
              </div>
              <p className="text-[10px] text-[#ffd6eb]/70 truncate max-w-xs">
                Playing as <strong className="text-white">{activePersona?.name}</strong> &bull; {activeLorebooks.length} Lorebooks &bull; {activePlugins.length} Plugins
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Icons: Affinity, Plugins, Scene, Story Notes, Settings */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Affinity Heart Widget */}
          <button
            onClick={() => {
              const updatedScore = Math.min(100, (chat.relationshipScore || 85) + 1);
              onUpdateChat({ ...chat, relationshipScore: updatedScore });
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#ff007f]/20 hover:bg-[#ff007f]/40 border border-[#ff66b2]/50 text-xs font-bold text-[#ffb3d9] shadow-[0_0_12px_rgba(255,0,128,0.4)] transition-all"
            title="Relationship Affinity Score (Click to boost!)"
          >
            <Heart className="w-3.5 h-3.5 fill-[#ff007f] text-[#ff007f] animate-pulse" />
            <span>{chat.relationshipScore ?? 92}%</span>
          </button>

          {/* Scene Background Button */}
          <button
            onClick={onOpenSceneGeneratorModal}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-400 transition-colors"
            title="Scene Backgrounds & Visualizer"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Story Notes Button */}
          <button
            onClick={onOpenStoryNotesModal}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-400 transition-colors"
            title="Story Notes & Memories"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Plugin Button */}
          <button
            onClick={onOpenPlugins}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#ffd6eb] transition-colors"
            title="Manage 5 Active Plugins"
          >
            <Puzzle className="w-4 h-4 text-fuchsia-400" />
          </button>

          {/* Settings / Diagnostic Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#ffd6eb] transition-colors"
            title="OpenRouter & Diagnostics"
          >
            <Settings className="w-4 h-4 text-[#ff3399]" />
          </button>
        </div>
      </header>

      {/* Scenario / Lore / Atmosphere Bar */}
      <div className="relative z-20 px-4 py-1.5 bg-[#1b0516]/85 border-b border-[#ff3399]/20 flex items-center justify-between text-[11px] text-[#ffd6eb]/80">
        <div className="truncate flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#ff66b2] shrink-0" />
          <span className="truncate">
            <strong>Scenario:</strong> {chat.scenario || 'Late night luxury penthouse encounters.'}
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-3 shrink-0 font-mono text-[10px]">
          <span className="flex items-center gap-1 text-sky-300">
            <CloudMoon className="w-3 h-3" /> {chat.weather || 'Midnight City Glow'}
          </span>
          <span className="text-white/40">&bull;</span>
          <span className="text-[#ffd6eb]">Time: {chat.timeOfDay || '1:45 AM'}</span>
        </div>
      </div>

      {/* Connection Problem Alert Banner */}
      {errorDetails && (
        <div className="relative z-20 px-4 py-3 bg-rose-950/90 border-b border-rose-500/60 text-xs text-rose-200 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-white">Problem Connecting to OpenRouter:</div>
              <p>{errorDetails.message}</p>
              {errorDetails.suggestedFix && (
                <p className="text-[11px] text-rose-300 font-semibold">{errorDetails.suggestedFix}</p>
              )}
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="shrink-0 px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-xs"
          >
            Fix in Settings
          </button>
        </div>
      )}

      {/* Notification Toast for Saved Quote */}
      {savedSuccessMsg && (
        <div className="absolute top-16 right-4 z-40 px-3.5 py-2 bg-emerald-950/95 border border-emerald-500/70 text-emerald-200 text-xs font-bold rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center space-x-2 animate-in fade-in">
          <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      {/* Clicking the message area backs out of both sides if dual track is open */}
      <div
        onClick={() => {
          if (isDualTrackOpen) setIsDualTrackOpen(false);
        }}
        className="cp-messages flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-10"
      >
        {chat.messages.map((msg) => {
          const isUser = msg.senderId === 'user';

          return (
            <div
              key={msg.id}
              className={`cp-message-row flex items-start space-x-3 max-w-3xl ${
                isUser ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <img
                src={resolveImageUrl(msg.avatar || (isUser ? '/colorpop_hero.jpg' : '/lucious.jpg'))}
                alt={msg.senderName}
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-[#ff3399]/50 shadow-md shrink-0"
              />

              {/* Message Bubble */}
              <div
                className={`cp-message-bubble relative rounded-2xl p-4 shadow-xl text-xs sm:text-sm leading-relaxed group ${
                  isUser
                    ? 'cp-bubble-user bg-gradient-to-br from-[#ff007f] to-[#ff3399] text-white rounded-tr-none shadow-[0_0_20px_rgba(255,0,128,0.4)]'
                    : 'bg-[#1b0516]/95 border border-[#ff3399]/40 text-[#ffd6eb] rounded-tl-none shadow-[0_0_20px_rgba(255,51,153,0.25)] backdrop-blur-sm'
                }`}
              >
                {/* Sender Name + Quick Save Action */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[10px] font-bold">
                  <span className={`cp-sender ${isUser ? 'text-white' : 'text-[#ff99cc]'}`}>{msg.senderName}</span>

                  <div className="flex items-center space-x-2">
                    {preferences.showTimestamps && <span className="opacity-60 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>}
                    <button disabled={loading} title="Edit message" onClick={() => { setEditingMsgId(msg.id); setEditContent(msg.content); }}><Edit2 className="w-3 h-3" /></button>
                    <button disabled={loading} title="Delete message" onClick={() => {
                      if (preferences.confirmDelete && !window.confirm("Delete this message?")) return;
                      onUpdateChat({ ...chat, messages: chat.messages.filter(m => m.id !== msg.id), updatedAt: new Date().toISOString() });
                    }}><Trash2 className="w-3 h-3" /></button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveQuote(msg);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-emerald-300 transition-opacity"
                      title="Bookmark this quote to Saved Messages"
                    >
                      <Bookmark className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                {editingMsgId === msg.id ? <div className="space-y-2">
                  <textarea aria-label="Edit message text" className="w-full text-black bg-white rounded-lg p-2" value={editContent} onChange={e => setEditContent(e.target.value)} />
                  <button disabled={!editContent.trim() || loading} onClick={() => {
                    onUpdateChat({ ...chat, messages: chat.messages.map(m => m.id === msg.id ? { ...m, content: editContent.trim() } : m), updatedAt: new Date().toISOString() });
                    setEditingMsgId(null);
                  }}>Save edit</button><button onClick={() => setEditingMsgId(null)}>Cancel</button>
                </div> : <div className="cp-message-text whitespace-pre-wrap font-sans select-text">{msg.content}</div>}
              </div>
            </div>
          );
        })}

        {loading && (
          <div
            data-testid="typing-indicator"
            className="flex items-start space-x-3 max-w-md mr-auto animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {/* Active Character Avatar with Pulsing Ring */}
            <div className="relative shrink-0">
              <img
                src={resolveImageUrl(activeCharacters[0]?.avatar || '/lucious.jpg')}
                alt={activeCharacters[0]?.name || 'Character'}
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-[#ff007f] shadow-[0_0_15px_rgba(255,0,128,0.5)] animate-pulse"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#12030f] rounded-full animate-ping" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#12030f] rounded-full" />
            </div>

            {/* Typing Indicator Bubble */}
            <div className="relative rounded-2xl rounded-tl-none p-3.5 bg-[#1b0516]/95 border border-[#ff3399]/40 text-[#ffd6eb] shadow-[0_0_20px_rgba(255,51,153,0.25)] backdrop-blur-md">
              {/* Header with Sparkles & Character Name */}
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10 text-[10px] font-bold">
                <div className="flex items-center space-x-1.5 text-[#ff99cc]">
                  <Sparkles className="w-3 h-3 text-[#ff007f] animate-spin" style={{ animationDuration: '4s' }} />
                  <span>{activeCharacters[0]?.name || 'Character'}</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-[#ffd6eb]/40 font-mono">
                  Thinking
                </span>
              </div>

              {/* Status Text & Subtle Animated Bouncing Dots */}
              <div className="flex items-center space-x-3 text-xs sm:text-sm text-[#ffd6eb]/90">
                <span className="font-medium italic tracking-wide text-white/90">
                  Character is thinking...
                </span>

                <div className="flex items-center space-x-1.5 py-1 px-1 bg-white/5 rounded-full border border-white/10">
                  <span
                    className="w-2 h-2 rounded-full bg-[#ff007f] animate-bounce shadow-[0_0_6px_#ff007f]"
                    style={{ animationDelay: '0ms', animationDuration: '900ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-[#ff3399] animate-bounce shadow-[0_0_6px_#ff3399]"
                    style={{ animationDelay: '200ms', animationDuration: '900ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-[#ffd6eb] animate-bounce shadow-[0_0_6px_#ffd6eb]"
                    style={{ animationDelay: '400ms', animationDuration: '900ms' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {commandNotice && <div role="status" className="mx-auto mb-2 rounded-xl border border-[#ff66b2]/40 bg-[#310d28]/95 px-4 py-2 text-sm text-[#ffd6eb] shadow-lg">{commandNotice}</div>}
        {diceResult && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-bounce">
            <Dices className="w-4 h-4" />
            <span>{diceResult}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="relative z-20 p-3 sm:p-4 bg-[#140410]/95 backdrop-blur-md border-t border-[#ff3399]/40">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center space-x-2">
          {/* Quick Dice Roll Action */}
          <button
            type="button"
            onClick={handleQuickDiceRoll}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-[#ffd6eb] transition-all hover:scale-105"
            title="Roll d20 Action Check"
          >
            <Dices className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Text Input */}
          <div className="relative flex-1">
            <textarea
              rows={1}
              placeholder={`Reply to ${activeCharacters.map((c) => c.name).join(' & ')} as ${
                activePersona?.name || 'yourself'
              }...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (preferences.enterToSend && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none resize-none shadow-inner"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="p-3.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white rounded-2xl shadow-[0_0_20px_rgba(255,0,128,0.7)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* DUAL TRACK SCREEN OVERLAY (Pops up and slides over from both sides) */}
      <DualTrackOverlay
        isOpen={isDualTrackOpen}
        onClose={() => setIsDualTrackOpen(false)} // Hitting X backs out of both sides
        activeChat={chat}
        chats={allChats}
        characters={characters}
        personas={personas}
        lorebooks={lorebooks}
        plugins={plugins}
        diagnostic={diagnostic}
        openRouterConfig={openRouterConfig}
        onSelectChat={(id) => {
          onSelectChat(id);
        }}
        onOpenChatScreen={() => {
          // In ChatScreen: closing track or acting out on both sides
          setIsDualTrackOpen(false);
        }}
        onOpenHome={() => {
          setIsDualTrackOpen(false);
          onBackToDashboard();
        }}
        onOpenCharacterModal={onOpenCharacterModal}
        onOpenLorebookModal={onOpenLorebookModal}
        onOpenPersonaModal={onOpenPersonaModal}
        onOpenPluginModal={onOpenPlugins}
        onOpenSettingsModal={onOpenSettings}
        onOpenStoryNotesModal={onOpenStoryNotesModal}
        onOpenSavedMessagesModal={onOpenSavedMessagesModal}
        onOpenSceneGeneratorModal={onOpenSceneGeneratorModal}
        onOpenGitHubSyncModal={onOpenGitHubSyncModal}
        onTogglePlugin={onTogglePlugin}
        onBoostAffinity={() => {
          const updatedScore = Math.min(100, (chat.relationshipScore || 85) + 1);
          onUpdateChat({ ...chat, relationshipScore: updatedScore });
        }}
      />
    </div>
  );
};


