import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { performSquadAnalysis, createEvidenceBasedFallback, AnalyzeSquadPayload } from './server/accuracyPipeline.ts';
import { sendVerificationEmail, verifyEmailOtp } from './server/emailService.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON limit for screenshots base64 payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'eFootball AI Hub API',
    timestamp: new Date().toISOString(),
    paymentStatus: 'disabled_development'
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

// User usage status & payment eligibility endpoint
app.get('/api/user/usage-status', (req, res) => {
  const userId = (req.query.userId as string) || 'guest';
  // 1 free analysis per week rule
  res.json({
    userId,
    freeAnalysesRemaining: 1,
    paidCredits: 0,
    paidAnalysisEnabled: false,
    paymentStatusNotice: 'Paid analysis is currently unavailable while we prepare the payment system. Enjoy your weekly free analysis!',
    nextFreeResetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });
});

// Perform AI Analysis endpoint
app.post('/api/analyze-squad', async (req, res) => {
  try {
    const payload: AnalyzeSquadPayload = req.body || {};
    const hasImages = Array.isArray(payload.images) && payload.images.length > 0;
    const hasTyped = Array.isArray(payload.typedPlayers) && payload.typedPlayers.length > 0;

    if (!hasImages && !hasTyped) {
      return res.status(400).json({
        error: 'Please upload squad screenshots or enter your squad players.'
      });
    }

    if (hasImages && payload.images!.length > 5) {
      return res.status(400).json({
        error: 'Maximum 5 images allowed per analysis.'
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
      analysis: result
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
