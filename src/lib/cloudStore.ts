import firebaseConfig from '../../firebase-applet-config.json';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface CloudAccountRecord {
  uid: string;
  email: string;
  displayName: string;
  whatsappNumber?: string;
  salt: string;
  hash: string;
  createdAt: string;
  role?: string;
  freeAnalysesRemaining?: number;
  paidCredits?: number;
  lastFreeResetAt?: string;
}

const PROJECT_ID = firebaseConfig.projectId || 'emergent-fastness-8lcf1';
const DB_ID = firebaseConfig.firestoreDatabaseId || 'ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba';
const API_KEY = firebaseConfig.apiKey || 'AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY';
const BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;

export function cleanPhoneDigits(phone: string): string {
  return (phone || '').replace(/[^0-9]/g, '');
}

export function sanitizeKey(key: string): string {
  return (key || '').toLowerCase().trim().replace(/[\/\s#$[\]]/g, '_');
}

/**
 * Converts a standard JavaScript object into Firestore REST API payload fields
 */
function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((item) => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return { integerValue: String(item) };
            if (typeof item === 'boolean') return { booleanValue: item };
            return { stringValue: String(item) };
          })
        }
      };
    }
  }
  return fields;
}

/**
 * Converts Firestore REST document fields back to standard JavaScript object
 */
export function fromFirestoreDoc(docData: any): any {
  if (!docData || !docData.fields) return null;
  const result: any = {};
  for (const [key, val] of Object.entries(docData.fields as Record<string, any>)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue, 10);
    else if (val.doubleValue !== undefined) result[key] = parseFloat(val.doubleValue);
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.nullValue !== undefined) result[key] = null;
    else if (val.arrayValue && val.arrayValue.values) {
      result[key] = val.arrayValue.values.map((item: any) => item.stringValue ?? item.integerValue ?? item.booleanValue ?? item);
    }
  }
  return result;
}

/**
 * Direct REST write to Firestore document (100% universal across all browsers and devices)
 */
export async function writeDocREST(collectionName: string, docId: string, data: Record<string, any>): Promise<boolean> {
  try {
    const encodedId = encodeURIComponent(docId);
    const url = `${BASE_REST_URL}/${collectionName}/${encodedId}?key=${API_KEY}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFirestoreFields(data) })
    });
    return res.ok;
  } catch (e) {
    console.warn(`writeDocREST error for ${collectionName}/${docId}:`, e);
    return false;
  }
}

/**
 * Direct REST read from Firestore document (100% universal across all browsers and devices)
 */
export async function readDocREST(collectionName: string, docId: string): Promise<any | null> {
  try {
    const encodedId = encodeURIComponent(docId);
    const url = `${BASE_REST_URL}/${collectionName}/${encodedId}?key=${API_KEY}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const json = await res.json();
    return fromFirestoreDoc(json);
  } catch (e) {
    console.warn(`readDocREST error for ${collectionName}/${docId}:`, e);
    return null;
  }
}

/**
 * Direct REST query for finding user by field value
 */
export async function queryUserREST(field: string, value: string): Promise<any | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents:runQuery?key=${API_KEY}`;
    const queryPayload = {
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value: { stringValue: value }
          }
        },
        limit: 1
      }
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryPayload)
    });
    if (!res.ok) return null;
    const results = await res.json();
    if (Array.isArray(results) && results.length > 0 && results[0].document) {
      return fromFirestoreDoc(results[0].document);
    }
    return null;
  } catch (e) {
    console.warn(`queryUserREST error on field ${field}:`, e);
    return null;
  }
}

/**
 * Universal Cloud Account Saver:
 * Writes to both REST endpoints and SDK instances in parallel to ensure immediate multi-device visibility
 */
export async function saveUniversalCloudAccount(account: CloudAccountRecord): Promise<void> {
  const cleanEmail = account.email.toLowerCase().trim();
  const rawDigits = cleanPhoneDigits(account.whatsappNumber || '');
  const emailKey = sanitizeKey(cleanEmail);

  const payload = {
    uid: account.uid,
    email: cleanEmail,
    displayName: account.displayName,
    whatsappNumber: account.whatsappNumber || null,
    salt: account.salt,
    hash: account.hash,
    createdAt: account.createdAt,
    freeAnalysesRemaining: account.freeAnalysesRemaining ?? 5,
    paidCredits: account.paidCredits ?? 0,
    lastFreeResetAt: account.lastFreeResetAt || new Date().toISOString(),
    role: account.role || 'user',
    updatedAt: new Date().toISOString()
  };

  const tasks: Promise<any>[] = [];

  // 1. Primary REST write by email key in authAccounts
  if (emailKey) {
    tasks.push(writeDocREST('authAccounts', emailKey, payload));
  }

  // 2. REST writes by WhatsApp number if provided
  if (rawDigits && rawDigits.length >= 7) {
    tasks.push(writeDocREST('authAccounts', 'wa_' + rawDigits, payload));
    tasks.push(writeDocREST('authAccounts', rawDigits, payload));
    if (account.whatsappNumber) {
      tasks.push(writeDocREST('authAccounts', sanitizeKey(account.whatsappNumber), payload));
    }
  }

  // 3. REST write by UID in users collection
  tasks.push(writeDocREST('users', account.uid, payload));

  // 4. Also write via Firestore client SDK with non-blocking error handling
  try {
    if (emailKey) {
      tasks.push(setDoc(doc(db, 'authAccounts', emailKey), payload, { merge: true }).catch(() => {}));
    }
    tasks.push(setDoc(doc(db, 'users', account.uid), payload, { merge: true }).catch(() => {}));
  } catch {}

  // 5. Send User Account Notification Email directly to efootballaihub@gmail.com
  try {
    const isWaPseudo = cleanEmail.includes('whatsapp.efootballaihub.com');
    const userEmailForMsg = isWaPseudo ? (account.whatsappNumber || cleanEmail) : cleanEmail;

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: '2c6e64c2-984e-4f36-a191-44755a498bb9',
        subject: `[New User Account] ${account.displayName} registered on eFootball AI Hub`,
        name: account.displayName,
        email: 'efootballaihub@gmail.com',
        message: `New User Account Details:\n\nManager Name: ${account.displayName}\nEmail Address: ${userEmailForMsg}\nWhatsApp Phone: ${account.whatsappNumber || 'N/A'}\nUser Account UID: ${account.uid}\nCreated At: ${account.createdAt || new Date().toUTCString()}\nRole: ${account.role || 'user'}\nPlatform: eFootball AI Hub (efootballaihub.com)`
      })
    }).catch(() => {});
  } catch {}

  await Promise.allSettled(tasks);
}

/**
 * Universal Cloud Account Finder:
 * Fast, resilient lookup across REST endpoints and Firestore collections
 * Returns the full account with cryptographic salt & hash for authentication on any device
 */
export async function findUniversalCloudAccount(identifier: string): Promise<CloudAccountRecord | null> {
  const cleanId = (identifier || '').trim();
  if (!cleanId) return null;

  const rawDigits = cleanPhoneDigits(cleanId);
  const isEmail = cleanId.includes('@');
  const cleanEmail = isEmail ? cleanId.toLowerCase() : '';

  // 1. Check direct Email lookup in authAccounts via REST
  if (isEmail && cleanEmail) {
    const emailKey = sanitizeKey(cleanEmail);
    const data = await readDocREST('authAccounts', emailKey);
    if (data && data.salt && data.hash) {
      return {
        uid: data.uid,
        email: data.email || cleanEmail,
        displayName: data.displayName || cleanEmail.split('@')[0],
        whatsappNumber: data.whatsappNumber || undefined,
        salt: data.salt,
        hash: data.hash,
        createdAt: data.createdAt || new Date().toISOString(),
        role: data.role,
        freeAnalysesRemaining: data.freeAnalysesRemaining,
        paidCredits: data.paidCredits,
        lastFreeResetAt: data.lastFreeResetAt
      };
    }
  }

  // 2. Check WhatsApp / Phone digits in authAccounts via REST
  if (rawDigits && rawDigits.length >= 7) {
    const waData1 = await readDocREST('authAccounts', 'wa_' + rawDigits);
    if (waData1 && waData1.salt && waData1.hash) {
      return {
        uid: waData1.uid,
        email: waData1.email || `${rawDigits}@whatsapp.efootballaihub.com`,
        displayName: waData1.displayName || `Manager_${rawDigits.slice(-4)}`,
        whatsappNumber: waData1.whatsappNumber || ('+' + rawDigits),
        salt: waData1.salt,
        hash: waData1.hash,
        createdAt: waData1.createdAt || new Date().toISOString(),
        role: waData1.role,
        freeAnalysesRemaining: waData1.freeAnalysesRemaining,
        paidCredits: waData1.paidCredits
      };
    }

    const waData2 = await readDocREST('authAccounts', rawDigits);
    if (waData2 && waData2.salt && waData2.hash) {
      return {
        uid: waData2.uid,
        email: waData2.email || `${rawDigits}@whatsapp.efootballaihub.com`,
        displayName: waData2.displayName || `Manager_${rawDigits.slice(-4)}`,
        whatsappNumber: waData2.whatsappNumber || ('+' + rawDigits),
        salt: waData2.salt,
        hash: waData2.hash,
        createdAt: waData2.createdAt || new Date().toISOString(),
        role: waData2.role,
        freeAnalysesRemaining: waData2.freeAnalysesRemaining,
        paidCredits: waData2.paidCredits
      };
    }

    const waData3 = await readDocREST('users', 'wa_' + rawDigits);
    if (waData3 && waData3.salt && waData3.hash) {
      return {
        uid: waData3.uid || ('wa_' + rawDigits),
        email: waData3.email || `${rawDigits}@whatsapp.efootballaihub.com`,
        displayName: waData3.displayName || `Manager_${rawDigits.slice(-4)}`,
        whatsappNumber: waData3.whatsappNumber || ('+' + rawDigits),
        salt: waData3.salt,
        hash: waData3.hash,
        createdAt: waData3.createdAt || new Date().toISOString(),
        role: waData3.role,
        freeAnalysesRemaining: waData3.freeAnalysesRemaining,
        paidCredits: waData3.paidCredits
      };
    }
  }

  // 3. Query users collection by email via REST
  if (isEmail && cleanEmail) {
    const queryData = await queryUserREST('email', cleanEmail);
    if (queryData && queryData.salt && queryData.hash) {
      const acc: CloudAccountRecord = {
        uid: queryData.uid,
        email: queryData.email || cleanEmail,
        displayName: queryData.displayName || cleanEmail.split('@')[0],
        whatsappNumber: queryData.whatsappNumber || undefined,
        salt: queryData.salt,
        hash: queryData.hash,
        createdAt: queryData.createdAt || new Date().toISOString(),
        role: queryData.role,
        freeAnalysesRemaining: queryData.freeAnalysesRemaining,
        paidCredits: queryData.paidCredits
      };
      // Cache in authAccounts
      saveUniversalCloudAccount(acc).catch(() => {});
      return acc;
    }
  }

  // 4. Firestore SDK fallback
  try {
    if (isEmail && cleanEmail) {
      const emailSnap = await getDoc(doc(db, 'authAccounts', sanitizeKey(cleanEmail)));
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
    }
  } catch {}

  return null;
}

/**
 * Universal Cloud Password Updater:
 * Updates the salt & hash across all database records linked to this email, whatsapp, or uid
 */
export async function updateUniversalCloudPassword(identifier: string, newSalt: string, newHash: string): Promise<boolean> {
  const cleanId = (identifier || '').trim();
  if (!cleanId || !newSalt || !newHash) return false;

  const rawDigits = cleanPhoneDigits(cleanId);
  const isEmail = cleanId.includes('@');
  const cleanEmail = isEmail ? cleanId.toLowerCase() : '';
  const now = new Date().toISOString();

  const patchFields = {
    salt: newSalt,
    hash: newHash,
    updatedAt: now
  };

  const tasks: Promise<any>[] = [];

  // Update in authAccounts by email
  if (isEmail && cleanEmail) {
    tasks.push(writeDocREST('authAccounts', sanitizeKey(cleanEmail), patchFields));
    tasks.push(writeDocREST('authAccounts', cleanEmail, patchFields));
  }

  // Update in authAccounts by whatsapp / phone digits
  if (rawDigits && rawDigits.length >= 7) {
    tasks.push(writeDocREST('authAccounts', 'wa_' + rawDigits, patchFields));
    tasks.push(writeDocREST('authAccounts', rawDigits, patchFields));
    tasks.push(writeDocREST('authAccounts', '+' + rawDigits, patchFields));
    tasks.push(writeDocREST('users', 'wa_' + rawDigits, patchFields));
  }

  // Also query account to get UID and update users collection
  try {
    const existing = await findUniversalCloudAccount(cleanId);
    if (existing && existing.uid) {
      tasks.push(writeDocREST('users', existing.uid, patchFields));
      if (existing.email && existing.email !== cleanEmail) {
        tasks.push(writeDocREST('authAccounts', sanitizeKey(existing.email), patchFields));
      }
      if (existing.whatsappNumber) {
        const waDigits = cleanPhoneDigits(existing.whatsappNumber);
        if (waDigits) {
          tasks.push(writeDocREST('authAccounts', 'wa_' + waDigits, patchFields));
          tasks.push(writeDocREST('authAccounts', waDigits, patchFields));
        }
      }
    }
  } catch {}

  const results = await Promise.allSettled(tasks);
  return results.some(r => r.status === 'fulfilled');
}
