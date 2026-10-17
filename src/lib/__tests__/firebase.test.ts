import { describe, it, expect, mock, beforeEach, spyOn, afterEach } from 'bun:test';

// Mock all dependencies that firebase.ts needs to load
mock.module('firebase/app', () => ({
  initializeApp: mock(() => ({})),
}));

mock.module('firebase/auth', () => ({
  getAuth: mock(() => ({
    currentUser: null,
  })),
  GoogleAuthProvider: mock(() => ({})),
  signInWithPopup: mock(),
  signOut: mock(),
}));

mock.module('firebase/firestore', () => ({
  getFirestore: mock(() => ({})),
  doc: mock(),
  getDocFromServer: mock(() => Promise.reject(new Error('test connection mock error'))),
}));

mock.module('firebase/storage', () => ({
  getStorage: mock(() => ({})),
}));

mock.module('../../firebase-applet-config.json', () => ({
  default: { firestoreDatabaseId: 'test-db' }
}));

// Now we can safely import our module under test
import { handleFirestoreError, OperationType, auth, FirestoreErrorInfo } from '../firebase';

describe('handleFirestoreError', () => {
  let consoleErrorMock: any;
  let consoleWarnMock: any;

  beforeEach(() => {
    // Reset currentUser before each test
    (auth as any).currentUser = null;

    // Silence console.error and console.warn during expected error logging
    consoleErrorMock = spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnMock = spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
    consoleWarnMock.mockRestore();
  });

  it('should correctly format and throw error info for Error objects', () => {
    const errorMsg = 'A test firestore error';
    const testError = new Error(errorMsg);
    const testPath = 'users/123/docs/456';

    let caughtError: Error | null = null;
    try {
      handleFirestoreError(testError, OperationType.GET, testPath);
    } catch (e: any) {
      caughtError = e;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError).toBeInstanceOf(Error);

    const errInfo: FirestoreErrorInfo = JSON.parse(caughtError!.message);

    expect(errInfo.error).toBe(errorMsg);
    expect(errInfo.operationType).toBe(OperationType.GET);
    expect(errInfo.path).toBe(testPath);

    // Verify console.error was called with the JSON stringified errInfo
    expect(consoleErrorMock).toHaveBeenCalledWith('Firestore Error:', caughtError!.message);
  });

  it('should correctly format and throw error info for non-Error objects (e.g., strings)', () => {
    const errorString = 'Just a string error';
    const testPath = null;

    let caughtError: Error | null = null;
    try {
      handleFirestoreError(errorString, OperationType.WRITE, testPath);
    } catch (e: any) {
      caughtError = e;
    }

    expect(caughtError).not.toBeNull();

    const errInfo: FirestoreErrorInfo = JSON.parse(caughtError!.message);

    expect(errInfo.error).toBe(errorString);
    expect(errInfo.operationType).toBe(OperationType.WRITE);
    expect(errInfo.path).toBeNull();
  });

  it('should include auth info when user is authenticated', () => {
    const mockUser = {
      uid: 'user-uid-789',
      email: 'test@example.com',
      emailVerified: true,
      isAnonymous: false,
      tenantId: 'tenant-123',
      providerData: [
        {
          providerId: 'google.com',
          email: 'test@example.com'
        }
      ]
    };

    (auth as any).currentUser = mockUser;

    let caughtError: Error | null = null;
    try {
      handleFirestoreError(new Error('error'), OperationType.UPDATE, 'some/path');
    } catch (e: any) {
      caughtError = e;
    }

    expect(caughtError).not.toBeNull();

    const errInfo: FirestoreErrorInfo = JSON.parse(caughtError!.message);

    expect(errInfo.authInfo).toBeDefined();
    expect(errInfo.authInfo.userId).toBe(mockUser.uid);
    expect(errInfo.authInfo.email).toBe(mockUser.email);
    expect(errInfo.authInfo.emailVerified).toBe(mockUser.emailVerified);
    expect(errInfo.authInfo.isAnonymous).toBe(mockUser.isAnonymous);
    expect(errInfo.authInfo.tenantId).toBe(mockUser.tenantId);
    expect(errInfo.authInfo.providerInfo).toBeDefined();
    expect(errInfo.authInfo.providerInfo!.length).toBe(1);
    expect(errInfo.authInfo.providerInfo![0].providerId).toBe(mockUser.providerData[0].providerId);
  });

  it('should handle missing auth info when user is not authenticated', () => {
    (auth as any).currentUser = null;

    let caughtError: Error | null = null;
    try {
      handleFirestoreError(new Error('error'), OperationType.DELETE, 'some/path');
    } catch (e: any) {
      caughtError = e;
    }

    expect(caughtError).not.toBeNull();

    const errInfo: FirestoreErrorInfo = JSON.parse(caughtError!.message);

    expect(errInfo.authInfo).toBeDefined();
    expect(errInfo.authInfo.userId).toBeUndefined();
    expect(errInfo.authInfo.email).toBeUndefined();
    expect(errInfo.authInfo.providerInfo).toEqual([]);
  });
});
