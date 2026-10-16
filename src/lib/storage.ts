import { Character, Lorebook, Persona, Plugin, Chat, OpenRouterConfig, SupabaseConfig, StoryMemory } from '../types/roleplay';
import { INITIAL_CHARACTERS, INITIAL_LOREBOOKS, INITIAL_PERSONAS, INITIAL_PLUGINS, INITIAL_CHATS } from './defaultData';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface StorageData {
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

export const DEFAULT_PROMPTS = {
  mainSystemPrompt:
    `[ROLEPLAY INSTRUCTIONS]\nYou are participating in a rich, multi-layered, uncensored creative roleplay session. Write evocative, descriptive, and emotionally engaging prose. Capture atmospheric nuances, physical gestures, subtle eye contact, tension, sensory details, and deep psychological subtext. Never speak for {{user}} or dictate their actions.`,
  roleplayStylePrompt:
    `Write in third-person descriptive narrative style with rich sensory detail and authentic character voices. Balance inner monologue with dynamic interaction.`,
  characterBehaviorPrompt:
    `Stay strictly in character as {{char}}. Express character traits, speech habits, motivations, and emotional depth consistently.`,
  userPersonaPrompt:
    `The user is playing as {{user}}. Persona details:\n{{persona}}`,
  memoryContinuityPrompt:
    `Relevant long-term memories and world context:\n{{memory}}\n\nActive Lorebooks:\n{{lorebooks}}`,
  narratorPrompt:
    `Describe scenic atmospheric updates, environmental details, and sensory cues when appropriate.`,
  oocPrompt:
    `If Out-Of-Character communication is requested, prepend comments with [OOC: ...].`,
};

export const DEFAULT_GENERATION = {
  temperature: 0.85,
  maxTokens: 1024,
  topP: 0.95,
  frequencyPenalty: 0.2,
  presencePenalty: 0.2,
  stopSequences: [] as string[],
  streaming: true,
  contextBudget: 4096,
  responseLength: 'medium' as const,
};

export const DEFAULT_CHAT_BEHAVIOR = {
  pov: 'third_person' as const,
  formattingStyle: 'Asterisks for actions (*smiles*), quotes for speech ("Hello").',
  autoContinue: false,
  narratorEnabled: true,
  includeMemory: true,
  includeLorebook: true,
  neverSpeakForUser: true,
};

export const DEFAULT_OPENROUTER_CONFIG: OpenRouterConfig = {
  apiKey: '',
  provider: 'openrouter',
  model: 'gryphe/mythomax-l2-13b',
  fallbackModel: 'meta-llama/llama-3.3-70b-instruct',
  temperature: 0.85,
  maxTokens: 1024,
  topP: 0.95,
  frequencyPenalty: 0.2,
  presencePenalty: 0.2,
  siteUrl: 'https://ais-dev-ohlfym6cwp4w2lwha7oenj-597148229967.us-east1.run.app',
  siteName: 'ColorPop Roleplay Hub',
  prompts: DEFAULT_PROMPTS,
  generation: DEFAULT_GENERATION,
  chatBehavior: DEFAULT_CHAT_BEHAVIOR,
  diagnosticsHistory: [],
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

export function mergeOpenRouterConfig(parsedConfig?: Partial<OpenRouterConfig>): OpenRouterConfig {
  const merged = { ...DEFAULT_OPENROUTER_CONFIG, ...(parsedConfig || {}) };
  merged.prompts = { ...DEFAULT_PROMPTS, ...(parsedConfig?.prompts || {}) };
  merged.generation = { ...DEFAULT_GENERATION, ...(parsedConfig?.generation || {}) };
  merged.chatBehavior = { ...DEFAULT_CHAT_BEHAVIOR, ...(parsedConfig?.chatBehavior || {}) };
  merged.diagnosticsHistory = parsedConfig?.diagnosticsHistory || [];
  return merged;
}

export function loadLocalData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        characters: parsed.characters?.length ? parsed.characters : INITIAL_CHARACTERS,
        lorebooks: parsed.lorebooks?.length ? parsed.lorebooks : INITIAL_LOREBOOKS,
        personas: parsed.personas?.length ? parsed.personas : INITIAL_PERSONAS,
        plugins: parsed.plugins?.length ? parsed.plugins : INITIAL_PLUGINS,
        chats: parsed.chats?.length ? parsed.chats : INITIAL_CHATS,
        activeChatId: parsed.activeChatId || (parsed.chats?.[0]?.id ?? INITIAL_CHATS[0]?.id),
        openRouterConfig: mergeOpenRouterConfig(parsed.openRouterConfig),
        supabaseConfig: { ...DEFAULT_SUPABASE_CONFIG, ...(parsed.supabaseConfig || {}) },
        storyMemories: parsed.storyMemories || DEFAULT_MEMORIES,
        savedMessages: parsed.savedMessages || DEFAULT_SAVED_MSGS,
      };
    }
  } catch (err) {
    console.warn('Failed to load local storage, falling back to defaults:', err);
  }

  return {
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

export function exportSettingsJSON(config: OpenRouterConfig, includeApiKey: boolean = false): string {
  const exportPayload: Partial<OpenRouterConfig> = { ...config };
  if (!includeApiKey) {
    exportPayload.apiKey = '';
  }
  return JSON.stringify(
    {
      version: '1.0',
      type: 'colorpop_settings',
      exportedAt: new Date().toISOString(),
      config: exportPayload,
    },
    null,
    2
  );
}

export function importSettingsJSON(jsonString: string): { success: boolean; config?: OpenRouterConfig; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const targetConfig = parsed.config || parsed;
    if (!targetConfig || typeof targetConfig !== 'object') {
      return { success: false, error: 'Invalid settings file format' };
    }
    const merged = mergeOpenRouterConfig(targetConfig);
    return { success: true, config: merged };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid JSON syntax' };
  }
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
  if (!user) return;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      {
        characters: data.characters,
        lorebooks: data.lorebooks,
        personas: data.personas,
        plugins: data.plugins,
        chats: data.chats,
        activeChatId: data.activeChatId || '',
        storyMemories: data.storyMemories || [],
        savedMessages: data.savedMessages || [],
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
