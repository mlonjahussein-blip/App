import type { VercelRequest, VercelResponse } from '@vercel/node';

const PROJECT_ID = 'emergent-fastness-8lcf1';
const DB_ID = 'ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba';
const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY';
const BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;

function sanitizeKey(key: string): string {
  return (key || '').toLowerCase().trim().replace(/[\/\s#$[\]]/g, '_');
}

function cleanPhoneDigits(phone: string): string {
  return (phone || '').replace(/[^0-9]/g, '');
}

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
    }
  }
  return fields;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { uid, email, displayName, whatsappNumber, salt, hash } = req.body || {};

    if (!uid || !email || !salt || !hash) {
      return res.status(400).json({ error: 'Missing required account registration parameters.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = (displayName || cleanEmail.split('@')[0] || 'Tactician').trim();
    const cleanWhatsApp = whatsappNumber ? String(whatsappNumber).trim() : null;
    const rawDigits = cleanWhatsApp ? cleanPhoneDigits(cleanWhatsApp) : '';

    const payload = {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      whatsappNumber: cleanWhatsApp,
      salt,
      hash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      freeAnalysesRemaining: 1,
      paidCredits: 0,
      lastFreeResetAt: new Date().toISOString(),
      role: 'user'
    };

    const emailKey = sanitizeKey(cleanEmail);
    const firestorePayload = { fields: toFirestoreFields(payload) };

    // 1. Write to authAccounts collection by email key
    const authEmailUrl = `${BASE_REST_URL}/authAccounts/${encodeURIComponent(emailKey)}?key=${API_KEY}`;
    await fetch(authEmailUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestorePayload)
    });

    // 2. Write to authAccounts collection by WhatsApp number if provided
    if (rawDigits && rawDigits.length >= 7) {
      const waUrl1 = `${BASE_REST_URL}/authAccounts/${encodeURIComponent('wa_' + rawDigits)}?key=${API_KEY}`;
      await fetch(waUrl1, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestorePayload)
      });

      const waUrl2 = `${BASE_REST_URL}/authAccounts/${encodeURIComponent(rawDigits)}?key=${API_KEY}`;
      await fetch(waUrl2, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestorePayload)
      });
    }

    // 3. Write to users collection by uid
    const userUrl = `${BASE_REST_URL}/users/${encodeURIComponent(uid)}?key=${API_KEY}`;
    await fetch(userUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestorePayload)
    });

    return res.status(200).json({
      success: true,
      message: 'Account successfully registered and saved to cloud database.',
      user: {
        uid,
        email: cleanEmail,
        displayName: cleanName,
        whatsappNumber: cleanWhatsApp
      }
    });
  } catch (err: any) {
    console.error('Account cloud registration error:', err);
    return res.status(500).json({ error: 'Internal server error while saving cloud account.' });
  }
}
