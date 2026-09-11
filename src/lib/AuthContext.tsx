import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase.ts';
import { UserProfile } from '../types.ts';
import {
  sendWhatsAppVerificationCode,
  verifyWhatsAppCode,
  cleanPhoneDigits,
  normalizeWhatsAppNumber
} from './whatsappAuth.ts';

export interface AppAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  isAnonymous?: boolean;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: AppAuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (identifier: string, p: string) => Promise<void>;
  signUp: (emailOrPhone: string, p: string, name: string) => Promise<void>;
  signInWithWhatsApp: (phoneNumber: string, p: string) => Promise<void>;
  signUpWithWhatsApp: (phoneNumber: string, p: string, managerName: string, otpCode: string) => Promise<void>;
  sendWhatsAppOtpCode: (phoneNumber: string, managerName?: string, purpose?: 'signup' | 'signin') => Promise<{
    success: boolean;
    message: string;
    code: string;
    expiresAt: number;
    whatsappLink: string;
  }>;
  signInWithWhatsAppOtp: (phoneNumber: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local Storage Keys
const STORAGE_SESSION_KEY = 'ef_user_session';
const STORAGE_WHATSAPP_ACCOUNTS_KEY = 'ef_whatsapp_accounts_v1';
const STORAGE_ACCOUNTS_V2_KEY = 'ef_auth_users_v2';
const STORAGE_LEGACY_ACCOUNTS_KEY = 'ef_registered_accounts';

export interface StoredWhatsAppAccount {
  uid: string;
  phoneNumber: string; // E.164 (e.g. +255712345678)
  displayName: string;
  salt: string;
  hash: string;
  createdAt: string;
}

function getStoredWhatsAppAccounts(): Record<string, StoredWhatsAppAccount> {
  try {
    const raw = localStorage.getItem(STORAGE_WHATSAPP_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveWhatsAppAccount(account: StoredWhatsAppAccount) {
  try {
    const all = getStoredWhatsAppAccounts();
    all[account.phoneNumber] = account;
    const rawDigits = cleanPhoneDigits(account.phoneNumber);
    all[rawDigits] = account;
    localStorage.setItem(STORAGE_WHATSAPP_ACCOUNTS_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('Could not save WhatsApp account locally:', err);
  }
}

// Cryptographically secure Salted SHA-256 Password Hashing via Web Crypto API
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (
    uid: string,
    defaultEmail: string,
    displayName?: string,
    photoURL?: string,
    whatsappNumber?: string
  ) => {
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
        if (whatsappNumber && !data.whatsappNumber) {
          data.whatsappNumber = whatsappNumber;
        }
        setProfile(data);
        localStorage.setItem(localProfileKey, JSON.stringify(data));
        return;
      } else {
        const newProf: UserProfile = cachedProfile || {
          uid,
          email: defaultEmail,
          displayName: displayName || (whatsappNumber ? `Manager ${whatsappNumber.slice(-4)}` : defaultEmail.split('@')[0]) || 'Tactician',
          whatsappNumber: whatsappNumber || undefined,
          photoURL: photoURL || undefined,
          createdAt: new Date().toISOString(),
          freeAnalysesRemaining: 1,
          paidCredits: 0,
          lastFreeResetAt: new Date().toISOString(),
          role: 'user'
        };
        try {
          await setDoc(ref, newProf, { merge: true });
        } catch (e) {
          console.warn('Could not write profile to firestore:', e);
        }
        setProfile(newProf);
        localStorage.setItem(localProfileKey, JSON.stringify(newProf));
      }
    } catch (err) {
      console.warn('Could not read user profile from firestore:', err);
      const fallbackProf: UserProfile = cachedProfile || {
        uid,
        email: defaultEmail,
        displayName: displayName || (whatsappNumber ? `Manager ${whatsappNumber.slice(-4)}` : defaultEmail.split('@')[0]) || 'Tactician',
        whatsappNumber: whatsappNumber || undefined,
        photoURL: photoURL || undefined,
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
    // 1. Check local session for instant restore
    try {
      const rawSession = localStorage.getItem(STORAGE_SESSION_KEY);
      if (rawSession) {
        const savedSession = JSON.parse(rawSession) as AppAuthUser;
        if (savedSession && savedSession.uid) {
          setUser(savedSession);
          fetchProfile(
            savedSession.uid,
            savedSession.email || '',
            savedSession.displayName || undefined,
            savedSession.photoURL || undefined,
            savedSession.whatsappNumber || undefined
          );
        }
      }
    } catch (e) {
      console.warn('Session parse error:', e);
    }

    // 2. Firebase Auth listener for background sync
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

  /**
   * Request a 6-digit WhatsApp OTP verification code
   */
  const sendWhatsAppOtpCode = async (
    phoneNumber: string,
    managerName?: string,
    purpose: 'signup' | 'signin' = 'signup'
  ) => {
    return sendWhatsAppVerificationCode(phoneNumber, managerName, purpose);
  };

  /**
   * Sign Up with WhatsApp Number + 6-digit Verification Code + Password
   */
  const signUpWithWhatsApp = async (
    phoneNumber: string,
    password: string,
    managerName: string,
    otpCode: string
  ) => {
    const cleanPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + cleanPhoneDigits(phoneNumber);
    const rawDigits = cleanPhoneDigits(cleanPhone);
    const cleanPassword = (password || '').trim();
    const cleanName = (managerName || '').trim() || `Manager_${rawDigits.slice(-4)}`;

    if (!rawDigits || rawDigits.length < 7) {
      throw new Error('Please enter a valid WhatsApp phone number with country code.');
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    if (!otpCode || otpCode.trim().length !== 6) {
      throw new Error('Please enter the 6-digit verification code sent to your WhatsApp.');
    }

    // Verify OTP code
    const isCodeValid = verifyWhatsAppCode(cleanPhone, otpCode);
    if (!isCodeValid) {
      throw new Error('Invalid or expired 6-digit verification code. Please check your WhatsApp or request a new code.');
    }

    // Generate Salted Hash
    const salt = generateSalt();
    const hash = await hashPasswordWithSalt(cleanPassword, salt);
    const uid = `wa_${rawDigits}`;
    const pseudoEmail = `${rawDigits}@whatsapp.efootballaihub.com`;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=10b981&color=ffffff&bold=true`;

    const waAccount: StoredWhatsAppAccount = {
      uid,
      phoneNumber: cleanPhone,
      displayName: cleanName,
      salt,
      hash,
      createdAt: new Date().toISOString()
    };
    saveWhatsAppAccount(waAccount);

    const newProf: UserProfile = {
      uid,
      email: pseudoEmail,
      displayName: cleanName,
      whatsappNumber: cleanPhone,
      photoURL: avatarUrl,
      createdAt: new Date().toISOString(),
      freeAnalysesRemaining: 1,
      paidCredits: 0,
      lastFreeResetAt: new Date().toISOString(),
      role: 'user'
    };

    localStorage.setItem(`ef_profile_${uid}`, JSON.stringify(newProf));
    setProfile(newProf);

    // Sync to Firestore
    try {
      await setDoc(doc(db, 'users', uid), {
        ...newProf,
        salt,
        hash
      }, { merge: true });
    } catch (fsErr) {
      console.warn('Firestore sync for WhatsApp user:', fsErr);
    }

    const authUser: AppAuthUser = {
      uid,
      email: pseudoEmail,
      displayName: cleanName,
      photoURL: avatarUrl,
      whatsappNumber: cleanPhone
    };

    setUser(authUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
  };

  /**
   * Sign In with WhatsApp Number + Password
   */
  const signInWithWhatsApp = async (phoneNumber: string, password: string) => {
    const cleanPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + cleanPhoneDigits(phoneNumber);
    const rawDigits = cleanPhoneDigits(cleanPhone);
    const cleanPassword = (password || '').trim();

    if (!rawDigits || rawDigits.length < 7) {
      throw new Error('Please enter your valid WhatsApp phone number.');
    }
    if (!cleanPassword) {
      throw new Error('Please enter your password.');
    }

    // 1. Check local WhatsApp accounts
    const allAccounts = getStoredWhatsAppAccounts();
    const localAcc = allAccounts[cleanPhone] || allAccounts[rawDigits];
    if (localAcc) {
      const computedHash = await hashPasswordWithSalt(cleanPassword, localAcc.salt);
      if (computedHash === localAcc.hash) {
        const authUser: AppAuthUser = {
          uid: localAcc.uid,
          email: `${rawDigits}@whatsapp.efootballaihub.com`,
          displayName: localAcc.displayName,
          whatsappNumber: localAcc.phoneNumber
        };
        setUser(authUser);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
        await fetchProfile(localAcc.uid, authUser.email || '', localAcc.displayName, undefined, localAcc.phoneNumber);
        return;
      } else {
        throw new Error('Incorrect password. Please verify your password and try again.');
      }
    }

    // 2. Check Firestore for WhatsApp account
    try {
      const uid = `wa_${rawDigits}`;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data.salt && data.hash) {
          const computedHash = await hashPasswordWithSalt(cleanPassword, data.salt);
          if (computedHash === data.hash) {
            const authUser: AppAuthUser = {
              uid,
              email: data.email || `${rawDigits}@whatsapp.efootballaihub.com`,
              displayName: data.displayName || 'Tactician',
              whatsappNumber: cleanPhone
            };
            saveWhatsAppAccount({
              uid,
              phoneNumber: cleanPhone,
              displayName: authUser.displayName || 'Tactician',
              salt: data.salt,
              hash: data.hash,
              createdAt: data.createdAt || new Date().toISOString()
            });
            setUser(authUser);
            localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
            setProfile(data as UserProfile);
            return;
          } else {
            throw new Error('Incorrect password. Please verify your password and try again.');
          }
        }
      }
    } catch (fsErr) {
      console.warn('Firestore WhatsApp account lookup:', fsErr);
    }

    throw new Error('No account found for this WhatsApp number. Click "Sign up with WhatsApp" below to register.');
  };

  /**
   * Sign In with WhatsApp 6-digit OTP Code (Passwordless instant login)
   */
  const signInWithWhatsAppOtp = async (phoneNumber: string, otpCode: string) => {
    const cleanPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + cleanPhoneDigits(phoneNumber);
    const rawDigits = cleanPhoneDigits(cleanPhone);

    if (!rawDigits || rawDigits.length < 7) {
      throw new Error('Please enter a valid WhatsApp phone number.');
    }

    const isValid = verifyWhatsAppCode(cleanPhone, otpCode);
    if (!isValid) {
      throw new Error('Invalid or expired 6-digit verification code. Please request a new code.');
    }

    // Lookup existing or provision user
    const allAccounts = getStoredWhatsAppAccounts();
    const existing = allAccounts[cleanPhone] || allAccounts[rawDigits];
    const uid = existing?.uid || `wa_${rawDigits}`;
    const displayName = existing?.displayName || `Manager_${rawDigits.slice(-4)}`;
    const pseudoEmail = `${rawDigits}@whatsapp.efootballaihub.com`;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=ffffff&bold=true`;

    const authUser: AppAuthUser = {
      uid,
      email: pseudoEmail,
      displayName,
      photoURL: avatarUrl,
      whatsappNumber: cleanPhone
    };

    setUser(authUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
    await fetchProfile(uid, pseudoEmail, displayName, avatarUrl, cleanPhone);
  };

  /**
   * Universal Sign In (Auto-routes WhatsApp number or email)
   */
  const signIn = async (identifier: string, p: string) => {
    const cleanId = (identifier || '').trim();
    if (!cleanId) throw new Error('Please enter your WhatsApp phone number or email.');
    
    // If it contains only digits, +, spaces, dashes, or no @, route to WhatsApp login
    if (!cleanId.includes('@') && cleanPhoneDigits(cleanId).length >= 7) {
      return signInWithWhatsApp(cleanId, p);
    }

    // Standard Email Login
    const cleanEmail = cleanId.toLowerCase();
    const cleanPassword = (p || '').trim();

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
        throw new Error('Incorrect password. Please verify and try again.');
      }
    }

    // Try Firebase Email Login
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const authUser: AppAuthUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName
      };
      setUser(authUser);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
      await fetchProfile(cred.user.uid, cred.user.email || cleanEmail, cred.user.displayName || undefined);
    } catch {
      throw new Error('Incorrect email/phone or password. Please verify and try again.');
    }
  };

  /**
   * Universal Sign Up
   */
  const signUp = async (emailOrPhone: string, p: string, name: string) => {
    const cleanId = (emailOrPhone || '').trim();
    if (!cleanId.includes('@') && cleanPhoneDigits(cleanId).length >= 7) {
      throw new Error('For WhatsApp sign-up, please use the WhatsApp registration form to verify your 6-digit code.');
    }

    const cleanEmail = cleanId.toLowerCase();
    const cleanPassword = (p || '').trim();
    const cleanName = (name || '').trim() || cleanEmail.split('@')[0] || 'Tactician';

    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

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

    localStorage.setItem(`ef_profile_${newUid}`, JSON.stringify(newProf));
    setProfile(newProf);

    try {
      await setDoc(doc(db, 'users', newUid), newProf);
    } catch (fsErr) {
      console.warn('Firestore user profile sync:', fsErr);
    }

    const authUser: AppAuthUser = {
      uid: newUid,
      email: cleanEmail,
      displayName: cleanName
    };
    setUser(authUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
  };

  const logout = async () => {
    await fbSignOut(auth).catch(() => {});
    localStorage.removeItem(STORAGE_SESSION_KEY);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(
        user.uid,
        user.email || '',
        user.displayName || undefined,
        user.photoURL || undefined,
        user.whatsappNumber || undefined
      );
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
        signInWithWhatsApp,
        signUpWithWhatsApp,
        sendWhatsAppOtpCode,
        signInWithWhatsAppOtp,
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
