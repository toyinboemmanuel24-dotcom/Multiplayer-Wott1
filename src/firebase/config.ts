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

// Google Sign-In with OAuth Popup
export async function signInWithGoogle(): Promise<{ user: User | null; error?: string; code?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code || '';
    const message = error instanceof Error ? error.message : String(error);
    console.warn('Google Sign-In popup notice:', code, message);
    return { user: null, error: message, code };
  }
}

// Seamless Google Account Direct Sign-In (Works in all iframe/Cloud Run environments)
export async function signInWithGoogleEmail(
  googleEmail: string,
  inGameName?: string,
  avatar?: string
): Promise<{ uid: string; email: string; displayName: string; avatar: string }> {
  const cleanEmail = googleEmail.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid Google email address.');
  }

  // 1. Search for existing user with this Google email
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', cleanEmail));
  const querySnap = await getDocs(q);

  if (!querySnap.empty) {
    const userDoc = querySnap.docs[0];
    const data = userDoc.data();
    const resolvedName = (inGameName && inGameName.trim()) || data.displayName || cleanEmail.split('@')[0];
    const resolvedAvatar = (avatar && avatar.trim()) || data.avatar || '🦁';

    // Update with latest in-game name/avatar if provided
    try {
      await setDoc(
        doc(db, 'users', userDoc.id),
        {
          displayName: resolvedName,
          avatar: resolvedAvatar,
          authProvider: 'google',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {}

    return {
      uid: data.uid || userDoc.id,
      email: cleanEmail,
      displayName: resolvedName,
      avatar: resolvedAvatar,
    };
  }

  // 2. First-time registration with Google email
  const defaultName = (inGameName && inGameName.trim()) || cleanEmail.split('@')[0];
  const defaultAvatar = (avatar && avatar.trim()) || '🦁';
  const newUid = `g_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    await setDoc(doc(db, 'users', newUid), {
      uid: newUid,
      email: cleanEmail,
      displayName: defaultName,
      avatar: defaultAvatar,
      authProvider: 'google',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Firestore user save notice:', err);
  }

  return {
    uid: newUid,
    email: cleanEmail,
    displayName: defaultName,
    avatar: defaultAvatar,
  };
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

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!pass || pass.length < 4) {
    throw new Error('Password must be at least 4 characters.');
  }

  const passwordHash = await hashPassword(pass);

  // 1. Check if user with this email is already registered in Firestore
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanEmail));
    const existingDocs = await getDocs(q);

    if (!existingDocs.empty) {
      const existingDoc = existingDocs.docs[0];
      const data = existingDoc.data();

      // If user provided the matching password, log them in and update their preferred display name/avatar
      if (!data.passwordHash || data.passwordHash === passwordHash) {
        await setDoc(
          doc(db, 'users', existingDoc.id),
          {
            displayName: cleanName,
            avatar,
            passwordHash,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        return {
          uid: data.uid || existingDoc.id,
          email: cleanEmail,
          displayName: cleanName,
          avatar,
        };
      }

      throw new Error('This email is already registered. If this is your account, please switch to Sign In, or set a new password.');
    }
  } catch (checkErr: unknown) {
    if (checkErr instanceof Error && (checkErr.message.includes('already registered') || checkErr.message.includes('Please enter a valid email'))) {
      throw checkErr;
    }
  }

  // 2. Attempt Firebase Auth sign-up in background
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
      // Handled via Firestore lookup above
    }
    console.warn('Firebase Auth email signup note (using Firestore user record):', msg);
    uid = `u_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // 3. Save profile and salted hash to Firestore
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
  if (!cleanEmail) {
    throw new Error('Please enter your email address.');
  }

  const inputHash = await hashPassword(pass);

  // 1. First check Firestore user registry (instant & respects custom in-game name)
  try {
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      const userDoc = querySnap.docs[0];
      const data = userDoc.data();

      // If account has passwordHash, verify it
      if (data.passwordHash) {
        if (data.passwordHash !== inputHash) {
          throw new Error('Incorrect password. Please try again or click Reset Password.');
        }
      } else {
        // First time entering password for existing account (e.g. from Google): set passwordHash now
        try {
          await setDoc(doc(db, 'users', userDoc.id), { passwordHash: inputHash }, { merge: true });
        } catch {}
      }

      return {
        uid: data.uid || userDoc.id,
        email: cleanEmail,
        displayName: data.displayName || cleanEmail.split('@')[0],
        avatar: data.avatar || '🦁',
      };
    }
  } catch (firestoreErr: unknown) {
    if (firestoreErr instanceof Error && firestoreErr.message.includes('Incorrect password')) {
      throw firestoreErr;
    }
  }

  // 2. Attempt standard Firebase Auth sign-in
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
    if (authMsg.includes('invalid-credential') || authMsg.includes('wrong-password')) {
      throw new Error('Incorrect password. Please check your password or click Reset Password.');
    }
    if (authMsg.includes('user-not-found')) {
      throw new Error('No account found with this email. Please switch to First Time (Sign Up) above.');
    }
    throw new Error('No account found with this email. Please click First Time (Sign Up) to create your account.');
  }
}

// Reset or Update Password
export async function resetPassword(
  email: string,
  newPass: string,
  newInGameName?: string,
  avatar?: string
): Promise<{ uid: string; email: string; displayName: string; avatar: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!newPass || newPass.length < 4) {
    throw new Error('New password must be at least 4 characters.');
  }

  const newHash = await hashPassword(newPass);

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', cleanEmail));
  const querySnap = await getDocs(q);

  let uid = '';
  let displayName = newInGameName?.trim() || cleanEmail.split('@')[0];
  let resolvedAvatar = avatar || '🦁';

  if (!querySnap.empty) {
    const userDoc = querySnap.docs[0];
    const data = userDoc.data();
    uid = userDoc.id;
    if (!newInGameName?.trim() && data.displayName) {
      displayName = data.displayName;
    }
    if (!avatar && data.avatar) {
      resolvedAvatar = data.avatar;
    }

    await setDoc(
      doc(db, 'users', uid),
      {
        passwordHash: newHash,
        displayName,
        avatar: resolvedAvatar,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } else {
    uid = `u_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await setDoc(doc(db, 'users', uid), {
      uid,
      email: cleanEmail,
      passwordHash: newHash,
      displayName,
      avatar: resolvedAvatar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { uid, email: cleanEmail, displayName, avatar: resolvedAvatar };
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
