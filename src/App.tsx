import { normalizePreferences, downloadJson, type AppPreferences } from './lib/preferences';
import './components/preferences.css';
import { testOpenRouterConnection } from './lib/openrouter';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ColorPopHeader } from './components/ColorPopHeader';
import { TopNavPill, NavTab } from './components/TopNavPill';
import { AppDrawers } from './components/AppDrawers';
import { ColorPopHero } from './components/ColorPopHero';
import { ActionCards } from './components/ActionCards';
import { CategoryPills, CategoryFilter } from './components/CategoryPills';
import { RecentChatsSection } from './components/RecentChatsSection';
import { ChatsLibraryView } from './components/ChatsLibraryView';
import { SocialMediaView } from './components/SocialMediaView';
import { ChatView } from './components/ChatView';
import { CharacterModal } from './components/CharacterModal';
import { CreateCharacterView } from './components/CreateCharacterView';
import { LorebookModal } from './components/LorebookModal';
import { PersonaModal } from './components/PersonaModal';
import { PersonaCreatorView } from './components/PersonaCreatorView';
import { PersonaLibraryView } from './components/PersonaLibraryView';
import { PerchanceView } from './components/PerchanceView';
import { PluginModal } from './components/PluginModal';
import { OpenRouterSettingsModal } from './components/OpenRouterSettingsModal';
import { StoryNotesModal } from './components/StoryNotesModal';
import { SavedMessagesModal } from './components/SavedMessagesModal';
import { SceneGeneratorModal } from './components/SceneGeneratorModal';
import { FileKeeperView } from './components/FileKeeperView';
import { GitHubSyncModal } from './components/GitHubSyncModal';
import { DualTrackOverlay } from './components/DualTrackOverlay';
import { Columns } from 'lucide-react';
import { WalletModal } from './components/WalletModal';
import { CharacterPhoneModal } from './components/CharacterPhoneModal';
import { getWalletForScope, type StoryWallet } from './lib/wallet';
import { DEFAULT_SOCIAL_WORLD, formatSocialWorldContext } from './lib/socialMedia';
import { formatPhoneStoryContext, mergePhoneSystemData } from './lib/phoneSystem';

import {
  Character,
  Lorebook,
  Persona,
  Plugin,
  Chat,
  ChatMessage,
  OpenRouterConfig,
  ConnectionDiagnostic,
  StoryMemory,
} from './types/roleplay';
import {
  loadLocalData,
  loadLocalDataAsync,
  saveLocalData,
  syncToFirebase,
  loadFromFirebase,
  mergeDefaultCharacters,
  StorageData,
} from './lib/storage';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [data, setData] = useState<StorageData>(loadLocalData);
  const dataRef = useRef(data);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const localSaveRevisionRef = useRef(0);
  const firebaseSyncRevisionRef = useRef(0);
  const firebaseSyncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [firebaseSyncMessage, setFirebaseSyncMessage] = useState('');
  const [firebaseLastSync, setFirebaseLastSync] = useState('');
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
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [walletView, setWalletView] = useState<'dashboard' | 'activity'>('dashboard');

  // Persona Page & Creator Mode
  const [isPersonaCreatorOpen, setIsPersonaCreatorOpen] = useState(false);
  const [personaToEdit, setPersonaToEdit] = useState<Persona | null>(null);

  // Dual Track Screen State (Left and Right Slide-over Panels)
  const [isDualTrackOpen, setIsDualTrackOpen] = useState(false);

  // Firebase user
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  useEffect(() => {
    if (!firebaseUser) { setFirebaseLastSync(''); return; }
    try { setFirebaseLastSync(localStorage.getItem(`plf_last_firebase_sync:${firebaseUser.uid}`) || ''); } catch { setFirebaseLastSync(''); }
  }, [firebaseUser?.uid]);


  // OpenRouter Connection Diagnostics
  const [diagnostic, setDiagnostic] = useState<ConnectionDiagnostic>({
    status: 'untested',
    lastChecked: null,
  });

  const enqueueFirebaseSync = (snapshot: StorageData): Promise<void> => {
    const revision = ++firebaseSyncRevisionRef.current;
    const operation = firebaseSyncQueueRef.current.catch(() => undefined).then(async () => {
      if (revision !== firebaseSyncRevisionRef.current) return;
      await syncToFirebase(snapshot);
      if (revision === firebaseSyncRevisionRef.current) {
        const syncedAt = new Date().toISOString();
        const userId = auth.currentUser?.uid;
        if (userId) {
          setFirebaseLastSync(syncedAt);
          try { localStorage.setItem(`plf_last_firebase_sync:${userId}`, syncedAt); } catch {}
        }
        setFirebaseSyncMessage('Firebase sync complete · ' + new Date(syncedAt).toLocaleString());
      }
    });
    firebaseSyncQueueRef.current = operation;
    return operation;
  };

  // Save immediately on-device, then serialize Firebase writes so older snapshots
  // cannot finish after and replace a newer conversation.
  const updateData = (newData: StorageData) => {
    dataRef.current = newData;
    setData(newData);
    const saveRevision = ++localSaveRevisionRef.current;

    void saveLocalData(newData).then(() => {
      if (saveRevision !== localSaveRevisionRef.current) return;
      if (newData.appPreferences?.cloudSync === false) {
        firebaseSyncRevisionRef.current += 1;
        setFirebaseSyncMessage('Chats and app data are saved on this device. Firebase sync is turned off in App Settings.');
        return;
      }
      if (!auth.currentUser) {
        setFirebaseSyncMessage('Chats and app data are saved on this device. Sign in under Settings → Firebase Cloud to back them up.');
        return;
      }
      setFirebaseSyncMessage('Saving chats and app data to Firebase…');
      void enqueueFirebaseSync(newData).catch((error) => {
        if (saveRevision === localSaveRevisionRef.current) {
          setFirebaseSyncMessage(`Firebase could not save the latest changes: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }).catch((error) => {
      if (saveRevision === localSaveRevisionRef.current) {
        setFirebaseSyncMessage(`Could not save on this device: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (auth.currentUser && newData.appPreferences?.cloudSync !== false) {
        void enqueueFirebaseSync(newData).catch((syncError) => {
          if (saveRevision === localSaveRevisionRef.current) {
            setFirebaseSyncMessage(`Device and Firebase saves failed: ${syncError instanceof Error ? syncError.message : String(syncError)}`);
          }
        });
      }
    });
  };

  // Test OpenRouter Connection
  const testOpenRouter = async (customKey?: string) => {
    const key = customKey ?? data.openRouterConfig.apiKey;
    setDiagnostic((prev) => ({ ...prev, status: 'testing' }));

    setDiagnostic(await testOpenRouterConnection(key));
  };

  // Hydrate the newest local snapshot before allowing edits. IndexedDB keeps
  // chat histories available even when imported images fill localStorage.
  useEffect(() => {
    let mounted = true;
    const hydration = loadLocalDataAsync().then((saved) => {
      if (mounted) {
        dataRef.current = saved;
        setData(saved);
        const selected = saved.chats.find((item) => item.id === saved.activeChatId) || saved.chats[0] || null;
        setActiveChat(selected);
        setStorageHydrated(true);
      }
      return saved;
    }).catch((error) => {
      console.warn('Could not hydrate saved app data:', error);
      if (mounted) {
        setFirebaseSyncMessage('Could not read the full local backup. The app is opening the available saved data.');
        setStorageHydrated(true);
      }
      return dataRef.current;
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      await hydration;
      if (!mounted) return;
      if (!user) {
        setFirebaseSyncMessage('Chats and app data are saved on this device. Sign in under Settings → Firebase Cloud to back them up.');
        return;
      }
      if (dataRef.current.appPreferences?.cloudSync === false) {
        setFirebaseSyncMessage('Firebase sync is turned off in App Settings.');
        return;
      }

      try {
        const remote = await loadFromFirebase();
        const current = dataRef.current;
        const mergeById = <T extends { id: string; updatedAt?: string }>(cloudItems: T[] | undefined, localItems: T[]): T[] => {
          const merged = new Map((cloudItems || []).map((item) => [item.id, item]));
          for (const item of localItems) {
            const cloudItem = merged.get(item.id);
            const localTime = item.updatedAt ? Date.parse(item.updatedAt) : Number.POSITIVE_INFINITY;
            const cloudTime = cloudItem?.updatedAt ? Date.parse(cloudItem.updatedAt) : Number.NEGATIVE_INFINITY;
            if (!cloudItem || localTime >= cloudTime) merged.set(item.id, item);
          }
          return [...merged.values()];
        };
        const merged: StorageData = {
          ...current,
          appPreferences: normalizePreferences({ ...(remote?.appPreferences || {}), ...current.appPreferences }),
          characters: mergeDefaultCharacters(mergeById(remote?.characters, current.characters)),
          chats: mergeById(remote?.chats, current.chats),
          lorebooks: mergeById(remote?.lorebooks, current.lorebooks),
          personas: mergeById(remote?.personas, current.personas),
          plugins: mergeById(remote?.plugins, current.plugins),
          storyMemories: mergeById(remote?.storyMemories, current.storyMemories),
          savedMessages: mergeById(remote?.savedMessages, current.savedMessages),
          wallets: mergeById(remote?.wallets, current.wallets),
          activeChatId: current.activeChatId || remote?.activeChatId,
          openRouterConfig: {
            ...(remote?.openRouterConfig || {}),
            ...current.openRouterConfig,
            apiKey: current.openRouterConfig.apiKey || remote?.openRouterConfig?.apiKey || '',
          },
          supabaseConfig: current.supabaseConfig,
          socialWorld: remote?.socialWorld || current.socialWorld,
          phoneSystem: mergePhoneSystemData(remote?.phoneSystem, current.phoneSystem),
        };
        dataRef.current = merged;
        setData(merged);
        const selected = merged.chats.find((item) => item.id === merged.activeChatId);
        if (selected) setActiveChat(selected);
        await saveLocalData(merged);
        await enqueueFirebaseSync(merged);
      } catch (error) {
        setFirebaseSyncMessage(`Firebase could not finish syncing: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    void hydration.then((saved) => {
      if (!mounted) return;
      if (saved.openRouterConfig.apiKey) {
        void testOpenRouter(saved.openRouterConfig.apiKey);
      } else {
        setDiagnostic({
          status: 'error',
          lastChecked: Date.now(),
          errorCategory: 'missing_key',
          errorMessage: 'OpenRouter API Key is not set.',
          suggestedFix: 'Click "Setup OpenRouter" or open Settings to enter your API key from openrouter.ai/keys.',
        });
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Handlers for updates
  const handleUpdateChat = (updatedChat: Chat) => {
    // Always merge against the latest persisted state. A reply may finish after
    // the user has switched conversations; it must update its own chat without
    // stealing the active screen or replacing another chat's messages.
    const currentData = dataRef.current;
    const exists = currentData.chats.some((chat) => chat.id === updatedChat.id);
    const updatedChats = exists
      ? currentData.chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat))
      : [updatedChat, ...currentData.chats];
    const selectedChatId = currentData.activeChatId || activeChat?.id || updatedChat.id;
    if (selectedChatId === updatedChat.id) setActiveChat(updatedChat);
    updateData({ ...currentData, chats: updatedChats, activeChatId: selectedChatId });
  };

  const handleSelectChat = (chatId: string) => {
    const currentData = dataRef.current;
    const chat = currentData.chats.find((item) => item.id === chatId);
    if (chat) {
      setActiveChat(chat);
      setInChatMode(true);
      updateData({ ...currentData, activeChatId: chat.id });
    }
  };

  const createChatForCharacterIds = (characterIds: string[]) => {
    const currentData = dataRef.current;
    const selectedCharacters = characterIds
      .map((id) => currentData.characters.find((character) => character.id === id))
      .filter((character): character is Character => Boolean(character));
    if (!selectedCharacters.length) return;

    const activePersona = currentData.personas.find((persona) => persona.is_default) || currentData.personas[0];
    const matchingChats = currentData.chats.filter((existing) =>
      existing.characterIds.length === selectedCharacters.length &&
      selectedCharacters.every((character) => existing.characterIds.includes(character.id))
    );
    const characterNames = selectedCharacters.map((character) => character.name);
    const baseTitle = characterNames.join(' & ');
    const title = matchingChats.length ? `${baseTitle} · Chat ${matchingChats.length + 1}` : baseTitle;
    const now = new Date().toISOString();
    const chat: Chat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      characterIds: selectedCharacters.map((character) => character.id),
      personaId: activePersona?.id || 'persona_siren',
      lorebookIds: currentData.lorebooks.slice(0, 3).map((lorebook) => lorebook.id),
      pluginIds: currentData.plugins.slice(0, 5).map((plugin) => plugin.id),
      scenario: selectedCharacters[0].scenario || 'A new story in the Pretty Little Fantasies universe.',
      bgImage: selectedCharacters[0].avatar || '/penthouse.jpg',
      relationshipScore: 88,
      replyLength: currentData.appPreferences.responseLengthTarget === 'custom' ? 'custom' : currentData.appPreferences.responseLengthTarget,
      customResponseWords: currentData.appPreferences.customResponseWords,
      replyPointOfView: currentData.appPreferences.defaultPointOfView,
      creativity: currentData.openRouterConfig.temperature,
      dialogueBalance: currentData.appPreferences.dialogueBalance,
      scenePacing: currentData.appPreferences.scenePacing,
      npcActivity: currentData.appPreferences.npcActivity,
      knowledgeBoundaries: currentData.appPreferences.knowledgeBoundaries,
      relationshipContinuity: currentData.appPreferences.relationshipContinuity,
      naturalSpeech: currentData.appPreferences.naturalSpeech,
      reduceRepetition: currentData.appPreferences.reduceRepetition,
      realisticReactions: currentData.appPreferences.realisticReactions,
      messages: [],
      openingPending: true,
      createdAt: now,
      updatedAt: now,
    };
    updateData({ ...currentData, chats: [chat, ...currentData.chats], activeChatId: chat.id });
    setActiveChat(chat);
    setInChatMode(true);
  };

  const handleStartChatWithCharacter = (char: Character) => {
    // Starting from Home always creates a fresh thread. Existing conversations
    // remain available from the Chats tab and the recent-chat cards.
    createChatForCharacterIds([char.id]);
  };

  const handleStartNewChat = () => {
    if (activeChat) createChatForCharacterIds(activeChat.characterIds);
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

  const handleSaveOpenRouterConfig = (cfg: OpenRouterConfig) => {
    updateData({ ...data, openRouterConfig: cfg });
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
  const createBackupPayload = () => {
    const { openRouterConfig, supabaseConfig, ...backup } = data;
    return { version: 1, exportedAt: new Date().toISOString(), ...backup };
  };
  const handleExportData = () => {
    downloadJson('Pretty_Little_Fantasies_Backup.json', createBackupPayload());
  };
  const handleImportBackup = (backupValue: unknown) => {
    if (!backupValue || typeof backupValue !== 'object' || Array.isArray(backupValue)) return;
    const source = backupValue as Record<string, any>;
    const current = dataRef.current;
    const restored = {
      ...current,
      ...source,
      appPreferences: normalizePreferences(source.appPreferences ?? current.appPreferences),
      openRouterConfig: current.openRouterConfig,
      supabaseConfig: current.supabaseConfig,
      characters: Array.isArray(source.characters) ? mergeDefaultCharacters(source.characters) : current.characters,
      chats: Array.isArray(source.chats) ? source.chats : current.chats,
      personas: Array.isArray(source.personas) ? source.personas : current.personas,
      lorebooks: Array.isArray(source.lorebooks) ? source.lorebooks : current.lorebooks,
      plugins: Array.isArray(source.plugins) ? source.plugins : current.plugins,
      storyMemories: Array.isArray(source.storyMemories) ? source.storyMemories : current.storyMemories,
      wallets: Array.isArray(source.wallets) ? source.wallets : current.wallets,
      savedMessages: Array.isArray(source.savedMessages) ? source.savedMessages : current.savedMessages,
      phoneSystem: source.phoneSystem ? mergePhoneSystemData(current.phoneSystem, source.phoneSystem) : current.phoneSystem,
      activeChatId: typeof source.activeChatId === 'string' ? source.activeChatId : current.activeChatId,
    };
    updateData(restored);
    const restoredActiveChat = restored.chats.find((chat: Chat) => chat.id === restored.activeChatId) || restored.chats[0] || null;
    setActiveChat(restoredActiveChat);
    setFirebaseSyncMessage('Backup restored locally. Firebase sync will save it if signed in and enabled.');
  };


  // Story Memory Handlers
  const handleSaveMemory = (memory: StoryMemory) => {
    const existing = data.storyMemories || [];
    const updated = existing.some((item) => item.id === memory.id)
      ? existing.map((item) => item.id === memory.id ? memory : item)
      : [memory, ...existing];
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

  if (!storageHydrated) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#0d020b] text-[#ffd6eb]" role="status">
        Loading your saved chats…
      </main>
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
          socialMediaContext={formatSocialWorldContext(data.socialWorld || DEFAULT_SOCIAL_WORLD)}
          phoneContext={formatPhoneStoryContext(data.phoneSystem, activeChat.id, activeChat.characterIds)}
          phoneSystem={data.phoneSystem}
          onUpdatePhoneSystem={(phoneSystem) => updateData({ ...dataRef.current, phoneSystem })}
          onOpenPhone={() => setIsPhoneOpen(true)}
          onUpdateChat={handleUpdateChat}
          onSelectChat={handleSelectChat}
          onStartNewChat={handleStartNewChat}
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
          onOpenSocialMedia={() => { setInChatMode(false); setActiveTab('social'); }}
          onOpenWallet={handleOpenWallet}
          onUpdatePreferences={handleSavePreferences}
          onTogglePlugin={handleTogglePlugin}
          onBookmarkMessage={handleBookmarkMessage}
        />

        <CharacterPhoneModal
          isOpen={isPhoneOpen}
          onClose={() => setIsPhoneOpen(false)}
          chat={activeChat}
          characters={data.characters}
          activeCharacters={data.characters.filter((character) => activeChat.characterIds.includes(character.id))}
          personaName={activeWalletPersona?.name || 'Emmy'}
          phoneSystem={data.phoneSystem}
          onChange={(phoneSystem) => updateData({ ...dataRef.current, phoneSystem })}
          wallet={activeWallet || undefined}
          onSaveWallet={handleSaveWallet}
          socialWorld={data.socialWorld || DEFAULT_SOCIAL_WORLD}
          openRouterConfig={data.openRouterConfig}
          preferences={preferences}
          persona={activeWalletPersona || null}
          lorebooks={data.lorebooks.filter((book) => activeChat.lorebookIds.includes(book.id))}
          plugins={data.plugins.filter((plugin) => activeChat.pluginIds.includes(plugin.id))}
          storyMemories={data.storyMemories.filter((memory) => memory.chatId === activeChat.id || memory.chatId === 'global')}
          socialMediaContext={formatSocialWorldContext(data.socialWorld || DEFAULT_SOCIAL_WORLD)}
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
        onImportBackup={handleImportBackup}
        backupData={createBackupPayload()}
          onSaveConfig={handleSaveOpenRouterConfig}
          diagnostic={diagnostic}
          activeChat={activeChat || undefined}
          onUpdateChat={handleUpdateChat}
          onTestConnection={testOpenRouter}
          firebaseUser={firebaseUser}
          firebaseSyncMessage={firebaseSyncMessage}
          firebaseLastSync={firebaseLastSync}
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
    <div className="cp-app-shell min-h-screen bg-[#0d020b] text-[#ffd6eb] flex flex-col font-sans selection:bg-[#ff007f]/40 relative overflow-x-hidden">
      {/* Background Neon Glow Orbs */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-[#ff007f]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-[#9b51e0]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 1. Pretty Little Fantasies header */}
      <ColorPopHeader
        diagnostic={diagnostic}
        firebaseConnected={Boolean(firebaseUser)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSearch={() => setIsCharModalOpen(true)}
        onOpenFavorites={() => setIsSavedMessagesOpen(true)}
        onOpenGitPush={() => setIsGitSyncOpen(true)}
        userAvatar={(activeChat && data.personas.find((persona) => persona.id === activeChat.personaId)?.avatar) || firebaseUser?.photoURL || '/colorpop_hero.jpg'}
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
                setInChatMode(false);
              } else if (t === 'characters' || t === 'gallery' || t === 'files') {
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

        <AppDrawers
          activeTab={activeTab}
          chats={data.chats}
          activeChat={activeChat}
          onNavigate={(tab) => {
            setActiveTab(tab);
            if (tab === 'chats') setInChatMode(false);
            else if (tab === 'characters' || tab === 'gallery' || tab === 'files') setIsCreateCharacterOpen(false);
            else if (tab === 'lorebooks') setIsLoreModalOpen(true);
            else if (tab === 'personas') { setIsPersonaCreatorOpen(false); setPersonaToEdit(null); }
          }}
          onSelectChat={handleSelectChat}
          onOpenWallet={handleOpenWallet}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenPlugins={() => setIsPluginModalOpen(true)}
          onOpenStoryNotes={() => setIsStoryNotesOpen(true)}
          onOpenSavedMessages={() => setIsSavedMessagesOpen(true)}
          onOpenScenes={() => setIsSceneGeneratorOpen(true)}
          onOpenGitHubSync={() => setIsGitSyncOpen(true)}
          onOpenSocialMedia={() => { setInChatMode(false); setActiveTab('social'); }}
        />

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
      <main key={activeTab} className="cp-page-transition flex-1 max-w-7xl w-full mx-auto pb-12 space-y-4">
        {activeTab === 'social' ? (
          <SocialMediaView
            world={data.socialWorld || DEFAULT_SOCIAL_WORLD}
            characters={data.characters}
            personas={data.personas}
            activeChat={activeChat}
            onUpdateWorld={(socialWorld) => updateData({ ...data, socialWorld })}
            onToggleChat={(enabled) => {
              if (activeChat) handleUpdateChat({ ...activeChat, socialMediaEnabled: enabled, updatedAt: new Date().toISOString() });
            }}
          />
        ) : activeTab === 'chats' ? (
          <ChatsLibraryView chats={data.chats} characters={data.characters} onOpenChat={handleSelectChat} />
        ) : activeTab === 'characters' ? (
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
        ) : activeTab === 'files' ? (
          <FileKeeperView onBack={() => setActiveTab('home')} />
        ) : activeTab === 'perchance' ? (
          <PerchanceView />
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
                setActiveTab('chats');
                setInChatMode(false);
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
                setActiveTab('chats');
                setInChatMode(false);
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
                const latestChat = [...data.chats].sort((a, b) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                )[0];
                if (latestChat) handleSelectChat(latestChat.id);
              }}
              onGenerateSceneImage={() => setIsSceneGeneratorOpen(true)}
              onOpenStoryNotes={() => setIsStoryNotesOpen(true)}
              onOpenSavedMessages={() => setIsSavedMessagesOpen(true)}
              onViewAllChats={() => {
                setActiveTab('chats');
                setInChatMode(false);
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
        onOpenWallet={handleOpenWallet}
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
        backupData={createBackupPayload()}
        onSaveConfig={handleSaveOpenRouterConfig}
        diagnostic={diagnostic}
        activeChat={activeChat || undefined}
        onUpdateChat={handleUpdateChat}
        onTestConnection={testOpenRouter}
        firebaseUser={firebaseUser}
        firebaseSyncMessage={firebaseSyncMessage}
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


