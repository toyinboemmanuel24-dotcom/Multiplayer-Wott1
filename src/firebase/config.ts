import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export Firestore with specific database ID as required
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Required Firestore connection validation on startup
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or connecting...');
    }
  }
}

// Sign in with Google using popup with graceful fallback if browser popup is blocked
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: unknown) {
    console.warn('Google Sign-In popup closed or restricted by browser:', error);
    return null;
  }
}

// Sign out helper
export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore
  }
}

// Listen to Auth State changes
export function onAuthUserChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

// Password hashing helper using standard browser Web Crypto API
async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_wott_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }
}

// Sign up with Email, Password, and In-Game Display Name
export async function signUpWithEmail(
  email: string,
  pass: string,
  inGameName: string,
  avatar: string
): Promise<{ uid: string; email: string; displayName: string; avatar: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = inGameName.trim() || cleanEmail.split('@')[0];

  // 1. Check if user with this email is already registered in Firestore
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanEmail));
    const existingDocs = await getDocs(q);
    if (!existingDocs.empty) {
      throw new Error('This email is already registered. Please sign in instead.');
    }
  } catch (checkErr: unknown) {
    if (checkErr instanceof Error && checkErr.message.includes('already registered')) {
      throw checkErr;
    }
  }

  // 2. Attempt Firebase Auth sign-up first
  let uid = '';
  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    uid = cred.user.uid;
    try {
      await updateProfile(cred.user, { displayName: cleanName });
    } catch {}
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('email-already-in-use')) {
      throw new Error('This email is already registered. Please sign in instead.');
    }
    console.warn('Firebase Auth email signup fallback to Firestore user registry:', msg);
    uid = `u_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // 3. Save profile and salted hash to Firestore
  const passwordHash = await hashPassword(pass);
  try {
    await setDoc(doc(db, 'users', uid), {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      avatar,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (storeErr) {
    console.warn('Could not store user profile in firestore:', storeErr);
  }

  return { uid, email: cleanEmail, displayName: cleanName, avatar };
}

// Sign in with Email and Password, retrieving saved in-game name
export async function signInWithEmail(
  email: string,
  pass: string
): Promise<{ uid: string; email: string; displayName: string; avatar: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Attempt standard Firebase Auth sign-in
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    let resolvedName = cred.user.displayName || '';
    let resolvedAvatar = '🦁';

    try {
      const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.displayName) resolvedName = data.displayName;
        if (data.avatar) resolvedAvatar = data.avatar;
      }
    } catch {}

    if (!resolvedName) resolvedName = cleanEmail.split('@')[0];
    return {
      uid: cred.user.uid,
      email: cleanEmail,
      displayName: resolvedName,
      avatar: resolvedAvatar,
    };
  } catch (authErr: unknown) {
    const authMsg = authErr instanceof Error ? authErr.message : String(authErr);
    console.log('Firebase Auth email sign-in notice, verifying Firestore user records:', authMsg);

    // 2. Fall back to Firestore user records
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      if (authMsg.includes('invalid-credential') || authMsg.includes('user-not-found') || authMsg.includes('wrong-password')) {
        throw new Error('Incorrect email or password. Please try again.');
      }
      throw new Error('No account found with this email. Please click Sign Up first.');
    }

    const userDoc = querySnap.docs[0];
    const data = userDoc.data();
    const inputHash = await hashPassword(pass);

    if (data.passwordHash && data.passwordHash !== inputHash) {
      throw new Error('Incorrect email or password. Please try again.');
    }

    return {
      uid: data.uid || userDoc.id,
      email: cleanEmail,
      displayName: data.displayName || cleanEmail.split('@')[0],
      avatar: data.avatar || '🦁',
    };
  }
}

// Get user profile by UID
export async function getUserProfile(
  uid: string
): Promise<{ displayName?: string; avatar?: string } | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as { displayName?: string; avatar?: string };
    }
  } catch (err) {
    console.warn('Error reading user profile:', err);
  }
  return null;
}

// Update / save user profile
export async function saveUserProfile(
  uid: string,
  data: { displayName: string; avatar: string }
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error saving user profile:', err);
  }
}
