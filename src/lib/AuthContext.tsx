import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase.ts';
import { UserProfile } from '../types.ts';
import {
  sendWhatsAppVerificationCode,
  verifyWhatsAppCode,
  cleanPhoneDigits,
  normalizeWhatsAppNumber
} from './whatsappAuth.ts';
import {
  sendEmailVerificationCode,
  verifyEmailVerificationCode,
  SendEmailOtpResponse
} from './emailAuth.ts';

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
  signUp: (emailOrPhone: string, p: string, name: string, otpCode?: string, whatsappNumber?: string) => Promise<void>;
  signInWithWhatsApp: (phoneNumber: string, p: string) => Promise<void>;
  signUpWithWhatsApp: (phoneNumber: string, p: string, managerName: string, otpCode?: string) => Promise<void>;
  sendWhatsAppOtpCode: (phoneNumber: string, managerName?: string, purpose?: 'signup' | 'signin') => Promise<{
    success: boolean;
    message: string;
    code: string;
    expiresAt: number;
    whatsappLink: string;
    hasGateway?: boolean;
  }>;
  sendEmailOtpCode: (email: string, managerName?: string) => Promise<SendEmailOtpResponse>;
  signInWithWhatsAppOtp: (phoneNumber: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
  whatsappNumber?: string;
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
    if (account.whatsappNumber) {
      accounts[account.whatsappNumber] = account;
      const rawDigits = cleanPhoneDigits(account.whatsappNumber);
      if (rawDigits) {
        accounts[rawDigits] = account;
      }
    }
    localStorage.setItem(STORAGE_ACCOUNTS_V2_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn('Could not save local v2 account record:', err);
  }
}

function safeDocKey(key: string): string {
  return (key || '').toLowerCase().trim().replace(/[\/\s#$[\]]/g, '_');
}

// Universal Cloud Account persistence across all devices via Firestore
async function saveCloudAccount(account: StoredAccountV2, profileData?: Partial<UserProfile>) {
  try {
    const emailKey = safeDocKey(account.email);
    const accountData = {
      uid: account.uid,
      email: account.email.toLowerCase(),
      displayName: account.displayName,
      whatsappNumber: account.whatsappNumber || null,
      salt: account.salt,
      hash: account.hash,
      createdAt: account.createdAt,
      updatedAt: new Date().toISOString()
    };

    // 1. Save to authAccounts by Email
    if (emailKey) {
      await setDoc(doc(db, 'authAccounts', emailKey), accountData, { merge: true });
    }

    // 2. Save to authAccounts by WhatsApp number / phone digits if available
    if (account.whatsappNumber) {
      const rawDigits = cleanPhoneDigits(account.whatsappNumber);
      if (rawDigits && rawDigits.length >= 7) {
        await setDoc(doc(db, 'authAccounts', 'wa_' + rawDigits), accountData, { merge: true });
        await setDoc(doc(db, 'authAccounts', rawDigits), accountData, { merge: true });
      }
    }

    // 3. Save to users document
    const userDocRef = doc(db, 'users', account.uid);
    await setDoc(userDocRef, {
      uid: account.uid,
      email: account.email.toLowerCase(),
      displayName: account.displayName,
      whatsappNumber: account.whatsappNumber || null,
      salt: account.salt,
      hash: account.hash,
      createdAt: account.createdAt,
      freeAnalysesRemaining: 1,
      paidCredits: 0,
      lastFreeResetAt: new Date().toISOString(),
      role: 'user',
      ...(profileData || {})
    }, { merge: true });
  } catch (err) {
    console.warn('saveCloudAccount notice:', err);
  }
}

// Universal Cloud Account lookup across all devices via Firestore
async function findCloudAccount(identifier: string): Promise<StoredAccountV2 | null> {
  const cleanId = (identifier || '').trim();
  if (!cleanId) return null;

  const rawDigits = cleanPhoneDigits(cleanId);
  const isEmail = cleanId.includes('@');
  const cleanEmail = isEmail ? cleanId.toLowerCase() : '';

  // 1. Direct Firestore authAccounts lookup by Email
  if (isEmail && cleanEmail) {
    try {
      const emailSnap = await getDoc(doc(db, 'authAccounts', safeDocKey(cleanEmail)));
      if (emailSnap.exists()) {
        const data = emailSnap.data() as any;
        if (data.salt && data.hash) {
          return {
            uid: data.uid,
            email: data.email || cleanEmail,
            displayName: data.displayName || cleanEmail.split('@')[0],
            whatsappNumber: data.whatsappNumber || undefined,
            salt: data.salt,
            hash: data.hash,
            createdAt: data.createdAt || new Date().toISOString()
          };
        }
      }
    } catch (e) {
      console.warn('authAccounts email lookup:', e);
    }
  }

  // 2. Direct Firestore authAccounts lookup by Phone / WhatsApp number
  if (rawDigits && rawDigits.length >= 7) {
    try {
      const waSnap1 = await getDoc(doc(db, 'authAccounts', 'wa_' + rawDigits));
      if (waSnap1.exists()) {
        const data = waSnap1.data() as any;
        if (data.salt && data.hash) {
          return {
            uid: data.uid,
            email: data.email || `${rawDigits}@whatsapp.efootballaihub.com`,
            displayName: data.displayName || `Manager_${rawDigits.slice(-4)}`,
            whatsappNumber: data.whatsappNumber || ('+' + rawDigits),
            salt: data.salt,
            hash: data.hash,
            createdAt: data.createdAt || new Date().toISOString()
          };
        }
      }

      const waSnap2 = await getDoc(doc(db, 'authAccounts', rawDigits));
      if (waSnap2.exists()) {
        const data = waSnap2.data() as any;
        if (data.salt && data.hash) {
          return {
            uid: data.uid,
            email: data.email || `${rawDigits}@whatsapp.efootballaihub.com`,
            displayName: data.displayName || `Manager_${rawDigits.slice(-4)}`,
            whatsappNumber: data.whatsappNumber || ('+' + rawDigits),
            salt: data.salt,
            hash: data.hash,
            createdAt: data.createdAt || new Date().toISOString()
          };
        }
      }
    } catch (e) {
      console.warn('authAccounts phone lookup:', e);
    }
  }

  // 3. Firestore users collection fallback query by Email
  if (isEmail && cleanEmail) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const userDoc = querySnap.docs[0];
        const data = userDoc.data() as any;
        if (data.salt && data.hash) {
          const acc: StoredAccountV2 = {
            uid: userDoc.id || data.uid,
            email: data.email || cleanEmail,
            displayName: data.displayName || cleanEmail.split('@')[0],
            whatsappNumber: data.whatsappNumber || undefined,
            salt: data.salt,
            hash: data.hash,
            createdAt: data.createdAt || new Date().toISOString()
          };
          // Cache in authAccounts for future instant lookups
          saveCloudAccount(acc).catch(() => {});
          return acc;
        }
      }
    } catch (e) {
      console.warn('users email query fallback:', e);
    }
  }

  // 4. Firestore users collection fallback query by WhatsApp
  if (rawDigits && rawDigits.length >= 7) {
    try {
      const userRef = doc(db, 'users', 'wa_' + rawDigits);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data.salt && data.hash) {
          const acc: StoredAccountV2 = {
            uid: snap.id,
            email: data.email || `${rawDigits}@whatsapp.efootballaihub.com`,
            displayName: data.displayName || `Manager_${rawDigits.slice(-4)}`,
            whatsappNumber: data.whatsappNumber || ('+' + rawDigits),
            salt: data.salt,
            hash: data.hash,
            createdAt: data.createdAt || new Date().toISOString()
          };
          saveCloudAccount(acc).catch(() => {});
          return acc;
        }
      }
    } catch (e) {
      console.warn('users whatsapp query fallback:', e);
    }
  }

  // 5. Local storage fallback on the current browser
  const localAccounts = getStoredAccountsV2();
  const localAcc = isEmail
    ? localAccounts[cleanEmail]
    : (localAccounts[cleanId] || (rawDigits ? localAccounts[rawDigits] : undefined));

  if (localAcc && localAcc.salt && localAcc.hash) {
    // Automatically replicate to cloud
    saveCloudAccount(localAcc).catch(() => {});
    return localAcc;
  }

  const localWaAccounts = getStoredWhatsAppAccounts();
  const waAcc = localWaAccounts[cleanId] || (rawDigits ? (localWaAccounts[rawDigits] || localWaAccounts['+' + rawDigits]) : undefined);
  if (waAcc && waAcc.salt && waAcc.hash) {
    const acc: StoredAccountV2 = {
      uid: waAcc.uid,
      email: `${cleanPhoneDigits(waAcc.phoneNumber)}@whatsapp.efootballaihub.com`,
      displayName: waAcc.displayName,
      whatsappNumber: waAcc.phoneNumber,
      salt: waAcc.salt,
      hash: waAcc.hash,
      createdAt: waAcc.createdAt
    };
    saveCloudAccount(acc).catch(() => {});
    return acc;
  }

  return null;
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

    // Eagerly set cached profile for instantaneous render & full offline support
    if (cachedProfile) {
      setProfile(cachedProfile);
    }

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

    // 2. Background sync any legacy local accounts to the Cloud so they can be accessed on other devices
    try {
      const localAccs = getStoredAccountsV2();
      Object.values(localAccs).forEach((acc) => {
        if (acc && acc.email && acc.salt && acc.hash) {
          saveCloudAccount(acc).catch(() => {});
        }
      });
      const localWaAccs = getStoredWhatsAppAccounts();
      Object.values(localWaAccs).forEach((waAcc) => {
        if (waAcc && waAcc.phoneNumber && waAcc.salt && waAcc.hash) {
          const rawDigits = cleanPhoneDigits(waAcc.phoneNumber);
          saveCloudAccount({
            uid: waAcc.uid,
            email: `${rawDigits}@whatsapp.efootballaihub.com`,
            displayName: waAcc.displayName,
            whatsappNumber: waAcc.phoneNumber,
            salt: waAcc.salt,
            hash: waAcc.hash,
            createdAt: waAcc.createdAt
          }).catch(() => {});
        }
      });
    } catch {}

    // 3. Firebase Auth listener for background sync
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
   * Automatically synchronizes across all internet-connected devices (Phone, PC, Tablet)
   */
  const signUpWithWhatsApp = async (
    phoneNumber: string,
    password: string,
    managerName: string,
    otpCode?: string
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

    // If an OTP code is explicitly supplied and not 'DIRECT', verify it
    if (otpCode && otpCode !== 'DIRECT') {
      const isCodeValid = verifyWhatsAppCode(cleanPhone, otpCode.trim());
      if (!isCodeValid) {
        throw new Error('Invalid or expired 6-digit verification code. Please request a new code.');
      }
    }

    const pseudoEmail = `${rawDigits}@whatsapp.efootballaihub.com`;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=10b981&color=ffffff&bold=true`;
    const fbUid = `wa_${rawDigits}`;

    // Generate Salted Hash for secure cross-device authentication
    const salt = generateSalt();
    const hash = await hashPasswordWithSalt(cleanPassword, salt);

    const waAccount: StoredWhatsAppAccount = {
      uid: fbUid,
      phoneNumber: cleanPhone,
      displayName: cleanName,
      salt,
      hash,
      createdAt: new Date().toISOString()
    };
    saveWhatsAppAccount(waAccount);

    const newProf: UserProfile = {
      uid: fbUid,
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

    localStorage.setItem(`ef_profile_${fbUid}`, JSON.stringify(newProf));
    setProfile(newProf);

    // Save to Universal Cloud Database (Accessible from any device)
    await saveCloudAccount({
      uid: fbUid,
      email: pseudoEmail,
      displayName: cleanName,
      whatsappNumber: cleanPhone,
      salt,
      hash,
      createdAt: new Date().toISOString()
    }, newProf);

    // Also attempt Firebase Auth creation in background
    try {
      const cred = await createUserWithEmailAndPassword(auth, pseudoEmail, cleanPassword);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: cleanName, photoURL: avatarUrl }).catch(() => {});
      }
    } catch {}

    const authUser: AppAuthUser = {
      uid: fbUid,
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
   * Works on ANY phone, computer, or tablet connected to the internet
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

    const pseudoEmail = `${rawDigits}@whatsapp.efootballaihub.com`;

    // 1. Primary: Lookup account from Universal Cloud Database (Firestore)
    const cloudAcc = await findCloudAccount(cleanPhone) || await findCloudAccount(rawDigits);
    if (cloudAcc && cloudAcc.salt && cloudAcc.hash) {
      const computedHash = await hashPasswordWithSalt(cleanPassword, cloudAcc.salt);
      if (computedHash === cloudAcc.hash) {
        const authUser: AppAuthUser = {
          uid: cloudAcc.uid,
          email: cloudAcc.email || pseudoEmail,
          displayName: cloudAcc.displayName,
          whatsappNumber: cloudAcc.whatsappNumber || cleanPhone
        };
        setUser(authUser);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
        await fetchProfile(cloudAcc.uid, authUser.email || '', cloudAcc.displayName, undefined, authUser.whatsappNumber);
        return;
      } else {
        throw new Error('Incorrect password. Please verify your password and try again.');
      }
    }

    // 2. Firebase Cloud Auth fallback
    try {
      const cred = await signInWithEmailAndPassword(auth, pseudoEmail, cleanPassword);
      const authUser: AppAuthUser = {
        uid: cred.user.uid,
        email: cred.user.email || pseudoEmail,
        displayName: cred.user.displayName || 'Manager',
        whatsappNumber: cleanPhone
      };
      setUser(authUser);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
      await fetchProfile(cred.user.uid, pseudoEmail, cred.user.displayName || undefined, undefined, cleanPhone);
      return;
    } catch {}

    throw new Error('No account found for this WhatsApp number. Click "Sign up with WhatsApp" below to create your account.');
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
    const cloudAcc = await findCloudAccount(cleanPhone) || await findCloudAccount(rawDigits);
    const uid = cloudAcc?.uid || `wa_${rawDigits}`;
    const displayName = cloudAcc?.displayName || `Manager_${rawDigits.slice(-4)}`;
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
   * Universal Sign In (Email or WhatsApp Number + Password)
   * Works on ANY internet-connected device (Phone, Tablet, Desktop, Laptop)
   */
  const signIn = async (identifier: string, p: string) => {
    const cleanId = (identifier || '').trim();
    if (!cleanId) throw new Error('Please enter your email or WhatsApp phone number.');
    
    const cleanEmail = cleanId.toLowerCase();
    const cleanPassword = (p || '').trim();
    const rawDigits = cleanPhoneDigits(cleanId);

    // 1. If it's a phone number, route to WhatsApp sign in
    if (!cleanId.includes('@') && rawDigits.length >= 7) {
      return signInWithWhatsApp(cleanId, p);
    }

    if (!cleanPassword) {
      throw new Error('Please enter your password.');
    }

    // 2. Primary: Universal Cloud Account Verification (Firestore authAccounts / users)
    const cloudAcc = await findCloudAccount(cleanEmail);
    if (cloudAcc && cloudAcc.salt && cloudAcc.hash) {
      const computedHash = await hashPasswordWithSalt(cleanPassword, cloudAcc.salt);
      if (computedHash === cloudAcc.hash) {
        const authUser: AppAuthUser = {
          uid: cloudAcc.uid,
          email: cloudAcc.email,
          displayName: cloudAcc.displayName,
          whatsappNumber: cloudAcc.whatsappNumber
        };
        setUser(authUser);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));

        // Background sync to Firebase Auth if possible
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        } catch {
          try {
            await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          } catch {}
        }

        await fetchProfile(cloudAcc.uid, cloudAcc.email, cloudAcc.displayName, undefined, cloudAcc.whatsappNumber);
        return;
      } else {
        throw new Error('Incorrect password. Please verify and try again, or click "Forgot Password?" to reset.');
      }
    }

    // 3. Secondary: Firebase Cloud Auth verification
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const authUser: AppAuthUser = {
        uid: cred.user.uid,
        email: cred.user.email || cleanEmail,
        displayName: cred.user.displayName || cleanEmail.split('@')[0],
        photoURL: cred.user.photoURL || undefined
      };
      setUser(authUser);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
      await fetchProfile(cred.user.uid, cred.user.email || cleanEmail, cred.user.displayName || undefined);
      return;
    } catch (fbErr: any) {
      const errorCode = fbErr?.code;
      if (errorCode === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please verify and try again or use Forgot Password.');
      }
    }

    // 4. Tertiary: Check local legacy accounts on this browser
    const accountsV2 = getStoredAccountsV2();
    const accV2 = accountsV2[cleanEmail] || (rawDigits && rawDigits.length >= 7 ? accountsV2[rawDigits] : undefined);
    if (accV2 && accV2.salt && accV2.hash) {
      const computedHash = await hashPasswordWithSalt(cleanPassword, accV2.salt);
      if (computedHash === accV2.hash) {
        // Automatically save to Cloud so user can sign in on any other device
        saveCloudAccount(accV2).catch(() => {});

        const localUser: AppAuthUser = {
          uid: accV2.uid,
          email: accV2.email,
          displayName: accV2.displayName,
          whatsappNumber: accV2.whatsappNumber
        };
        setUser(localUser);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(localUser));
        await fetchProfile(accV2.uid, accV2.email, accV2.displayName, undefined, accV2.whatsappNumber);
        return;
      } else {
        throw new Error('Incorrect password. Please verify and try again.');
      }
    }

    throw new Error('No account found for this email address. Please create an account to get started.');
  };

  const resetPassword = async (emailToReset: string) => {
    const cleanEmail = (emailToReset || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }

    let firebaseSuccess = false;
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      firebaseSuccess = true;
    } catch (fbErr: any) {
      console.warn('Firebase sendPasswordResetEmail attempt:', fbErr?.code || fbErr?.message);
    }

    try {
      await sendEmailVerificationCode(cleanEmail);
    } catch (emailErr) {
      if (!firebaseSuccess) {
        throw new Error('Could not send password reset email. Please verify your email address or try again.');
      }
    }
  };

  const sendEmailOtpCode = async (email: string, managerName?: string) => {
    return sendEmailVerificationCode(email, managerName);
  };

  /**
   * Universal Sign Up with 6-digit Email Verification & Integrated WhatsApp Number
   * Accessible on ANY device across the globe immediately upon creation
   */
  const signUp = async (
    emailOrPhone: string,
    p: string,
    name: string,
    otpCode?: string,
    whatsappNumber?: string
  ) => {
    const cleanId = (emailOrPhone || '').trim();
    const cleanEmail = cleanId.toLowerCase();
    const cleanPassword = (p || '').trim();
    const cleanName = (name || '').trim() || cleanEmail.split('@')[0] || 'Tactician';
    const cleanWhatsApp = (whatsappNumber || '').trim();

    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Verify 6-digit Email Verification Code
    if (!otpCode || otpCode.trim().length !== 6) {
      throw new Error('Please enter the 6-digit verification code sent to your email.');
    }

    const isCodeValid = await verifyEmailVerificationCode(cleanEmail, otpCode.trim());
    if (!isCodeValid) {
      throw new Error('Invalid or expired 6-digit email verification code. Please check your inbox or click Resend.');
    }

    // Check if account already exists in cloud
    const existingCloud = await findCloudAccount(cleanEmail);
    if (existingCloud) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    const finalUid = 'u_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    const salt = generateSalt();
    const hash = await hashPasswordWithSalt(cleanPassword, salt);

    const accountRecord: StoredAccountV2 = {
      uid: finalUid,
      email: cleanEmail,
      displayName: cleanName,
      whatsappNumber: cleanWhatsApp || undefined,
      salt,
      hash,
      createdAt: new Date().toISOString()
    };
    saveAccountV2(accountRecord);

    const newProf: UserProfile = {
      uid: finalUid,
      email: cleanEmail,
      displayName: cleanName,
      whatsappNumber: cleanWhatsApp || undefined,
      createdAt: new Date().toISOString(),
      freeAnalysesRemaining: 1,
      paidCredits: 0,
      lastFreeResetAt: new Date().toISOString(),
      role: 'user'
    };

    localStorage.setItem(`ef_profile_${finalUid}`, JSON.stringify(newProf));
    setProfile(newProf);

    // Save to Cloud Firestore for instant cross-device access from any phone, laptop, or tablet
    await saveCloudAccount(accountRecord, newProf);

    // Also attempt Firebase Auth creation in background
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
      }
    } catch (fbErr: any) {
      console.warn('Firebase Cloud Auth user registration notice:', fbErr);
    }

    const authUser: AppAuthUser = {
      uid: finalUid,
      email: cleanEmail,
      displayName: cleanName,
      whatsappNumber: cleanWhatsApp || undefined
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

  const deleteAccount = async () => {
    if (!user) return;
    const currentUid = user.uid;
    const currentEmail = user.email ? user.email.toLowerCase() : '';
    const currentWhatsApp = user.whatsappNumber || '';

    // 1. Delete user profile document from Firestore
    try {
      await deleteDoc(doc(db, 'users', currentUid));
    } catch (e) {
      console.warn('Could not delete user doc from Firestore:', e);
    }

    // 2. Delete user squads and saved analyses in Firestore
    try {
      const squadsQuery = query(collection(db, 'userSquads'), where('userId', '==', currentUid));
      const squadSnaps = await getDocs(squadsQuery);
      for (const sDoc of squadSnaps.docs) {
        await deleteDoc(doc(db, 'userSquads', sDoc.id)).catch(() => {});
      }
    } catch (e) {
      console.warn('Could not delete user squads from Firestore:', e);
    }

    try {
      const reportsQuery = query(collection(db, 'savedAnalyses'), where('userId', '==', currentUid));
      const reportSnaps = await getDocs(reportsQuery);
      for (const rDoc of reportSnaps.docs) {
        await deleteDoc(doc(db, 'savedAnalyses', rDoc.id)).catch(() => {});
      }
    } catch (e) {
      console.warn('Could not delete saved analyses from Firestore:', e);
    }

    // 3. Delete from Firebase Auth if current Firebase user
    if (auth.currentUser) {
      try {
        await deleteUser(auth.currentUser);
      } catch (e) {
        console.warn('Firebase auth deleteUser error:', e);
      }
    }

    // 4. Remove local credential stores
    try {
      if (currentEmail) {
        const emailAccounts = getStoredAccountsV2();
        delete emailAccounts[currentEmail];
        localStorage.setItem(STORAGE_ACCOUNTS_V2_KEY, JSON.stringify(emailAccounts));
      }
      if (currentWhatsApp) {
        const waAccounts = getStoredWhatsAppAccounts();
        delete waAccounts[currentWhatsApp];
        delete waAccounts[cleanPhoneDigits(currentWhatsApp)];
        localStorage.setItem(STORAGE_WHATSAPP_ACCOUNTS_KEY, JSON.stringify(waAccounts));
      }
      const legacyRaw = localStorage.getItem(STORAGE_LEGACY_ACCOUNTS_KEY);
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (currentEmail && legacy[currentEmail]) delete legacy[currentEmail];
        localStorage.setItem(STORAGE_LEGACY_ACCOUNTS_KEY, JSON.stringify(legacy));
      }
    } catch (err) {
      console.warn('Error clearing local stored accounts:', err);
    }

    // 5. Clear all local user session & cached profile data
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(`ef_profile_${currentUid}`);
    localStorage.removeItem(`ef_user_squads_${currentUid}`);

    // 6. Sign out & reset state
    await fbSignOut(auth).catch(() => {});
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
        sendEmailOtpCode,
        signInWithWhatsAppOtp,
        logout,
        deleteAccount,
        refreshProfile,
        resetPassword
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
