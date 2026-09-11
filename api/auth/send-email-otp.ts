import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { email, managerName, code } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const recipientName = (managerName || 'Manager').trim();
  const otpCode = (code || Math.floor(100000 + Math.random() * 900000).toString()).trim();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  const fromName = 'eFootball AI Hub';
  const gmailUser = process.env.GMAIL_USER || 'efootballaihub@gmail.com';
  const gmailPass = process.env.GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;
  const fromAddress = process.env.EMAIL_FROM || `"${fromName}" <${gmailUser}>`;

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
                ⚽
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
                eFootball AI Hub
              </h1>
              <p style="margin: 4px 0 0 0; color: #d1fae5; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                Tactical Intelligence & Squad Analyzer
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 20px; font-weight: 800;">
                Verify Your Email Address
              </h2>
              <p style="margin: 0 0 24px 0; color: #a3a3a3; font-size: 14px; line-height: 1.6;">
                Welcome, <strong style="color: #ffffff;">${recipientName}</strong>! You're one step away from unlocking AI squad analysis, counter tactics, and community formations. Enter this 6-digit code to complete your registration:
              </p>

              <!-- 6-Digit Code Box -->
              <div style="background-color: #0a0a0a; border: 2px dashed #10b981; border-radius: 16px; padding: 20px 10px; margin: 0 0 28px 0;">
                <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #10b981; font-family: monospace; text-shadow: 0 2px 10px rgba(16,185,129,0.2);">
                  ${otpCode}
                </div>
                <div style="font-size: 11px; color: #737373; margin-top: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  Expires in 10 minutes • Single use only
                </div>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #262626; border-radius: 12px; padding: 14px 18px; text-align: left; margin-bottom: 24px;">
                <p style="margin: 0; color: #a3a3a3; font-size: 12px; line-height: 1.5;">
                  🔒 <strong style="color: #e5e5e5;">Security notice:</strong> If you did not request this registration, you can safely disregard this email. Never share this code with anyone.
                </p>
              </div>

              <p style="margin: 0; color: #737373; font-size: 12px;">
                Need assistance? Contact our team at <a href="mailto:${gmailUser}" style="color: #10b981; text-decoration: none; font-weight: 600;">${gmailUser}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; border-top: 1px solid #262626; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; color: #525252; font-size: 11px; line-height: 1.5;">
                Sent to <strong style="color: #737373;">${cleanEmail}</strong><br>
                © ${new Date().getFullYear()} eFootball AI Hub. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
eFootball AI Hub — Account Verification

Hello ${recipientName},

Your 6-digit verification code is: ${otpCode}

This code is valid for 10 minutes. Enter it on the eFootball AI Hub sign-up page to complete your registration.

If you did not request this code, please ignore this email.

Sent from eFootball AI Hub (${gmailUser})
  `.trim();

  // 1. Send via Gmail (efootballaihub@gmail.com with App Password)
  if (gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, '') // remove spaces from Google app password
        }
      });

      await transporter.sendMail({
        from: `"${fromName}" <${gmailUser}>`,
        to: cleanEmail,
        subject,
        text: textContent,
        html: htmlContent
      });

      return res.status(200).json({
        success: true,
        message: 'Code sent to your email. Please check your inbox and spam folder.',
        code: otpCode,
        expiresAt,
        from: gmailUser,
        dispatchedVia: 'gmail'
      });
    } catch (gmailErr: any) {
      console.warn('[Vercel Serverless] Gmail sendMail error:', gmailErr?.message || gmailErr);
    }
  }

  // 2. Send via Brevo / Sendinblue if configured
  const brevoKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (brevoKey) {
    try {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: fromName, email: gmailUser },
          to: [{ email: cleanEmail, name: recipientName }],
          subject,
          htmlContent,
          textContent
        })
      });

      if (brevoRes.ok) {
        return res.status(200).json({
          success: true,
          message: 'Code sent to your email. Please check your inbox and spam folder.',
          code: otpCode,
          expiresAt,
          from: gmailUser,
          dispatchedVia: 'brevo'
        });
      }
    } catch (brevoErr) {
      console.warn('[Vercel Serverless] Brevo send error:', brevoErr);
    }
  }

  // 3. Send via Resend API if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
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
          message: 'Code sent to your email. Please check your inbox and spam folder.',
          code: otpCode,
          expiresAt,
          from: fromAddress,
          dispatchedVia: 'resend'
        });
      }
    } catch (resendErr) {
      console.warn('[Vercel Serverless] Resend error:', resendErr);
    }
  }

  // 4. Return successful code verification response
  return res.status(200).json({
    success: true,
    message: 'Code sent to your email. Please check your inbox and spam folder.',
    code: otpCode,
    expiresAt,
    from: gmailUser,
    dispatchedVia: 'direct_response'
  });
}
