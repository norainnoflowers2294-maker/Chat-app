import { describe, it, expect, mock, beforeEach, spyOn, afterEach } from 'bun:test';

// Mock dependencies before importing the module under test
mock.module('firebase/firestore', () => ({
  doc: mock(),
  getDoc: mock(),
  setDoc: mock(),
}));

mock.module('../firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

import { doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import { loadFromFirebase, loadLocalData, mergeDefaultCharacters, DEFAULT_OPENROUTER_CONFIG, DEFAULT_SUPABASE_CONFIG, DEFAULT_MEMORIES, DEFAULT_SAVED_MSGS } from '../storage';
import { ADDITIONAL_CHARACTER_PLACEHOLDER_AVATARS, INITIAL_CHARACTERS, INITIAL_LOREBOOKS, INITIAL_PERSONAS, INITIAL_PLUGINS, INITIAL_CHATS } from '../defaultData';

describe('mergeDefaultCharacters', () => {
  it('replaces only the old generated placeholder avatar with the bundled portrait', () => {
    const ryker = INITIAL_CHARACTERS.find((character) => character.id === 'char_ryker_alexander_wilhelm')!;
    const previousPlaceholder = ADDITIONAL_CHARACTER_PLACEHOLDER_AVATARS[ryker.id];
    const migrated = mergeDefaultCharacters([{ ...ryker, avatar: previousPlaceholder }]);
    expect(migrated.find((character) => character.id === ryker.id)?.avatar).toBe('/characters/ryker.svg');

    const customized = mergeDefaultCharacters([{ ...ryker, avatar: 'https://example.com/custom-ryker.png' }]);
    expect(customized.find((character) => character.id === ryker.id)?.avatar).toBe('https://example.com/custom-ryker.png');
  });
});

describe('loadLocalData', () => {
  let consoleWarnMock: any;
  const STORAGE_KEY = 'colorpop_roleplay_app_data_v2';
  let mockGetItem: ReturnType<typeof mock>;

  beforeEach(() => {
    consoleWarnMock = spyOn(console, 'warn').mockImplementation(() => {});
    mockGetItem = mock();
    globalThis.localStorage = {
      getItem: mockGetItem,
      setItem: mock(),
      removeItem: mock(),
      clear: mock(),
      length: 0,
      key: mock(),
    } as any;
  });

  afterEach(() => {
    consoleWarnMock.mockRestore();
    // @ts-ignore
    delete globalThis.localStorage;
  });

  it('should return default values if localStorage is empty', () => {
    mockGetItem.mockReturnValue(null);

    const result = loadLocalData();

    expect(mockGetItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(result.characters).toEqual(INITIAL_CHARACTERS);
    expect(result.lorebooks).toEqual(INITIAL_LOREBOOKS);
    expect(result.personas).toEqual(INITIAL_PERSONAS);
    expect(result.plugins).toEqual(INITIAL_PLUGINS);
    expect(result.chats).toEqual(INITIAL_CHATS);
    expect(result.activeChatId).toBe(INITIAL_CHATS[0]?.id);
    expect(result.openRouterConfig).toEqual(DEFAULT_OPENROUTER_CONFIG);
    expect(result.supabaseConfig).toEqual(DEFAULT_SUPABASE_CONFIG);
    expect(result.storyMemories).toEqual(DEFAULT_MEMORIES);
    expect(result.savedMessages).toEqual(DEFAULT_SAVED_MSGS);
  });

  it('should return default values and log warning if localStorage contains invalid JSON', () => {
    mockGetItem.mockReturnValue('invalid json');

    const result = loadLocalData();

    expect(mockGetItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(consoleWarnMock).toHaveBeenCalledWith(
      'Failed to load local storage, falling back to defaults:',
      expect.any(Error)
    );
    expect(result.characters).toEqual(INITIAL_CHARACTERS);
  });

  it('should fall back to default arrays if parsed JSON has empty arrays for main data', () => {
    mockGetItem.mockReturnValue(JSON.stringify({
      characters: [],
      lorebooks: [],
      personas: [],
      plugins: [],
      chats: []
    }));

    const result = loadLocalData();

    expect(result.characters).toEqual(INITIAL_CHARACTERS);
    expect(result.lorebooks).toEqual(INITIAL_LOREBOOKS);
    expect(result.personas).toEqual(INITIAL_PERSONAS);
    expect(result.plugins).toEqual(INITIAL_PLUGINS);
    expect(result.chats).toEqual(INITIAL_CHATS);
  });

  it('should return parsed data if valid JSON with custom data exists', () => {
    const customData = {
      characters: [{ id: 'char1', name: 'Custom Char' } as any],
      lorebooks: [{ id: 'lore1', name: 'Custom Lorebook' } as any],
      personas: [{ id: 'pers1', name: 'Custom Persona' } as any],
      plugins: [{ id: 'plug1', name: 'Custom Plugin' } as any],
      chats: [{ id: 'chat1', name: 'Custom Chat' } as any],
      activeChatId: 'chat1',
      openRouterConfig: { apiKey: 'test-key' },
      supabaseConfig: { url: 'test-url' },
      storyMemories: [{ id: 'mem1', title: 'Custom Memory' }],
      savedMessages: [{ id: 'msg1', content: 'Custom Message' }]
    };

    mockGetItem.mockReturnValue(JSON.stringify(customData));

    const result = loadLocalData();

    expect(result.characters).toEqual([...customData.characters, ...INITIAL_CHARACTERS] as any);
    expect(result.lorebooks).toEqual(customData.lorebooks as any);
    expect(result.personas).toEqual(customData.personas as any);
    expect(result.plugins).toEqual(customData.plugins as any);
    expect(result.chats).toEqual(customData.chats as any);
    expect(result.activeChatId).toBe('chat1');
    expect(result.openRouterConfig.apiKey).toBe('test-key');
    expect(result.supabaseConfig.url).toBe('test-url');
    expect(result.storyMemories).toEqual(customData.storyMemories as any);
    expect(result.savedMessages).toEqual(customData.savedMessages as any);
  });
});

describe('loadFromFirebase', () => {
  let consoleWarnMock: any;

  beforeEach(() => {
    // Reset mocks
    (doc as any).mockClear();
    (getDoc as any).mockClear();
    Object.defineProperty(auth, 'currentUser', { value: null, writable: true });
    consoleWarnMock = spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnMock.mockRestore();
  });

  it('should return null if user is not logged in', async () => {
    Object.defineProperty(auth, 'currentUser', { value: null, writable: true });

    const result = await loadFromFirebase();

    expect(result).toBeNull();
    expect(doc).not.toHaveBeenCalled();
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('should return data if document exists', async () => {
    Object.defineProperty(auth, 'currentUser', { value: { uid: 'test-user-id' } as any, writable: true });

    const mockDocRef = { id: 'mock-doc-ref' };
    (doc as any).mockReturnValue(mockDocRef);

    const mockData = { activeChatId: 'test-chat-id' };
    const mockSnap = {
      exists: () => true,
      data: () => mockData,
    };
    (getDoc as any).mockResolvedValue(mockSnap);

    const result = await loadFromFirebase();

    expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', 'test-user-id');
    expect(getDoc).toHaveBeenCalledWith(mockDocRef);
    expect(result).toEqual(mockData);
  });

  it('should return null if document does not exist', async () => {
    Object.defineProperty(auth, 'currentUser', { value: { uid: 'test-user-id' } as any, writable: true });

    const mockDocRef = { id: 'mock-doc-ref' };
    (doc as any).mockReturnValue(mockDocRef);

    const mockSnap = {
      exists: () => false,
      data: () => ({}),
    };
    (getDoc as any).mockResolvedValue(mockSnap);

    const result = await loadFromFirebase();

    expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', 'test-user-id');
    expect(getDoc).toHaveBeenCalledWith(mockDocRef);
    expect(result).toBeNull();
  });

  it('should return null and log warning if error occurs during fetch', async () => {
    Object.defineProperty(auth, 'currentUser', { value: { uid: 'test-user-id' } as any, writable: true });

    const mockDocRef = { id: 'mock-doc-ref' };
    (doc as any).mockReturnValue(mockDocRef);

    const mockError = new Error('Network error');
    (getDoc as any).mockRejectedValue(mockError);

    const result = await loadFromFirebase();

    expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', 'test-user-id');
    expect(getDoc).toHaveBeenCalledWith(mockDocRef);
    expect(result).toBeNull();
    expect(consoleWarnMock).toHaveBeenCalledWith('Could not load from Firebase Firestore:', mockError);
  });
});
