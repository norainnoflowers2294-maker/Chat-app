import { DEFAULT_PREFERENCES, normalizePreferences, type AppPreferences } from './preferences';
import { Character, Lorebook, Persona, Plugin, Chat, OpenRouterConfig, SupabaseConfig, StoryMemory } from '../types/roleplay';
import { INITIAL_CHARACTERS, INITIAL_LOREBOOKS, INITIAL_PERSONAS, INITIAL_PLUGINS, INITIAL_CHATS } from './defaultData';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface StorageData {
  appPreferences: AppPreferences;
  characters: Character[];
  lorebooks: Lorebook[];
  personas: Persona[];
  plugins: Plugin[];
  chats: Chat[];
  activeChatId?: string;
  openRouterConfig: OpenRouterConfig;
  supabaseConfig: SupabaseConfig;
  storyMemories: StoryMemory[];
  savedMessages: Array<{
    id: string;
    chatId: string;
    senderName: string;
    avatar?: string;
    content: string;
    timestamp: number;
  }>;
}

const STORAGE_KEY = 'colorpop_roleplay_app_data_v2';

export const DEFAULT_OPENROUTER_CONFIG: OpenRouterConfig = {
  apiKey: '',
  model: 'gryphe/mythomax-l2-13b',
  temperature: 0.85,
  maxTokens: 1024,
  topP: 0.95,
  frequencyPenalty: 0.2,
  presencePenalty: 0.2,
  siteUrl: 'https://ais-dev-ohlfym6cwp4w2lwha7oenj-597148229967.us-east1.run.app',
  siteName: 'ColorPop Roleplay Hub',
};

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: '',
  anonKey: '',
  connected: false,
};

export const DEFAULT_MEMORIES: StoryMemory[] = [
  {
    id: 'mem_1',
    chatId: 'chat_lucious',
    title: 'The Skyfall Penthouse Encounter',
    type: 'recap',
    content: 'After slipping away from the crowded ballroom gala, Lucious met you on the terrace under neon city lights.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem_2',
    chatId: 'chat_lucious',
    title: 'Lucious Devotion',
    type: 'quote',
    content: '"Arrogant? No, sweetheart. I just know what belongs to me. And right now, every second of your attention is mine."',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_SAVED_MSGS = [
  {
    id: 'saved_1',
    chatId: 'chat_lucious',
    senderName: 'Lucious',
    avatar: '/lucious.jpg',
    content: 'Took you long enough, beautiful. You thought you could tease me all evening across that crowded ballroom and just slip away into the night? Not a chance.',
    timestamp: Date.now() - 3600000,
  },
];

export function loadLocalData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        appPreferences: normalizePreferences(parsed.appPreferences),
        characters: parsed.characters?.length ? parsed.characters : INITIAL_CHARACTERS,
        lorebooks: parsed.lorebooks?.length ? parsed.lorebooks : INITIAL_LOREBOOKS,
        personas: parsed.personas?.length ? parsed.personas : INITIAL_PERSONAS,
        plugins: parsed.plugins?.length ? parsed.plugins : INITIAL_PLUGINS,
        chats: parsed.chats?.length ? parsed.chats : INITIAL_CHATS,
        activeChatId: parsed.activeChatId || (parsed.chats?.[0]?.id ?? INITIAL_CHATS[0]?.id),
        openRouterConfig: { ...DEFAULT_OPENROUTER_CONFIG, ...(parsed.openRouterConfig || {}) },
        supabaseConfig: { ...DEFAULT_SUPABASE_CONFIG, ...(parsed.supabaseConfig || {}) },
        storyMemories: parsed.storyMemories || DEFAULT_MEMORIES,
        savedMessages: parsed.savedMessages || DEFAULT_SAVED_MSGS,
      };
    }
  } catch (err) {
    console.warn('Failed to load local storage, falling back to defaults:', err);
  }

  return {
    appPreferences: { ...DEFAULT_PREFERENCES },
    characters: INITIAL_CHARACTERS,
    lorebooks: INITIAL_LOREBOOKS,
    personas: INITIAL_PERSONAS,
    plugins: INITIAL_PLUGINS,
    chats: INITIAL_CHATS,
    activeChatId: INITIAL_CHATS[0]?.id,
    openRouterConfig: DEFAULT_OPENROUTER_CONFIG,
    supabaseConfig: DEFAULT_SUPABASE_CONFIG,
    storyMemories: DEFAULT_MEMORIES,
    savedMessages: DEFAULT_SAVED_MSGS,
  };
}

export function saveLocalData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export async function syncToFirebase(data: StorageData): Promise<void> {
  const user = auth.currentUser;
  if (!user || data.appPreferences?.cloudSync === false) return;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      {
        appPreferences: data.appPreferences || DEFAULT_PREFERENCES,
        characters: data.characters,
        lorebooks: data.lorebooks,
        personas: data.personas,
        plugins: data.plugins,
        chats: data.chats,
        activeChatId: data.activeChatId || '',
        storyMemories: data.storyMemories || [],
        savedMessages: data.savedMessages || [],
        openRouterConfig: data.openRouterConfig || DEFAULT_OPENROUTER_CONFIG,
        supabaseConfig: data.supabaseConfig || DEFAULT_SUPABASE_CONFIG,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync to Firebase Firestore:', err);
  }
}

export async function loadFromFirebase(): Promise<Partial<StorageData> | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as Partial<StorageData>;
    }
  } catch (err) {
    console.warn('Could not load from Firebase Firestore:', err);
  }
  return null;
}

