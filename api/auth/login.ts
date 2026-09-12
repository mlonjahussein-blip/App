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

function fromFirestoreDoc(docData: any): any {
  if (!docData || !docData.fields) return null;
  const result: any = {};
  for (const [key, val] of Object.entries(docData.fields as Record<string, any>)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue, 10);
    else if (val.doubleValue !== undefined) result[key] = parseFloat(val.doubleValue);
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.nullValue !== undefined) result[key] = null;
  }
  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const identifier = (req.body?.identifier || req.query?.identifier || '').toString().trim();
  if (!identifier) {
    return res.status(400).json({ error: 'Identifier (email or phone) is required.' });
  }

  const rawDigits = cleanPhoneDigits(identifier);
  const isEmail = identifier.includes('@');
  const cleanEmail = isEmail ? identifier.toLowerCase() : '';

  try {
    // 1. Direct Email lookup in authAccounts
    if (isEmail && cleanEmail) {
      const emailUrl = `${BASE_REST_URL}/authAccounts/${encodeURIComponent(sanitizeKey(cleanEmail))}?key=${API_KEY}`;
      const emailRes = await fetch(emailUrl);
      if (emailRes.ok) {
        const json = await emailRes.json();
        const data = fromFirestoreDoc(json);
        if (data && data.salt && data.hash) {
          return res.status(200).json({
            found: true,
            account: {
              uid: data.uid,
              email: data.email || cleanEmail,
              displayName: data.displayName || cleanEmail.split('@')[0],
              whatsappNumber: data.whatsappNumber || null,
              salt: data.salt,
              hash: data.hash,
              role: data.role || 'user',
              freeAnalysesRemaining: data.freeAnalysesRemaining,
              paidCredits: data.paidCredits
            }
          });
        }
      }
    }

    // 2. Direct WhatsApp / Phone lookup in authAccounts
    if (rawDigits && rawDigits.length >= 7) {
      const waUrl1 = `${BASE_REST_URL}/authAccounts/${encodeURIComponent('wa_' + rawDigits)}?key=${API_KEY}`;
      const waRes1 = await fetch(waUrl1);
      if (waRes1.ok) {
        const json = await waRes1.json();
        const data = fromFirestoreDoc(json);
        if (data && data.salt && data.hash) {
          return res.status(200).json({
            found: true,
            account: {
              uid: data.uid,
              email: data.email || `${rawDigits}@whatsapp.efootballaihub.com`,
              displayName: data.displayName || `Manager_${rawDigits.slice(-4)}`,
              whatsappNumber: data.whatsappNumber || ('+' + rawDigits),
              salt: data.salt,
              hash: data.hash,
              role: data.role || 'user',
              freeAnalysesRemaining: data.freeAnalysesRemaining,
              paidCredits: data.paidCredits
            }
          });
        }
      }

      const waUrl2 = `${BASE_REST_URL}/authAccounts/${encodeURIComponent(rawDigits)}?key=${API_KEY}`;
      const waRes2 = await fetch(waUrl2);
      if (waRes2.ok) {
        const json = await waRes2.json();
        const data = fromFirestoreDoc(json);
        if (data && data.salt && data.hash) {
          return res.status(200).json({
            found: true,
            account: {
              uid: data.uid,
              email: data.email || `${rawDigits}@whatsapp.efootballaihub.com`,
              displayName: data.displayName || `Manager_${rawDigits.slice(-4)}`,
              whatsappNumber: data.whatsappNumber || ('+' + rawDigits),
              salt: data.salt,
              hash: data.hash,
              role: data.role || 'user',
              freeAnalysesRemaining: data.freeAnalysesRemaining,
              paidCredits: data.paidCredits
            }
          });
        }
      }
    }

    // 3. Query users collection
    if (isEmail && cleanEmail) {
      const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents:runQuery?key=${API_KEY}`;
      const qRes = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'email' },
                op: 'EQUAL',
                value: { stringValue: cleanEmail }
              }
            },
            limit: 1
          }
        })
      });

      if (qRes.ok) {
        const results = await qRes.json();
        if (Array.isArray(results) && results.length > 0 && results[0].document) {
          const data = fromFirestoreDoc(results[0].document);
          if (data && data.salt && data.hash) {
            return res.status(200).json({
              found: true,
              account: {
                uid: data.uid || results[0].document.name.split('/').pop(),
                email: data.email || cleanEmail,
                displayName: data.displayName || cleanEmail.split('@')[0],
                whatsappNumber: data.whatsappNumber || null,
                salt: data.salt,
                hash: data.hash,
                role: data.role || 'user',
                freeAnalysesRemaining: data.freeAnalysesRemaining,
                paidCredits: data.paidCredits
              }
            });
          }
        }
      }
    }

    return res.status(404).json({ found: false, error: 'No account found for this identifier.' });
  } catch (err) {
    console.error('Login lookup error:', err);
    return res.status(500).json({ error: 'Failed to look up account in cloud database.' });
  }
}
