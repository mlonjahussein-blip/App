import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { applySecurityHeaders, checkRateLimit, getClientIp, escapeHtml } from '../server/rateLimiter.ts';

const PROJECT_ID = 'emergent-fastness-8lcf1';
const DB_ID = 'ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba';
const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY';
const BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always set hardened CORS & Content-Type to application/json
  applySecurityHeaders(req, res);
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Rate Limiting: Max 5 feedback submissions per 10 minutes per IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`feedback:${clientIp}`, 5, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many submissions. Please wait ${rateLimit.retryAfterSec} seconds before sending more feedback.`
    });
  }

  try {
    const { name, email, category, subject, message, userId } = req.body || {};

    if (!email || !message) {
      return res.status(400).json({ error: 'Email and feedback message are required.' });
    }

    const rawEmail = String(email).trim().toLowerCase();
    if (!rawEmail.includes('@') || rawEmail.length > 120 || rawEmail.length < 5) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const cleanEmail = escapeHtml(rawEmail);
    const cleanName = escapeHtml(String(name || rawEmail.split('@')[0] || 'eFootball Manager').trim().slice(0, 100));
    const cleanMessage = escapeHtml(String(message).trim().slice(0, 5000));
    const cleanCategory = escapeHtml(String(category || 'Feedback').trim().slice(0, 50));
    const cleanSubject = escapeHtml(String(subject || `${cleanCategory} from ${cleanName}`).trim().slice(0, 200));
    const cleanUserId = userId ? escapeHtml(String(userId).trim().slice(0, 100)) : '';
    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const nowIso = new Date().toISOString();

    // 1. Store feedback directly in Firestore
    let dbSaved = false;
    try {
      const docUrl = `${BASE_REST_URL}/feedbacks/${feedbackId}?key=${API_KEY}`;
      const firestoreResp = await fetch(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: feedbackId },
            userId: { stringValue: String(cleanUserId || 'anonymous') },
            name: { stringValue: cleanName },
            email: { stringValue: rawEmail },
            category: { stringValue: cleanCategory },
            subject: { stringValue: cleanSubject },
            message: { stringValue: cleanMessage },
            createdAt: { stringValue: nowIso }
          }
        })
      });
      if (firestoreResp.ok) {
        dbSaved = true;
      } else {
        const errText = await firestoreResp.text();
        console.warn('[FEEDBACK STORE] Firestore REST status not ok:', firestoreResp.status, errText);
      }
    } catch (dbErr) {
      console.warn('[FEEDBACK STORE] Firestore exception:', dbErr);
    }

    // 2. Dispatch email notification to efootballaihub@gmail.com
    const targetEmail = 'efootballaihub@gmail.com';
    const formattedSubject = `[eFootball AI Hub Feedback] ${cleanCategory}: ${cleanSubject}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #f5f5f5; margin: 0; padding: 24px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #141414; border: 1px solid #262626; border-radius: 12px; padding: 28px; }
            .header { border-bottom: 1px solid #262626; padding-bottom: 16px; margin-bottom: 20px; }
            .badge { display: inline-block; background-color: #059669; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 8px 0; border-bottom: 1px solid #1f1f1f; font-size: 13px; }
            .label { color: #a3a3a3; font-weight: 600; width: 120px; }
            .value { color: #ffffff; }
            .message-box { background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; color: #e5e5e5; white-space: pre-wrap; word-break: break-word; }
            .footer { margin-top: 24px; font-size: 12px; color: #737373; text-align: center; border-top: 1px solid #262626; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="badge">${cleanCategory}</span>
              <h2 style="color: #10b981; margin: 12px 0 4px 0;">New User Feedback & Query</h2>
              <p style="color: #a3a3a3; font-size: 13px; margin: 0;">Received via eFootball AI Hub Profile Portal</p>
            </div>
            <table class="info-table">
              <tr>
                <td class="label">User Name:</td>
                <td class="value"><strong>${cleanName}</strong></td>
              </tr>
              <tr>
                <td class="label">User Email:</td>
                <td class="value"><a href="mailto:${cleanEmail}" style="color: #10b981; text-decoration: none;">${cleanEmail}</a></td>
              </tr>
              <tr>
                <td class="label">Category:</td>
                <td class="value">${cleanCategory}</td>
              </tr>
              <tr>
                <td class="label">Subject:</td>
                <td class="value">${cleanSubject}</td>
              </tr>
              <tr>
                <td class="label">Date & Time:</td>
                <td class="value">${new Date().toUTCString()}</td>
              </tr>
              ${cleanUserId ? `<tr><td class="label">User UID:</td><td class="value">${cleanUserId}</td></tr>` : ''}
            </table>
            <div>
              <h3 style="color: #f5f5f5; font-size: 14px; margin-bottom: 8px;">Message Content:</h3>
              <div class="message-box">${cleanMessage}</div>
            </div>
            <div class="footer">
              <p style="margin: 0;">You can directly reply to this email to respond to <strong>${cleanName}</strong> at <strong>${cleanEmail}</strong>.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    let emailSent = false;

    // A. Brevo
    if (!emailSent && process.env.BREVO_API_KEY) {
      try {
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: cleanName, email: process.env.EMAIL_FROM_ADDRESS || 'info@efootballaihub.com' },
            to: [{ email: targetEmail, name: 'eFootball AI Hub Admin' }],
            replyTo: { email: cleanEmail, name: cleanName },
            subject: formattedSubject,
            htmlContent
          })
        });
        if (brevoRes.ok) emailSent = true;
      } catch (e) {
        console.warn('[FEEDBACK EMAIL] Brevo error:', e);
      }
    }

    // B. Resend
    if (!emailSent && process.env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM_ADDRESS || 'eFootball AI Hub <onboarding@resend.dev>',
            to: [targetEmail],
            reply_to: cleanEmail,
            subject: formattedSubject,
            html: htmlContent
          })
        });
        if (resendRes.ok) emailSent = true;
      } catch (e) {
        console.warn('[FEEDBACK EMAIL] Resend error:', e);
      }
    }

    // C. SendGrid
    if (!emailSent && process.env.SENDGRID_API_KEY) {
      try {
        const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: targetEmail }] }],
            from: { email: process.env.EMAIL_FROM_ADDRESS || 'notifications@efootballaihub.com', name: cleanName },
            reply_to: { email: cleanEmail, name: cleanName },
            subject: formattedSubject,
            content: [{ type: 'text/html', value: htmlContent }]
          })
        });
        if (sgRes.ok) emailSent = true;
      } catch (e) {
        console.warn('[FEEDBACK EMAIL] SendGrid error:', e);
      }
    }

    // D. SMTP / Gmail
    const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER || 'efootballaihub@gmail.com';
    const gmailPass = (process.env.GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || 'otblyzhyhemwaxws').replace(/\s+/g, '');

    if (!emailSent && gmailPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: gmailUser,
            pass: gmailPass
          }
        });

        const info = await transporter.sendMail({
          from: `"${cleanName} via eFootball AI Hub" <${gmailUser}>`,
          to: targetEmail,
          replyTo: cleanEmail,
          subject: formattedSubject,
          text: `New Feedback from ${cleanName} (${cleanEmail})\nCategory: ${cleanCategory}\nSubject: ${cleanSubject}\n\nMessage:\n${cleanMessage}`,
          html: htmlContent
        });
        console.log('[FEEDBACK EMAIL] Gmail dispatch success:', info.messageId);
        emailSent = true;
      } catch (e) {
        console.warn('[FEEDBACK EMAIL] Gmail error:', e);
      }
    }

    return res.status(200).json({
      success: true,
      emailDispatched: emailSent,
      storedInDatabase: dbSaved,
      message: 'Your feedback and queries have been submitted successfully. Our team will review them promptly!'
    });
  } catch (error: any) {
    console.error('Error handling /api/feedback:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to submit feedback. Please try again.'
    });
  }
}
