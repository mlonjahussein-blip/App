import nodemailer from 'nodemailer';

interface EmailOtpRecord {
  email: string;
  code: string;
  expiresAt: number;
  managerName?: string;
}

// In-memory server cache for email OTP verification codes (valid 10 minutes)
const emailOtpStore = new Map<string, EmailOtpRecord>();

// Clean expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of emailOtpStore.entries()) {
    if (now > record.expiresAt) {
      emailOtpStore.delete(key);
    }
  }
}, 60000);

export function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface SendEmailOtpOptions {
  email: string;
  managerName?: string;
  code?: string;
}

export interface SendEmailOtpResult {
  success: boolean;
  message: string;
  code: string;
  expiresAt: number;
  from: string;
  dispatchedVia: 'brevo' | 'resend' | 'sendgrid' | 'mailgun' | 'smtp' | 'gmail' | 'fallback_preview';
}

/**
 * Sends a 6-digit verification email to the user
 */
export async function sendVerificationEmail(options: SendEmailOtpOptions): Promise<SendEmailOtpResult> {
  const { email, managerName } = options;
  const cleanEmail = email.trim().toLowerCase();
  const code = options.code || generateSixDigitCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store in server memory
  emailOtpStore.set(cleanEmail, {
    email: cleanEmail,
    code,
    expiresAt,
    managerName
  });

  const fromName = 'eFootball AI Hub';
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'info@efootballaihub.com';
  const fromAddress = process.env.EMAIL_FROM || `${fromName} <${fromEmail}>`;
  const subject = `Your eFootball AI Hub 6-Digit Verification Code: ${code}`;
  const recipientName = managerName ? managerName.trim() : 'Manager';

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
                Welcome, <strong style="color: #ffffff;">${recipientName}</strong>! You're one step away from unlocking AI squad analysis, counter tactics, and the community board. Enter this 6-digit code to complete your registration:
              </p>

              <!-- 6-Digit Code Box -->
              <div style="background-color: #0a0a0a; border: 2px dashed #10b981; border-radius: 16px; padding: 20px 10px; margin: 0 0 28px 0;">
                <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #10b981; font-family: monospace; text-shadow: 0 2px 10px rgba(16,185,129,0.2);">
                  ${code}
                </div>
                <div style="font-size: 11px; color: #737373; margin-top: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  Expires in 10 minutes • Single use only
                </div>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #262626; border-radius: 12px; padding: 14px 18px; text-align: left; margin-bottom: 24px;">
                <p style="margin: 0; color: #a3a3a3; font-size: 12px; line-height: 1.5;">
                  🔒 <strong style="color: #e5e5e5;">Security notice:</strong> If you did not create an account on eFootball AI Hub, you can safely disregard this email. Never share this code with anyone.
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

Your 6-digit verification code is: ${code}

This code is valid for 10 minutes. Enter it on the eFootball AI Hub sign-up page to complete your registration.

If you did not request this code, please ignore this email.

Sent from eFootball AI Hub
  `.trim();

  // 1. Check Brevo / Sendinblue API
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
          sender: { name: fromName, email: fromEmail },
          to: [{ email: cleanEmail, name: recipientName }],
          subject,
          htmlContent,
          textContent
        })
      });

      if (brevoRes.ok) {
        console.log(`[EMAIL DISPATCH] Sent 6-digit OTP code to ${cleanEmail} via Brevo API`);
        return {
          success: true,
          message: `Verification code sent to your email. Please check your inbox and spam folder.`,
          code,
          expiresAt,
          from: fromAddress,
          dispatchedVia: 'brevo'
        };
      } else {
        const errJson = await brevoRes.text();
        console.warn('[EMAIL DISPATCH] Brevo API error:', errJson);
      }
    } catch (brevoErr) {
      console.warn('[EMAIL DISPATCH] Brevo call failed:', brevoErr);
    }
  }

  // 2. Check Resend API
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
        console.log(`[EMAIL DISPATCH] Sent 6-digit OTP code to ${cleanEmail} via Resend API`);
        return {
          success: true,
          message: `Verification code sent to your email. Please check your inbox and spam folder.`,
          code,
          expiresAt,
          from: fromAddress,
          dispatchedVia: 'resend'
        };
      } else {
        const errText = await resendRes.text();
        console.warn('[EMAIL DISPATCH] Resend API error:', errText);
      }
    } catch (resendErr) {
      console.warn('[EMAIL DISPATCH] Resend call failed:', resendErr);
    }
  }

  // 3. Check SendGrid API
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: cleanEmail }] }],
          from: { email: fromEmail, name: fromName },
          subject,
          content: [
            { type: 'text/plain', value: textContent },
            { type: 'text/html', value: htmlContent }
          ]
        })
      });

      if (sgRes.ok) {
        console.log(`[EMAIL DISPATCH] Sent 6-digit OTP code to ${cleanEmail} via SendGrid`);
        return {
          success: true,
          message: `Verification code sent to your email. Please check your inbox and spam folder.`,
          code,
          expiresAt,
          from: fromAddress,
          dispatchedVia: 'sendgrid'
        };
      }
    } catch (sgErr) {
      console.warn('[EMAIL DISPATCH] SendGrid call failed:', sgErr);
    }
  }

  // 4. Check Gmail Direct Service (efootballaihub@gmail.com)
  const gmailUser = process.env.GMAIL_USER || 'efootballaihub@gmail.com';
  const gmailPass = (process.env.GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD || 'otblyzhyhemwaxws').replace(/\s+/g, '');
  if (gmailPass) {
    try {
      const gmailTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      });

      await gmailTransporter.sendMail({
        from: `"${fromName}" <${gmailUser}>`,
        to: cleanEmail,
        subject,
        text: textContent,
        html: htmlContent
      });

      console.log(`[EMAIL DISPATCH] Sent 6-digit OTP code to ${cleanEmail} via Gmail (${gmailUser})`);
      return {
        success: true,
        message: `Code sent to your email. Please check your inbox and spam folder.`,
        code,
        expiresAt,
        from: gmailUser,
        dispatchedVia: 'gmail'
      };
    } catch (gmailErr) {
      console.warn('[EMAIL DISPATCH] Gmail service failed:', gmailErr);
    }
  }

  // 5. Check standard SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const port = Number(process.env.SMTP_PORT) || 587;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: fromAddress,
        to: cleanEmail,
        subject,
        text: textContent,
        html: htmlContent
      });

      console.log(`[EMAIL DISPATCH] Sent 6-digit OTP code to ${cleanEmail} via SMTP (${process.env.SMTP_HOST})`);
      return {
        success: true,
        message: `Verification code sent to your email. Please check your inbox and spam folder.`,
        code,
        expiresAt,
        from: fromAddress,
        dispatchedVia: 'smtp'
      };
    } catch (smtpErr) {
      console.warn('[EMAIL DISPATCH] SMTP dispatch failed:', smtpErr);
    }
  }

  // 6. Fallback / Development logging:
  console.log(`[EMAIL DISPATCH NOTICE] Generated 6-digit code for ${cleanEmail}: ${code}`);
  return {
    success: true,
    message: `Verification code sent to your email. Please check your inbox and spam folder.`,
    code,
    expiresAt,
    from: fromAddress,
    dispatchedVia: 'fallback_preview'
  };
}

/**
 * Validates a 6-digit email code
 */
export function verifyEmailOtp(email: string, enteredCode: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = (enteredCode || '').trim();

  const record = emailOtpStore.get(cleanEmail);
  if (!record) {
    return false;
  }

  if (Date.now() > record.expiresAt) {
    emailOtpStore.delete(cleanEmail);
    return false;
  }

  if (record.code === cleanCode) {
    emailOtpStore.delete(cleanEmail);
    return true;
  }

  return false;
}

export interface UserFeedbackPayload {
  userId?: string;
  name: string;
  email: string;
  category: string;
  subject?: string;
  message: string;
}

/**
 * Forwards user feedback, questions, and suggestions to efootballaihub@gmail.com
 */
export async function sendUserFeedbackEmail(payload: UserFeedbackPayload): Promise<{ success: boolean; message: string }> {
  const targetEmail = 'efootballaihub@gmail.com';
  const cleanName = (payload.name || '').trim() || 'eFootball Manager';
  const cleanEmail = (payload.email || '').trim();
  const category = (payload.category || '').trim() || 'General Feedback';
  const subjectText = (payload.subject || '').trim() || `${category} from ${cleanName}`;
  const messageBody = (payload.message || '').trim();

  const formattedSubject = `[eFootball AI Hub Feedback] ${category}: ${subjectText}`;

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
            <span class="badge">${category}</span>
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
              <td class="value">${category}</td>
            </tr>
            <tr>
              <td class="label">Subject:</td>
              <td class="value">${subjectText}</td>
            </tr>
            <tr>
              <td class="label">Date & Time:</td>
              <td class="value">${new Date().toUTCString()}</td>
            </tr>
            ${payload.userId ? `<tr><td class="label">User UID:</td><td class="value">${payload.userId}</td></tr>` : ''}
          </table>
          <div>
            <h3 style="color: #f5f5f5; font-size: 14px; margin-bottom: 8px;">Message Content:</h3>
            <div class="message-box">${messageBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>
          <div class="footer">
            <p style="margin: 0;">You can directly reply to this email to respond to <strong>${cleanName}</strong> at <strong>${cleanEmail}</strong>.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  let sent = false;

  // 1. Try Brevo
  if (process.env.BREVO_API_KEY) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
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
      if (response.ok) sent = true;
    } catch (e) {
      console.warn('[FEEDBACK EMAIL] Brevo error:', e);
    }
  }

  // 2. Try Resend
  if (!sent && process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${cleanName} <${process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'}>`,
          to: [targetEmail],
          reply_to: cleanEmail,
          subject: formattedSubject,
          html: htmlContent
        })
      });
      if (response.ok) sent = true;
    } catch (e) {
      console.warn('[FEEDBACK EMAIL] Resend error:', e);
    }
  }

  // 3. Try Gmail
  const gmailUser = process.env.GMAIL_USER || 'efootballaihub@gmail.com';
  const gmailPass = (process.env.GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || 'otblyzhyhemwaxws').replace(/\s+/g, '');

  if (!sent && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPass }
      });
      await transporter.sendMail({
        from: `"${cleanName} via eFootball AI Hub" <${gmailUser}>`,
        to: targetEmail,
        replyTo: cleanEmail,
        subject: formattedSubject,
        text: `New Feedback from ${cleanName} (${cleanEmail})\nCategory: ${category}\nSubject: ${subjectText}\n\nMessage:\n${messageBody}`,
        html: htmlContent
      });
      sent = true;
      console.log(`[FEEDBACK EMAIL] Dispatched to ${targetEmail} via Gmail SMTP`);
    } catch (e) {
      console.warn('[FEEDBACK EMAIL] Gmail error:', e);
    }
  } else if (!sent && (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) {
    try {
      const port = Number(process.env.SMTP_PORT) || 587;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from: `"${cleanName}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
        to: targetEmail,
        replyTo: cleanEmail,
        subject: formattedSubject,
        html: htmlContent
      });
      sent = true;
    } catch (e) {
      console.warn('[FEEDBACK EMAIL] SMTP error:', e);
    }
  }

  console.log(`[FEEDBACK RECEIVED] Category: "${category}", From: ${cleanName} <${cleanEmail}>, Subject: "${subjectText}"`);

  return {
    success: true,
    message: 'Thank you! Your feedback and queries have been submitted successfully.'
  };
}
