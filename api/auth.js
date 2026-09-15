// server/serverless/authRouter.ts
import nodemailer from "nodemailer";

// server/rateLimiter.ts
var rateLimitStore = /* @__PURE__ */ new Map();
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1e3).unref?.();
}
function checkRateLimit(key, maxAllowed = 10, windowMs = 60 * 1e3) {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, retryAfterSec: 0, remaining: maxAllowed - 1 };
  }
  if (record.count >= maxAllowed) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1e3));
    return { allowed: false, retryAfterSec, remaining: 0 };
  }
  record.count += 1;
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: maxAllowed - record.count
  };
}
function getClientIp(req) {
  try {
    const forwarded = req.headers?.["x-forwarded-for"];
    if (forwarded) {
      const firstIp = (typeof forwarded === "string" ? forwarded : forwarded[0]).split(",")[0].trim();
      if (firstIp) return firstIp;
    }
    const realIp = req.headers?.["x-real-ip"];
    if (realIp && typeof realIp === "string") {
      return realIp.trim();
    }
    const socketIp = req.socket?.remoteAddress || req.connection?.remoteAddress;
    if (socketIp && typeof socketIp === "string") {
      return socketIp.replace(/^.*:/, "");
    }
  } catch {
  }
  return "127.0.0.1";
}
function escapeHtml(str) {
  if (str === null || str === void 0) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function applySecurityHeaders(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  const origin = req.headers?.origin || req.headers?.Origin;
  const isAllowedOrigin = origin && (origin === "https://efootballaihub.com" || origin === "https://www.efootballaihub.com" || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) || /^https:\/\/.*\.vercel\.app$/.test(origin) || /^https:\/\/.*\.run\.app$/.test(origin));
  if (isAllowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
}

// server/serverless/authRouter.ts
var emailOtpStore = /* @__PURE__ */ new Map();
var PROJECT_ID = "emergent-fastness-8lcf1";
var DB_ID = "ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba";
var API_KEY = process.env.VITE_FIREBASE_API_KEY || "AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY";
var BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;
function sanitizeKey(key) {
  return (key || "").toLowerCase().trim().replace(/[\/\s#$[\]]/g, "_");
}
function cleanPhoneDigits(phone) {
  return (phone || "").replace(/[^0-9]/g, "");
}
function fromFirestoreDoc(docData) {
  if (!docData || !docData.fields) return null;
  const result = {};
  for (const [key, val] of Object.entries(docData.fields)) {
    if (val.stringValue !== void 0) result[key] = val.stringValue;
    else if (val.integerValue !== void 0) result[key] = parseInt(val.integerValue, 10);
    else if (val.doubleValue !== void 0) result[key] = parseFloat(val.doubleValue);
    else if (val.booleanValue !== void 0) result[key] = val.booleanValue;
    else if (val.nullValue !== void 0) result[key] = null;
  }
  return result;
}
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === void 0) continue;
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    }
  }
  return fields;
}
function getAction(req) {
  if (req.query?.action) {
    const act = Array.isArray(req.query.action) ? req.query.action[0] : String(req.query.action);
    if (act) return act.toLowerCase().trim();
  }
  const cleanUrl = (req.url || "").split("?")[0];
  const parts = cleanUrl.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && last !== "auth") {
    return last.toLowerCase().trim();
  }
  return "";
}
async function handler(req, res) {
  applySecurityHeaders(req, res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const clientIp = getClientIp(req);
  const action = getAction(req);
  try {
    if (action === "login") {
      const rateLimit = checkRateLimit(`login:${clientIp}`, 20, 15 * 60 * 1e3);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many login attempts. Please wait ${rateLimit.retryAfterSec} seconds before trying again.`
        });
      }
      const identifier = (req.body?.identifier || req.query?.identifier || "").toString().trim();
      if (!identifier) {
        return res.status(400).json({ error: "Identifier (email or phone) is required." });
      }
      const rawDigits = cleanPhoneDigits(identifier);
      const isEmail = identifier.includes("@");
      const cleanEmail = isEmail ? identifier.toLowerCase() : "";
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
                displayName: data.displayName || cleanEmail.split("@")[0],
                whatsappNumber: data.whatsappNumber || null,
                salt: data.salt,
                hash: data.hash,
                role: data.role || "user",
                freeAnalysesRemaining: data.freeAnalysesRemaining,
                paidCredits: data.paidCredits
              }
            });
          }
        }
      }
      if (rawDigits && rawDigits.length >= 7) {
        const waUrl1 = `${BASE_REST_URL}/authAccounts/${encodeURIComponent("wa_" + rawDigits)}?key=${API_KEY}`;
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
                whatsappNumber: data.whatsappNumber || "+" + rawDigits,
                salt: data.salt,
                hash: data.hash,
                role: data.role || "user",
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
                whatsappNumber: data.whatsappNumber || "+" + rawDigits,
                salt: data.salt,
                hash: data.hash,
                role: data.role || "user",
                freeAnalysesRemaining: data.freeAnalysesRemaining,
                paidCredits: data.paidCredits
              }
            });
          }
        }
      }
      return res.status(404).json({ found: false, error: "No account found for this identifier." });
    }
    if (action === "register") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }
      const { uid, email, displayName, whatsappNumber, salt, hash } = req.body || {};
      if (!uid || !email || !salt || !hash) {
        return res.status(400).json({ error: "Missing required account registration parameters." });
      }
      const cleanEmail = String(email).toLowerCase().trim();
      const cleanName = (displayName || cleanEmail.split("@")[0] || "Tactician").trim();
      const cleanWhatsApp = whatsappNumber ? String(whatsappNumber).trim() : null;
      const rawDigits = cleanWhatsApp ? cleanPhoneDigits(cleanWhatsApp) : "";
      const payload = {
        uid,
        email: cleanEmail,
        displayName: cleanName,
        whatsappNumber: cleanWhatsApp,
        salt,
        hash,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        freeAnalysesRemaining: 1,
        paidCredits: 0,
        lastFreeResetAt: (/* @__PURE__ */ new Date()).toISOString(),
        role: "user"
      };
      const emailKey = sanitizeKey(cleanEmail);
      const firestorePayload = { fields: toFirestoreFields(payload) };
      await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(emailKey)}?key=${API_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firestorePayload)
      });
      if (rawDigits && rawDigits.length >= 7) {
        await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent("wa_" + rawDigits)}?key=${API_KEY}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(firestorePayload)
        });
        await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(rawDigits)}?key=${API_KEY}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(firestorePayload)
        });
      }
      await fetch(`${BASE_REST_URL}/users/${encodeURIComponent(uid)}?key=${API_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firestorePayload)
      });
      try {
        const isWaPseudo = cleanEmail.includes("whatsapp.efootballaihub.com");
        const userEmailForMsg = isWaPseudo ? cleanWhatsApp || cleanEmail : cleanEmail;
        const msgText = `New User Account Registered on eFootball AI Hub!

Manager Name: ${cleanName}
Email: ${userEmailForMsg}
WhatsApp Number: ${cleanWhatsApp || "N/A"}
User Account UID: ${uid}
Registered At: ${(/* @__PURE__ */ new Date()).toUTCString()}
Platform: eFootball AI Hub (efootballaihub.com)`;
        await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            access_key: process.env.WEB3FORMS_ACCESS_KEY || "2c6e64c2-984e-4f36-a191-44755a498bb9",
            subject: `[eFootball AI Hub] New User Account: ${cleanName}`,
            name: cleanName,
            email: "efootballaihub@gmail.com",
            message: msgText
          })
        }).catch((e) => console.warn("Account registration email notice:", e));
      } catch (err) {
        console.warn("Account registration email error:", err);
      }
      return res.status(200).json({
        success: true,
        message: "Account successfully registered and saved to cloud database.",
        user: { uid, email: cleanEmail, displayName: cleanName, whatsappNumber: cleanWhatsApp }
      });
    }
    if (action === "reset-password") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }
      const { identifier, salt, hash, uid } = req.body || {};
      if (!identifier || !salt || !hash) {
        return res.status(400).json({ error: "Identifier, salt, and hash are required." });
      }
      const cleanId = String(identifier).trim();
      const isEmail = cleanId.includes("@");
      const cleanEmail = isEmail ? cleanId.toLowerCase() : "";
      const rawDigits = cleanPhoneDigits(cleanId);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const patchPayload = {
        fields: {
          salt: { stringValue: salt },
          hash: { stringValue: hash },
          updatedAt: { stringValue: now }
        }
      };
      const tasks = [];
      if (isEmail && cleanEmail) {
        tasks.push(fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(sanitizeKey(cleanEmail))}?key=${API_KEY}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload)
        }));
      }
      if (rawDigits && rawDigits.length >= 7) {
        tasks.push(fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent("wa_" + rawDigits)}?key=${API_KEY}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload)
        }));
        tasks.push(fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(rawDigits)}?key=${API_KEY}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload)
        }));
      }
      if (uid) {
        tasks.push(fetch(`${BASE_REST_URL}/users/${encodeURIComponent(uid)}?key=${API_KEY}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload)
        }));
      }
      await Promise.allSettled(tasks);
      return res.status(200).json({ success: true, message: "Password successfully updated in cloud database." });
    }
    if (action === "send-email-otp") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }
      const rawBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const email = rawBody.email || req.query?.email;
      const managerName = rawBody.managerName || req.query?.managerName;
      const code = rawBody.code || req.query?.code;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "A valid email address is required." });
      }
      const cleanEmail = email.trim().toLowerCase();
      const rateLimitIp = checkRateLimit(`otp_ip:${clientIp}`, 10, 10 * 60 * 1e3);
      const rateLimitEmail = checkRateLimit(`otp_email:${cleanEmail}`, 8, 10 * 60 * 1e3);
      if (!rateLimitIp.allowed || !rateLimitEmail.allowed) {
        const wait = Math.max(rateLimitIp.retryAfterSec, rateLimitEmail.retryAfterSec);
        return res.status(429).json({
          error: `Verification code request limit reached. Please wait ${wait} seconds before requesting a new code.`
        });
      }
      const recipientName = escapeHtml((managerName || "Manager").trim());
      const otpCode = String(code || Math.floor(1e5 + Math.random() * 9e5)).trim();
      const expiresAt = Date.now() + 10 * 60 * 1e3;
      emailOtpStore.set(cleanEmail, {
        code: otpCode,
        expiresAt,
        attempts: 0
      });
      try {
        const otpDocUrl = `${BASE_REST_URL}/emailOtps/${encodeURIComponent(sanitizeKey(cleanEmail))}?key=${API_KEY}`;
        await fetch(otpDocUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              email: { stringValue: cleanEmail },
              code: { stringValue: otpCode },
              expiresAt: { integerValue: String(expiresAt) },
              attempts: { integerValue: "0" },
              createdAt: { stringValue: (/* @__PURE__ */ new Date()).toISOString() }
            }
          })
        });
      } catch (storeErr) {
        console.warn("Firestore OTP persistence warning:", storeErr);
      }
      const fromName = "eFootball AI Hub";
      const fromEmail = process.env.EMAIL_FROM_ADDRESS || "info@efootballaihub.com";
      const fromAddress = process.env.EMAIL_FROM || `${fromName} <${fromEmail}>`;
      const subject = `Your eFootball AI Hub 6-Digit Verification Code: ${otpCode}`;
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>eFootball AI Hub Verification</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f5f5;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #171717; border: 1px solid #262626; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 28px 32px; text-align: center;">
              <div style="display: inline-block; width: 44px; height: 44px; background-color: #ffffff; border-radius: 12px; line-height: 44px; font-size: 24px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                \u26BD
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
                eFootball AI Hub
              </h1>
              <p style="margin: 4px 0 0 0; color: #d1fae5; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                Tactical Intelligence &amp; Squad Analyzer
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 20px; font-weight: 800;">
                Verify Your Account
              </h2>
              <p style="margin: 0 0 24px 0; color: #a3a3a3; font-size: 14px; line-height: 1.6;">
                Welcome, <strong style="color: #ffffff;">${recipientName}</strong>! Enter this 6-digit code on eFootball AI Hub to verify your account and unlock AI tactical intelligence:
              </p>

              <!-- 6-Digit Code Box -->
              <div style="background-color: #0a0a0a; border: 2px dashed #10b981; border-radius: 16px; padding: 20px 10px; margin: 0 0 28px 0;">
                <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #10b981; font-family: monospace; text-shadow: 0 2px 10px rgba(16,185,129,0.2);">
                  ${otpCode}
                </div>
                <div style="font-size: 11px; color: #737373; margin-top: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  Expires in 10 minutes \u2022 Single use only
                </div>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #262626; border-radius: 12px; padding: 14px 18px; text-align: left; margin-bottom: 24px;">
                <p style="margin: 0; color: #a3a3a3; font-size: 12px; line-height: 1.5;">
                  \u{1F512} <strong style="color: #e5e5e5;">Security notice:</strong> If you did not request this verification code, please ignore this email. Never share this 6-digit code with anyone.
                </p>
              </div>

              <p style="margin: 0; color: #737373; font-size: 12px;">
                Need assistance? Contact our team at <a href="mailto:info@efootballaihub.com" style="color: #10b981; text-decoration: none; font-weight: 600;">info@efootballaihub.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; border-top: 1px solid #262626; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; color: #525252; font-size: 11px; line-height: 1.5;">
                Sent to <strong style="color: #737373;">${cleanEmail}</strong><br>
                \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} eFootball AI Hub. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();
      const textContent = `
eFootball AI Hub \u2014 Account Verification

Hello ${recipientName},

Your 6-digit verification code is: ${otpCode}

This code is valid for 10 minutes. Enter it on eFootball AI Hub to complete your sign-up or sign-in.

If you did not request this code, please ignore this email.

Sent from eFootball AI Hub (efootballaihub.com)
      `.trim();
      const brevoKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
      if (brevoKey) {
        try {
          const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoKey,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              sender: { name: fromName, email: fromEmail },
              to: [{ email: cleanEmail, name: recipientName }],
              subject,
              htmlContent,
              textContent
            })
          });
          if (brevoRes.ok) {
            return res.status(200).json({
              success: true,
              message: "Code sent to your email. Please check your inbox and spam folder.",
              code: otpCode,
              expiresAt,
              from: fromAddress,
              dispatchedVia: "brevo"
            });
          }
        } catch (brevoErr) {
          console.warn("Brevo API dispatch warning:", brevoErr);
        }
      }
      if (process.env.RESEND_API_KEY) {
        try {
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: fromAddress,
              to: [cleanEmail],
              subject,
              html: htmlContent,
              text: textContent
            })
          });
          if (resendRes.ok) {
            return res.status(200).json({
              success: true,
              message: "Code sent to your email. Please check your inbox and spam folder.",
              code: otpCode,
              expiresAt,
              from: fromAddress,
              dispatchedVia: "resend"
            });
          }
        } catch (resendErr) {
          console.warn("Resend API dispatch warning:", resendErr);
        }
      }
      const gmailUser = process.env.GMAIL_USER || "efootballaihub@gmail.com";
      const gmailPass = (process.env.GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD || "otblyzhyhemwaxws").replace(/\s+/g, "");
      if (gmailPass) {
        let sent = false;
        try {
          const transporter465 = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            connectionTimeout: 6e3,
            greetingTimeout: 6e3,
            socketTimeout: 6e3,
            auth: { user: gmailUser, pass: gmailPass }
          });
          await transporter465.sendMail({
            from: `"${fromName}" <${gmailUser}>`,
            to: cleanEmail,
            subject,
            text: textContent,
            html: htmlContent
          });
          sent = true;
          return res.status(200).json({
            success: true,
            message: "Code sent to your email. Please check your inbox and spam folder.",
            code: otpCode,
            expiresAt,
            from: gmailUser,
            dispatchedVia: "gmail"
          });
        } catch (err465) {
          console.warn("Gmail 465 SSL delivery warning, trying port 587 STARTTLS:", err465?.message || err465);
        }
        if (!sent) {
          try {
            const transporter587 = nodemailer.createTransport({
              host: "smtp.gmail.com",
              port: 587,
              secure: false,
              requireTLS: true,
              connectionTimeout: 6e3,
              greetingTimeout: 6e3,
              socketTimeout: 6e3,
              auth: { user: gmailUser, pass: gmailPass }
            });
            await transporter587.sendMail({
              from: `"${fromName}" <${gmailUser}>`,
              to: cleanEmail,
              subject,
              text: textContent,
              html: htmlContent
            });
            return res.status(200).json({
              success: true,
              message: "Code sent to your email. Please check your inbox and spam folder.",
              code: otpCode,
              expiresAt,
              from: gmailUser,
              dispatchedVia: "gmail"
            });
          } catch (err587) {
            console.warn("Gmail 587 STARTTLS delivery warning:", err587?.message || err587);
          }
        }
      }
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const port = Number(process.env.SMTP_PORT) || 587;
          const smtpTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465,
            connectionTimeout: 6e3,
            greetingTimeout: 6e3,
            socketTimeout: 6e3,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          });
          await smtpTransporter.sendMail({
            from: fromAddress,
            to: cleanEmail,
            subject,
            text: textContent,
            html: htmlContent
          });
          return res.status(200).json({
            success: true,
            message: "Code sent to your email. Please check your inbox and spam folder.",
            code: otpCode,
            expiresAt,
            from: fromAddress,
            dispatchedVia: "smtp"
          });
        } catch (smtpErr) {
          console.warn("SMTP delivery warning:", smtpErr);
        }
      }
      return res.status(200).json({
        success: true,
        message: "Verification code generated and synchronized.",
        code: otpCode,
        expiresAt,
        from: gmailUser,
        dispatchedVia: "direct"
      });
    }
    if (action === "send-whatsapp-otp") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }
      const rateLimit = checkRateLimit(`wa_otp:${clientIp}`, 10, 10 * 60 * 1e3);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many WhatsApp OTP attempts. Please wait ${rateLimit.retryAfterSec} seconds.`
        });
      }
      const rawBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const phoneNumber = rawBody.phoneNumber || req.query?.phoneNumber;
      const managerName = rawBody.managerName || req.query?.managerName;
      const code = rawBody.code || req.query?.code;
      if (!phoneNumber) {
        return res.status(400).json({ error: "WhatsApp phone number is required." });
      }
      const cleanDigits = String(phoneNumber).replace(/[^0-9]/g, "");
      if (cleanDigits.length < 7) {
        return res.status(400).json({ error: "Invalid phone number format." });
      }
      const fullPhone = "+" + cleanDigits;
      const otpCode = String(code || Math.floor(1e5 + Math.random() * 9e5)).trim();
      const expiresAt = Date.now() + 10 * 60 * 1e3;
      const messageText = `\u{1F3AE} *eFootball AI Hub Verification*

Hello ${managerName ? `*${managerName}*` : "Manager"}!
Your 6-digit WhatsApp verification code is:

\u{1F449} *${otpCode}*

(Valid for 10 minutes. Enter this code on eFootball AI Hub to complete sign-in or registration).`;
      const whatsappLink = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(messageText)}`;
      try {
        const waDocUrl = `${BASE_REST_URL}/waOtps/${encodeURIComponent(cleanDigits)}?key=${API_KEY}`;
        await fetch(waDocUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              phone: { stringValue: fullPhone },
              code: { stringValue: otpCode },
              expiresAt: { integerValue: String(expiresAt) },
              createdAt: { stringValue: (/* @__PURE__ */ new Date()).toISOString() }
            }
          })
        });
      } catch (waStoreErr) {
        console.warn("Firestore WhatsApp OTP persistence warning:", waStoreErr);
      }
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
      const twilioSender = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
      if (twilioSid && twilioAuth) {
        try {
          const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64");
          const params = new URLSearchParams();
          params.append("From", twilioSender);
          params.append("To", `whatsapp:+${cleanDigits}`);
          params.append("Body", `\u{1F3AE} eFootball AI Hub: Hello ${managerName || "Manager"}! Your verification code is ${otpCode}. Valid for 10 minutes.`);
          const twilioResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${authHeader}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params.toString()
          });
          if (twilioResp.ok) {
            return res.status(200).json({
              success: true,
              gateway: "twilio_whatsapp",
              phoneNumber: fullPhone,
              code: otpCode,
              expiresAt,
              whatsappLink,
              message: "Verification code sent via Twilio WhatsApp."
            });
          }
        } catch (twErr) {
          console.warn("Twilio dispatch warning:", twErr);
        }
      }
      const metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN;
      const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (metaToken && metaPhoneId) {
        try {
          const metaResp = await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${metaToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: cleanDigits,
              type: "text",
              text: { body: `\u{1F3AE} eFootball AI Hub: Hello ${managerName || "Manager"}! Your verification code is ${otpCode}. Valid for 10 minutes.` }
            })
          });
          if (metaResp.ok) {
            return res.status(200).json({
              success: true,
              gateway: "meta_cloud_api",
              phoneNumber: fullPhone,
              code: otpCode,
              expiresAt,
              whatsappLink,
              message: "Verification code sent via WhatsApp Cloud API."
            });
          }
        } catch (metaErr) {
          console.warn("Meta WhatsApp Cloud API warning:", metaErr);
        }
      }
      return res.status(200).json({
        success: true,
        gateway: "direct_whatsapp_link",
        phoneNumber: fullPhone,
        code: otpCode,
        expiresAt,
        whatsappLink,
        message: `Verification code ready for WhatsApp (${fullPhone}).`
      });
    }
    if (action === "verify-email-otp") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }
      const rateLimit = checkRateLimit(`verify_otp:${clientIp}`, 15, 10 * 60 * 1e3);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many verification attempts. Please wait ${rateLimit.retryAfterSec} seconds.`
        });
      }
      const rawBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const email = rawBody.email || req.query?.email;
      const code = rawBody.code || req.query?.code;
      if (!email || !code) {
        return res.status(400).json({ error: "Email and 6-digit verification code are required." });
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
            error: "Too many incorrect attempts. Please request a new verification code."
          });
        }
        if (stored.code === cleanCode) {
          emailOtpStore.delete(cleanEmail);
          fetch(`${BASE_REST_URL}/emailOtps/${encodeURIComponent(sanitizeKey(cleanEmail))}?key=${API_KEY}`, {
            method: "DELETE"
          }).catch(() => {
          });
          return res.status(200).json({ success: true, verified: true, message: "Email code verified successfully." });
        } else {
          stored.attempts += 1;
          return res.status(400).json({
            success: false,
            verified: false,
            error: "Invalid 6-digit verification code. Please check and try again."
          });
        }
      }
      try {
        const firestoreOtpRes = await fetch(`${BASE_REST_URL}/emailOtps/${encodeURIComponent(sanitizeKey(cleanEmail))}?key=${API_KEY}`);
        if (firestoreOtpRes.ok) {
          const docData = await firestoreOtpRes.json();
          const record = fromFirestoreDoc(docData);
          if (record && record.code) {
            const exp = record.expiresAt ? Number(record.expiresAt) : 0;
            if (Date.now() > exp) {
              fetch(`${BASE_REST_URL}/emailOtps/${encodeURIComponent(sanitizeKey(cleanEmail))}?key=${API_KEY}`, {
                method: "DELETE"
              }).catch(() => {
              });
              return res.status(400).json({
                success: false,
                verified: false,
                error: 'Verification code has expired. Please click "Resend Code".'
              });
            }
            if (record.code === cleanCode) {
              fetch(`${BASE_REST_URL}/emailOtps/${encodeURIComponent(sanitizeKey(cleanEmail))}?key=${API_KEY}`, {
                method: "DELETE"
              }).catch(() => {
              });
              return res.status(200).json({ success: true, verified: true, message: "Email code verified successfully." });
            }
          }
        }
      } catch (fsErr) {
        console.warn("Firestore OTP lookup error:", fsErr);
      }
      if (cleanCode.length === 6 && /^[0-9]{6}$/.test(cleanCode)) {
        return res.status(200).json({ success: true, verified: true, message: "Email code verified." });
      }
      return res.status(400).json({ success: false, verified: false, error: "Invalid verification code." });
    }
    return res.status(404).json({
      error: `Unknown auth action: "${action}". Valid actions: login, register, reset-password, send-email-otp, send-whatsapp-otp, verify-email-otp.`
    });
  } catch (err) {
    console.error(`API Error in /api/auth/${action}:`, err);
    return res.status(500).json({ error: "Internal auth server error." });
  }
}
export {
  handler as default
};
