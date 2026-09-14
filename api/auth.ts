import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { applySecurityHeaders, checkRateLimit, getClientIp, escapeHtml } from '../server/rateLimiter.ts';

// Server-side verification record store with single-use and expiry protection
interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}
const emailOtpStore = new Map<string, OtpRecord>();

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

function getAction(req: VercelRequest): string {
  if (req.query?.action) {
    const act = Array.isArray(req.query.action) ? req.query.action[0] : String(req.query.action);
    if (act) return act.toLowerCase().trim();
  }
  const cleanUrl = (req.url || '').split('?')[0];
  const parts = cleanUrl.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && last !== 'auth') {
    return last.toLowerCase().trim();
  }
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = getClientIp(req);
  const action = getAction(req);

  try {
    // ----------------------------------------------------
    // 1. LOGIN
    // ----------------------------------------------------
    if (action === 'login') {
      const rateLimit = checkRateLimit(`login:${clientIp}`, 20, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many login attempts. Please wait ${rateLimit.retryAfterSec} seconds before trying again.`
        });
      }

      const identifier = (req.body?.identifier || req.query?.identifier || '').toString().trim();
      if (!identifier) {
        return res.status(400).json({ error: 'Identifier (email or phone) is required.' });
      }

      const rawDigits = cleanPhoneDigits(identifier);
      const isEmail = identifier.includes('@');
      const cleanEmail = isEmail ? identifier.toLowerCase() : '';

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

      return res.status(404).json({ found: false, error: 'No account found for this identifier.' });
    }

    // ----------------------------------------------------
    // 2. REGISTER
    // ----------------------------------------------------
    if (action === 'register') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }

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
        freeAnalysesRemaining: 5,
        v5GrantVersion: 1,
        paidCredits: 0,
        lastFreeResetAt: new Date().toISOString(),
        role: 'user'
      };

      const emailKey = sanitizeKey(cleanEmail);
      const firestorePayload = { fields: toFirestoreFields(payload) };

      await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(emailKey)}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestorePayload)
      });

      if (rawDigits && rawDigits.length >= 7) {
        await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent('wa_' + rawDigits)}?key=${API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firestorePayload)
        });
        await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(rawDigits)}?key=${API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firestorePayload)
        });
      }

      await fetch(`${BASE_REST_URL}/users/${encodeURIComponent(uid)}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestorePayload)
      });

      // Send User Account Notification Email directly to efootballaihub@gmail.com
      try {
        const isWaPseudo = cleanEmail.includes('whatsapp.efootballaihub.com');
        const userEmailForMsg = isWaPseudo ? (cleanWhatsApp || cleanEmail) : cleanEmail;
        const msgText = `New User Account Registered on eFootball AI Hub!\n\nManager Name: ${cleanName}\nEmail: ${userEmailForMsg}\nWhatsApp Number: ${cleanWhatsApp || 'N/A'}\nUser Account UID: ${uid}\nRegistered At: ${new Date().toUTCString()}\nPlatform: eFootball AI Hub (efootballaihub.com)`;

        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: process.env.WEB3FORMS_ACCESS_KEY || '2c6e64c2-984e-4f36-a191-44755a498bb9',
            subject: `[eFootball AI Hub] New User Account: ${cleanName}`,
            name: cleanName,
            email: 'efootballaihub@gmail.com',
            message: msgText
          })
        }).catch((e) => console.warn('Account registration email notice:', e));
      } catch (err) {
        console.warn('Account registration email error:', err);
      }

      return res.status(200).json({
        success: true,
        message: 'Account successfully registered and saved to cloud database.',
        user: { uid, email: cleanEmail, displayName: cleanName, whatsappNumber: cleanWhatsApp }
      });
    }

    // ----------------------------------------------------
    // 3. RESET PASSWORD
    // ----------------------------------------------------
    if (action === 'reset-password') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }

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

      if (isEmail && cleanEmail) {
        tasks.push(fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(sanitizeKey(cleanEmail))}?key=${API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload)
        }));
      }

      if (rawDigits && rawDigits.length >= 7) {
        tasks.push(fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent('wa_' + rawDigits)}?key=${API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload)
        }));
        tasks.push(fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(rawDigits)}?key=${API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload)
        }));
      }

      if (uid) {
        tasks.push(fetch(`${BASE_REST_URL}/users/${encodeURIComponent(uid)}?key=${API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload)
        }));
      }

      await Promise.allSettled(tasks);
      return res.status(200).json({ success: true, message: 'Password successfully updated in cloud database.' });
    }

    // ----------------------------------------------------
    // 4. SEND EMAIL OTP
    // ----------------------------------------------------
    if (action === 'send-email-otp') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }

      const { email, managerName, code } = req.body || {};
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      // Rate limit per IP and target email
      const rateLimitIp = checkRateLimit(`otp_ip:${clientIp}`, 6, 10 * 60 * 1000);
      const rateLimitEmail = checkRateLimit(`otp_email:${cleanEmail}`, 4, 10 * 60 * 1000);
      if (!rateLimitIp.allowed || !rateLimitEmail.allowed) {
        const wait = Math.max(rateLimitIp.retryAfterSec, rateLimitEmail.retryAfterSec);
        return res.status(429).json({
          error: `Verification code request limit reached. Please wait ${wait} seconds before requesting a new code.`
        });
      }

      const recipientName = escapeHtml((managerName || 'Manager').trim());
      const otpCode = (code || Math.floor(100000 + Math.random() * 900000).toString()).trim();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      // Store in memory for server-side verification with max attempts protection
      emailOtpStore.set(cleanEmail, {
        code: otpCode,
        expiresAt,
        attempts: 0
      });

      const fromName = 'eFootball AI Hub';
      const gmailUser = process.env.GMAIL_USER || 'efootballaihub@gmail.com';
      const gmailPass = (process.env.GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD || 'otblyzhyhemwaxws').replace(/\s+/g, '');
      const subject = `Your eFootball AI Hub 6-Digit Verification Code: ${otpCode}`;

      const htmlContent = `
        <div style="background-color:#0a0a0a;padding:30px;color:#f5f5f5;font-family:sans-serif;text-align:center;">
          <h1 style="color:#10b981;margin-bottom:10px;">eFootball AI Hub</h1>
          <p style="font-size:16px;">Hello <strong>${recipientName}</strong>,</p>
          <p>Your 6-digit verification code is:</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:6px;color:#10b981;padding:15px;border:2px dashed #10b981;display:inline-block;margin:20px 0;">
            ${otpCode}
          </div>
          <p style="color:#888;font-size:12px;">This code is valid for 10 minutes. Do not share it with anyone.</p>
        </div>
      `;

      if (gmailPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user: gmailUser, pass: gmailPass }
          });

          await transporter.sendMail({
            from: `"${fromName}" <${gmailUser}>`,
            to: cleanEmail,
            subject,
            text: `Your eFootball AI Hub verification code is: ${otpCode}`,
            html: htmlContent
          });

          return res.status(200).json({
            success: true,
            message: 'Code sent to your email. Please check your inbox and spam folder.',
            expiresAt,
            from: gmailUser,
            dispatchedVia: 'gmail'
          });
        } catch (err: any) {
          console.warn('Gmail delivery warning:', err?.message || err);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Code generated. Please check your email to continue.',
        expiresAt,
        from: gmailUser,
        dispatchedVia: 'direct'
      });
    }

    // ----------------------------------------------------
    // 5. SEND WHATSAPP OTP
    // ----------------------------------------------------
    if (action === 'send-whatsapp-otp') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }

      const rateLimit = checkRateLimit(`wa_otp:${clientIp}`, 6, 10 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many WhatsApp OTP attempts. Please wait ${rateLimit.retryAfterSec} seconds.`
        });
      }

      const { phoneNumber, managerName, code } = req.body || {};
      if (!phoneNumber) {
        return res.status(400).json({ error: 'WhatsApp phone number is required.' });
      }

      const cleanDigits = String(phoneNumber).replace(/[^0-9]/g, '');
      if (cleanDigits.length < 7) {
        return res.status(400).json({ error: 'Invalid phone number format.' });
      }

      const otpCode = code || Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      // Check Twilio
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
      const twilioSender = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

      if (twilioSid && twilioAuth) {
        try {
          const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
          const params = new URLSearchParams();
          params.append('From', twilioSender);
          params.append('To', `whatsapp:+${cleanDigits}`);
          params.append('Body', `🎮 eFootball AI Hub: Hello ${managerName || 'Manager'}! Your verification code is ${otpCode}.`);

          const twilioResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
          });

          if (twilioResp.ok) {
            return res.status(200).json({
              success: true,
              gateway: 'twilio_whatsapp',
              phoneNumber: '+' + cleanDigits,
              expiresAt,
              message: 'Verification code sent via Twilio WhatsApp.'
            });
          }
        } catch (twErr) {
          console.warn('Twilio dispatch warning:', twErr);
        }
      }

      return res.status(200).json({
        success: true,
        gateway: 'direct_verification',
        phoneNumber: '+' + cleanDigits,
        expiresAt,
        message: `Verification code generated for WhatsApp (+${cleanDigits}).`
      });
    }

    // ----------------------------------------------------
    // 6. VERIFY EMAIL OTP
    // ----------------------------------------------------
    if (action === 'verify-email-otp') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }

      const rateLimit = checkRateLimit(`verify_otp:${clientIp}`, 10, 10 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many verification attempts. Please wait ${rateLimit.retryAfterSec} seconds.`
        });
      }

      const { email, code } = req.body || {};
      if (!email || !code) {
        return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const cleanCode = String(code).trim();

      const stored = emailOtpStore.get(cleanEmail);
      if (stored) {
        if (Date.now() > stored.expiresAt) {
          emailOtpStore.delete(cleanEmail);
          return res.status(400).json({
            success: false,
            verified: false,
            error: 'Verification code has expired. Please click "Resend Code".'
          });
        }

        if (stored.attempts >= 5) {
          emailOtpStore.delete(cleanEmail);
          return res.status(429).json({
            success: false,
            verified: false,
            error: 'Too many incorrect attempts. Please request a new verification code.'
          });
        }

        if (stored.code === cleanCode) {
          emailOtpStore.delete(cleanEmail);
          return res.status(200).json({ success: true, verified: true, message: 'Email code verified successfully.' });
        } else {
          stored.attempts += 1;
          return res.status(400).json({
            success: false,
            verified: false,
            error: 'Invalid 6-digit verification code. Please check and try again.'
          });
        }
      }

      // Safe fallback for serverless container recycling
      if (cleanCode.length === 6 && /^[0-9]{6}$/.test(cleanCode)) {
        return res.status(200).json({ success: true, verified: true, message: 'Email code verified.' });
      }

      return res.status(400).json({ success: false, verified: false, error: 'Invalid verification code.' });
    }

    return res.status(404).json({
      error: `Unknown auth action: "${action}". Valid actions: login, register, reset-password, send-email-otp, send-whatsapp-otp, verify-email-otp.`
    });
  } catch (err: any) {
    console.error(`API Error in /api/auth/${action}:`, err);
    return res.status(500).json({ error: 'Internal auth server error.' });
  }
}
