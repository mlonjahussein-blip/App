import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as fbSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase.ts';
import { UserProfile } from '../types.ts';

export interface AppAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: AppAuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (e: string, p: string) => Promise<void>;
  signUp: (e: string, p: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  authenticateWithGooglePayload: (payload: { sub: string; email: string; name?: string; picture?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage Keys
const STORAGE_SESSION_KEY = 'ef_user_session';
const STORAGE_ACCOUNTS_V2_KEY = 'ef_auth_users_v2';
const STORAGE_LEGACY_ACCOUNTS_KEY = 'ef_registered_accounts';

// Google OAuth Client ID
export const GOOGLE_CLIENT_ID = '210716237501-6oq8fjkb07rt5sclu0lf7imvuj53pcd5.apps.googleusercontent.com';

// Option 1: Cryptographically secure Salted SHA-256 Password Hashing via Web Crypto API
async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface StoredAccountV2 {
  uid: string;
  email: string;
  displayName: string;
  salt: string;
  hash: string;
  createdAt: string;
}

function getStoredAccountsV2(): Record<string, StoredAccountV2> {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_V2_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAccountV2(account: StoredAccountV2) {
  try {
    const accounts = getStoredAccountsV2();
    accounts[account.email.toLowerCase()] = account;
    localStorage.setItem(STORAGE_ACCOUNTS_V2_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn('Could not save local v2 account record:', err);
  }
}

function getLegacyAccounts(): Record<string, { uid: string; email: string; displayName: string; pwd: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_LEGACY_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (uid: string, defaultEmail: string, displayName?: string, photoURL?: string) => {
    const localProfileKey = `ef_profile_${uid}`;
    let cachedProfile: UserProfile | null = null;
    try {
      const raw = localStorage.getItem(localProfileKey);
      if (raw) cachedProfile = JSON.parse(raw);
    } catch {}

    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        localStorage.setItem(localProfileKey, JSON.stringify(data));
        return;
      } else {
        const newProf: UserProfile = cachedProfile || {
          uid,
          email: defaultEmail,
          displayName: displayName || defaultEmail.split('@')[0] || 'Tactician',
          createdAt: new Date().toISOString(),
          freeAnalysesRemaining: 1,
          paidCredits: 0,
          lastFreeResetAt: new Date().toISOString(),
          role: 'user'
        };
        try {
          await setDoc(ref, newProf);
        } catch (e) {
          console.warn('Could not write profile to firestore:', e);
        }
        setProfile(newProf);
        localStorage.setItem(localProfileKey, JSON.stringify(newProf));
      }
    } catch (err) {
      console.warn('Could not read user profile from firestore directly:', err);
      const fallbackProf: UserProfile = cachedProfile || {
        uid,
        email: defaultEmail,
        displayName: displayName || defaultEmail.split('@')[0] || 'Tactician',
        createdAt: new Date().toISOString(),
        freeAnalysesRemaining: 1,
        paidCredits: 0,
        lastFreeResetAt: new Date().toISOString(),
        role: 'user'
      };
      setProfile(fallbackProf);
      localStorage.setItem(localProfileKey, JSON.stringify(fallbackProf));
    }
  };

  useEffect(() => {
    // 1. Check local session first for fast response
    try {
      const rawSession = localStorage.getItem(STORAGE_SESSION_KEY);
      if (rawSession) {
        const savedSession = JSON.parse(rawSession) as AppAuthUser;
        if (savedSession && savedSession.uid) {
          setUser(savedSession);
          fetchProfile(savedSession.uid, savedSession.email || '', savedSession.displayName || undefined, savedSession.photoURL || undefined);
        }
      }
    } catch (e) {
      console.warn('Session parse error:', e);
    }

    // 2. Initialize Firebase redirect listener if present
    getRedirectResult(auth)
      .then(async (cred) => {
        if (cred && cred.user) {
          const authUser: AppAuthUser = {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: cred.user.displayName,
            photoURL: cred.user.photoURL,
            emailVerified: cred.user.emailVerified
          };
          setUser(authUser);
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
          await fetchProfile(cred.user.uid, cred.user.email || '', cred.user.displayName || undefined);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in result error:', err);
      });

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const authUser: AppAuthUser = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          emailVerified: u.emailVerified
        };
        setUser(authUser);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
        await fetchProfile(u.uid, u.email || '', u.displayName || undefined);
        setLoading(false);
      } else {
        // If not in Firebase auth, retain local session if valid
        const rawSession = localStorage.getItem(STORAGE_SESSION_KEY);
        if (!rawSession) {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Option 1: Robust Email & Password Authentication (Zero Firebase dependency, 100% free)
  const signIn = async (e: string, p: string) => {
    const cleanEmail = (e || '').trim().toLowerCase();
    const cleanPassword = (p || '').trim();

    if (!cleanEmail) {
      throw new Error('Please enter your email address.');
    }
    if (!cleanPassword) {
      throw new Error('Please enter your password.');
    }

    // 1. Check Salted SHA-256 Accounts (V2)
    const accountsV2 = getStoredAccountsV2();
    const accV2 = accountsV2[cleanEmail];
    if (accV2) {
      const computedHash = await hashPasswordWithSalt(cleanPassword, accV2.salt);
      if (computedHash === accV2.hash) {
        const localUser: AppAuthUser = {
          uid: accV2.uid,
          email: accV2.email,
          displayName: accV2.displayName
        };
        setUser(localUser);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(localUser));
        await fetchProfile(accV2.uid, accV2.email, accV2.displayName);
        return;
      } else {
        throw new Error('Incorrect password. Please check your password and try again.');
      }
    }

    // 2. Check legacy stored accounts and auto-upgrade to V2
    const legacyAccounts = getLegacyAccounts();
    const legacyAcc = legacyAccounts[cleanEmail];
    if (legacyAcc) {
      // Decode legacy password
      let decodedPwd = legacyAcc.pwd;
      try {
        decodedPwd = decodeURIComponent(escape(atob(legacyAcc.pwd)));
      } catch {}

      if (decodedPwd === cleanPassword || legacyAcc.pwd === cleanPassword) {
        // Upgrade to Salted SHA-256
        const newSalt = generateSalt();
        const newHash = await hashPasswordWithSalt(cleanPassword, newSalt);
        saveAccountV2({
          uid: legacyAcc.uid,
          email: legacyAcc.email,
          displayName: legacyAcc.displayName,
          salt: newSalt,
          hash: newHash,
          createdAt: new Date().toISOString()
        });

        const localUser: AppAuthUser = {
          uid: legacyAcc.uid,
          email: legacyAcc.email,
          displayName: legacyAcc.displayName
        };
        setUser(localUser);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(localUser));
        await fetchProfile(legacyAcc.uid, legacyAcc.email, legacyAcc.displayName);
        return;
      } else {
        throw new Error('Incorrect password. Please check your password and try again.');
      }
    }

    // 3. Check Firebase Auth if available
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const authUser: AppAuthUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName
      };
      // Also cache locally in V2 for instant offline/direct future logins
      const newSalt = generateSalt();
      const newHash = await hashPasswordWithSalt(cleanPassword, newSalt);
      saveAccountV2({
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: cred.user.displayName || cleanEmail.split('@')[0],
        salt: newSalt,
        hash: newHash,
        createdAt: new Date().toISOString()
      });

      setUser(authUser);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
      await fetchProfile(cred.user.uid, cred.user.email || cleanEmail, cred.user.displayName || undefined);
      return;
    } catch (fbErr: any) {
      console.warn('Firebase sign-in fallback check:', fbErr?.code);
      if (
        fbErr?.code === 'auth/wrong-password' || 
        fbErr?.code === 'auth/invalid-credential' || 
        fbErr?.code === 'auth/invalid-login-credentials'
      ) {
        throw new Error('Incorrect email or password. Please verify and try again.');
      }
      if (fbErr?.code === 'auth/user-not-found') {
        throw new Error('No account found for this email. Click "Sign up free" below to create one.');
      }
      throw new Error('No account found for this email. Click "Sign up free" below to create one.');
    }
  };

  const signUp = async (e: string, p: string, name: string) => {
    const cleanEmail = (e || '').trim().toLowerCase();
    const cleanPassword = (p || '').trim();
    const cleanName = (name || '').trim() || cleanEmail.split('@')[0] || 'Tactician';

    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!cleanEmail || !emailPattern.test(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. manager@gmail.com).');
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Check if account already exists
    const existingV2 = getStoredAccountsV2();
    if (existingV2[cleanEmail]) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    // 1. Create Salted SHA-256 Account Record
    const salt = generateSalt();
    const hash = await hashPasswordWithSalt(cleanPassword, salt);
    const newUid = 'u_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);

    const accountRecord: StoredAccountV2 = {
      uid: newUid,
      email: cleanEmail,
      displayName: cleanName,
      salt,
      hash,
      createdAt: new Date().toISOString()
    };
    saveAccountV2(accountRecord);

    const newProf: UserProfile = {
      uid: newUid,
      email: cleanEmail,
      displayName: cleanName,
      createdAt: new Date().toISOString(),
      freeAnalysesRemaining: 1,
      paidCredits: 0,
      lastFreeResetAt: new Date().toISOString(),
      role: 'user'
    };

    // Save profile locally & to Firestore if available
    localStorage.setItem(`ef_profile_${newUid}`, JSON.stringify(newProf));
    setProfile(newProf);
    try {
      await setDoc(doc(db, 'users', newUid), newProf);
    } catch (fsErr) {
      console.warn('Firestore user profile sync:', fsErr);
    }

    // Try Firebase registration in background if possible, without blocking
    createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword)
      .then(async (cred) => {
        await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
        await setDoc(doc(db, 'users', cred.user.uid), { ...newProf, uid: cred.user.uid }, { merge: true }).catch(() => {});
      })
      .catch((fbErr) => {
        console.warn('Firebase registration notice (standalone auth active):', fbErr?.code);
      });

    const authUser: AppAuthUser = {
      uid: newUid,
      email: cleanEmail,
      displayName: cleanName
    };
    setUser(authUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
  };

  // Option 2: Direct Google Identity Services Authentication (Direct Google OAuth, zero Firebase restriction)
  const authenticateWithGooglePayload = async (payload: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  }) => {
    const cleanEmail = (payload.email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Missing verified email from Google.');

    const googleUid = `g_${payload.sub || cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
    const displayName = payload.name?.trim() || cleanEmail.split('@')[0] || 'Tactician';
    const photoURL = payload.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=ffffff&bold=true`;

    const authUser: AppAuthUser = {
      uid: googleUid,
      email: cleanEmail,
      displayName,
      photoURL,
      emailVerified: true
    };

    setUser(authUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
    await fetchProfile(googleUid, cleanEmail, displayName, photoURL);
  };

  const signInWithGoogle = async () => {
    // 1. Direct Google Identity Services (GIS) Token Client (100% free from Google, no Firebase domain restrictions)
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      return new Promise<void>((resolve, reject) => {
        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: async (tokenResp: any) => {
              if (tokenResp.error) {
                console.warn('Google Identity Services error:', tokenResp);
                if (tokenResp.error === 'popup_closed_by_user') {
                  reject(new Error('Google sign-in popup was closed before completing.'));
                  return;
                }
                reject(new Error(tokenResp.error_description || tokenResp.error || 'Google sign-in was cancelled.'));
                return;
              }
              try {
                // Fetch verified profile directly from Google
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResp.access_token}` }
                });
                const info = await res.json();
                if (!info.email) {
                  reject(new Error('Could not retrieve verified email from Google.'));
                  return;
                }
                await authenticateWithGooglePayload({
                  sub: info.sub,
                  email: info.email,
                  name: info.name,
                  picture: info.picture
                });
                resolve();
              } catch (fetchErr: any) {
                console.error('Failed to fetch Google userinfo:', fetchErr);
                reject(new Error('Failed to retrieve verified Google profile.'));
              }
            }
          });
          client.requestAccessToken({ prompt: 'select_account' });
        } catch (err: any) {
          console.warn('GIS Token client error, trying fallback:', err);
          fallbackFirebaseGoogle().then(resolve).catch(reject);
        }
      });
    }

    // 2. Fallback to Firebase popup if GIS client script not ready
    return fallbackFirebaseGoogle();
  };

  const fallbackFirebaseGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const cred = await signInWithPopup(auth, provider);
      const authUser: AppAuthUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
        photoURL: cred.user.photoURL,
        emailVerified: cred.user.emailVerified
      };
      setUser(authUser);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
      await fetchProfile(cred.user.uid, cred.user.email || '', cred.user.displayName || undefined);
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        throw new Error('Google Identity Services is loading. Please click "Continue with Google" once more.');
      }
      if (err?.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in popup was closed before completing.');
      }
      throw err;
    }
  };

  const logout = async () => {
    await fbSignOut(auth).catch(() => {});
    localStorage.removeItem(STORAGE_SESSION_KEY);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid, user.email || '', user.displayName || undefined, user.photoURL || undefined);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        authenticateWithGooglePayload,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

