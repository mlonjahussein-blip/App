import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase.ts';
import { UserProfile } from '../types.ts';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (e: string, p: string) => Promise<void>;
  signUp: (e: string, p: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (uid: string, defaultEmail: string, displayName?: string) => {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
      } else {
        // Create initial user document
        const newProf: UserProfile = {
          uid,
          email: defaultEmail,
          displayName: displayName || defaultEmail.split('@')[0] || 'Tactician',
          createdAt: new Date().toISOString(),
          freeAnalysesRemaining: 1,
          paidCredits: 0,
          lastFreeResetAt: new Date().toISOString(),
          role: 'user'
        };
        await setDoc(ref, newProf);
        setProfile(newProf);
      }
    } catch (err) {
      console.warn('Could not read user profile from firestore directly:', err);
      // Local fallback in case of security rules or network issue
      setProfile({
        uid,
        email: defaultEmail,
        displayName: displayName || defaultEmail.split('@')[0] || 'Tactician',
        createdAt: new Date().toISOString(),
        freeAnalysesRemaining: 1,
        paidCredits: 0,
        lastFreeResetAt: new Date().toISOString(),
        role: 'user'
      });
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u.uid, u.email || '', u.displayName || undefined);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = async (e: string, p: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, e, p);
      await fetchProfile(cred.user.uid, cred.user.email || '', cred.user.displayName || undefined);
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        throw new Error(
          'Email/Password sign-in is disabled in your Firebase console. Please sign in with Google or enable Email/Password provider in Firebase Console > Authentication > Sign-in method.'
        );
      }
      throw err;
    }
  };

  const signUp = async (e: string, p: string, name: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, e, p);
      await updateProfile(cred.user, { displayName: name });
      const newProf: UserProfile = {
        uid: cred.user.uid,
        email: e,
        displayName: name,
        createdAt: new Date().toISOString(),
        freeAnalysesRemaining: 1,
        paidCredits: 0,
        lastFreeResetAt: new Date().toISOString(),
        role: 'user'
      };
      try {
        await setDoc(doc(db, 'users', cred.user.uid), newProf);
      } catch (err) {
        console.warn('Set doc error during sign up:', err);
      }
      setProfile(newProf);
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        throw new Error(
          'Email/Password registration is disabled in your Firebase console. Please sign in with Google or enable Email/Password provider in Firebase Console > Authentication > Sign-in method.'
        );
      }
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      await fetchProfile(cred.user.uid, cred.user.email || '', cred.user.displayName || undefined);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err?.code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      }
      if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in popup was closed before completing.');
      }
      throw err;
    }
  };

  const logout = async () => {
    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid, user.email || '', user.displayName || undefined);
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
