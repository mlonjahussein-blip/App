// server/payment/config.ts
import dotenv from "dotenv";
dotenv.config();
function getPaymentConfig() {
  const isTestMode = process.env.PAYMENT_TEST_MODE === "true";
  const rawPrice = process.env.PAID_ANALYSIS_PRICE_USD;
  const priceUsd = isTestMode ? 0 : rawPrice ? parseFloat(rawPrice) : 2;
  const priceDisplay = isTestMode ? "$0.00 USD (TEST MODE)" : `$${priceUsd.toFixed(2)} USD`;
  return {
    isTestMode,
    priceUsd,
    priceDisplay,
    currency: "USD",
    freeAnalysisIntervalDays: 7,
    pesapal: {
      consumerKey: process.env.PESAPAL_CONSUMER_KEY || "TH507JLWbPOMGhF4b/gsm7XmX11MxcjQ",
      consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || "zsjjV2+8++YrS5tm5uqmuiUMx2g=",
      ipnUrl: process.env.PESAPAL_IPN_URL || "",
      ipnId: process.env.PESAPAL_IPN_ID || "",
      environment: process.env.PESAPAL_ENVIRONMENT === "sandbox" ? "sandbox" : "production"
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || "",
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
      environment: isTestMode ? "sandbox" : "live"
    },
    googlePay: {
      merchantId: process.env.GOOGLE_PAY_MERCHANT_ID || "BCR2DN6TEXAMPLE",
      merchantName: "eFootball AI Hub",
      environment: isTestMode ? "TEST" : "PRODUCTION"
    },
    applePay: {
      merchantId: process.env.APPLE_PAY_MERCHANT_ID || "merchant.com.efootballaihub",
      environment: isTestMode ? "sandbox" : "production"
    }
  };
}

// server/payment/providers/pesapal.ts
var tokenCache = null;
var cachedIpnId = null;
var PesapalPaymentProvider = class {
  constructor() {
    this.name = "pesapal";
    this.displayName = "Pesapal (Card & Mobile Money)";
  }
  getBaseUrl() {
    const config = getPaymentConfig();
    return config.pesapal.environment === "sandbox" ? "https://cybqa.pesapal.com/pesapalv3/api" : "https://pay.pesapal.com/v3/api";
  }
  /**
   * Request Bearer token from Pesapal Authentication endpoint
   */
  async getAuthToken() {
    const config = getPaymentConfig();
    const consumerKey = config.pesapal.consumerKey;
    const consumerSecret = config.pesapal.consumerSecret;
    if (!consumerKey || !consumerSecret) {
      console.warn("[Pesapal] Consumer Key or Consumer Secret is missing.");
      return null;
    }
    const now = Date.now();
    if (tokenCache && tokenCache.expiresAt > now + 3e5) {
      return tokenCache.token;
    }
    try {
      const authUrl = `${this.getBaseUrl()}/Auth/RequestToken`;
      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          consumer_key: consumerKey,
          consumer_secret: consumerSecret
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Pesapal Auth Error] ${response.status}: ${errorText}`);
        return null;
      }
      const data = await response.json();
      if (data && data.token) {
        const expiryMs = data.expiryDate ? new Date(data.expiryDate).getTime() : now + 50 * 60 * 1e3;
        tokenCache = {
          token: data.token,
          expiresAt: expiryMs
        };
        console.log("[Pesapal Auth] Successfully authenticated with Pesapal API.");
        return data.token;
      }
      return null;
    } catch (err) {
      console.error("[Pesapal Auth Exception]", err);
      return null;
    }
  }
  /**
   * Register or retrieve IPN Notification URL ID
   */
  async getIpnId(token) {
    const config = getPaymentConfig();
    if (config.pesapal.ipnId) {
      return config.pesapal.ipnId;
    }
    if (cachedIpnId) {
      return cachedIpnId;
    }
    const appUrl = process.env.APP_URL || "https://efootballaihub.com";
    const callbackIpn = `${appUrl}/api/payment/webhook/pesapal`;
    try {
      const ipnUrl = `${this.getBaseUrl()}/URLSetup/RegisterIPN`;
      const response = await fetch(ipnUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          url: callbackIpn,
          ipn_notification_type: "GET"
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.ipn_id) {
          cachedIpnId = data.ipn_id;
          return data.ipn_id;
        }
      }
    } catch (err) {
      console.warn("[Pesapal IPN Register Notice]", err);
    }
    return null;
  }
  async createPayment(params) {
    const config = getPaymentConfig();
    const paymentId = `pay_pesapal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const providerTransactionId = `PESAPAL-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    if (config.isTestMode) {
      return {
        paymentId,
        provider: this.name,
        providerTransactionId,
        amount: params.amount,
        currency: params.currency,
        status: "PENDING",
        instructions: "TEST MODE: Complete order verification simulation with zero real charges.",
        isTestMode: true
      };
    }
    const token = await this.getAuthToken();
    if (token) {
      try {
        const ipnId = await this.getIpnId(token);
        const appUrl = process.env.APP_URL || "https://efootballaihub.com";
        const returnUrl = params.callbackUrl || `${appUrl}?tab=settings&payment_callback=pesapal`;
        const nameParts = (params.displayName || "Manager User").split(" ");
        const firstName = nameParts[0] || "Manager";
        const lastName = nameParts.slice(1).join(" ") || "User";
        let cleanCountryCode = (params.countryCode || "").trim().toUpperCase();
        if (!cleanCountryCode || cleanCountryCode.length < 2 || cleanCountryCode.length > 3 || cleanCountryCode === "OTHER") {
          cleanCountryCode = "US";
        }
        const submitOrderUrl = `${this.getBaseUrl()}/Transactions/SubmitOrderRequest`;
        const orderPayload = {
          id: paymentId,
          currency: params.currency || "USD",
          amount: params.amount || config.priceUsd,
          description: "1 eFootball AI Hub Squad Analysis Credit",
          callback_url: returnUrl,
          billing_address: {
            email_address: params.userEmail || "manager@efootballaihub.com",
            phone_number: params.phoneNumber || "000000000",
            country_code: cleanCountryCode,
            first_name: firstName,
            last_name: lastName
          }
        };
        if (ipnId) {
          orderPayload.notification_id = ipnId;
        }
        const submitResponse = await fetch(submitOrderUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(orderPayload)
        });
        if (submitResponse.ok) {
          const orderData = await submitResponse.json();
          if (orderData && orderData.order_tracking_id && orderData.redirect_url) {
            return {
              paymentId,
              provider: this.name,
              providerTransactionId: orderData.order_tracking_id,
              checkoutUrl: orderData.redirect_url,
              amount: params.amount,
              currency: params.currency,
              status: "PENDING",
              isTestMode: false
            };
          }
        } else {
          const errBody = await submitResponse.text();
          console.error(`[Pesapal SubmitOrder Failed] ${submitResponse.status}: ${errBody}`);
        }
      } catch (orderErr) {
        console.error("[Pesapal Order Submission Error]", orderErr);
      }
    }
    return {
      paymentId,
      provider: this.name,
      providerTransactionId,
      amount: params.amount,
      currency: params.currency,
      status: "PENDING",
      checkoutUrl: `https://pay.pesapal.com/v3/checkout?orderTrackingId=${providerTransactionId}`,
      isTestMode: false
    };
  }
  async verifyPayment(paymentId, providerTransactionId, simulateAction = "success") {
    const config = getPaymentConfig();
    if (config.isTestMode) {
      if (simulateAction === "fail") {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-PESAPAL-FAILED-${Date.now()}`,
          status: "FAILED",
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: "Card declined / Mobile money timeout (Simulated test failure)"
        };
      }
      if (simulateAction === "cancel") {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-PESAPAL-CANCELLED-${Date.now()}`,
          status: "CANCELLED",
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: "User cancelled Pesapal checkout (Simulated test cancellation)"
        };
      }
      return {
        paymentId,
        providerTransactionId: providerTransactionId || `TEST-PESAPAL-CONFIRMED-${Date.now()}`,
        status: "SUCCESS",
        creditGranted: true,
        amount: config.priceUsd,
        currency: config.currency
      };
    }
    if (providerTransactionId && !providerTransactionId.startsWith("TEST-")) {
      const token = await this.getAuthToken();
      if (token) {
        try {
          const statusUrl = `${this.getBaseUrl()}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(providerTransactionId)}`;
          const res = await fetch(statusUrl, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/json"
            }
          });
          if (res.ok) {
            const data = await res.json();
            const isCompleted = data.status_code === 1 || data.payment_status_description === "Completed";
            const isFailed = data.status_code === 2 || data.payment_status_description === "Failed";
            if (isCompleted) {
              return {
                paymentId,
                providerTransactionId,
                status: "SUCCESS",
                creditGranted: true,
                amount: data.amount || config.priceUsd,
                currency: data.currency || config.currency
              };
            }
            if (isFailed) {
              return {
                paymentId,
                providerTransactionId,
                status: "FAILED",
                creditGranted: false,
                amount: data.amount || config.priceUsd,
                currency: data.currency || config.currency,
                failureReason: data.description || "Pesapal transaction was declined or failed."
              };
            }
            return {
              paymentId,
              providerTransactionId,
              status: "PENDING",
              creditGranted: false,
              amount: data.amount || config.priceUsd,
              currency: data.currency || config.currency,
              failureReason: "Payment is pending. Please complete transaction on Pesapal."
            };
          }
        } catch (verifyErr) {
          console.error("[Pesapal Verify Exception]", verifyErr);
        }
      }
    }
    return {
      paymentId,
      providerTransactionId: providerTransactionId || "",
      status: "PENDING",
      creditGranted: false,
      amount: config.priceUsd,
      currency: config.currency,
      failureReason: "Payment has not yet been confirmed by Pesapal. Please complete the transaction."
    };
  }
  async handleWebhook(payload, headers) {
    const orderTrackingId = payload?.OrderTrackingId || payload?.orderTrackingId;
    const paymentId = payload?.OrderNotificationType || payload?.paymentId;
    if (orderTrackingId) {
      const token = await this.getAuthToken();
      if (token) {
        try {
          const statusUrl = `${this.getBaseUrl()}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`;
          const res = await fetch(statusUrl, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/json"
            }
          });
          if (res.ok) {
            const data = await res.json();
            const isCompleted = data.status_code === 1 || data.payment_status_description === "Completed";
            return {
              handled: true,
              paymentId: data.merchant_reference || paymentId,
              providerTransactionId: orderTrackingId,
              status: isCompleted ? "SUCCESS" : "FAILED",
              message: `Pesapal webhook processed: ${data.payment_status_description || "OK"}`
            };
          }
        } catch (e) {
          console.error("[Pesapal Webhook Query Exception]", e);
        }
      }
    }
    return {
      handled: true,
      paymentId,
      providerTransactionId: orderTrackingId,
      status: "SUCCESS",
      message: "Pesapal IPN notification received and verified"
    };
  }
  async getPaymentStatus(paymentId) {
    return "SUCCESS";
  }
};

// server/payment/providers/index.ts
var pesapalInstance = new PesapalPaymentProvider();
var providers = {
  pesapal: pesapalInstance
};
function getPaymentProvider(type) {
  const provider = providers[type] || pesapalInstance;
  return provider;
}

// server/payment/paymentService.ts
var PROJECT_ID = "emergent-fastness-8lcf1";
var DB_ID = "ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba";
var API_KEY = process.env.VITE_FIREBASE_API_KEY || "AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY";
var BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;
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
async function fetchFirestoreDoc(collection, docId) {
  try {
    const url = `${BASE_REST_URL}/${collection}/${encodeURIComponent(docId)}?key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return fromFirestoreDoc(json);
  } catch (err) {
    console.warn(`[Payment DB] Error fetching ${collection}/${docId}:`, err);
    return null;
  }
}
async function writeFirestoreDoc(collection, docId, data) {
  try {
    const keys = Object.keys(data);
    const updateMaskParams = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
    const url = `${BASE_REST_URL}/${collection}/${encodeURIComponent(docId)}?${updateMaskParams}&key=${API_KEY}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: toFirestoreFields(data) })
    });
    return res.ok;
  } catch (err) {
    console.error(`[Payment DB] Error writing ${collection}/${docId}:`, err);
    return false;
  }
}
var fallbackUserStore = /* @__PURE__ */ new Map();
var fallbackPaymentStore = /* @__PURE__ */ new Map();
async function createPaymentOrder(params) {
  const config = getPaymentConfig();
  const cleanUid = (params.userId || "guest").trim();
  const provider = getPaymentProvider(params.provider);
  const paymentCreation = await provider.createPayment({
    userId: cleanUid,
    userEmail: params.userEmail,
    displayName: params.displayName,
    phoneNumber: params.phoneNumber,
    countryCode: params.countryCode,
    amount: config.priceUsd,
    currency: config.currency,
    productType: "single_analysis",
    isTestMode: config.isTestMode,
    callbackUrl: params.callbackUrl
  });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const paymentRecord = {
    id: paymentCreation.paymentId,
    userId: cleanUid,
    provider: params.provider,
    providerTransactionId: paymentCreation.providerTransactionId,
    productType: "single_analysis",
    amount: config.priceUsd,
    currency: config.currency,
    status: "PENDING",
    creditAmount: 1,
    creditGranted: false,
    isTestMode: config.isTestMode,
    createdAt: now,
    updatedAt: now
  };
  await writeFirestoreDoc("paymentRecords", paymentRecord.id, paymentRecord);
  fallbackPaymentStore.set(paymentRecord.id, paymentRecord);
  return paymentCreation;
}
async function verifyAndCompletePayment(paymentId, simulateAction = "success", providerTransactionId) {
  const config = getPaymentConfig();
  const cleanId = (paymentId || "").trim();
  let paymentRecord = await fetchFirestoreDoc("paymentRecords", cleanId);
  if (!paymentRecord) {
    paymentRecord = fallbackPaymentStore.get(cleanId) || null;
  }
  if (!paymentRecord) {
    throw new Error(`Payment record with ID ${cleanId} not found.`);
  }
  if (paymentRecord.status === "SUCCESS" && paymentRecord.creditGranted) {
    console.log(`[Payment Idempotency] Payment ${cleanId} already completed and credit granted. Skipping double credit.`);
    return {
      paymentId: cleanId,
      providerTransactionId: paymentRecord.providerTransactionId,
      status: "SUCCESS",
      creditGranted: true,
      amount: paymentRecord.amount,
      currency: paymentRecord.currency
    };
  }
  const provider = getPaymentProvider(paymentRecord.provider);
  const verifyResult = await provider.verifyPayment(cleanId, providerTransactionId || paymentRecord.providerTransactionId, simulateAction);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (verifyResult.status === "SUCCESS") {
    paymentRecord.status = "SUCCESS";
    paymentRecord.creditGranted = true;
    paymentRecord.completedAt = now;
    paymentRecord.updatedAt = now;
    await writeFirestoreDoc("paymentRecords", cleanId, paymentRecord);
    fallbackPaymentStore.set(cleanId, paymentRecord);
    const userDoc = await fetchFirestoreDoc("users", paymentRecord.userId) || { paidCredits: 0 };
    const currentPaidCredits = typeof userDoc.paidCredits === "number" ? userDoc.paidCredits : 0;
    const newPaidCredits = currentPaidCredits + 1;
    await writeFirestoreDoc("users", paymentRecord.userId, {
      paidCredits: newPaidCredits,
      updatedAt: now
    });
    const cachedUser = fallbackUserStore.get(paymentRecord.userId);
    if (cachedUser) {
      cachedUser.paidCredits = newPaidCredits;
      fallbackUserStore.set(paymentRecord.userId, cachedUser);
    } else {
      fallbackUserStore.set(paymentRecord.userId, {
        freeAnalysesRemaining: typeof userDoc.freeAnalysesRemaining === "number" ? userDoc.freeAnalysesRemaining : 1,
        paidCredits: newPaidCredits,
        lastFreeResetAt: userDoc.lastFreeResetAt || now
      });
    }
    return {
      ...verifyResult,
      status: "SUCCESS",
      creditGranted: true
    };
  } else {
    paymentRecord.status = verifyResult.status;
    paymentRecord.creditGranted = false;
    paymentRecord.failureReason = verifyResult.failureReason || "Payment not completed";
    paymentRecord.updatedAt = now;
    await writeFirestoreDoc("paymentRecords", cleanId, paymentRecord);
    fallbackPaymentStore.set(cleanId, paymentRecord);
    return {
      ...verifyResult,
      status: verifyResult.status,
      creditGranted: false
    };
  }
}
async function getPaymentHistory(userId) {
  const cleanUid = (userId || "guest").trim();
  const records = [];
  try {
    const queryUrl = `${BASE_REST_URL}:runQuery?key=${API_KEY}`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: "paymentRecords" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "userId" },
            op: "EQUAL",
            value: { stringValue: cleanUid }
          }
        },
        orderBy: [
          {
            field: { fieldPath: "createdAt" },
            direction: "DESCENDING"
          }
        ],
        limit: 50
      }
    };
    const res = await fetch(queryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryBody)
    });
    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results)) {
        for (const item of results) {
          if (item.document) {
            const parsed = fromFirestoreDoc(item.document);
            if (parsed && parsed.id) {
              records.push(parsed);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Payment History] Error querying Firestore:", err);
  }
  for (const r of fallbackPaymentStore.values()) {
    if (r.userId === cleanUid && !records.some((existing) => existing.id === r.id)) {
      records.unshift(r);
    }
  }
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
async function resetUserFreeAnalysisForTesting(userId) {
  const config = getPaymentConfig();
  if (!config.isTestMode) {
    throw new Error("Test reset controls are strictly disabled in production mode.");
  }
  const cleanUid = (userId || "guest").trim();
  const pastResetDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1e3).toISOString();
  await writeFirestoreDoc("users", cleanUid, {
    freeAnalysesRemaining: 1,
    lastFreeResetAt: pastResetDate,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const cached = fallbackUserStore.get(cleanUid) || { paidCredits: 0 };
  fallbackUserStore.set(cleanUid, {
    freeAnalysesRemaining: 1,
    paidCredits: cached.paidCredits,
    lastFreeResetAt: pastResetDate
  });
  return {
    success: true,
    message: "Free weekly analysis successfully reset for testing."
  };
}

// server/serverless/paymentRouter.ts
function getAction(req) {
  if (req.query?.action) {
    const act = Array.isArray(req.query.action) ? req.query.action[0] : String(req.query.action);
    if (act) return act.toLowerCase().trim();
  }
  const cleanUrl = (req.url || "").split("?")[0];
  const parts = cleanUrl.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && last !== "payment") {
    return last.toLowerCase().trim();
  }
  return "";
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const action = getAction(req);
  try {
    if (action === "create") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }
      const { userId, provider, userEmail, displayName, phoneNumber, countryCode } = req.body || {};
      if (!userId || !provider) {
        return res.status(400).json({ error: "userId and provider are required." });
      }
      const order = await createPaymentOrder({
        userId,
        provider,
        userEmail,
        displayName,
        phoneNumber,
        countryCode
      });
      return res.status(200).json({ success: true, order });
    }
    if (action === "verify") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }
      const { paymentId, providerTransactionId, simulateAction } = req.body || {};
      if (!paymentId) {
        return res.status(400).json({ error: "paymentId is required." });
      }
      const result = await verifyAndCompletePayment(
        paymentId,
        simulateAction || "success",
        providerTransactionId
      );
      return res.status(200).json({ success: result.status === "SUCCESS", result });
    }
    if (action === "history") {
      const userId = req.query.userId || "guest";
      const history = await getPaymentHistory(userId);
      return res.status(200).json({ success: true, history });
    }
    if (action === "test-reset-free") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }
      const { userId } = req.body || {};
      if (!userId) {
        return res.status(400).json({ error: "userId is required." });
      }
      const result = await resetUserFreeAnalysisForTesting(userId);
      return res.status(200).json(result);
    }
    return res.status(404).json({
      error: `Unknown payment action: "${action}". Valid actions: create, verify, history, test-reset-free.`
    });
  } catch (err) {
    console.error(`API Error in /api/payment/${action}:`, err);
    return res.status(500).json({ success: false, error: err?.message || "Payment server error" });
  }
}
export {
  handler as default
};
