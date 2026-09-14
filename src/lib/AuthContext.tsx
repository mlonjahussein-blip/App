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
  saveUniversalCloudAccount,
  findUniversalCloudAccount,
  updateUniversalCloudPassword,
  readDocREST,
  writeDocREST,
  cleanPhoneDigits,
  sanitizeKey,
  CloudAccountRecord
} from './cloudStore.ts';
import {
  sendWhatsAppVerificationCode,
  verifyWhatsAppCode,
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
  signInWithEmailOtp: (email: string, otpCode: string) => Promise<void>;
  resetPasswordWithOtp: (identifier: string, otpCode: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
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

// Universal Cloud Account persistence across all devices via direct Firestore REST & SDK
async function saveCloudAccount(account: StoredAccountV2, profileData?: Partial<UserProfile>) {
  try {
    await saveUniversalCloudAccount({
      uid: account.uid,
      email: account.email.toLowerCase(),
      displayName: account.displayName,
      whatsappNumber: account.whatsappNumber,
      salt: account.salt,
      hash: account.hash,
      createdAt: account.createdAt,
      freeAnalysesRemaining: profileData?.freeAnalysesRemaining ?? 5,
      paidCredits: profileData?.paidCredits ?? 0,
      lastFreeResetAt: profileData?.lastFreeResetAt || new Date().toISOString(),
      role: profileData?.role || 'user'
    });

    // Also notify server API endpoint in background for cross-environment redundancy
    try {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: account.uid,
          email: account.email.toLowerCase(),
          displayName: account.displayName,
          whatsappNumber: account.whatsappNumber,
          salt: account.salt,
          hash: account.hash
        })
      }).catch(() => {});
    } catch {}
  } catch (err) {
    console.warn('saveCloudAccount notice:', err);
  }
}

// Universal Cloud Account lookup across all devices (Cloud Firestore is the SOLE authority)
async function findCloudAccount(identifier: string): Promise<StoredAccountV2 | null> {
  const cleanId = (identifier || '').trim();
  if (!cleanId) return null;

  // 1. Direct Cloud Store Lookup (REST + SDK)
  try {
    const cloudRecord = await findUniversalCloudAccount(cleanId);
    if (cloudRecord && cloudRecord.salt && cloudRecord.hash) {
      return {
        uid: cloudRecord.uid,
        email: cloudRecord.email,
        displayName: cloudRecord.displayName,
        whatsappNumber: cloudRecord.whatsappNumber,
        salt: cloudRecord.salt,
        hash: cloudRecord.hash,
        createdAt: cloudRecord.createdAt
      };
    }
  } catch (e) {
    console.warn('findUniversalCloudAccount notice:', e);
  }

  // 2. Server API fallback query
  try {
    const apiRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanId })
    });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json && json.found && json.account && json.account.salt && json.account.hash) {
        return {
          uid: json.account.uid,
          email: json.account.email,
          displayName: json.account.displayName,
          whatsappNumber: json.account.whatsappNumber,
          salt: json.account.salt,
          hash: json.account.hash,
          createdAt: json.account.createdAt || new Date().toISOString()
        };
      }
    }
  } catch {}

  // Cloud database is authoritative; do not fall back to local storage
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

    // 1. Direct Cloud REST read (fastest, guaranteed across all devices)
    try {
      const restDoc = await readDocREST('users', uid);
      if (restDoc && (restDoc.email || restDoc.uid)) {
        let freeAnalysesRemaining = typeof restDoc.freeAnalysesRemaining === 'number' ? restDoc.freeAnalysesRemaining : 5;
        let lastFreeResetAt = restDoc.lastFreeResetAt || new Date().toISOString();

        // One-time upgrade check: Grant 5 free analyses to all existing user accounts
        if (restDoc.v5GrantVersion !== 1) {
          freeAnalysesRemaining = 5;
          lastFreeResetAt = new Date().toISOString();
          writeDocREST('users', uid, { freeAnalysesRemaining: 5, v5GrantVersion: 1, lastFreeResetAt }).catch(() => {});
        }

        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        let lastResetTime = new Date(lastFreeResetAt).getTime();
        if (isNaN(lastResetTime) || Date.now() - lastResetTime >= sevenDaysMs) {
          freeAnalysesRemaining = 5;
          lastFreeResetAt = new Date().toISOString();
          writeDocREST('users', uid, { freeAnalysesRemaining: 5, lastFreeResetAt, v5GrantVersion: 1 }).catch(() => {});
        }

        const fullProf: UserProfile = {
          uid: restDoc.uid || uid,
          email: restDoc.email || defaultEmail,
          displayName: restDoc.displayName || displayName || defaultEmail.split('@')[0] || 'Tactician',
          whatsappNumber: restDoc.whatsappNumber || whatsappNumber || undefined,
          photoURL: restDoc.photoURL || photoURL || undefined,
          createdAt: restDoc.createdAt || new Date().toISOString(),
          freeAnalysesRemaining,
          paidCredits: typeof restDoc.paidCredits === 'number' ? restDoc.paidCredits : 0,
          lastFreeResetAt,
          role: restDoc.role || 'user'
        };
        setProfile(fullProf);
        localStorage.setItem(localProfileKey, JSON.stringify(fullProf));
        return;
      }
    } catch {}

    // 2. Firestore SDK fallback
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
          freeAnalysesRemaining: 5,
          paidCredits: 0,
          lastFreeResetAt: new Date().toISOString(),
          role: 'user'
        };
        try {
          await writeDocREST('users', uid, newProf);
          await setDoc(ref, newProf, { merge: true });
        } catch (e) {
          console.warn('Could not write profile to firestore:', e);
        }
        setProfile(newProf);
        localStorage.setItem(localProfileKey, JSON.stringify(newProf));
      }
    } catch (err) {
      console.warn('Could not read user profile from firestore:', err);
      if (cachedProfile) {
        setProfile(cachedProfile);
      }
    }
  };

  useEffect(() => {
    // 1. Wipe legacy local testing stores to ensure clean slate across all browsers
    try {
      localStorage.removeItem(STORAGE_ACCOUNTS_V2_KEY);
      localStorage.removeItem(STORAGE_WHATSAPP_ACCOUNTS_KEY);
      localStorage.removeItem(STORAGE_LEGACY_ACCOUNTS_KEY);
      localStorage.removeItem('ef_pending_whatsapp_otps');
    } catch {}

    // 2. Check local session and verify against Cloud Firestore authority
    try {
      const rawSession = localStorage.getItem(STORAGE_SESSION_KEY);
      if (rawSession) {
        const savedSession = JSON.parse(rawSession) as AppAuthUser;
        if (savedSession && savedSession.uid) {
          const verifyIdentifier = savedSession.email || savedSession.whatsappNumber || savedSession.uid;
          findCloudAccount(verifyIdentifier)
            .then((cloudAcc) => {
              if (!cloudAcc) {
                // Account does not exist in Cloud database (e.g. was purged) -> immediately log out
                console.log('Session user not found in cloud database; clearing local session.');
                localStorage.removeItem(STORAGE_SESSION_KEY);
                setUser(null);
                setProfile(null);
              } else {
                setUser(savedSession);
                fetchProfile(
                  savedSession.uid,
                  savedSession.email || '',
                  savedSession.displayName || undefined,
                  savedSession.photoURL || undefined,
                  savedSession.whatsappNumber || undefined
                );
              }
            })
            .catch(() => {
              setUser(savedSession);
            });
        }
      }
    } catch (e) {
      console.warn('Session parse error:', e);
    }

    // 3. Firebase Auth listener with strict Cloud DB verification
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const verifyId = u.email || u.uid;
        try {
          const cloudAcc = await findCloudAccount(verifyId);
          if (!cloudAcc) {
            // Account was deleted/purged from the cloud database -> destroy lingering Firebase user & session
            console.log('Firebase user not found in cloud database; terminating session.');
            await deleteUser(u).catch(() => {});
            await fbSignOut(auth).catch(() => {});
            localStorage.removeItem(STORAGE_SESSION_KEY);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
          const authUser: AppAuthUser = {
            uid: cloudAcc.uid || u.uid,
            email: cloudAcc.email || u.email,
            displayName: cloudAcc.displayName || u.displayName,
            photoURL: u.photoURL,
            emailVerified: u.emailVerified,
            whatsappNumber: cloudAcc.whatsappNumber
          };
          setUser(authUser);
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
          await fetchProfile(authUser.uid, authUser.email || '', authUser.displayName || undefined, undefined, authUser.whatsappNumber);
          setLoading(false);
        } catch {
          setLoading(false);
        }
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

    const newProf: UserProfile = {
      uid: fbUid,
      email: pseudoEmail,
      displayName: cleanName,
      whatsappNumber: cleanPhone,
      photoURL: avatarUrl,
      createdAt: new Date().toISOString(),
      freeAnalysesRemaining: 5,
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

    // 2. If no cloud account exists in Firestore, purge any lingering Firebase auth user and reject
    try {
      const cred = await signInWithEmailAndPassword(auth, pseudoEmail, cleanPassword);
      if (cred.user) {
        await deleteUser(cred.user).catch(() => {});
        await fbSignOut(auth).catch(() => {});
      }
    } catch {}

    throw new Error('No registered account found for this WhatsApp number in the system cloud. Please click "Sign up with WhatsApp" below to create your account.');
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

    // Lookup registered account in cloud
    const cloudAcc = await findCloudAccount(cleanPhone) || await findCloudAccount(rawDigits);
    if (!cloudAcc) {
      throw new Error('No registered account found with this WhatsApp number. Please click "Sign up with WhatsApp" to register first.');
    }

    const uid = cloudAcc.uid;
    const displayName = cloudAcc.displayName || `Manager_${rawDigits.slice(-4)}`;
    const pseudoEmail = cloudAcc.email || `${rawDigits}@whatsapp.efootballaihub.com`;
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

    // 3. No account in Cloud DB -> clean up any lingering legacy Firebase Auth user and reject
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      if (cred.user) {
        await deleteUser(cred.user).catch(() => {});
        await fbSignOut(auth).catch(() => {});
      }
    } catch {}

    throw new Error('No registered account found for this email address in the system cloud. Please click "Create Account" below to sign up.');
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

  /**
   * Reset Password with verified 6-digit Email/WhatsApp OTP Code
   * Saves new salt and hash to Cloud Firestore for immediate access across all devices
   */
  const resetPasswordWithOtp = async (identifier: string, otpCode: string, newPassword: string) => {
    const cleanId = (identifier || '').trim();
    const cleanCode = (otpCode || '').trim();
    const cleanPass = (newPassword || '').trim();

    if (!cleanId) {
      throw new Error('Please enter your email address or WhatsApp phone number.');
    }
    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('Please enter the 6-digit verification code.');
    }
    if (!cleanPass || cleanPass.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const isEmail = cleanId.includes('@');
    const rawDigits = cleanPhoneDigits(cleanId);

    // 1. Verify 6-digit code
    let isCodeValid = false;
    if (isEmail) {
      isCodeValid = await verifyEmailVerificationCode(cleanId.toLowerCase(), cleanCode);
    } else if (rawDigits && rawDigits.length >= 7) {
      const cleanPhone = cleanId.startsWith('+') ? cleanId : '+' + rawDigits;
      isCodeValid = verifyWhatsAppCode(cleanPhone, cleanCode);
    }

    if (!isCodeValid) {
      throw new Error('Invalid or expired 6-digit verification code. Please check your code or click Resend.');
    }

    // 2. Generate new cryptographically secure salt & SHA-256 hash
    const salt = generateSalt();
    const hash = await hashPasswordWithSalt(cleanPass, salt);

    // 3. Update across Firestore cloud database records
    await updateUniversalCloudPassword(cleanId, salt, hash);

    // 4. Notify server API endpoint in background
    try {
      fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, salt, hash })
      }).catch(() => {});
    } catch {}

    // 5. Sign in the user automatically
    await signIn(cleanId, cleanPass);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('You must be signed in to change your password.');
    const cleanCurrent = (currentPassword || '').trim();
    const cleanNew = (newPassword || '').trim();

    if (!cleanCurrent) {
      throw new Error('Please enter your current password.');
    }
    if (!cleanNew || cleanNew.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const identifier = user.email || user.whatsappNumber || user.uid;
    const cloudAcc = await findCloudAccount(identifier);
    if (!cloudAcc || !cloudAcc.salt || !cloudAcc.hash) {
      throw new Error('Account record not found in system cloud database.');
    }

    const computedCurrentHash = await hashPasswordWithSalt(cleanCurrent, cloudAcc.salt);
    if (computedCurrentHash !== cloudAcc.hash) {
      throw new Error('Current password is incorrect.');
    }

    const newSalt = generateSalt();
    const newHash = await hashPasswordWithSalt(cleanNew, newSalt);

    await updateUniversalCloudPassword(identifier, newSalt, newHash);
    try {
      fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, salt: newSalt, hash: newHash })
      }).catch(() => {});
    } catch {}
  };

  /**
   * Passwordless Sign In with verified 6-digit Email OTP code
   */
  const signInWithEmailOtp = async (email: string, otpCode: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (otpCode || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('Please enter the 6-digit verification code sent to your email.');
    }

    const isCodeValid = await verifyEmailVerificationCode(cleanEmail, cleanCode);
    if (!isCodeValid) {
      throw new Error('Invalid or expired 6-digit email code. Please check your inbox or click Resend.');
    }

    // Lookup existing account in cloud
    const cloudAcc = await findCloudAccount(cleanEmail);
    if (!cloudAcc) {
      throw new Error('No registered account found with this email in the system cloud. Please sign up to create your account.');
    }

    const uid = cloudAcc.uid;
    const displayName = cloudAcc.displayName || cleanEmail.split('@')[0] || 'Tactician';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=ffffff&bold=true`;

    const authUser: AppAuthUser = {
      uid,
      email: cleanEmail,
      displayName,
      photoURL: avatarUrl,
      whatsappNumber: cloudAcc.whatsappNumber
    };

    setUser(authUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(authUser));
    await fetchProfile(uid, cleanEmail, displayName, avatarUrl, cloudAcc.whatsappNumber);
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

    const newProf: UserProfile = {
      uid: finalUid,
      email: cleanEmail,
      displayName: cleanName,
      whatsappNumber: cleanWhatsApp || undefined,
      createdAt: new Date().toISOString(),
      freeAnalysesRemaining: 5,
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

    // 4. Clear all local user session & cached profile data
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(`ef_profile_${currentUid}`);
    localStorage.removeItem(`ef_user_squads_${currentUid}`);

    // 5. Sign out & reset state
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
        signInWithEmailOtp,
        resetPasswordWithOtp,
        logout,
        deleteAccount,
        refreshProfile,
        resetPassword,
        changePassword
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
