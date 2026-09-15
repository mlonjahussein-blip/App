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

// server/serverless/playerBuilder.ts
var maxDuration = 10;
async function handler(req, res) {
  applySecurityHeaders(req, res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`player_build:${clientIp}`, 30, 5 * 60 * 1e3);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: `Too many build requests. Please wait ${rateLimit.retryAfterSec} seconds.` });
  }
  try {
    const { player, tacticalPlaystyle } = req.body || {};
    if (!player || !player.name) {
      return res.status(400).json({ error: "Player data is required." });
    }
    const guidance = {
      playerName: player.name,
      position: player.position || "CMF",
      playstyle: player.playstyle || "All-round",
      levelTraining: {
        recommendedLevels: 32,
        estimatedExpRequired: "74,000 EXP",
        keyTargetMilestones: "Cap core defensive and speed stats to reach break point +4"
      },
      playerProgression: [
        { attributeGroup: "Passing", points: 6, rationale: "Enhances curl and low pass trajectory under pressure." },
        { attributeGroup: "Dribbling / Tight Possession", points: 4, rationale: "Enables swift 180\xB0 turns when crowded in midfield." },
        { attributeGroup: "Dexterity / Acceleration", points: 8, rationale: "Provides initial burst to escape marker tracking." },
        { attributeGroup: "Lower Body Strength / Stamina", points: 8, rationale: "Ensures stamina remains in green zone until 90th minute." },
        { attributeGroup: "Defending", points: 4, rationale: "Increases recovery tackle success rate." }
      ],
      skillsToTeach: [
        { skill: "One-touch Pass", why: "Essential for crisp build-up and avoiding unnecessary tackles." },
        { skill: "Interception", why: "Triggers automatic limb extensions to cut opponent through-balls." },
        { skill: "Double Touch", why: "Fastest 1v1 skill move to create space for shooting or crossing." }
      ],
      positionTraining: {
        viablePositions: player.position === "DMF" ? ["CB", "CMF"] : player.position === "CF" ? ["SS", "AMF"] : ["CMF", "AMF"],
        recommendation: `Recommended familiarity upgrade to enhance squad depth for ${tacticalPlaystyle || "Quick Counter"} formation changes.`
      },
      tacticalAdvice: `Deploy as primary pivot or half-space receiver. Avoid carrying the ball for more than 3 touches in central third.`
    };
    return res.status(200).json({ success: true, builderPlan: guidance });
  } catch (error) {
    return res.status(200).json({
      success: false,
      error: error?.message || "Failed to generate player builder plan."
    });
  }
}
export {
  handler as default,
  maxDuration
};
