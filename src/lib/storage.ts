import { DEFAULT_PREFERENCES, normalizePreferences, type AppPreferences } from './preferences';
import { Character, Lorebook, Persona, Plugin, Chat, OpenRouterConfig, SupabaseConfig, StoryMemory } from '../types/roleplay';
import { ADDITIONAL_CHARACTER_PLACEHOLDER_AVATARS, INITIAL_CHARACTERS, INITIAL_LOREBOOKS, INITIAL_PERSONAS, INITIAL_PLUGINS, INITIAL_CHATS } from './defaultData';
import { db, auth, storage } from './firebase';
import { DEFAULT_WALLETS, type StoryWallet } from './wallet';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadString } from 'firebase/storage';
import { DEFAULT_SOCIAL_WORLD, type SocialMediaWorld } from './socialMedia';

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
  wallets: StoryWallet[];
  socialWorld?: SocialMediaWorld;
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
  siteName: 'Pretty Little Fantasies',
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

export function mergeDefaultCharacters(characters: Character[] | undefined): Character[] {
  const saved = Array.isArray(characters) ? characters : [];
  const savedIds = new Set(saved.map((character) => character.id));
  const savedNames = new Set(saved.map((character) => character.name.trim().toLocaleLowerCase()));
  const defaultsById = new Map(INITIAL_CHARACTERS.map((character) => [character.id, character]));
  const refreshedSaved = saved.map((character) => {
    const defaultCharacter = defaultsById.get(character.id);
    const previousPlaceholder = ADDITIONAL_CHARACTER_PLACEHOLDER_AVATARS[character.id];
    if (defaultCharacter && previousPlaceholder && character.avatar === previousPlaceholder) {
      return { ...character, avatar: defaultCharacter.avatar };
    }
    return character;
  });
  const missingDefaults = INITIAL_CHARACTERS.filter((character) =>
    !savedIds.has(character.id) && !savedNames.has(character.name.trim().toLocaleLowerCase())
  );
  return [...refreshedSaved, ...missingDefaults];
}

const STORAGE_META_KEY = `${STORAGE_KEY}_saved_at`;
const LOCAL_DB_NAME = 'pretty-little-fantasies-local';
const LOCAL_DB_STORE = 'snapshots';
const LOCAL_DB_KEY = 'app-data';
let localWriteQueue: Promise<void> = Promise.resolve();

interface LocalDataSnapshot {
  savedAt: number;
  data: StorageData;
}

function defaultLocalData(): StorageData {
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
    wallets: DEFAULT_WALLETS,
    socialWorld: DEFAULT_SOCIAL_WORLD,
    savedMessages: DEFAULT_SAVED_MSGS,
  };
}

function normalizeStoredData(parsed: any): StorageData {
  return {
    appPreferences: normalizePreferences(parsed.appPreferences),
    characters: mergeDefaultCharacters(parsed.characters?.length ? parsed.characters : INITIAL_CHARACTERS),
    lorebooks: parsed.lorebooks?.length ? parsed.lorebooks : INITIAL_LOREBOOKS,
    personas: parsed.personas?.length ? parsed.personas : INITIAL_PERSONAS,
    plugins: parsed.plugins?.length ? parsed.plugins : INITIAL_PLUGINS,
    chats: parsed.chats?.length ? parsed.chats : INITIAL_CHATS,
    activeChatId: parsed.activeChatId || (parsed.chats?.[0]?.id ?? INITIAL_CHATS[0]?.id),
    openRouterConfig: { ...DEFAULT_OPENROUTER_CONFIG, ...(parsed.openRouterConfig || {}) },
    supabaseConfig: { ...DEFAULT_SUPABASE_CONFIG, ...(parsed.supabaseConfig || {}) },
    storyMemories: parsed.storyMemories || DEFAULT_MEMORIES,
    wallets: Array.isArray(parsed.wallets) ? parsed.wallets : DEFAULT_WALLETS,
    socialWorld: parsed.socialWorld?.profiles ? parsed.socialWorld : DEFAULT_SOCIAL_WORLD,
    savedMessages: parsed.savedMessages || DEFAULT_SAVED_MSGS,
  };
}

function openLocalDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LOCAL_DB_STORE)) request.result.createObjectStore(LOCAL_DB_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local chat storage.'));
    request.onblocked = () => reject(new Error('Local chat storage is blocked by another tab.'));
  });
}

async function readLocalSnapshot(): Promise<LocalDataSnapshot | null> {
  const db = await openLocalDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(LOCAL_DB_STORE, 'readonly');
      const request = transaction.objectStore(LOCAL_DB_STORE).get(LOCAL_DB_KEY);
      request.onsuccess = () => resolve(request.result ? { savedAt: request.result.savedAt, data: request.result.data } : null);
      request.onerror = () => reject(request.error || new Error('Could not read local chat storage.'));
    });
  } finally {
    db.close();
  }
}

async function writeLocalSnapshot(snapshot: LocalDataSnapshot): Promise<void> {
  const db = await openLocalDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(LOCAL_DB_STORE, 'readwrite');
      transaction.objectStore(LOCAL_DB_STORE).put({ id: LOCAL_DB_KEY, ...snapshot });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Could not save local chat storage.'));
      transaction.onabort = () => reject(transaction.error || new Error('Local chat storage save was aborted.'));
    });
  } finally {
    db.close();
  }
}

export function loadLocalData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeStoredData(JSON.parse(raw));
  } catch (err) {
    console.warn('Failed to load local storage, falling back to defaults:', err);
  }
  return defaultLocalData();
}

/** Loads the newest local snapshot, using IndexedDB when localStorage is full. */
export async function loadLocalDataAsync(): Promise<StorageData> {
  let localParsed: unknown = null;
  let localSavedAt = 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localParsed = JSON.parse(raw);
    localSavedAt = Number(localStorage.getItem(STORAGE_META_KEY)) || 0;
  } catch (err) {
    console.warn('Failed to read local storage snapshot:', err);
  }

  try {
    const snapshot = await readLocalSnapshot();
    if (snapshot && snapshot.savedAt > localSavedAt) return normalizeStoredData(snapshot.data);
  } catch (err) {
    console.warn('Could not read IndexedDB snapshot:', err);
  }
  return localParsed ? normalizeStoredData(localParsed) : defaultLocalData();
}

export function saveLocalData(data: StorageData): Promise<void> {
  const savedAt = Date.now();
  let localSaved = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_META_KEY, String(savedAt));
    localSaved = true;
  } catch (err) {
    console.warn('localStorage is full or unavailable; saving app data to IndexedDB:', err);
  }

  const persist = localWriteQueue.catch(() => undefined).then(() => writeLocalSnapshot({ savedAt, data }));
  localWriteQueue = persist.catch(() => undefined);
  return persist.catch((err) => {
    if (localSaved) {
      console.warn('IndexedDB save failed; localStorage contains the saved app data:', err);
      return;
    }
    throw err;
  });
}

const embeddedImageUrlCache = new Map<string, { source: string; url: string }>();

async function storeEmbeddedImages(value: unknown, userId: string, path = 'app-data'): Promise<unknown> {
  if (typeof value === 'string' && value.startsWith('data:image/')) {
    const safePath = path.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
    const cacheKey = `${userId}/${safePath}`;
    const cached = embeddedImageUrlCache.get(cacheKey);
    if (cached?.source === value) return cached.url;
    const imageRef = storageRef(
      storage,
      `users/${userId}/app-images/${safePath}.img`
    );
    await uploadString(imageRef, value, 'data_url');
    const url = await getDownloadURL(imageRef);
    embeddedImageUrlCache.set(cacheKey, { source: value, url });
    return url;
  }
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const entry = value[index] as { id?: unknown } | null;
      const stableId = entry && typeof entry === 'object' && entry.id ? String(entry.id) : String(index);
      result.push(await storeEmbeddedImages(value[index], userId, `${path}_${stableId}`));
    }
    return result;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = await storeEmbeddedImages(child, userId, `${path}_${key}`);
    }
    return result;
  }
  return value;
}

export async function syncToFirebase(data: StorageData): Promise<void> {
  const user = auth.currentUser;
  if (!user || data.appPreferences?.cloudSync === false) return;

  try {
    // Firestore documents have a 1 MiB limit. Keep imported PNGs and other
    // embedded images in Storage and store their URLs in the user document.
    const cloudData = await storeEmbeddedImages({
      appPreferences: data.appPreferences || DEFAULT_PREFERENCES,
      characters: data.characters,
      lorebooks: data.lorebooks,
      personas: data.personas,
      plugins: data.plugins,
      chats: data.chats,
      activeChatId: data.activeChatId || '',
      storyMemories: data.storyMemories || [],
      savedMessages: data.savedMessages || [],
      wallets: data.wallets || DEFAULT_WALLETS,
      socialWorld: data.socialWorld || DEFAULT_SOCIAL_WORLD,
      openRouterConfig: data.openRouterConfig || DEFAULT_OPENROUTER_CONFIG,
      supabaseConfig: data.supabaseConfig || DEFAULT_SUPABASE_CONFIG,
      updatedAt: new Date().toISOString(),
    }, user.uid) as Record<string, unknown>;

    await setDoc(doc(db, 'users', user.uid), cloudData, { merge: true });
  } catch (err) {
    console.warn('Could not sync to Firebase Firestore:', err);
    throw err;
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
    throw err;
  }
  return null;
}

