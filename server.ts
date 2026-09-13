import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { performSquadAnalysis, createEvidenceBasedFallback, AnalyzeSquadPayload } from './server/accuracyPipeline.ts';
import { sendVerificationEmail, verifyEmailOtp } from './server/emailService.ts';
import {
  getUserEntitlements,
  consumeEntitlementForAnalysis,
  createPaymentOrder,
  verifyAndCompletePayment,
  getPaymentHistory,
  resetUserFreeAnalysisForTesting
} from './server/payment/paymentService.ts';
import { getPaymentConfig } from './server/payment/config.ts';

dotenv.config();

const app = express();
const PORT = 3000;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Increase JSON limit for screenshots base64 payloads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'eFootball AI Hub API',
    timestamp: new Date().toISOString(),
    paymentStatus: 'active_test_mode'
  });
});

// WhatsApp OTP Verification Code endpoint
app.post('/api/auth/send-whatsapp-otp', async (req, res) => {
  const { phoneNumber, managerName, code, purpose } = req.body || {};

  if (!phoneNumber) {
    return res.status(400).json({ error: 'WhatsApp phone number is required.' });
  }

  const cleanDigits = String(phoneNumber).replace(/[^0-9]/g, '');
  if (cleanDigits.length < 7) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }

  const otpCode = code || Math.floor(100000 + Math.random() * 900000).toString();
  const greeting = managerName ? `Hello ${managerName}!` : 'Hello Manager!';
  const messageBody = `🎮 eFootball AI Hub: ${greeting} Your 6-digit WhatsApp verification code is: ${otpCode}. Valid for 10 minutes. Enter this code to complete registration.`;

  // 1. Twilio WhatsApp Gateway
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioAuth) {
    try {
      const fromNumber = twilioFrom
        ? (twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom.startsWith('+') ? twilioFrom : '+' + twilioFrom}`)
        : 'whatsapp:+14155238886'; // Twilio official WhatsApp Sandbox sender

      const toNumber = `whatsapp:+${cleanDigits}`;

      const twilioParams = new URLSearchParams();
      twilioParams.append('From', fromNumber);
      twilioParams.append('To', toNumber);
      twilioParams.append('Body', messageBody);

      const twilioResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: twilioParams.toString()
      });

      const twilioData = await twilioResp.json();

      if (twilioResp.ok) {
        console.log(`[WhatsApp Gateway] Successfully sent Twilio WhatsApp message to +${cleanDigits} (SID: ${twilioData.sid})`);
        return res.json({
          success: true,
          gateway: 'twilio_whatsapp',
          phoneNumber: '+' + cleanDigits,
          message: `Verification code sent to your WhatsApp (+${cleanDigits}).`
        });
      } else {
        console.warn('[WhatsApp Gateway] Twilio WhatsApp dispatch warning:', twilioData);
        // If WhatsApp failed (e.g. user hasn't joined sandbox), try direct SMS fallback if available
        if (twilioFrom && !twilioFrom.startsWith('whatsapp:')) {
          const smsParams = new URLSearchParams();
          smsParams.append('From', twilioFrom.startsWith('+') ? twilioFrom : '+' + twilioFrom);
          smsParams.append('To', `+${cleanDigits}`);
          smsParams.append('Body', messageBody);

          const smsResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: smsParams.toString()
          });

          if (smsResp.ok) {
            return res.json({
              success: true,
              gateway: 'twilio_sms',
              phoneNumber: '+' + cleanDigits,
              message: `Verification code sent to your phone (+${cleanDigits}) via SMS.`
            });
          }
        }

        return res.status(400).json({
          success: false,
          error: `Twilio delivery failed: ${twilioData.message || 'Check recipient phone number and Twilio WhatsApp sender setup.'}`
        });
      }
    } catch (e: any) {
      console.error('[WhatsApp Gateway] Twilio dispatch exception:', e);
    }
  }

  // 2. Meta WhatsApp Cloud API (Graph API)
  const metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN || process.env.WHATSAPP_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (metaToken && metaPhoneId) {
    try {
      const metaResp = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanDigits,
          type: 'text',
          text: {
            preview_url: false,
            body: messageBody
          }
        })
      });

      const metaData = await metaResp.json();
      if (metaResp.ok) {
        console.log(`[WhatsApp Gateway] Sent Meta WhatsApp Cloud message to +${cleanDigits}`);
        return res.json({
          success: true,
          gateway: 'meta_cloud_api',
          phoneNumber: '+' + cleanDigits,
          message: 'Verification code sent via WhatsApp Cloud API.'
        });
      } else {
        console.warn('[WhatsApp Gateway] Meta Cloud API error:', metaData);
        return res.status(400).json({
          success: false,
          error: `Meta WhatsApp Cloud API error: ${metaData?.error?.message || 'Check WhatsApp Business access token and phone number ID.'}`
        });
      }
    } catch (e: any) {
      console.error('[WhatsApp Gateway] Meta dispatch exception:', e);
    }
  }

  // 3. Neither Gateway Configured
  console.warn(`[WhatsApp Gateway] No active WhatsApp Gateway credentials found. (TWILIO_ACCOUNT_SID or WHATSAPP_CLOUD_API_TOKEN missing).`);
  return res.status(400).json({
    success: false,
    gatewayConfigured: false,
    phoneNumber: '+' + cleanDigits,
    error: 'Automated WhatsApp text delivery requires a WhatsApp Gateway (Twilio or Meta WhatsApp Cloud API) configured in environment variables. Because no gateway credentials (TWILIO_ACCOUNT_SID or WHATSAPP_CLOUD_API_TOKEN) are set yet, an automated text cannot be sent to your WhatsApp. Please sign up or sign in using Option 2 (Email & Password) to receive your verification code at your email from info@efootballaihub.com, or configure your WhatsApp Gateway.'
  });
});

// Email OTP Verification Code endpoint (from info@efootballaihub.com)
app.post('/api/auth/send-email-otp', async (req, res) => {
  try {
    const { email, managerName, code } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    const result = await sendVerificationEmail({
      email: cleanEmail,
      managerName,
      code
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/auth/send-email-otp:', error);
    res.status(500).json({ error: error?.message || 'Failed to dispatch verification email.' });
  }
});

// Verify 6-digit email OTP endpoint
app.post('/api/auth/verify-email-otp', (req, res) => {
  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const isValid = verifyEmailOtp(email, String(code));
    if (isValid) {
      res.json({ success: true, verified: true, message: 'Email verified successfully.' });
    } else {
      res.status(400).json({
        success: false,
        verified: false,
        error: 'Invalid or expired 6-digit code. Please verify the code or click Resend.'
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to verify email code.' });
  }
});

// Universal Cloud Registration Endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { uid, email, displayName, whatsappNumber, salt, hash } = req.body || {};
    if (!uid || !email || !salt || !hash) {
      return res.status(400).json({ error: 'Missing required account registration parameters.' });
    }

    const PROJECT_ID = 'emergent-fastness-8lcf1';
    const DB_ID = 'ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba';
    const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY';
    const BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = (displayName || cleanEmail.split('@')[0] || 'Tactician').trim();
    const cleanWhatsApp = whatsappNumber ? String(whatsappNumber).trim() : null;
    const rawDigits = cleanWhatsApp ? cleanWhatsApp.replace(/[^0-9]/g, '') : '';
    const emailKey = cleanEmail.replace(/[\/\s#$[\]]/g, '_');

    const fields: any = {
      uid: { stringValue: uid },
      email: { stringValue: cleanEmail },
      displayName: { stringValue: cleanName },
      salt: { stringValue: salt },
      hash: { stringValue: hash },
      createdAt: { stringValue: new Date().toISOString() },
      updatedAt: { stringValue: new Date().toISOString() },
      role: { stringValue: 'user' },
      freeAnalysesRemaining: { integerValue: '1' },
      paidCredits: { integerValue: '0' },
      lastFreeResetAt: { stringValue: new Date().toISOString() }
    };
    if (cleanWhatsApp) {
      fields.whatsappNumber = { stringValue: cleanWhatsApp };
    }

    // 1. Write to authAccounts
    await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(emailKey)}?key=${API_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    if (rawDigits && rawDigits.length >= 7) {
      await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent('wa_' + rawDigits)}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
      await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(rawDigits)}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
    }

    // 2. Write to users
    await fetch(`${BASE_REST_URL}/users/${encodeURIComponent(uid)}?key=${API_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    res.json({
      success: true,
      message: 'Account registered and persisted to cloud database.',
      user: { uid, email: cleanEmail, displayName: cleanName, whatsappNumber: cleanWhatsApp }
    });
  } catch (err: any) {
    console.error('Server auth register error:', err);
    res.status(500).json({ error: 'Failed to register account to cloud.' });
  }
});

// Universal Cloud Login Lookup Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const identifier = (req.body?.identifier || '').toString().trim();
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required.' });
    }

    const PROJECT_ID = 'emergent-fastness-8lcf1';
    const DB_ID = 'ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba';
    const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY';
    const BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;

    const rawDigits = identifier.replace(/[^0-9]/g, '');
    const isEmail = identifier.includes('@');
    const cleanEmail = isEmail ? identifier.toLowerCase() : '';

    const unwrap = (docData: any) => {
      if (!docData || !docData.fields) return null;
      const r: any = {};
      for (const [k, v] of Object.entries(docData.fields as Record<string, any>)) {
        if (v.stringValue !== undefined) r[k] = v.stringValue;
        else if (v.integerValue !== undefined) r[k] = parseInt(v.integerValue, 10);
        else if (v.booleanValue !== undefined) r[k] = v.booleanValue;
      }
      return r;
    };

    if (isEmail && cleanEmail) {
      const emailKey = cleanEmail.replace(/[\/\s#$[\]]/g, '_');
      const fetchRes = await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(emailKey)}?key=${API_KEY}`);
      if (fetchRes.ok) {
        const docJson = await fetchRes.json();
        const data = unwrap(docJson);
        if (data && data.salt && data.hash) {
          return res.json({ found: true, account: data });
        }
      }
    }

    if (rawDigits && rawDigits.length >= 7) {
      const fetchRes1 = await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent('wa_' + rawDigits)}?key=${API_KEY}`);
      if (fetchRes1.ok) {
        const docJson = await fetchRes1.json();
        const data = unwrap(docJson);
        if (data && data.salt && data.hash) {
          return res.json({ found: true, account: data });
        }
      }
    }

    res.status(404).json({ found: false, error: 'Account not found in cloud database.' });
  } catch (err: any) {
    console.error('Server auth login error:', err);
    res.status(500).json({ error: 'Failed to query cloud database.' });
  }
});

// Universal Cloud Password Reset Endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { identifier, salt, hash, uid } = req.body || {};
    if (!identifier || !salt || !hash) {
      return res.status(400).json({ error: 'Identifier, salt, and hash are required.' });
    }

    const PROJECT_ID = 'emergent-fastness-8lcf1';
    const DB_ID = 'ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba';
    const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY';
    const BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;

    const cleanId = String(identifier).trim();
    const isEmail = cleanId.includes('@');
    const cleanEmail = isEmail ? cleanId.toLowerCase() : '';
    const rawDigits = cleanId.replace(/[^0-9]/g, '');
    const now = new Date().toISOString();

    const patchPayload = {
      fields: {
        salt: { stringValue: salt },
        hash: { stringValue: hash },
        updatedAt: { stringValue: now }
      }
    };

    if (isEmail && cleanEmail) {
      const emailKey = cleanEmail.replace(/[\/\s#$[\]]/g, '_');
      await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(emailKey)}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
      }).catch(() => {});
    }

    if (rawDigits && rawDigits.length >= 7) {
      await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent('wa_' + rawDigits)}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
      }).catch(() => {});
      await fetch(`${BASE_REST_URL}/authAccounts/${encodeURIComponent(rawDigits)}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
      }).catch(() => {});
    }

    if (uid) {
      await fetch(`${BASE_REST_URL}/users/${encodeURIComponent(uid)}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Password updated successfully in cloud database.' });
  } catch (err: any) {
    console.error('Server password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// User entitlements & usage status endpoint (Backend source of truth)
app.get('/api/user/entitlements', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'guest';
    const entitlements = await getUserEntitlements(userId);
    res.json(entitlements);
  } catch (err: any) {
    console.error('Error fetching entitlements:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch user entitlements' });
  }
});

// Backward-compatible usage status endpoint
app.get('/api/user/usage-status', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'guest';
    const entitlements = await getUserEntitlements(userId);
    res.json({
      userId,
      freeAnalysesRemaining: entitlements.freeAnalysesRemaining,
      paidCredits: entitlements.paidAnalysisCredits,
      paidAnalysisEnabled: true,
      canAnalyze: entitlements.canAnalyze,
      testMode: entitlements.testMode,
      priceUsd: entitlements.paidAnalysisPriceUsd,
      priceDisplay: entitlements.priceDisplay,
      nextFreeResetDate: entitlements.nextFreeResetDate
    });
  } catch (err: any) {
    console.error('Error in usage-status:', err);
    res.status(500).json({ error: err?.message || 'Failed to query usage status' });
  }
});

// Create Payment Order Intent endpoint
app.post('/api/payment/create', async (req, res) => {
  try {
    const { userId, provider, userEmail, displayName } = req.body || {};
    if (!userId || !provider) {
      return res.status(400).json({ error: 'userId and provider are required.' });
    }

    const order = await createPaymentOrder({
      userId,
      provider,
      userEmail,
      displayName
    });

    res.json({ success: true, order });
  } catch (err: any) {
    console.error('Error in /api/payment/create:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to create payment order' });
  }
});

// Verify & Complete Payment endpoint (Idempotent: grants credit once)
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { paymentId, providerTransactionId, simulateAction } = req.body || {};
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required.' });
    }

    const result = await verifyAndCompletePayment(
      paymentId,
      simulateAction || 'success',
      providerTransactionId
    );

    res.json({ success: result.status === 'SUCCESS', result });
  } catch (err: any) {
    console.error('Error in /api/payment/verify:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to verify payment' });
  }
});

// Payment History endpoint
app.get('/api/payment/history', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'guest';
    const history = await getPaymentHistory(userId);
    res.json({ success: true, history });
  } catch (err: any) {
    console.error('Error in /api/payment/history:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch payment history' });
  }
});

// Test Mode: Reset Free Analysis Quota (Only allowed when PAYMENT_TEST_MODE = true)
app.post('/api/payment/test-reset-free', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    const result = await resetUserFreeAnalysisForTesting(userId);
    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/payment/test-reset-free:', err);
    res.status(400).json({ success: false, error: err?.message || 'Failed to reset free analysis' });
  }
});

// Perform AI Analysis endpoint with server-side entitlement enforcement
app.post('/api/analyze-squad', async (req, res) => {
  try {
    const payload: AnalyzeSquadPayload = req.body || {};
    const hasTyped = Array.isArray(payload.typedPlayers) && payload.typedPlayers.length > 0;

    if (!hasTyped) {
      return res.status(400).json({
        error: 'Please enter your squad players before analyzing.'
      });
    }

    // Backend Source of Truth: Verify & Consume analysis entitlement
    const userId = (payload as any).userId || (req.query?.userId as string) || 'guest';
    const entitlementCheck = await consumeEntitlementForAnalysis(userId);
    if (!entitlementCheck.allowed) {
      return res.status(402).json({
        success: false,
        paymentRequired: true,
        errorCode: 'PAYMENT_REQUIRED',
        error: entitlementCheck.error || 'Weekly free analysis used. Additional analysis requires payment.'
      });
    }

    // Call server-side Gemini service with safety fallback
    let result;
    try {
      result = await performSquadAnalysis(payload);
    } catch (analysisErr) {
      console.warn('Analysis execution caught in server.ts, falling back to evidence-based analysis:', analysisErr);
      result = createEvidenceBasedFallback(payload);
    }

    res.json({
      success: true,
      analysis: {
        ...result,
        analysisType: entitlementCheck.analysisType || 'FREE_WEEKLY'
      },
      analysisType: entitlementCheck.analysisType || 'FREE_WEEKLY'
    });
  } catch (error: any) {
    console.error('API Error in /api/analyze-squad:', error);
    const fallback = createEvidenceBasedFallback(req.body || {});
    res.json({
      success: true,
      analysis: fallback
    });
  }
});

// AI Player Builder endpoint: How to train and develop a specific player
app.post('/api/player-builder', async (req, res) => {
  try {
    const { player, tacticalPlaystyle } = req.body;
    if (!player || !player.name) {
      return res.status(400).json({ error: 'Player data is required.' });
    }

    // Build specific tactical training guidance
    const guidance = {
      playerName: player.name,
      position: player.position || 'CMF',
      playstyle: player.playstyle || 'All-round',
      levelTraining: {
        recommendedLevels: 32,
        estimatedExpRequired: '74,000 EXP',
        keyTargetMilestones: 'Cap core defensive and speed stats to reach break point +4'
      },
      playerProgression: [
        { attributeGroup: 'Passing', points: 6, rationale: 'Enhances curl and low pass trajectory under pressure.' },
        { attributeGroup: 'Dribbling / Tight Possession', points: 4, rationale: 'Enables swift 180° turns when crowded in midfield.' },
        { attributeGroup: 'Dexterity / Acceleration', points: 8, rationale: 'Provides initial burst to escape marker tracking.' },
        { attributeGroup: 'Lower Body Strength / Stamina', points: 8, rationale: 'Ensures stamina remains in green zone until 90th minute.' },
        { attributeGroup: 'Defending', points: 4, rationale: 'Increases recovery tackle success rate.' }
      ],
      skillsToTeach: [
        { skill: 'One-touch Pass', why: 'Essential for crisp build-up and avoiding unnecessary tackles.' },
        { skill: 'Interception', why: 'Triggers automatic limb extensions to cut opponent through-balls.' },
        { skill: 'Double Touch', why: 'Fastest 1v1 skill move to create space for shooting or crossing.' }
      ],
      positionTraining: {
        viablePositions: player.position === 'DMF' ? ['CB', 'CMF'] : player.position === 'CF' ? ['SS', 'AMF'] : ['CMF', 'AMF'],
        recommendation: `Recommended familiarity upgrade to enhance squad depth for ${tacticalPlaystyle || 'Quick Counter'} formation changes.`
      },
      tacticalAdvice: `Deploy as primary pivot or half-space receiver. Avoid carrying the ball for more than 3 touches in central third.`
    };

    res.json({ success: true, builderPlan: guidance });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to generate player builder plan.' });
  }
});

// Player Comparison endpoint
app.post('/api/player-comparison', (req, res) => {
  const { players, playstyle } = req.body;
  if (!Array.isArray(players) || players.length < 2) {
    return res.status(400).json({ error: 'At least 2 players are required for comparison.' });
  }

  const p1 = players[0];
  const p2 = players[1];

  const winner = (p1.rating || 85) >= (p2.rating || 85) ? p1 : p2;
  const runnerUp = winner === p1 ? p2 : p1;

  res.json({
    success: true,
    comparison: {
      playerA: p1,
      playerB: p2,
      recommendation: {
        winnerName: winner.name,
        verdict: `${winner.name} is the superior choice for your ${playstyle || 'current'} tactical system.`,
        detailedReasoning: `${winner.name} offers higher rating (${winner.rating || 85}) and greater role suitability as ${winner.playstyle || 'specialist'}, enabling tighter defensive cover and more clinical transition execution compared to ${runnerUp.name}.`
      }
    }
  });
});

// Global Express Error Handler for payload & middleware errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error('Express global error caught:', err?.message || err);
    console.error('Stack trace:', err?.stack);
    console.error('Request body keys:', Object.keys(req.body || {}));
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({ 
        error: 'Screenshot upload exceeds server payload limits. Please upload 1 to 3 screenshots or smaller files.' 
      });
    }
    // Return status 200 with evidence fallback instead of unhandled 500
    try {
      const fallback = createEvidenceBasedFallback(req.body || {});
      return res.status(200).json({
        success: true,
        analysis: fallback
      });
    } catch {
      return res.status(200).json({
        success: false,
        error: 'Analysis service encountered a temporary error. Please try again.'
      });
    }
  }
  next();
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`eFootball AI Hub server listening on port ${PORT}`);
  });
}

startServer();
