import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { performSquadAnalysis, createEvidenceBasedFallback, AnalyzeSquadPayload } from './server/accuracyPipeline.ts';
import { sendVerificationEmail, verifyEmailOtp, sendUserFeedbackEmail } from './server/emailService.ts';
import {
  getUserEntitlements,
  consumeEntitlementForAnalysis,
  createPaymentOrder,
  verifyAndCompletePayment,
  getPaymentHistory,
  resetUserFreeAnalysisForTesting,
  handlePaymentWebhook
} from './server/payment/paymentService.ts';
import { getPaymentConfig } from './server/payment/config.ts';
import {
  EFOOTBALL_MASTER_PLAYERS,
  normalizeString,
  getAllEfhubCardsForPlayer
} from './src/lib/efootballDatabase.ts';

dotenv.config();

const app = express();
const PORT = 3000;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Security: Disable X-Powered-By header and set secure HTTP headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://apis.google.com https://*.firebaseapp.com https://*.lemonsqueezy.com https://js.paystack.co https://checkout.flutterwave.com https://www.paypal.com https://efhub.com https://*.efhub.com https://cdn.efhub.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://efhub.com https://*.efhub.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: http: https://efhub.com https://*.efhub.com https://cdn.efhub.com https://img.efhub.com https://efimg.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://api.lemonsqueezy.com https://api.paystack.co https://api.flutterwave.com https://api.paypal.com https://*.run.app https://*.vercel.app https://efhub.com https://*.efhub.com https://cdn.efhub.com https://img.efhub.com https://efimg.com; frame-src 'self' https://efhub.com https://*.efhub.com https://*.firebaseapp.com https://accounts.google.com https://*.lemonsqueezy.com https://checkout.flutterwave.com https://www.paypal.com; frame-ancestors 'self' https://*.google.com https://*.run.app; object-src 'none'; base-uri 'self'; upgrade-insecure-requests;"
  );

  // For API endpoints, prevent any downstream or browser proxy caching of dynamic data
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
});

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

// User Feedback, Suggestions, and Queries endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, category, subject, message, userId } = req.body || {};

    if (!email || !message) {
      return res.status(400).json({ error: 'Email and feedback message are required.' });
    }

    const cleanEmail = String(email).trim();
    const cleanName = String(name || cleanEmail.split('@')[0] || 'Tactician').trim();
    const cleanMessage = String(message).trim();
    const cleanCategory = String(category || 'Feedback').trim();
    const cleanSubject = String(subject || `${cleanCategory} from ${cleanName}`).trim();

    // 1. Dispatch email directly to support mailbox
    const dispatchResult = await sendUserFeedbackEmail({
      userId,
      name: cleanName,
      email: cleanEmail,
      category: cleanCategory,
      subject: cleanSubject,
      message: cleanMessage
    });

    // 2. Also persist to Firestore for record-keeping
    try {
      const PROJECT_ID = 'emergent-fastness-8lcf1';
      const DB_ID = 'ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba';
      const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY';
      const BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;
      const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      await fetch(`${BASE_REST_URL}/feedbacks/${feedbackId}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: feedbackId },
            userId: { stringValue: userId || 'anonymous' },
            name: { stringValue: cleanName },
            email: { stringValue: cleanEmail },
            category: { stringValue: cleanCategory },
            subject: { stringValue: cleanSubject },
            message: { stringValue: cleanMessage },
            createdAt: { stringValue: new Date().toISOString() }
          }
        })
      });
    } catch (dbErr) {
      console.warn('[FEEDBACK STORE] Could not save feedback to Firestore:', dbErr);
    }

    res.json(dispatchResult);
  } catch (error: any) {
    console.error('Error handling /api/feedback:', error);
    res.status(500).json({ error: error?.message || 'Failed to submit feedback. Please try again.' });
  }
});

// Route PESDB and eFHUB subpaths directly through the proxy so no link click in the iframe falls through to index.html
app.get(['/efootball', '/efootball/*', '/assets/*', '/pes2021/*', '/players', '/players/*', '/articles/*', '/managers/*', '/items/*'], (req, res) => {
  const host = req.originalUrl.startsWith('/efootball') || req.originalUrl.startsWith('/assets') || req.originalUrl.startsWith('/pes2021')
    ? 'https://pesdb.net'
    : 'https://efhub.com';
  const fullTarget = host + req.originalUrl;
  res.redirect(`/api/efhub-proxy?url=${encodeURIComponent(fullTarget)}`);
});

// Proxy Next.js assets if requested on host domain
app.get('/_next/*', async (req, res) => {
  try {
    const targetUrl = 'https://efhub.com' + req.originalUrl;
    const response = await fetch(targetUrl);
    const contentType = response.headers.get('content-type') || 'application/javascript';
    res.setHeader('content-type', contentType);
    res.setHeader('access-control-allow-origin', '*');
    const buffer = await response.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch {
    res.status(404).send('Asset not found');
  }
});

// Forward Next.js static assets and chunks for live efhub browsing
app.use('/_next', async (req, res, next) => {
  try {
    const targetUrl = `https://efhub.com/_next${req.url}`;
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      }
    });
    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'application/javascript';
      res.setHeader('content-type', contentType);
      res.setHeader('access-control-allow-origin', '*');
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (e) {}
  next();
});

// Live Database Reverse Proxy Endpoint (Supports efhub.com & pesdb.net)
// Strips frame-ancestors and x-frame-options and rewrites relative resources so official database sites open smoothly
app.get('/api/efhub-proxy', async (req, res) => {
  try {
    let target = (req.query.url as string) || 'https://efhub.com/';
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = target.startsWith('/efootball') || target.startsWith('/assets')
        ? 'https://pesdb.net' + (target.startsWith('/') ? target : '/' + target)
        : 'https://efhub.com' + (target.startsWith('/') ? target : '/' + target);
    }

    const parsedUrl = new URL(target);
    const baseOrigin = parsedUrl.origin;

    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    res.setHeader('content-type', contentType);
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('x-frame-options', 'ALLOWALL');

    // Remove frame blocking headers
    res.removeHeader('x-frame-options');
    res.removeHeader('content-security-policy');
    res.removeHeader('content-security-policy-report-only');

    if (contentType.includes('text/html')) {
      let html = await response.text();

      // 1. Rewrite relative paths for scripts, styles, manifests, assets
      html = html.replace(/href="\/assets\//g, `href="${baseOrigin}/assets/`);
      html = html.replace(/src="\/assets\//g, `src="${baseOrigin}/assets/`);
      html = html.replace(/href="\/_next\//g, `href="${baseOrigin}/_next/`);
      html = html.replace(/src="\/_next\//g, `src="${baseOrigin}/_next/`);
      html = html.replace(/href="\/favicon/g, `href="${baseOrigin}/favicon`);
      html = html.replace(/src="\/favicon/g, `src="${baseOrigin}/favicon`);
      html = html.replace(/href="\/manifest\.json"/g, `href="${baseOrigin}/manifest.json"`);

      // 2. Inject anti-redirect, anti-framebust and card extractor script at the VERY TOP of <head>
      const headScriptTag = `
<base href="${baseOrigin}/">
<script>
(function() {
  // 1. Completely disable frame-busting so host app is NEVER redirected to system home
  try {
    Object.defineProperty(window, 'top', {
      get: function() { return window.self; },
      set: function() {}
    });
  } catch(e) {}

  function notifyParent(type, payload) {
    try {
      window.parent.postMessage({ source: 'EFHUB_EMBED', type: type, ...payload }, '*');
    } catch (e) {}
  }

  // 2. Intercept router history methods
  var origReplaceState = history.replaceState;
  history.replaceState = function(state, title, url) {
    if (url === '/' || url === window.location.origin + '/' || url === '') {
      return;
    }
    if (typeof url === 'string') {
      var fullUrl = url.startsWith('http') ? url : '${baseOrigin}' + (url.startsWith('/') ? url : '/' + url);
      notifyParent('URL_CHANGED', { url: fullUrl, pathname: url });
    }
    return origReplaceState.apply(this, arguments);
  };

  var origPushState = history.pushState;
  history.pushState = function(state, title, url) {
    if (url === '/' || url === window.location.origin + '/' || url === '') {
      return;
    }
    if (typeof url === 'string') {
      var fullUrl = url.startsWith('http') ? url : '${baseOrigin}' + (url.startsWith('/') ? url : '/' + url);
      notifyParent('URL_CHANGED', { url: fullUrl, pathname: url });
      if (url.includes('/players/') || url.includes('/players?') || url.includes('player.php') || url.includes('/player/')) {
        window.location.href = '/api/efhub-proxy?url=' + encodeURIComponent(fullUrl);
        return;
      }
    }
    return origPushState.apply(this, arguments);
  };

  // 3. Intercept fetch & XMLHttpRequest to proxy relative asset and API requests to target origin
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(input, init) {
      if (typeof input === 'string' && input.startsWith('/')) {
        input = '${baseOrigin}' + input;
      }
      return origFetch.call(this, input, init);
    };
  }

  var origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && url.startsWith('/')) {
      url = '${baseOrigin}' + url;
    }
    return origXhrOpen.apply(this, [method, url].concat(Array.prototype.slice.call(arguments, 2)));
  };

  // Helper to extract player card details from clicked element / row
  function extractCardFromElement(targetEl) {
    if (!targetEl) return null;
    var container = targetEl.closest('a, tr, div[class*="player"], div[class*="card"], div[class*="item"]');
    if (!container) return null;

    var text = (container.innerText || '').trim();
    if (!text || text.length < 2) return null;

    // Detect OVR rating (e.g. 102, 100, 98, 96, 95...)
    var ovrMatch = text.match(/\\b(10[0-9]|9[0-9]|8[0-9]|7[0-9])\\b/);
    var ovr = ovrMatch ? parseInt(ovrMatch[1], 10) : 90;

    // Detect position
    var posMatch = text.match(/\\b(GK|CB|LB|RB|LWB|RWB|DMF|CMF|AMF|LMF|RMF|LWF|RWF|SS|CF)\\b/);
    var pos = posMatch ? posMatch[1] : 'CF';

    // Detect Card Type
    var cardType = 'Highlight';
    if (/show\\s*time/i.test(text)) cardType = 'Show Time';
    else if (/epic/i.test(text)) cardType = 'Epic';
    else if (/big\\s*time/i.test(text)) cardType = 'Big Time';
    else if (/potw/i.test(text)) cardType = 'POTW';
    else if (/booster/i.test(text)) cardType = 'Booster';
    else if (/legendary/i.test(text)) cardType = 'Legendary';
    else if (/featured/i.test(text)) cardType = 'Featured';

    // Detect Playstyle
    var playstyle = 'Goal Poacher';
    var styles = [
      'Goal Poacher', 'Hole Player', 'Box-to-Box', 'Anchor Man', 'Build Up', 'Destroyer',
      'Orchestrator', 'Creative Playmaker', 'Proficient Winger', 'Roaming Flank', 
      'Target Man', 'Fox in the Box', 'Offensive Fullback', 'Defensive Fullback',
      'Fullback Finisher', 'Extra Frontman', 'Offensive Goalkeeper', 'Defensive Goalkeeper', 'Cross Specialist'
    ];
    for (var i = 0; i < styles.length; i++) {
      if (new RegExp(styles[i], 'i').test(text)) {
        playstyle = styles[i];
        break;
      }
    }

    // Detect Name
    var lines = text.split('\\n').map(function(l) { return l.trim(); }).filter(Boolean);
    var name = lines[0] || 'Selected Player';
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j];
      if (line.length > 2 && !/^\\d+$/.test(line) && !/^(GK|CB|LB|RB|DMF|CMF|AMF|LMF|RMF|LWF|RWF|SS|CF)$/.test(line)) {
        name = line;
        break;
      }
    }

    return {
      fullName: name,
      commonName: name,
      primaryPosition: pos,
      maxRating: ovr,
      baseRating: Math.max(70, ovr - 10),
      cardType: cardType,
      playstyle: playstyle,
      rawText: text.substring(0, 200)
    };
  }

  // 4. Intercept all form submissions so search and filters stay inside the proxy
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form) return;
    e.preventDefault();
    e.stopPropagation();

    var action = form.getAttribute('action') || window.location.pathname;
    var formData = new FormData(form);
    var params = new URLSearchParams();
    for (var pair of formData.entries()) {
      params.append(pair[0], pair[1]);
    }
    var queryString = params.toString();

    var target = action.startsWith('http') ? action : ('${baseOrigin}' + (action.startsWith('/') ? action : '/' + action));
    if (queryString) {
      target += (target.includes('?') ? '&' : '?') + queryString;
    }

    notifyParent('URL_CHANGED', { url: target });
    window.location.href = '/api/efhub-proxy?url=' + encodeURIComponent(target);
  }, true);

  // 5. Intercept all link and card clicks so navigation stays within the proxy browser
  document.addEventListener('click', function(e) {
    var anchor = e.target.closest('a');
    var cardData = extractCardFromElement(e.target);
    
    if (cardData) {
      notifyParent('CARD_DETECTED', { player: cardData });
    }

    if (!anchor) return;

    var href = anchor.getAttribute('href');
    if (!href) return;

    if (href.startsWith('mailto:') || href.startsWith('#') || href.startsWith('javascript:')) return;

    // Check for player selection or card click
    var efhubPlayerMatch = (href || '').match(/\\/(?:efootball\\/)?(?:players|player)\\/([0-9a-zA-Z_\\-]+)/);
    var pesdbPlayerMatch = (href || '').match(/player\\.php\\?id=([0-9]+)/);
    var playerId = (efhubPlayerMatch && efhubPlayerMatch[1]) || (pesdbPlayerMatch && pesdbPlayerMatch[1]);
    var text = (anchor.innerText || '').trim();

    var fullTarget = href.startsWith('http://') || href.startsWith('https://')
      ? href
      : (href.startsWith('/') ? ('${baseOrigin}' + href) : ('${baseOrigin}/' + href.replace(/^\\.\\//, '')));

    notifyParent('URL_CHANGED', { url: fullTarget, pathname: href });

    if (playerId) {
      notifyParent('CARD_CLICKED', { 
        href: href, 
        fullUrl: fullTarget, 
        playerId: playerId, 
        text: text,
        player: cardData 
      });
    }

    e.preventDefault();
    e.stopPropagation();

    window.location.href = '/api/efhub-proxy?url=' + encodeURIComponent(fullTarget);
  }, true);

  // Monitor URL on load
  setTimeout(function() {
    notifyParent('URL_CHANGED', { url: window.location.href, pathname: window.location.pathname });
  }, 1000);
})();
</script>
`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${headScriptTag}`);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head[^>]*>/, `$&${headScriptTag}`);
      } else {
        html = headScriptTag + html;
      }

      return res.send(html);
    } else {
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (err: any) {
    console.error('Error in /api/efhub-proxy:', err);
    res.status(500).send('Unable to load live database website frame. Please use the fallback search or open directly.');
  }
});

// Endpoint to fetch player card details from a PESDB or eFHUB URL or ID
app.get('/api/efhub-player', async (req, res) => {
  try {
    const input = (req.query.id || req.query.url) as string;
    if (!input) {
      return res.status(400).json({ error: 'Player ID or URL is required.' });
    }

    let targetUrl = input;
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      targetUrl = `https://pesdb.net/efootball/players/${input}`;
    }

    let response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok && !targetUrl.includes('efhub.com')) {
      targetUrl = `https://efhub.com/players/${input}`;
      response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        }
      });
    }

    if (!response.ok) {
      return res.status(404).json({ error: `Database returned status ${response.status}` });
    }

    const html = await response.text();

    // Try parsing rich PESDB JSON data
    const pesdbScriptMatch = html.match(/<script[^>]*id="player-progression-data"[^>]*>([\s\S]*?)<\/script>/i);
    let parsedPesdb: any = null;
    if (pesdbScriptMatch && pesdbScriptMatch[1]) {
      try {
        parsedPesdb = JSON.parse(pesdbScriptMatch[1]);
      } catch (e) {
        console.warn('Could not parse pesdb JSON script:', e);
      }
    }

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

    let name = parsedPesdb?.compare?.playerName || 'Unknown Player';
    let maxRating = parsedPesdb?.databaseMaxOverall || parsedPesdb?.baseOverall || 90;
    let baseRating = parsedPesdb?.baseOverall || Math.max(70, maxRating - 10);
    let position = 'CF';
    let playstyle = parsedPesdb?.compare?.attackingPlayingStyle || parsedPesdb?.compare?.defensivePlayingStyle || 'Goal Poacher';
    let cardType = parsedPesdb?.compare?.cardType || 'Epic';
    let club = parsedPesdb?.compare?.teamName || 'eFootball Club';
    let nationality = parsedPesdb?.compare?.nationality || 'International';
    let skills: string[] = parsedPesdb?.compare?.playerSkills || ['Double Touch', 'First-time Shot', 'One-touch Pass'];

    if (name === 'Unknown Player' && titleMatch) {
      const parts = titleMatch[1].split(/—|-|\|/);
      if (parts[0]) name = parts[0].trim();
      if (parts[1]) {
        const ovrMatch = parts[1].match(/(\d+)\s*OVR/i) || parts[1].match(/(\d+)/);
        if (ovrMatch) maxRating = parseInt(ovrMatch[1], 10);
      }
    }

    if (descMatch) {
      const desc = descMatch[1];
      const mRate = desc.match(/Max Overall (\d+)/i) || desc.match(/Overall Rating (\d+)/i) || desc.match(/is a (\d+)-rated/i);
      if (mRate) maxRating = parseInt(mRate[1], 10);

      const mPos = desc.match(/rated ([A-Z]{2,3}) in eFootball/i) || desc.match(/\b(GK|CB|LB|RB|LWB|RWB|DMF|CMF|AMF|LMF|RMF|LWF|RWF|SS|CF)\b/);
      if (mPos) position = mPos[1].toUpperCase();

      const mStyle = desc.match(/Playing style:\s*([^.]+)\./i);
      if (mStyle) playstyle = mStyle[1].trim();
    }

    // Convert PESDB snake_case baseStats to PascalCase keyAttributes
    const keyAttributes: Record<string, number> = {};
    if (parsedPesdb?.baseStats) {
      const statsObj = parsedPesdb.baseStats;
      const keyMap: Record<string, string> = {
        offensive_awareness: 'OffensiveAwareness',
        ball_control: 'BallControl',
        dribbling: 'Dribbling',
        tight_possession: 'TightPossession',
        low_pass: 'LowPass',
        lofted_pass: 'LoftedPass',
        finishing: 'Finishing',
        heading: 'Heading',
        set_piece_taking: 'PlaceKicking',
        curl: 'Curl',
        speed: 'Speed',
        acceleration: 'Acceleration',
        kicking_power: 'KickingPower',
        jumping: 'Jumping',
        physical_contact: 'PhysicalContact',
        balance: 'Balance',
        stamina: 'Stamina',
        defensive_awareness: 'DefensiveAwareness',
        tackling: 'Tackling',
        aggression: 'Aggression',
        defensive_engagement: 'DefensiveEngagement',
        gk_awareness: 'GKAwareness',
        gk_catching: 'GKCatching',
        gk_parrying: 'GKParrying',
        gk_reflexes: 'GKReflexes',
        gk_reach: 'GKReach'
      };

      Object.keys(statsObj).forEach(k => {
        const pasName = keyMap[k] || k;
        keyAttributes[pasName] = Number(statsObj[k]);
      });
    }

    const matched = EFOOTBALL_MASTER_PLAYERS.find(p => 
      normalizeString(p.fullName) === normalizeString(name) ||
      normalizeString(p.commonName) === normalizeString(name) ||
      p.aliases.some(a => normalizeString(a) === normalizeString(name))
    );

    const generated = getAllEfhubCardsForPlayer(name);
    const chosen = generated.find(c => c.primaryPosition === position) || generated[0] || {
      id: `pesdb_${Date.now()}`,
      fullName: name,
      commonName: name,
      aliases: [name.toUpperCase()],
      primaryPosition: position,
      secondaryPositions: position === 'CF' ? ['SS'] : position === 'CB' ? ['RB'] : ['CMF'],
      baseRating: baseRating,
      maxRating: maxRating,
      playstyle: playstyle,
      club: club || matched?.club || 'eFootball Club',
      nationality: nationality || matched?.nationality || 'International',
      cardType: cardType || (maxRating >= 102 ? 'Big Time' : maxRating >= 100 ? 'Epic' : maxRating >= 98 ? 'Show Time' : 'Standard'),
      cardTitle: `${name} Official Card`,
      keyAttributes: keyAttributes,
      skills: skills.length > 0 ? skills : (matched?.skills || ['Double Touch', 'First-time Shot', 'One-touch Pass']),
      efhubUrl: targetUrl
    };

    const finalPlayer = {
      ...chosen,
      fullName: name,
      commonName: name,
      primaryPosition: position || chosen.primaryPosition,
      maxRating: maxRating || chosen.maxRating,
      baseRating: baseRating || chosen.baseRating,
      playstyle: playstyle || chosen.playstyle,
      cardType: cardType || chosen.cardType,
      club: club || chosen.club,
      nationality: nationality || chosen.nationality,
      keyAttributes: Object.keys(keyAttributes).length > 0 ? keyAttributes : chosen.keyAttributes,
      skills: skills.length > 0 ? skills : chosen.skills,
      efhubUrl: targetUrl,
      imageUrl: imgMatch ? imgMatch[1] : undefined
    };

    res.json({ success: true, player: finalPlayer });
  } catch (err: any) {
    console.error('Error in /api/efhub-player:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch player data' });
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
    const { userId, provider, userEmail, displayName, phoneNumber, countryCode, paymentType, callbackUrl } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    const effectiveProvider = provider || 'blmpay';

    const order = await createPaymentOrder({
      userId,
      provider: effectiveProvider,
      userEmail,
      displayName,
      phoneNumber,
      countryCode,
      paymentType,
      callbackUrl
    });

    res.json({ success: true, order });
  } catch (err: any) {
    console.error('Error in /api/payment/create:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to create payment order' });
  }
});

// BLM Pay / Universal Payment Webhook endpoint
app.post(['/api/payment/webhook/blmpay', '/api/payment/webhook'], async (req, res) => {
  try {
    console.log('[Payment Webhook Received]', req.path, JSON.stringify(req.body));
    const result = await handlePaymentWebhook(req.body, req.headers, 'blmpay');
    res.json(result);
  } catch (err: any) {
    console.error('[Payment Webhook Error in Route]', err);
    res.status(500).json({ success: false, error: err?.message || 'Internal webhook error' });
  }
});

// Verify & Complete Payment endpoint (Idempotent: grants credit once)
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { paymentId, providerTransactionId, simulateAction } = req.body || {};
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required.' });
    }

    const config = getPaymentConfig();
    const effectiveSimulate = config.isTestMode ? (simulateAction || 'success') : 'success';

    const result = await verifyAndCompletePayment(
      paymentId,
      effectiveSimulate,
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
    const config = getPaymentConfig();
    if (!config.isTestMode) {
      return res.status(403).json({ error: 'Resetting test quotas is forbidden in production.' });
    }

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
