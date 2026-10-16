import { normalizePreferences, downloadJson, type AppPreferences } from './lib/preferences';
import './components/preferences.css';
import { testOpenRouterConnection } from './lib/openrouter';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ColorPopHeader } from './components/ColorPopHeader';
import { TopNavPill, NavTab } from './components/TopNavPill';
import { ColorPopHero } from './components/ColorPopHero';
import { ActionCards } from './components/ActionCards';
import { CategoryPills, CategoryFilter } from './components/CategoryPills';
import { RecentChatsSection } from './components/RecentChatsSection';
import { ChatView } from './components/ChatView';
import { CharacterModal } from './components/CharacterModal';
import { CreateCharacterView } from './components/CreateCharacterView';
import { LorebookModal } from './components/LorebookModal';
import { PersonaModal } from './components/PersonaModal';
import { PersonaCreatorView } from './components/PersonaCreatorView';
import { PersonaLibraryView } from './components/PersonaLibraryView';
import { PluginModal } from './components/PluginModal';
import { OpenRouterSettingsModal } from './components/OpenRouterSettingsModal';
import { StoryNotesModal } from './components/StoryNotesModal';
import { SavedMessagesModal } from './components/SavedMessagesModal';
import { SceneGeneratorModal } from './components/SceneGeneratorModal';
import { GitHubSyncModal } from './components/GitHubSyncModal';
import { DualTrackOverlay } from './components/DualTrackOverlay';
import { Columns } from 'lucide-react';
import { WalletModal } from './components/WalletModal';
import { getWalletForScope, type StoryWallet } from './lib/wallet';

import {
  Character,
  Lorebook,
  Persona,
  Plugin,
  Chat,
  ChatMessage,
  OpenRouterConfig,
  ConnectionDiagnostic,
  SupabaseConfig,
  StoryMemory,
} from './types/roleplay';
import {
  loadLocalData,
  saveLocalData,
  syncToFirebase,
  loadFromFirebase,
  StorageData,
} from './lib/storage';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [data, setData] = useState<StorageData>(loadLocalData);
  const preferences = normalizePreferences(data.appPreferences);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.cpTheme = preferences.theme;
    root.dataset.cpMotion = preferences.reducedMotion ? 'reduce' : 'normal';
    root.style.setProperty('--cp-accent', preferences.accent);
    root.style.setProperty('--cp-chat-size', `${preferences.fontSize}px`);
    root.style.setProperty('--cp-heading-font', preferences.headerFont === 'serif' ? 'Georgia, serif' : preferences.headerFont === 'mono' ? 'ui-monospace, monospace' : 'system-ui, sans-serif');
  }, [preferences.theme, preferences.accent, preferences.fontSize, preferences.headerFont, preferences.reducedMotion]);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [homeImage, setHomeImage] = useState<string>(() => {
    try { return localStorage.getItem('colorpop_home_picture_v1') || '/colorpop_hero.jpg'; } catch { return '/colorpop_hero.jpg'; }
  });
  const handleSetHomeImage = (image: string) => {
    setHomeImage(image);
    try { localStorage.setItem('colorpop_home_picture_v1', image); } catch { window.alert('Could not save the home picture in this browser.'); }
  };
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [inChatMode, setInChatMode] = useState(false);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Dedicated Create Character Page State
  const [isCreateCharacterOpen, setIsCreateCharacterOpen] = useState(false);
  const [characterToEdit, setCharacterToEdit] = useState<Character | null>(null);

  // Modals
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [isLoreModalOpen, setIsLoreModalOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStoryNotesOpen, setIsStoryNotesOpen] = useState(false);
  const [isSavedMessagesOpen, setIsSavedMessagesOpen] = useState(false);
  const [isSceneGeneratorOpen, setIsSceneGeneratorOpen] = useState(false);
  const [isGitSyncOpen, setIsGitSyncOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [walletView, setWalletView] = useState<'dashboard' | 'activity'>('dashboard');

  // Persona Page & Creator Mode
  const [isPersonaCreatorOpen, setIsPersonaCreatorOpen] = useState(false);
  const [personaToEdit, setPersonaToEdit] = useState<Persona | null>(null);

  // Dual Track Screen State (Left and Right Slide-over Panels)
  const [isDualTrackOpen, setIsDualTrackOpen] = useState(false);

  // Firebase user
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // OpenRouter Connection Diagnostics
  const [diagnostic, setDiagnostic] = useState<ConnectionDiagnostic>({
    status: 'untested',
    lastChecked: null,
  });

  // Sync state on change
  const updateData = (newData: StorageData) => {
    setData(newData);
    saveLocalData(newData);
    syncToFirebase(newData);
  };

  // Test OpenRouter Connection
  const testOpenRouter = async (customKey?: string) => {
    const key = customKey ?? data.openRouterConfig.apiKey;
    setDiagnostic((prev) => ({ ...prev, status: 'testing' }));

    setDiagnostic(await testOpenRouterConnection(key));
  };

  // Initialize
  useEffect(() => {
    // Check initial active chat
    if (data.activeChatId) {
      const found = data.chats.find((c) => c.id === data.activeChatId);
      if (found) setActiveChat(found);
    } else if (data.chats.length > 0) {
      setActiveChat(data.chats[0]);
    }

    // Auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u && data.appPreferences?.cloudSync !== false) {
        const remote = await loadFromFirebase();
        if (remote) {
          setData((prev) => ({
            ...prev,
            appPreferences: normalizePreferences(remote.appPreferences || prev.appPreferences),
            characters: remote.characters || prev.characters,
            chats: remote.chats || prev.chats,
            lorebooks: remote.lorebooks || prev.lorebooks,
            personas: remote.personas || prev.personas,
            storyMemories: remote.storyMemories || prev.storyMemories,
            savedMessages: remote.savedMessages || prev.savedMessages,
            openRouterConfig: remote.openRouterConfig || prev.openRouterConfig,
            supabaseConfig: remote.supabaseConfig || prev.supabaseConfig,
            wallets: remote.wallets || prev.wallets,
          }));
        }
      }
    });

    // Test OpenRouter if key exists
    if (data.openRouterConfig.apiKey) {
      testOpenRouter(data.openRouterConfig.apiKey);
    } else {
      setDiagnostic({
        status: 'error',
        lastChecked: Date.now(),
        errorCategory: 'missing_key',
        errorMessage: 'OpenRouter API Key is not set.',
        suggestedFix: 'Click "Setup OpenRouter" or open Settings to enter your API key from openrouter.ai/keys.',
      });
    }

    return () => unsubscribe();
  }, []);

  // Handlers for updates
  const handleUpdateChat = (updatedChat: Chat) => {
    const updatedChats = data.chats.map((c) => (c.id === updatedChat.id ? updatedChat : c));
    setActiveChat(updatedChat);
    updateData({ ...data, chats: updatedChats, activeChatId: updatedChat.id });
  };

  const handleSelectChat = (chatId: string) => {
    const chat = data.chats.find((c) => c.id === chatId);
    if (chat) {
      setActiveChat(chat);
      setInChatMode(true);
      updateData({ ...data, activeChatId: chat.id });
    }
  };

  const handleStartChatWithCharacter = (char: Character) => {
    let chat = data.chats.find((c) => c.characterIds.includes(char.id));
    if (!chat) {
      const activePersona = data.personas.find((p) => p.is_default) || data.personas[0];
      chat = {
        id: `chat_${Date.now()}`,
        title: char.name,
        characterIds: [char.id],
        personaId: activePersona?.id || 'persona_siren',
        lorebookIds: data.lorebooks.slice(0, 3).map((l) => l.id),
        pluginIds: data.plugins.slice(0, 5).map((p) => p.id),
        scenario: char.scenario || 'Late night encounters in the ColorPop universe.',
        bgImage: char.avatar || '/penthouse.jpg',
        relationshipScore: 88,
        messages: [
          {
            id: `msg_first_${Date.now()}`,
            senderId: char.id,
            senderName: char.name,
            avatar: char.avatar,
            content: char.first_mes,
            timestamp: Date.now(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateData({ ...data, chats: [chat, ...data.chats], activeChatId: chat.id });
    }
    setActiveChat(chat);
    setInChatMode(true);
  };

  const handleSaveCharacter = (char: Character) => {
    const exists = data.characters.find((c) => c.id === char.id);
    const updated = exists
      ? data.characters.map((c) => (c.id === char.id ? char : c))
      : [char, ...data.characters];
    updateData({ ...data, characters: updated });
  };

  const handleSaveLorebook = (lore: Lorebook) => {
    const exists = data.lorebooks.find((l) => l.id === lore.id);
    const updated = exists
      ? data.lorebooks.map((l) => (l.id === lore.id ? lore : l))
      : [lore, ...data.lorebooks];
    updateData({ ...data, lorebooks: updated });
  };

  const handleSavePersona = (persona: Persona) => {
    const exists = data.personas.find((p) => p.id === persona.id);
    let updated: Persona[];
    if (exists) {
      updated = data.personas.map((p) => (p.id === persona.id ? persona : p));
    } else {
      updated = [persona, ...data.personas];
    }
    // If this persona is marked default, set all others to false
    if (persona.is_default) {
      updated = updated.map((p) => ({ ...p, is_default: p.id === persona.id }));
    }
    updateData({ ...data, personas: updated });
  };

  const handleDeletePersona = (personaId: string) => {
    const updated = data.personas.filter((p) => p.id !== personaId);
    const hasDefault = updated.some((p) => p.is_default);
    const ensured = updated.map((p, idx) => ({
      ...p,
      is_default: hasDefault ? p.is_default : idx === 0,
    }));
    updateData({ ...data, personas: ensured });
  };

  const handleSelectDefaultPersona = (pId: string) => {
    const updated = data.personas.map((p) => ({ ...p, is_default: p.id === pId }));
    updateData({ ...data, personas: updated });
    try {
      localStorage.setItem('colorpop_default_persona', pId);
    } catch (e) {}
  };

  const handleStartChatWithPersona = (persona: Persona) => {
    handleSelectDefaultPersona(persona.id);
    if (activeChat) {
      setInChatMode(true);
    } else if (data.chats.length > 0) {
      setActiveChat(data.chats[0]);
      setInChatMode(true);
    }
  };

  const handleTogglePlugin = (pluginId: string) => {
    const updated = data.plugins.map((p) => (p.id === pluginId ? { ...p, enabled: !p.enabled } : p));
    updateData({ ...data, plugins: updated });
  };

  const handleSaveOpenRouterConfig = (cfg: OpenRouterConfig, supabaseCfg?: SupabaseConfig) => {
    updateData({ ...data, openRouterConfig: cfg, supabaseConfig: supabaseCfg ?? data.supabaseConfig });
    testOpenRouter(cfg.apiKey);
  };

  const handleSavePreferences = (value: AppPreferences) => {
    updateData({ ...data, appPreferences: normalizePreferences(value) });
  };
  const handleOpenWallet = (view: 'dashboard' | 'activity') => {
    if (!activeChat) return;
    const persona = data.personas.find((item) => item.id === activeChat.personaId) || data.personas[0];
    const wallet = getWalletForScope(data.wallets, activeChat.id, persona?.id || 'persona_default');
    if (!data.wallets.some((item) => item.id === wallet.id)) updateData({ ...data, wallets: [...data.wallets, wallet] });
    setWalletView(view);
    setIsWalletOpen(true);
  };
  const handleSaveWallet = (wallet: StoryWallet) => {
    const wallets = data.wallets.some((item) => item.id === wallet.id)
      ? data.wallets.map((item) => item.id === wallet.id ? wallet : item)
      : [...data.wallets, wallet];
    updateData({ ...data, wallets });
  };
  const handleExportData = () => {
    const { openRouterConfig, supabaseConfig, ...backup } = data;
    downloadJson('ColorPop_Backup.json', { version: 1, exportedAt: new Date().toISOString(), ...backup });
  };

  const handleSaveSupabaseConfig = (cfg: SupabaseConfig) => {
    updateData({ ...data, supabaseConfig: cfg });
  };

  // Story Memory Handlers
  const handleSaveMemory = (memory: StoryMemory) => {
    const updated = [memory, ...(data.storyMemories || [])];
    updateData({ ...data, storyMemories: updated });
  };

  const handleDeleteMemory = (id: string) => {
    const updated = (data.storyMemories || []).filter((m) => m.id !== id);
    updateData({ ...data, storyMemories: updated });
  };

  // Saved Messages Bookmarks Handlers
  const handleBookmarkMessage = (msg: ChatMessage) => {
    const newSaved = {
      id: `saved_${Date.now()}`,
      chatId: activeChat?.id || 'chat_general',
      senderName: msg.senderName,
      avatar: msg.avatar,
      content: msg.content,
      timestamp: msg.timestamp || Date.now(),
    };
    const updated = [newSaved, ...(data.savedMessages || [])];
    updateData({ ...data, savedMessages: updated });
  };

  const handleRemoveSavedMessage = (id: string) => {
    const updated = (data.savedMessages || []).filter((s) => s.id !== id);
    updateData({ ...data, savedMessages: updated });
  };

  // Scene Background Handlers
  const handleApplySceneBackground = (chatId: string, bgUrl: string) => {
    const updatedChats = data.chats.map((c) => (c.id === chatId ? { ...c, bgImage: bgUrl } : c));
    if (activeChat && activeChat.id === chatId) {
      setActiveChat({ ...activeChat, bgImage: bgUrl });
    }
    updateData({ ...data, chats: updatedChats });
  };

  const handleOpenCreateCharacterPage = (charToEdit?: Character | null) => {
    setCharacterToEdit(charToEdit || null);
    setIsCreateCharacterOpen(true);
  };

  const activeWalletPersona = activeChat ? (data.personas.find((item) => item.id === activeChat.personaId) || data.personas[0]) : undefined;
  const activeWallet = activeChat && activeWalletPersona ? getWalletForScope(data.wallets, activeChat.id, activeWalletPersona.id) : null;
  const walletSenderName = activeChat ? (data.characters.find((item) => activeChat.characterIds.includes(item.id))?.name || 'Story character') : 'Story character';

  // 1. Dedicated Full-Page Create Character View
  if (isCreateCharacterOpen) {
    return (
      <CreateCharacterView
        existingCharacter={characterToEdit}
        existingCharactersList={data.characters}
        onSaveCharacter={(savedChar) => {
          handleSaveCharacter(savedChar);
        }}
        onBack={() => {
          setIsCreateCharacterOpen(false);
          setCharacterToEdit(null);
        }}
        onStartChat={(char) => {
          setIsCreateCharacterOpen(false);
          setCharacterToEdit(null);
          handleStartChatWithCharacter(char);
        }}
        onOpenLibrary={() => {
          setIsCreateCharacterOpen(false);
          setCharacterToEdit(null);
          setActiveTab('characters');
        }}
        onOpenPersonaLibrary={() => {
          setIsCreateCharacterOpen(false);
          setCharacterToEdit(null);
          setActiveTab('personas');
          setIsPersonaCreatorOpen(false);
        }}
        onOpenLorebookLibrary={() => {
          setIsCreateCharacterOpen(false);
          setCharacterToEdit(null);
          setIsLoreModalOpen(true);
        }}
        onOpenGallery={() => {
          setIsCreateCharacterOpen(false);
          setCharacterToEdit(null);
          setActiveTab('gallery');
        }}
        onOpenHome={() => {
          setIsCreateCharacterOpen(false);
          setCharacterToEdit(null);
          setActiveTab('home');
        }}
      />
    );
  }

  // 2. Full-scale Roleplay Chat View
  if (inChatMode && activeChat) {
    return (
      <>
        <ChatView
          chat={activeChat}
          allChats={data.chats}
          characters={data.characters}
          personas={data.personas}
          lorebooks={data.lorebooks}
          plugins={data.plugins}
          openRouterConfig={data.openRouterConfig}
          diagnostic={diagnostic}
          preferences={preferences}
          storyMemories={data.storyMemories}
          onUpdateChat={handleUpdateChat}
          onSelectChat={handleSelectChat}
          onBackToDashboard={() => setInChatMode(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenPlugins={() => setIsPluginModalOpen(true)}
          onOpenCharacterModal={() => setIsCharModalOpen(true)}
          onOpenLorebookModal={() => setIsLoreModalOpen(true)}
          onOpenPersonaModal={() => setIsPersonaModalOpen(true)}
          onOpenStoryNotesModal={() => setIsStoryNotesOpen(true)}
          onOpenSavedMessagesModal={() => setIsSavedMessagesOpen(true)}
          onOpenSceneGeneratorModal={() => setIsSceneGeneratorOpen(true)}
          onOpenGitHubSyncModal={() => setIsGitSyncOpen(true)}
          onOpenWallet={handleOpenWallet}
          onUpdatePreferences={handleSavePreferences}
          onTogglePlugin={handleTogglePlugin}
          onBookmarkMessage={handleBookmarkMessage}
        />

        {/* Global Modals (Accessible from Chat View) */}
        <CharacterModal
          isOpen={isCharModalOpen}
          onClose={() => setIsCharModalOpen(false)}
          characters={data.characters}
          onSaveCharacter={handleSaveCharacter}
          onStartChatWithCharacter={handleStartChatWithCharacter}
          onOpenCreateCharacter={handleOpenCreateCharacterPage}
        />
        <LorebookModal
          isOpen={isLoreModalOpen}
          onClose={() => setIsLoreModalOpen(false)}
          lorebooks={data.lorebooks}
          onSaveLorebook={handleSaveLorebook}
        />
        <PersonaModal
          isOpen={isPersonaModalOpen}
          onClose={() => setIsPersonaModalOpen(false)}
          personas={data.personas}
          onSavePersona={handleSavePersona}
          onSelectDefaultPersona={(pId) => {
            const updated = data.personas.map((p) => ({ ...p, is_default: p.id === pId }));
            updateData({ ...data, personas: updated });
          }}
        />
        <PluginModal
          isOpen={isPluginModalOpen}
          onClose={() => setIsPluginModalOpen(false)}
          plugins={data.plugins}
          onTogglePlugin={handleTogglePlugin}
          onSavePlugin={(p) => updateData({ ...data, plugins: [...data.plugins, p] })}
        />
        <OpenRouterSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={data.openRouterConfig}
        preferences={preferences}
        onSavePreferences={handleSavePreferences}
        onExportData={handleExportData}
          onSaveConfig={handleSaveOpenRouterConfig}
          diagnostic={diagnostic}
          onTestConnection={testOpenRouter}
          supabaseConfig={data.supabaseConfig}
          onSaveSupabaseConfig={handleSaveSupabaseConfig}
          firebaseUser={firebaseUser}
        />
        <StoryNotesModal
          isOpen={isStoryNotesOpen}
          onClose={() => setIsStoryNotesOpen(false)}
          memories={data.storyMemories || []}
          chats={data.chats}
          activeChatId={activeChat?.id}
          onSaveMemory={handleSaveMemory}
          onDeleteMemory={handleDeleteMemory}
          onOpenChat={handleSelectChat}
        />
        <SavedMessagesModal
          isOpen={isSavedMessagesOpen}
          onClose={() => setIsSavedMessagesOpen(false)}
          savedMessages={data.savedMessages || []}
          chats={data.chats}
          onRemoveSavedMessage={handleRemoveSavedMessage}
          onOpenChat={handleSelectChat}
        />
        <SceneGeneratorModal
          isOpen={isSceneGeneratorOpen}
          onClose={() => setIsSceneGeneratorOpen(false)}
          chats={data.chats}
          activeChatId={activeChat?.id}
          onApplySceneBackground={handleApplySceneBackground}
        />
        <GitHubSyncModal isOpen={isGitSyncOpen} onClose={() => setIsGitSyncOpen(false)} />
        {activeWallet && activeWalletPersona && <WalletModal
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
          view={walletView}
          onChangeView={setWalletView}
          wallet={activeWallet}
          personaName={activeWalletPersona.name}
          characterName={walletSenderName}
          onSaveWallet={handleSaveWallet}
        />}
      </>
    );
  }

  // Dashboard View (Faithfully matching the uploaded image + Dual Track System)
  return (
    <div className="min-h-screen bg-[#0d020b] text-[#ffd6eb] flex flex-col font-sans selection:bg-[#ff007f]/40 relative overflow-x-hidden">
      {/* Background Neon Glow Orbs */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-[#ff007f]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-[#9b51e0]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 1. Header (ColorPop with Diamonds & Crown) */}
      <ColorPopHeader
        diagnostic={diagnostic}
        firebaseConnected={Boolean(firebaseUser)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSearch={() => setIsCharModalOpen(true)}
        onOpenFavorites={() => setIsSavedMessagesOpen(true)}
        onOpenGitPush={() => setIsGitSyncOpen(true)}
        userAvatar={firebaseUser?.photoURL || '/colorpop_hero.jpg'}
        userName={firebaseUser?.displayName || 'The Muse'}
      />

      {/* 2. Top Navigation Pill with Dual Track Trigger */}
      <div className="w-full max-w-4xl mx-auto px-4 flex items-center justify-between gap-2">
        <div className="flex-1">
          <TopNavPill
            activeTab={activeTab}
            onChangeTab={(t) => {
              setActiveTab(t);
              if (t === 'chats') {
                if (activeChat) setInChatMode(true);
              } else if (t === 'characters' || t === 'gallery') {
                setIsCreateCharacterOpen(false);
              } else if (t === 'lorebooks') {
                setIsLoreModalOpen(true);
              } else if (t === 'personas') {
                setIsPersonaCreatorOpen(false);
                setPersonaToEdit(null);
              }
            }}
            onOpenMoreMenu={() => setIsSettingsOpen(true)}
          />
        </div>

        {/* Prominent Track Screen Button on Dashboard */}
        <button
          onClick={() => setIsDualTrackOpen(true)}
          className="shrink-0 px-3.5 py-2 rounded-full bg-gradient-to-r from-[#ff007f]/30 to-[#9b51e0]/30 hover:from-[#ff007f]/50 hover:to-[#9b51e0]/50 border border-[#ff3399]/60 text-white font-bold text-xs shadow-[0_0_15px_rgba(255,0,128,0.4)] flex items-center space-x-1.5 transition-all hover:scale-105"
          title="Open Dual Track Screen (Slide-over panels on left and right)"
        >
          <Columns className="w-4 h-4 text-[#ff99cc]" />
          <span className="hidden sm:inline">Track Screen</span>
        </button>
      </div>

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto pb-12 space-y-4">
        {activeTab === 'characters' ? (
          <CharacterModal
            isOpen={true}
            fullPage
            onClose={() => setActiveTab('home')}
            characters={data.characters}
            onSaveCharacter={handleSaveCharacter}
            onStartChatWithCharacter={handleStartChatWithCharacter}
            onOpenCreateCharacter={(character) => handleOpenCreateCharacterPage(character)}
          />
        ) : activeTab === 'gallery' ? (
          <SceneGeneratorModal
            isOpen={true}
            fullPage
            homeImage={homeImage}
            onSetHomeImage={(image) => { handleSetHomeImage(image); setActiveTab('home'); }}
            onClose={() => setActiveTab('home')}
            chats={data.chats}
            activeChatId={activeChat?.id}
            onApplySceneBackground={handleApplySceneBackground}
          />
        ) : activeTab === 'personas' ? (
          isPersonaCreatorOpen ? (
            <PersonaCreatorView
              initialPersona={personaToEdit}
              onSavePersona={(persona) => {
                handleSavePersona(persona);
                setIsPersonaCreatorOpen(false);
                setPersonaToEdit(null);
              }}
              onCancel={() => {
                setIsPersonaCreatorOpen(false);
                setPersonaToEdit(null);
              }}
              onSelectDefaultPersona={handleSelectDefaultPersona}
            />
          ) : (
            <PersonaLibraryView
              personas={data.personas}
              onOpenCreator={(p) => {
                setPersonaToEdit(p || null);
                setIsPersonaCreatorOpen(true);
              }}
              onSavePersona={handleSavePersona}
              onDeletePersona={handleDeletePersona}
              onSelectDefaultPersona={handleSelectDefaultPersona}
              onStartChatWithPersona={handleStartChatWithPersona}
            />
          )
        ) : (
          <>
            {/* 3. Luxury Hero Banner + Quick Links 12-Jewel Grid */}
            <ColorPopHero
              heroImage={homeImage}
              onOpenGallery={() => setActiveTab('gallery')}
              onQuickAction={(id) => {
                if (id === 'characters') setActiveTab('characters');
                else if (id === 'lorebooks') setIsLoreModalOpen(true);
                else if (id === 'plugins') setIsPluginModalOpen(true);
                else if (id === 'settings') setIsSettingsOpen(true);
                else if (id === 'gallery') setActiveTab('gallery');
                else if (id === 'templates' || id === 'loreberry') handleOpenCreateCharacterPage(null);
              }}
              onOpenCharacterModal={() => handleOpenCreateCharacterPage(null)}
              onOpenLorebookModal={() => setIsLoreModalOpen(true)}
              onOpenPersonaModal={() => {
                setActiveTab('personas');
                setIsPersonaCreatorOpen(false);
                setPersonaToEdit(null);
              }}
              onOpenChats={() => {
                if (activeChat) setInChatMode(true);
              }}
              onOpenPlugins={() => setIsPluginModalOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* 4. Glowing 4 Action Cards */}
            <ActionCards
              onCreateCharacter={() => handleOpenCreateCharacterPage(null)}
              onCreateLorebook={() => setIsLoreModalOpen(true)}
              onCreatePersona={() => {
                setActiveTab('personas');
                setIsPersonaCreatorOpen(true);
                setPersonaToEdit(null);
              }}
              onOpenMyChats={() => {
                if (activeChat) setInChatMode(true);
              }}
            />

            {/* 5. 10 Circular Category Pills */}
            <CategoryPills
              activeCategory={activeCategory}
              onSelectCategory={(cat) => {
                setActiveCategory(cat);
                if (cat === 'characters') setActiveTab('characters');
                if (cat === 'personas') {
                  setActiveTab('personas');
                  setIsPersonaCreatorOpen(false);
                  setPersonaToEdit(null);
                }
                if (cat === 'lorebooks' || cat === 'locations') setIsLoreModalOpen(true);
                if (cat === 'plugins') setIsPluginModalOpen(true);
                if (cat === 'images') setActiveTab('gallery');
                if (cat === 'favorites') setIsSavedMessagesOpen(true);
                if (cat === 'recent') {
                  if (activeChat) setInChatMode(true);
                }
                if (cat === 'wardrobe') setIsStoryNotesOpen(true);
              }}
            />

            {/* 6. Recent Chats Carousel & Continue Sidebar */}
            <RecentChatsSection
              chats={data.chats}
              onSelectChat={handleSelectChat}
              onContinueLastChat={() => {
                if (activeChat) setInChatMode(true);
              }}
              onGenerateSceneImage={() => setIsSceneGeneratorOpen(true)}
              onOpenStoryNotes={() => setIsStoryNotesOpen(true)}
              onOpenSavedMessages={() => setIsSavedMessagesOpen(true)}
              onViewAllChats={() => {
                if (activeChat) setInChatMode(true);
              }}
            />
          </>
        )}
      </main>

      {/* DUAL TRACK SCREEN OVERLAY (Pops up and slides over from both sides) */}
      <DualTrackOverlay
        isOpen={isDualTrackOpen}
        onClose={() => setIsDualTrackOpen(false)} // Hitting X backs out of both sides
        activeChat={activeChat}
        chats={data.chats}
        characters={data.characters}
        personas={data.personas}
        lorebooks={data.lorebooks}
        plugins={data.plugins}
        diagnostic={diagnostic}
        openRouterConfig={data.openRouterConfig}
        onSelectChat={handleSelectChat}
        onOpenChatScreen={() => {
          setIsDualTrackOpen(false);
          if (activeChat) setInChatMode(true);
        }}
        onOpenHome={() => setIsDualTrackOpen(false)}
        onOpenCharacterModal={() => {
          setIsDualTrackOpen(false);
          handleOpenCreateCharacterPage(null);
        }}
        onOpenLorebookModal={() => setIsLoreModalOpen(true)}
        onOpenPersonaModal={() => {
          setIsDualTrackOpen(false);
          setActiveTab('personas');
          setIsPersonaCreatorOpen(false);
          setPersonaToEdit(null);
        }}
        onOpenPluginModal={() => setIsPluginModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onOpenStoryNotesModal={() => setIsStoryNotesOpen(true)}
        onOpenSavedMessagesModal={() => setIsSavedMessagesOpen(true)}
        onOpenSceneGeneratorModal={() => setIsSceneGeneratorOpen(true)}
        onOpenGitHubSyncModal={() => setIsGitSyncOpen(true)}
        onTogglePlugin={handleTogglePlugin}
        onBoostAffinity={() => {
          if (activeChat) {
            const updatedScore = Math.min(100, (activeChat.relationshipScore || 85) + 1);
            handleUpdateChat({ ...activeChat, relationshipScore: updatedScore });
          }
        }}
      />

      {/* All Modal Screens Fully Connected */}
      <CharacterModal
        isOpen={isCharModalOpen}
        onClose={() => setIsCharModalOpen(false)}
        characters={data.characters}
        onSaveCharacter={handleSaveCharacter}
        onStartChatWithCharacter={handleStartChatWithCharacter}
        onOpenCreateCharacter={handleOpenCreateCharacterPage}
      />

      <LorebookModal
        isOpen={isLoreModalOpen}
        onClose={() => setIsLoreModalOpen(false)}
        lorebooks={data.lorebooks}
        onSaveLorebook={handleSaveLorebook}
      />

      <PersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        personas={data.personas}
        onSavePersona={handleSavePersona}
        onSelectDefaultPersona={(pId) => {
          const updated = data.personas.map((p) => ({ ...p, is_default: p.id === pId }));
          updateData({ ...data, personas: updated });
        }}
      />

      <PluginModal
        isOpen={isPluginModalOpen}
        onClose={() => setIsPluginModalOpen(false)}
        plugins={data.plugins}
        onTogglePlugin={handleTogglePlugin}
        onSavePlugin={(p) => updateData({ ...data, plugins: [...data.plugins, p] })}
      />

      <OpenRouterSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={data.openRouterConfig}
        preferences={preferences}
        onSavePreferences={handleSavePreferences}
        onExportData={handleExportData}
        onSaveConfig={handleSaveOpenRouterConfig}
        diagnostic={diagnostic}
        onTestConnection={testOpenRouter}
        supabaseConfig={data.supabaseConfig}
        onSaveSupabaseConfig={handleSaveSupabaseConfig}
        firebaseUser={firebaseUser}
      />

      <StoryNotesModal
        isOpen={isStoryNotesOpen}
        onClose={() => setIsStoryNotesOpen(false)}
        memories={data.storyMemories || []}
        chats={data.chats}
        activeChatId={activeChat?.id}
        onSaveMemory={handleSaveMemory}
        onDeleteMemory={handleDeleteMemory}
        onOpenChat={handleSelectChat}
      />

      <SavedMessagesModal
        isOpen={isSavedMessagesOpen}
        onClose={() => setIsSavedMessagesOpen(false)}
        savedMessages={data.savedMessages || []}
        chats={data.chats}
        onRemoveSavedMessage={handleRemoveSavedMessage}
        onOpenChat={handleSelectChat}
      />

      <SceneGeneratorModal
        isOpen={isSceneGeneratorOpen}
        onClose={() => setIsSceneGeneratorOpen(false)}
        chats={data.chats}
        activeChatId={activeChat?.id}
        onApplySceneBackground={handleApplySceneBackground}
      />

      <GitHubSyncModal isOpen={isGitSyncOpen} onClose={() => setIsGitSyncOpen(false)} />
    </div>
  );
}


