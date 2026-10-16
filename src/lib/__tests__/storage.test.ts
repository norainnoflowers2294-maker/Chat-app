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
import { loadFromFirebase } from '../storage';

describe('loadFromFirebase', () => {
  let consoleWarnMock: any;

  beforeEach(() => {
    // Reset mocks
    (doc as any).mockClear();
    (getDoc as any).mockClear();
    // @ts-expect-error
    auth.currentUser = null;
    consoleWarnMock = spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnMock.mockRestore();
  });

  it('should return null if user is not logged in', async () => {
    // @ts-expect-error
    auth.currentUser = null;

    const result = await loadFromFirebase();

    expect(result).toBeNull();
    expect(doc).not.toHaveBeenCalled();
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('should return data if document exists', async () => {
    // @ts-expect-error
    auth.currentUser = { uid: 'test-user-id' } as any;

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
    // @ts-expect-error
    auth.currentUser = { uid: 'test-user-id' } as any;

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
    // @ts-expect-error
    auth.currentUser = { uid: 'test-user-id' } as any;

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
