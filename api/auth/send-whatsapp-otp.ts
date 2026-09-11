import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const { phoneNumber, managerName, code, purpose } = req.body || {};

  if (!phoneNumber) {
    return res.status(400).json({ error: 'WhatsApp phone number is required.' });
  }

  const cleanDigits = String(phoneNumber).replace(/[^0-9]/g, '');
  if (cleanDigits.length < 7) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }

  const otpCode = code || Math.floor(100000 + Math.random() * 900000).toString();

  // 1. Meta WhatsApp Cloud API (if configured in environment)
  const metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN || process.env.WHATSAPP_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (metaToken && metaPhoneId) {
    try {
      const metaResp = await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanDigits,
          type: 'text',
          text: {
            preview_url: false,
            body: `🎮 eFootball AI Hub: Your 6-digit verification code is ${otpCode}. Valid for 10 minutes.`
          }
        })
      });

      if (metaResp.ok) {
        return res.status(200).json({
          success: true,
          gateway: 'meta_cloud_api',
          phoneNumber: '+' + cleanDigits,
          message: 'Verification code sent via WhatsApp Cloud API.'
        });
      }
    } catch (metaErr) {
      console.warn('Meta WhatsApp API dispatch error:', metaErr);
    }
  }

  // 2. Twilio WhatsApp API (if configured in environment)
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
          message: 'Verification code sent via Twilio WhatsApp.'
        });
      }
    } catch (twErr) {
      console.warn('Twilio WhatsApp dispatch error:', twErr);
    }
  }

  // 3. Standalone Direct Verification Response
  return res.status(200).json({
    success: true,
    gateway: 'direct_verification',
    phoneNumber: '+' + cleanDigits,
    code: otpCode,
    message: `Verification code generated for WhatsApp (+${cleanDigits}).`
  });
}
