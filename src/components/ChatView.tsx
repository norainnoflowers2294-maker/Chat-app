import type { AppPreferences } from '../lib/preferences';
import type { StoryMemory } from '../types/roleplay';
import { sendOpenRouterChat } from '../lib/openrouter';
import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  CornerDownLeft,
  Sparkles,
  ArrowLeft,
  Settings,
  SlidersHorizontal,
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
  Volume2,
  VolumeX,
  Copy,
  ChevronLeft,
  ChevronRight,
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
import { getSlashCommandSuggestions, parseSlashCommand, type SlashCommand } from '../lib/slashCommands';
import { DualTrackOverlay } from './DualTrackOverlay';
import { ChatSettingsPanel } from './ChatSettingsPanel';

interface ChatViewProps {
  preferences: AppPreferences;
  storyMemories: StoryMemory[];
  socialMediaContext: string;
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
  onOpenSocialMedia: () => void;
  onOpenWallet: (view: 'dashboard' | 'activity') => void;
  onStartNewChat?: () => void;
  onUpdatePreferences: (value: AppPreferences) => void;
  onTogglePlugin: (pluginId: string) => void;
  onBookmarkMessage: (msg: ChatMessage) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  preferences, storyMemories, socialMediaContext,
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
  onOpenSocialMedia,
  onOpenWallet,
  onStartNewChat,
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
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(() => {
    try { return typeof window !== 'undefined' ? window.localStorage.getItem('plf_elevenlabs_api_key') || '' : ''; } catch { return ''; }
  });
  const [elevenLabsKeyDraft, setElevenLabsKeyDraft] = useState('');
  const [customTtsVoices, setCustomTtsVoices] = useState<Array<{ voice_id: string; name: string; description?: string }>>(() => {
    try { return typeof window !== 'undefined' ? JSON.parse(window.localStorage.getItem('plf_custom_tts_voices') || '[]') : []; } catch { return []; }
  });
  const [selectedTtsVoiceId, setSelectedTtsVoiceId] = useState(() => {
    try { return typeof window !== 'undefined' ? window.localStorage.getItem('plf_selected_tts_voice') || '' : ''; } catch { return ''; }
  });
  const [isVoiceManagerOpen, setIsVoiceManagerOpen] = useState(false);
  const [voiceNameDraft, setVoiceNameDraft] = useState('');
  const [voiceDescriptionDraft, setVoiceDescriptionDraft] = useState('');
  const [voiceSampleFile, setVoiceSampleFile] = useState<File | null>(null);
  const [isImportingVoice, setIsImportingVoice] = useState(false);
  const [voiceImportError, setVoiceImportError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRequestRef = useRef(0);
  const [regeneratingMsgId, setRegeneratingMsgId] = useState<string | null>(null);
  const [commandSuggestionIndex, setCommandSuggestionIndex] = useState(0);

  // Chat navigation drawers and dual-track overlay
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [isDualTrackOpen, setIsDualTrackOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem('plf_elevenlabs_api_key', elevenLabsApiKey);
      window.localStorage.setItem('plf_custom_tts_voices', JSON.stringify(customTtsVoices));
      window.localStorage.setItem('plf_selected_tts_voice', selectedTtsVoiceId);
    } catch {}
  }, [elevenLabsApiKey, customTtsVoices, selectedTtsVoiceId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Active entities in this chat
  const activeCharacters = characters.filter((c) => chat.characterIds.includes(c.id));
  const activePersona = chat.personaId ? personas.find((p) => p.id === chat.personaId) || null : personas[0] || null;
  const activeLorebooks = lorebooks.filter((l) => chat.lorebookIds.includes(l.id)).slice(0, 3);
  const activePlugins = plugins.filter((p) => chat.pluginIds.includes(p.id)).slice(0, 5);
  const slashSuggestions = getSlashCommandSuggestions(inputText);

  const scrollToBottom = () => {
    if (preferences.autoScroll && shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: preferences.reducedMotion ? 'auto' : 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, loading, preferences.autoScroll, preferences.reducedMotion]);

  useEffect(() => {
    shouldAutoScrollRef.current = true;
    scrollToBottom();
  }, [chat.id]);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    speechRequestRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);


  const handleContinueStory = async () => {
    if (loading) return;
    setErrorDetails(null);
    setLoading(true);
    try {
      const apiMessages = buildOpenRouterMessages({
        characters: activeCharacters,
        persona: activePersona,
        lorebooks: activeLorebooks,
        plugins: activePlugins,
        chat,
        preferences,
        storyMemories,
        socialMediaContext,
      });
      apiMessages.push({
        role: 'user',
        content: 'Continue the current scene naturally from the last line. Do not repeat previous text, summarize, fade out, or decide what {{user}} says, thinks, or does.',
      });
      const replyLength = chat.replyLength || 'medium';
      const maxTokens = replyLength === 'short'
        ? Math.min(openRouterConfig.maxTokens, 512)
        : replyLength === 'long' ? Math.min(4096, Math.round(openRouterConfig.maxTokens * 1.5)) : openRouterConfig.maxTokens;
      const botReply = await sendOpenRouterChat({
        ...openRouterConfig,
        temperature: chat.creativity ?? openRouterConfig.temperature,
        maxTokens,
      }, apiMessages);
      const responder = activeCharacters[0] || { id: 'char_bot', name: 'Roleplay' };
      const replyMessage: ChatMessage = {
        id: `msg_continue_${Date.now()}`,
        senderId: responder.id,
        senderName: responder.name,
        avatar: responder.avatar,
        content: botReply,
        timestamp: Date.now(),
        swipes: [botReply],
        currentSwipeIndex: 0,
      };
      onUpdateChat({ ...chat, messages: [...chat.messages, replyMessage], updatedAt: new Date().toISOString() });
    } catch (err: any) {
      setErrorDetails({
        message: err.message || 'Could not continue the scene.',
        suggestedFix: err.suggestedFix || 'Check your OpenRouter connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const executeSlashCommand = async (command: SlashCommand) => {
    if (command.type === 'wallet') {
      onOpenWallet(command.view);
    } else if (command.type === 'ooc') {
      const enabled = command.enabled ?? !chat.oocMode;
      onUpdateChat({ ...chat, oocMode: enabled, updatedAt: new Date().toISOString() });
      setCommandNotice(enabled
        ? 'OOC mode is on. Messages will guide the scene out of character until /ic.'
        : 'OOC mode is off. Back in character.');
      setTimeout(() => setCommandNotice(null), 4000);
    } else if (command.type === 'narrator') {
      const enabled = command.enabled ?? !preferences.narratorEnabled;
      const nextPreferences = { ...preferences, narratorEnabled: enabled, ...(command.frequency ? { narratorFrequency: command.frequency } : {}) };
      onUpdatePreferences(nextPreferences);
      const detail = command.frequency ? ' Narration detail: ' + command.frequency + '.' : '';
      setCommandNotice('Narrator ' + (enabled ? 'enabled.' : 'disabled.') + detail);
      setTimeout(() => setCommandNotice(null), 3500);
    } else if (command.type === 'roll') {
      const roll = Math.floor(Math.random() * 20) + 1;
      const result = roll >= 18 ? 'Critical Success! (Natural ' + roll + ')' : roll >= 10 ? 'Success (Rolled ' + roll + ')' : 'Failure (Rolled ' + roll + ')';
      setDiceResult(result);
      setTimeout(() => setDiceResult(null), 4000);
    } else if (command.type === 'continue') {
      await handleContinueStory();
    } else if (command.type === 'rewind') {
      const lastReplyIndex = chat.messages.map((message) => message.senderId).lastIndexOf(activeCharacters[0]?.id || '');
      const fallbackIndex = chat.messages.map((message) => message.senderId).lastIndexOf('char_bot');
      const targetIndex = lastReplyIndex >= 0 ? lastReplyIndex : fallbackIndex;
      if (targetIndex < 0) {
        setCommandNotice('There is no character reply to rewind yet.');
      } else if (preferences.confirmDelete && !window.confirm('Remove the latest character reply?')) {
        return;
      } else {
        const removed = chat.messages[targetIndex];
        onUpdateChat({ ...chat, messages: chat.messages.filter((_, index) => index !== targetIndex), updatedAt: new Date().toISOString() });
        setCommandNotice(`Removed the latest reply from ${removed.senderName}.`);
      }
      setTimeout(() => setCommandNotice(null), 3000);
    } else if (command.type === 'tts') {
      if (command.action === 'stop') {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        speechRequestRef.current += 1;
        audioRef.current?.pause();
        audioRef.current = null;
        setSpeakingMessageId(null);
        setCommandNotice('Reading stopped.');
      } else {
        const latestReply = [...chat.messages].reverse().find((message) => message.senderId !== 'user');
        if (!latestReply) {
          setCommandNotice('There is no character reply to read aloud yet.');
        } else {
          handleSpeakMessage(latestReply, command.action === 'play');
          setCommandNotice(command.action === 'play' ? 'Reading the latest reply aloud.' : (speakingMessageId === latestReply.id ? 'Reading stopped.' : 'Reading the latest reply aloud.'));
        }
      }
      setTimeout(() => setCommandNotice(null), 3000);
    } else {
      setCommandNotice('Commands: /continue, /rewind, /nar, /ooc, /ic, /cash, /cashapp, /roll, /tts, /help.');
      setTimeout(() => setCommandNotice(null), 4500);
    }
  };

  const runQuickCommand = (value: string) => {
    const command = parseSlashCommand(value);
    if (!command || loading) return;
    setInputText('');
    void executeSlashCommand(command);
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    setErrorDetails(null);
    const command = parseSlashCommand(inputText.trim());
    if (command) {
      setInputText('');
      await executeSlashCommand(command);
      return;
    }

    const userText = inputText.trim();
    const assistantWasTagged = /(^|\\s)@assistant\\b/i.test(userText);
    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      senderId: 'user',
      senderName: activePersona ? activePersona.name : 'You',
      avatar: activePersona?.avatar || '/colorpop_hero.jpg',
      content: chat.oocMode ? `[OOC] ${userText}` : userText,
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
        preferences, storyMemories, socialMediaContext,
      });

      if (updatedChat.oocMode) {
        apiMessages.unshift({
          role: 'system',
          content: 'Out-of-character mode is enabled. Treat the user message marked [OOC] as meta direction or a question about the roleplay. Respond out of character, follow their direction, and do not advance the scene or write actions, thoughts, or dialogue for the user. Keep the response concise unless asked for detail.',
        });
      }

      const replyLength = updatedChat.replyLength || 'medium';
      const maxTokens = replyLength === 'short'
        ? Math.min(openRouterConfig.maxTokens, 512)
        : replyLength === 'long' ? Math.min(4096, Math.round(openRouterConfig.maxTokens * 1.5)) : openRouterConfig.maxTokens;
      if (assistantWasTagged) {
        apiMessages.unshift({
          role: 'system',
          content: 'The user explicitly tagged @assistant. Reply as the Pretty Little Fantasies in-chat assistant, a helpful out-of-character participant who can answer questions about the scene, offer ideas, and help the user steer the roleplay. Speak directly to the user, keep character actions and dialogue under the user’s control, and do not impersonate a roleplay character. Do not continue as the roleplay character in this reply.',
        });
      }
      const botReply = await sendOpenRouterChat({ ...openRouterConfig, temperature: updatedChat.creativity ?? openRouterConfig.temperature, maxTokens }, apiMessages);
      const responder = assistantWasTagged
        ? { id: 'assistant', name: 'Pretty Little Fantasies Assistant', avatar: '/colorpop_hero.jpg' }
        : activeCharacters[0] || { id: 'char_bot', name: 'Roleplay' };

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

  const handleSpeakMessage = async (msg: ChatMessage, restart = false) => {
    const usingCustomVoice = Boolean(selectedTtsVoiceId);
    if (typeof window === 'undefined' || (!usingCustomVoice && (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined'))) {
      setCommandNotice('Text-to-speech is not available in this browser.');
      setTimeout(() => setCommandNotice(null), 3000);
      return;
    }
    if (speakingMessageId === msg.id && !restart) {
      speechRequestRef.current += 1;
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
      audioRef.current = null;
      setSpeakingMessageId(null);
      return;
    }
    speechRequestRef.current += 1;
    const requestId = speechRequestRef.current;
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    audioRef.current = null;

    if (usingCustomVoice) {
      if (!elevenLabsApiKey.trim()) {
        setVoiceImportError('Save your ElevenLabs API key in Voice Settings first.');
        setIsVoiceManagerOpen(true);
        return;
      }
      setSpeakingMessageId(msg.id);
      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(selectedTtsVoiceId)}?output_format=mp3_44100_128`, {
          method: 'POST',
          headers: { 'xi-api-key': elevenLabsApiKey.trim(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: msg.content, model_id: 'eleven_multilingual_v2' }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.detail?.message || payload?.detail || `ElevenLabs returned HTTP ${response.status}.`);
        }
        const audioUrl = URL.createObjectURL(await response.blob());
        if (requestId !== speechRequestRef.current) {
          URL.revokeObjectURL(audioUrl);
          return;
        }
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        const cleanup = () => {
          URL.revokeObjectURL(audioUrl);
          if (audioRef.current === audio) audioRef.current = null;
          setSpeakingMessageId(null);
        };
        audio.onended = cleanup;
        audio.onerror = cleanup;
        await audio.play();
      } catch (error: any) {
        if (requestId === speechRequestRef.current) {
          setSpeakingMessageId(null);
          setCommandNotice(error.message || 'Could not generate speech with the selected voice.');
          setTimeout(() => setCommandNotice(null), 4500);
        }
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(msg.content);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(msg.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleImportVoiceSample = async () => {
    setVoiceImportError(null);
    if (!elevenLabsApiKey.trim()) {
      setVoiceImportError('Add and save your ElevenLabs API key first.');
      return;
    }
    if (!voiceNameDraft.trim() || !voiceSampleFile) {
      setVoiceImportError('Enter a voice name and choose an audio sample.');
      return;
    }
    setIsImportingVoice(true);
    try {
      const body = new FormData();
      body.append('name', voiceNameDraft.trim());
      body.append('files[]', voiceSampleFile, voiceSampleFile.name);
      if (voiceDescriptionDraft.trim()) body.append('description', voiceDescriptionDraft.trim());
      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: { 'xi-api-key': elevenLabsApiKey.trim() },
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.voice_id) {
        throw new Error(payload?.detail?.message || payload?.detail || `Voice import failed (HTTP ${response.status}).`);
      }
      const voice = { voice_id: payload.voice_id as string, name: voiceNameDraft.trim(), description: voiceDescriptionDraft.trim() };
      setCustomTtsVoices((voices) => [...voices.filter((item) => item.voice_id !== voice.voice_id), voice]);
      setSelectedTtsVoiceId(voice.voice_id);
      setVoiceNameDraft('');
      setVoiceDescriptionDraft('');
      setVoiceSampleFile(null);
      setVoiceImportError(null);
    } catch (error: any) {
      setVoiceImportError(error.message || 'Could not import this voice sample.');
    } finally {
      setIsImportingVoice(false);
    }
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable.');
      await navigator.clipboard.writeText(msg.content);
      setCommandNotice('Message copied.');
    } catch {
      setCommandNotice('Could not copy this message on this device.');
    }
    setTimeout(() => setCommandNotice(null), 2500);
  };

  const handleChangeSwipe = (msg: ChatMessage, direction: -1 | 1) => {
    const versions = msg.swipes?.length ? msg.swipes : [msg.content];
    const currentIndex = Math.min(msg.currentSwipeIndex ?? versions.length - 1, versions.length - 1);
    const nextIndex = (currentIndex + direction + versions.length) % versions.length;
    onUpdateChat({
      ...chat,
      messages: chat.messages.map((message) => message.id === msg.id
        ? { ...message, content: versions[nextIndex], currentSwipeIndex: nextIndex }
        : message),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRegenerateMessage = async (msg: ChatMessage) => {
    if (loading) return;
    const messageIndex = chat.messages.findIndex((message) => message.id === msg.id);
    if (messageIndex < 0) return;

    setErrorDetails(null);
    setLoading(true);
    setRegeneratingMsgId(msg.id);
    try {
      const contextChat = { ...chat, messages: chat.messages.slice(0, messageIndex) };
      const apiMessages = buildOpenRouterMessages({
        characters: activeCharacters,
        persona: activePersona,
        lorebooks: activeLorebooks,
        plugins: activePlugins,
        chat: contextChat,
        preferences,
        storyMemories,
        socialMediaContext,
      });
      const replyLength = chat.replyLength || 'medium';
      const maxTokens = replyLength === 'short'
        ? Math.min(openRouterConfig.maxTokens, 512)
        : replyLength === 'long' ? Math.min(4096, Math.round(openRouterConfig.maxTokens * 1.5)) : openRouterConfig.maxTokens;
      const replacement = await sendOpenRouterChat({
        ...openRouterConfig,
        temperature: chat.creativity ?? openRouterConfig.temperature,
        maxTokens,
      }, apiMessages);

      const versions = msg.swipes?.length ? [...msg.swipes] : [msg.content];
      const activeIndex = Math.min(msg.currentSwipeIndex ?? versions.length - 1, versions.length - 1);
      if (versions[activeIndex] !== msg.content) versions.push(msg.content);
      versions.push(replacement);
      const nextIndex = versions.length - 1;
      onUpdateChat({
        ...chat,
        messages: chat.messages.map((message) => message.id === msg.id
          ? { ...message, content: replacement, swipes: versions, currentSwipeIndex: nextIndex, timestamp: Date.now() }
          : message),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setErrorDetails({
        message: err.message || 'Could not regenerate this character reply.',
        suggestedFix: err.suggestedFix || 'Check your OpenRouter connection and try again.',
      });
    } finally {
      setLoading(false);
      setRegeneratingMsgId(null);
    }
  };

  return (
    <div data-compact={preferences.compactMode} data-bubble-motion={preferences.messageAnimations && !preferences.reducedMotion} className="cp-chat cp-page-transition relative w-full h-[100dvh] max-h-[100dvh] flex flex-col bg-[#0d020b] text-[#ffd6eb] overflow-hidden select-none">
      {/* Background Ambience with chat.bgImage */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none filter blur-sm transition-all duration-700"
        style={{ backgroundImage: `url(${resolveImageUrl(chat.bgImage || '/penthouse.jpg')})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d020b]/95 via-[#0d020b]/80 to-[#0d020b]/95 pointer-events-none" />

      {/* Top Chat Bar */}
      <header className="relative px-3 sm:px-5 py-2.5 bg-[#140410]/95 backdrop-blur-md border-b border-[#ff3399]/40 flex items-center justify-between z-30 shadow-[0_0_25px_rgba(255,0,128,0.3)]">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            type="button"
            aria-label="Open chat navigation drawer"
            aria-expanded={isLeftDrawerOpen}
            onClick={() => { setIsDualTrackOpen(false); setIsRightDrawerOpen(false); setIsLeftDrawerOpen(true); }}
            className="p-2 rounded-xl bg-white/10 hover:bg-[#ff007f] text-white transition-all"
            title="Open chats and navigation"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Open chat tools drawer"
            aria-expanded={isRightDrawerOpen}
            onClick={() => { setIsDualTrackOpen(false); setIsLeftDrawerOpen(false); setIsRightDrawerOpen(true); }}
            className="p-2 rounded-xl bg-white/10 hover:bg-[#ff007f] text-white transition-all"
            title="Open character and chat tools"
          >
            <PanelRight className="w-4 h-4" />
          </button>

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
                Playing as <select aria-label="Choose persona for this chat" value={chat.personaId || activePersona?.id || ''} onChange={(e) => onUpdateChat({ ...chat, personaId: e.target.value, updatedAt: new Date().toISOString() })} className="max-w-[130px] bg-[#1e0818] border border-[#ff66b2]/50 rounded-md px-1 py-0.5 text-white focus:outline-none focus:border-[#ff007f]">{personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.display_name || persona.name}</option>)}</select> &bull; {activeLorebooks.length} Lorebooks &bull; {activePlugins.length} Plugins
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Icons: Affinity, Plugins, Scene, Story Notes, Settings */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            type="button"
            onClick={() => onStartNewChat?.()}
            aria-label="Start another chat with these characters"
            title="Start another chat with these characters"
            className="p-2 rounded-xl bg-[#ff007f]/20 hover:bg-[#ff007f]/40 border border-[#ff66b2]/50 text-[#ffd6eb] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

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

          <button type="button" onClick={() => setIsChatSettingsOpen(true)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-pink-200 transition-colors" title="Chat reply settings" aria-label="Chat reply settings">
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Settings / Diagnostic Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#ffd6eb] transition-colors"
            title="OpenRouter & Diagnostics"
          >
            <Settings className="w-4 h-4 text-[#ff3399]" />
          </button>
          <img
            key={activePersona?.id || 'persona-default'}
            src={resolveImageUrl(activePersona?.avatar || '/colorpop_hero.jpg')}
            alt={activePersona?.display_name || activePersona?.name || 'Selected persona'}
            title={`Playing as ${activePersona?.display_name || activePersona?.name || 'your persona'}`}
            className="ml-1 h-8 w-8 shrink-0 rounded-full border-2 border-[#ff66b2] object-cover shadow-[0_0_12px_rgba(255,0,128,0.4)]"
          />
        </div>
      </header>

      {isChatSettingsOpen && <ChatSettingsPanel chat={chat} characters={characters} personas={personas} onClose={() => setIsChatSettingsOpen(false)} onSave={(updatedChat) => { onUpdateChat(updatedChat); setIsChatSettingsOpen(false); }} />}

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
        ref={messagesViewportRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          shouldAutoScrollRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
        }}
        onClick={() => {
          if (isDualTrackOpen) setIsDualTrackOpen(false);
        }}
        className="cp-messages flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-10"
      >
        {chat.messages.map((msg) => {
          const isUser = msg.senderId === 'user';
          const messageCharacter = characters.find((character) => character.id === msg.senderId);
          const messageAvatar = messageCharacter?.avatar || msg.avatar || (isUser ? activePersona?.avatar : undefined) || (isUser ? '/colorpop_hero.jpg' : '/lucious.jpg');
          const messageName = messageCharacter?.name || msg.senderName;

          return (
            <div
              key={msg.id}
              className={`cp-message-row flex items-start space-x-3 max-w-3xl ${
                isUser ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <img
                src={resolveImageUrl(messageAvatar)}
                alt={messageName}
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
                  <span className={`cp-sender ${isUser ? 'text-white' : 'text-[#ff99cc]'}`}>{messageName}</span>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {preferences.showTimestamps && <span className="opacity-60 font-mono mr-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>}
                    {!isUser && (msg.swipes?.length || 0) > 1 && <>
                      <button type="button" disabled={loading} aria-label="Previous reply" title="Previous reply" onClick={(e) => { e.stopPropagation(); handleChangeSwipe(msg, -1); }} className="p-1 rounded hover:bg-white/10 disabled:opacity-40"><ChevronLeft className="w-3 h-3" /></button>
                      <span className="text-[9px] opacity-70 tabular-nums">{(msg.currentSwipeIndex ?? msg.swipes!.length - 1) + 1}/{msg.swipes!.length}</span>
                      <button type="button" disabled={loading} aria-label="Next reply" title="Next reply" onClick={(e) => { e.stopPropagation(); handleChangeSwipe(msg, 1); }} className="p-1 rounded hover:bg-white/10 disabled:opacity-40"><ChevronRight className="w-3 h-3" /></button>
                    </>}
                    <button type="button" disabled={loading} aria-label={speakingMessageId === msg.id ? "Stop reading message" : "Read message aloud"} title={speakingMessageId === msg.id ? "Stop reading" : "Read aloud"} onClick={(e) => { e.stopPropagation(); handleSpeakMessage(msg); }} className="p-1 rounded hover:bg-white/10 disabled:opacity-40">{speakingMessageId === msg.id ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}</button>
                    <button type="button" aria-label="Copy message" title="Copy message" onClick={(e) => { e.stopPropagation(); void handleCopyMessage(msg); }} className="p-1 rounded hover:bg-white/10"><Copy className="w-3 h-3" /></button>
                    {!isUser && <button type="button" disabled={loading} aria-label="Regenerate character reply" title="Regenerate reply" onClick={(e) => { e.stopPropagation(); void handleRegenerateMessage(msg); }} className="p-1 rounded hover:bg-white/10 disabled:opacity-40">{regeneratingMsgId === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}</button>}
                    <button type="button" disabled={loading} aria-label="Edit message" title="Edit message" onClick={(e) => { e.stopPropagation(); setEditingMsgId(msg.id); setEditContent(msg.content); }} className="p-1 rounded hover:bg-white/10 disabled:opacity-40"><Edit2 className="w-3 h-3" /></button>
                    <button type="button" disabled={loading} aria-label="Delete message" title="Delete message" onClick={(e) => {
                      e.stopPropagation();
                      if (preferences.confirmDelete && !window.confirm("Delete this message?")) return;
                      onUpdateChat({ ...chat, messages: chat.messages.filter(m => m.id !== msg.id), updatedAt: new Date().toISOString() });
                    }} className="p-1 rounded hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-40"><Trash2 className="w-3 h-3" /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleSaveQuote(msg); }} className="p-1 rounded hover:bg-emerald-500/20 hover:text-emerald-300" title="Bookmark this quote to Saved Messages" aria-label="Save message"><Bookmark className="w-3 h-3" /></button>
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
        <div className="max-w-4xl mx-auto mb-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-[#ffd6eb]/50">Quick</span>
          {[
            ['Continue', '/continue'],
            ['Rewind', '/rewind'],
            ['Narrator', '/nar'],
            ['Wallet', '/cash'],
            ['Cash App', '/cashapp'],
            ['Roll', '/roll'],
            ['Read Aloud', '/tts'],
          ].map(([label, command]) => (
            <button key={command} type="button" disabled={loading} onClick={() => runQuickCommand(command)} className="shrink-0 rounded-full border border-[#ff66b2]/30 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-[#ffd6eb] hover:border-[#ff66b2]/70 hover:bg-[#ff007f]/20 disabled:opacity-40">
              {label}
            </button>
          ))}
        </div>
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
            {slashSuggestions.length > 0 && <div role="listbox" aria-label="Slash commands" className="absolute bottom-full left-0 right-0 z-40 mb-2 max-h-56 overflow-y-auto rounded-2xl border border-[#ff66b2]/40 bg-[#170411]/98 p-1.5 shadow-[0_0_24px_rgba(255,0,128,0.25)]">
              {slashSuggestions.map((suggestion, index) => (
                <button key={suggestion.name} type="button" role="option" aria-selected={index === commandSuggestionIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => { setInputText(suggestion.usage + ' '); setCommandSuggestionIndex(index); }} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs ${index === commandSuggestionIndex ? 'bg-[#ff007f]/25 text-white' : 'text-[#ffd6eb]/80 hover:bg-white/5'}`}>
                  <span className="font-mono font-bold">{suggestion.usage}</span>
                  <span className="truncate text-right text-[10px] opacity-70">{suggestion.description}</span>
                </button>
              ))}
            </div>}
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={`Reply to ${activeCharacters.map((c) => c.name).join(' & ')} as ${
                activePersona?.name || 'yourself'
              }... Type / for commands, @assistant to summon help`}
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); setCommandSuggestionIndex(0); }}
              onKeyDown={(e) => {
                if (slashSuggestions.length > 0 && e.key === 'ArrowDown') {
                  e.preventDefault();
                  setCommandSuggestionIndex((index) => (index + 1) % slashSuggestions.length);
                  return;
                }
                if (slashSuggestions.length > 0 && e.key === 'ArrowUp') {
                  e.preventDefault();
                  setCommandSuggestionIndex((index) => (index - 1 + slashSuggestions.length) % slashSuggestions.length);
                  return;
                }
                if (preferences.enterToSend && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  if (slashSuggestions.length > 0 && inputText.trim() !== slashSuggestions[commandSuggestionIndex]?.usage) {
                    e.preventDefault();
                    setInputText(slashSuggestions[commandSuggestionIndex].usage + ' ');
                    return;
                  }
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none resize-none shadow-inner"
            />
          </div>

          {/* Insert a line break without sending */}
          <button
            type="button"
            onClick={() => {
              const textarea = inputRef.current;
              if (!textarea) {
                setInputText((current) => `${current}\n`);
                return;
              }
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const nextText = `${inputText.slice(0, start)}\n${inputText.slice(end)}`;
              setInputText(nextText);
              requestAnimationFrame(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 1, start + 1);
              });
            }}
            aria-label="Insert new line"
            title="Insert new line"
            className="p-3.5 bg-white/10 hover:bg-white/20 text-[#ffd6eb] rounded-2xl border border-[#ff3399]/40 transition-all hover:scale-105"
          >
            <CornerDownLeft className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            aria-label="Send message"
            title="Send message"
            className="p-3.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white rounded-2xl shadow-[0_0_20px_rgba(255,0,128,0.7)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {isVoiceManagerOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setIsVoiceManagerOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Custom text-to-speech voices" onClick={(event) => event.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#ff66b2]/50 bg-[#140410] p-5 text-white shadow-[0_0_35px_rgba(255,0,128,0.35)]">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="text-lg font-bold">Custom TTS Voices</h2><p className="text-xs text-[#ffd6eb]/65">Import a voice sample and use its clone for Read Aloud.</p></div>
              <button type="button" aria-label="Close voice settings" onClick={() => setIsVoiceManagerOpen(false)} className="rounded-xl bg-white/10 p-2"><X className="h-4 w-4" /></button>
            </div>
            <label className="mb-1 block text-xs font-semibold">ElevenLabs API key</label>
            <input type="password" autoComplete="off" value={elevenLabsKeyDraft} onChange={(event) => setElevenLabsKeyDraft(event.target.value)} placeholder="Paste your API key" className="mb-2 w-full rounded-xl border border-[#ff66b2]/35 bg-[#1e0818] p-3 text-sm text-white placeholder:text-white/35" />
            <button type="button" onClick={() => { setElevenLabsApiKey(elevenLabsKeyDraft.trim()); setVoiceImportError(null); }} className="mb-4 rounded-xl border border-[#ff66b2]/40 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Save key on this device</button>
            <p className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-[#ffd6eb]/75">
              Your key and voice list are stored in this browser. Voice samples are sent to ElevenLabs to create the clone, and Read Aloud sends message text there to generate audio. Usage may consume account credits. Only upload a voice you own or have permission to use; create a restricted API key with a usage limit when available.
            </p>
            <div className="space-y-3 rounded-xl border border-[#ff66b2]/25 bg-white/5 p-3">
              <label className="block text-xs font-semibold">Name for this voice</label>
              <input value={voiceNameDraft} onChange={(event) => setVoiceNameDraft(event.target.value)} placeholder="e.g. Lucious" className="w-full rounded-xl border border-[#ff66b2]/35 bg-[#1e0818] p-3 text-sm text-white placeholder:text-white/35" />
              <label className="block text-xs font-semibold">Voice sample</label>
              <input type="file" accept="audio/*" onChange={(event) => setVoiceSampleFile(event.target.files?.[0] || null)} className="block w-full text-xs text-[#ffd6eb] file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff007f]/30 file:px-3 file:py-2 file:text-white" />
              {voiceSampleFile && <p className="truncate text-[10px] text-[#ffd6eb]/60">Selected: {voiceSampleFile.name}</p>}
              <label className="block text-xs font-semibold">Optional description</label>
              <input value={voiceDescriptionDraft} onChange={(event) => setVoiceDescriptionDraft(event.target.value)} placeholder="Accent or voice notes" className="w-full rounded-xl border border-[#ff66b2]/35 bg-[#1e0818] p-3 text-sm text-white placeholder:text-white/35" />
              {voiceImportError && <p role="alert" className="rounded-lg bg-rose-950/70 p-2 text-xs text-rose-200">{voiceImportError}</p>}
              <button type="button" disabled={isImportingVoice || !elevenLabsApiKey.trim()} onClick={handleImportVoiceSample} className="w-full rounded-xl bg-gradient-to-r from-[#ff007f] to-[#ff3399] p-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{isImportingVoice ? 'Importing voice…' : 'Upload sample and create voice'}</button>
            </div>
            {customTtsVoices.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#ff99cc]">Imported voices</h3>
                {customTtsVoices.map((voice) => (
                  <div key={voice.voice_id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3">
                    <button type="button" onClick={() => setSelectedTtsVoiceId(voice.voice_id)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold">{voice.name}</span><span className="text-[10px] text-[#ffd6eb]/55">{selectedTtsVoiceId === voice.voice_id ? 'Selected for Read Aloud' : 'Tap to select'}</span></button>
                    <button type="button" onClick={() => { setCustomTtsVoices((voices) => voices.filter((item) => item.voice_id !== voice.voice_id)); if (selectedTtsVoiceId === voice.voice_id) setSelectedTtsVoiceId(''); }} className="rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/80 hover:bg-rose-900/60">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {(isLeftDrawerOpen || isRightDrawerOpen) && (
        <div
          className="fixed inset-0 z-[70]"
          onClick={() => { setIsLeftDrawerOpen(false); setIsRightDrawerOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Chat navigation drawer"
            onClick={(event) => event.stopPropagation()}
            className={`absolute inset-y-0 left-0 flex w-[min(88vw,22rem)] flex-col border-r border-[#ff66b2]/60 bg-[#140410] shadow-[10px_0_40px_rgba(255,0,128,0.35)] transition-transform duration-300 ${isLeftDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="flex items-center justify-between border-b border-[#ff3399]/30 p-4">
              <div>
                <h2 className="text-base font-bold text-white">Chats &amp; Navigation</h2>
                <p className="text-[11px] text-[#ffd6eb]/65">Open a chat or go to a library</p>
              </div>
              <button type="button" aria-label="Close navigation drawer" onClick={() => setIsLeftDrawerOpen(false)} className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 border-b border-[#ff3399]/25 p-3">
              <button type="button" onClick={() => { setIsLeftDrawerOpen(false); onBackToDashboard(); }} className="w-full rounded-xl bg-[#ff007f]/20 p-3 text-left text-sm font-semibold text-white hover:bg-[#ff007f]/35">Home</button>
              <button type="button" onClick={() => { setIsLeftDrawerOpen(false); onOpenCharacterModal(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Character Library</button>
              <button type="button" onClick={() => { setIsLeftDrawerOpen(false); onOpenPersonaModal(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Persona Library</button>
              <button type="button" onClick={() => { setIsLeftDrawerOpen(false); onOpenLorebookModal(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Lorebooks</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-[#ff99cc]">Your chats</h3>
              <div className="space-y-1.5">
                {allChats.length ? allChats.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={item.id === chat.id ? 'page' : undefined}
                    onClick={() => { setIsLeftDrawerOpen(false); onSelectChat(item.id); }}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${item.id === chat.id ? 'border-[#ff66b2]/70 bg-[#ff007f]/20' : 'border-transparent bg-white/5 hover:bg-white/10'}`}
                  >
                    <span className="block truncate text-sm font-semibold text-white">{item.title || 'Untitled chat'}</span>
                    <span className="mt-1 block truncate text-[10px] text-[#ffd6eb]/60">{item.messages[item.messages.length - 1]?.content || 'No messages yet'}</span>
                  </button>
                )) : <p className="rounded-xl bg-white/5 p-3 text-xs text-[#ffd6eb]/65">Your chats will appear here.</p>}
              </div>
            </div>
          </aside>

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Chat tools drawer"
            onClick={(event) => event.stopPropagation()}
            className={`absolute inset-y-0 right-0 flex w-[min(88vw,22rem)] flex-col border-l border-[#ff66b2]/60 bg-[#140410] shadow-[-10px_0_40px_rgba(255,0,128,0.35)] transition-transform duration-300 ${isRightDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="flex items-center justify-between border-b border-[#ff3399]/30 p-4">
              <div>
                <h2 className="text-base font-bold text-white">Chat Tools</h2>
                <p className="text-[11px] text-[#ffd6eb]/65">Characters, settings, and extras</p>
              </div>
              <button type="button" aria-label="Close tools drawer" onClick={() => setIsRightDrawerOpen(false)} className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
              <section className="rounded-xl border border-[#ff66b2]/30 bg-white/5 p-3">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ff99cc]">Social Media world</h3>
                <p className="mb-2 text-[11px] leading-relaxed text-[#ffd6eb]/65">This world stays separate unless you turn it on for this chat.</p>
                <button type="button" aria-pressed={Boolean(chat.socialMediaEnabled)} onClick={() => onUpdateChat({ ...chat, socialMediaEnabled: !chat.socialMediaEnabled, updatedAt: new Date().toISOString() })} className={`w-full rounded-lg p-2 text-xs font-semibold ${chat.socialMediaEnabled ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white hover:bg-white/15'}`}>{chat.socialMediaEnabled ? 'Social context on for this chat' : 'Turn on for this chat'}</button>
                <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenSocialMedia(); }} className="mt-2 w-full rounded-lg bg-[#ff007f]/20 p-2 text-left text-xs font-semibold text-white hover:bg-[#ff007f]/35">Open Social Media world</button>
              </section>
              <section className="rounded-xl border border-[#ff66b2]/30 bg-white/5 p-3">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ff99cc]">Text-to-speech voice</h3>
                <select aria-label="Select text-to-speech voice" value={selectedTtsVoiceId} onChange={(event) => setSelectedTtsVoiceId(event.target.value)} className="w-full rounded-lg border border-[#ff66b2]/40 bg-[#1e0818] p-2 text-sm text-white">
                  <option value="">Use device voice</option>
                  {customTtsVoices.map((voice) => <option key={voice.voice_id} value={voice.voice_id}>{voice.name}</option>)}
                </select>
                <button type="button" onClick={() => { setIsRightDrawerOpen(false); setElevenLabsKeyDraft(elevenLabsApiKey); setVoiceImportError(null); setIsVoiceManagerOpen(true); }} className="mt-2 w-full rounded-lg bg-[#ff007f]/20 p-2 text-left text-xs font-semibold text-white hover:bg-[#ff007f]/35">Import or manage custom voices</button>
              </section>
              <section className="rounded-xl border border-[#ff66b2]/30 bg-white/5 p-3">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ff99cc]">Playing as</h3>
                <select aria-label="Choose persona for this chat" value={chat.personaId || activePersona?.id || ''} onChange={(event) => onUpdateChat({ ...chat, personaId: event.target.value, updatedAt: new Date().toISOString() })} className="w-full rounded-lg border border-[#ff66b2]/40 bg-[#1e0818] p-2 text-sm text-white">
                  {personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.display_name || persona.name}</option>)}
                </select>
                <div className="mt-3 space-y-2">
                  {activeCharacters.map((character) => (
                    <div key={character.id} className="flex items-center gap-2 rounded-lg bg-black/20 p-2">
                      <img src={resolveImageUrl(character.avatar)} alt="" className="h-9 w-9 rounded-full border border-[#ff66b2]/50 object-cover" />
                      <span className="truncate text-xs font-semibold text-white">{character.name}</span>
                    </div>
                  ))}
                  {!activeCharacters.length && <p className="text-xs text-[#ffd6eb]/60">No character selected.</p>}
                </div>
              </section>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); setIsChatSettingsOpen(true); }} className="w-full rounded-xl border border-[#ff66b2]/30 bg-[#ff007f]/15 p-3 text-left text-sm font-semibold text-white hover:bg-[#ff007f]/25">Chat reply settings</button>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenCharacterModal(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Character Library</button>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenPersonaModal(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Persona Library</button>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenLorebookModal(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Lorebooks</button>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenPlugins(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Plugins</button>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenStoryNotesModal(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Story Notes &amp; Memories</button>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenSavedMessagesModal(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Saved Messages</button>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenSceneGeneratorModal(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Scene Backgrounds</button>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenSettings(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Connection &amp; Diagnostics</button>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenWallet('dashboard'); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">Wallet</button>
              <button type="button" onClick={() => { setIsRightDrawerOpen(false); onOpenGitHubSyncModal(); }} className="w-full rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10">GitHub Sync</button>
            </div>
          </aside>
        </div>
      )}

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
        onOpenWallet={onOpenWallet}
        onTogglePlugin={onTogglePlugin}
        onBoostAffinity={() => {
          const updatedScore = Math.min(100, (chat.relationshipScore || 85) + 1);
          onUpdateChat({ ...chat, relationshipScore: updatedScore });
        }}
      />
    </div>
  );
};


