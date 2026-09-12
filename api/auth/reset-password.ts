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
    const { identifier, salt, hash, uid } = req.body || {};
    if (!identifier || !salt || !hash) {
      return res.status(400).json({ error: 'Identifier, salt, and hash are required.' });
    }

    const cleanId = String(identifier).trim();
    const isEmail = cleanId.includes('@');
    const cleanEmail = isEmail ? cleanId.toLowerCase() : '';
    const rawDigits = cleanPhoneDigits(cleanId);
    const now = new Date().toISOString();

    const patchPayload = {
      fields: {
        salt: { stringValue: salt },
        hash: { stringValue: hash },
        updatedAt: { stringValue: now }
      }
    };

    const tasks: Promise<any>[] = [];

    // 1. Update in authAccounts by email
    if (isEmail && cleanEmail) {
      const emailUrl = `${BASE_REST_URL}/authAccounts/${encodeURIComponent(sanitizeKey(cleanEmail))}?key=${API_KEY}`;
      tasks.push(fetch(emailUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
      }));
    }

    // 2. Update in authAccounts by phone
    if (rawDigits && rawDigits.length >= 7) {
      const waUrl1 = `${BASE_REST_URL}/authAccounts/${encodeURIComponent('wa_' + rawDigits)}?key=${API_KEY}`;
      tasks.push(fetch(waUrl1, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
      }));

      const waUrl2 = `${BASE_REST_URL}/authAccounts/${encodeURIComponent(rawDigits)}?key=${API_KEY}`;
      tasks.push(fetch(waUrl2, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
      }));
    }

    // 3. Update in users by uid if supplied
    if (uid) {
      const userUrl = `${BASE_REST_URL}/users/${encodeURIComponent(uid)}?key=${API_KEY}`;
      tasks.push(fetch(userUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
      }));
    }

    await Promise.allSettled(tasks);

    return res.status(200).json({
      success: true,
      message: 'Password successfully updated in cloud database.'
    });
  } catch (err) {
    console.error('Password reset API error:', err);
    return res.status(500).json({ error: 'Failed to update cloud password.' });
  }
}
