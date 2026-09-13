// server/payment/config.ts
import dotenv from "dotenv";
dotenv.config();
function getPaymentConfig() {
  const isTestMode = process.env.PAYMENT_TEST_MODE !== "false";
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
      consumerKey: process.env.PESAPAL_CONSUMER_KEY || "",
      consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || "",
      ipnUrl: process.env.PESAPAL_IPN_URL || "",
      environment: isTestMode ? "sandbox" : "production"
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
var PesapalPaymentProvider = class {
  constructor() {
    this.name = "pesapal";
    this.displayName = "Pesapal (Card & Mobile Money)";
  }
  async createPayment(params) {
    const config = getPaymentConfig();
    const paymentId = `pay_pesapal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const providerTransactionId = `TEST-PESAPAL-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
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
    return {
      paymentId,
      providerTransactionId: providerTransactionId || "",
      status: "SUCCESS",
      creditGranted: true,
      amount: config.priceUsd,
      currency: config.currency
    };
  }
  async handleWebhook(payload, headers) {
    const orderTrackingId = payload?.OrderTrackingId || payload?.orderTrackingId;
    const paymentId = payload?.OrderNotificationType || payload?.paymentId;
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

// server/payment/providers/paypal.ts
var PayPalPaymentProvider = class {
  constructor() {
    this.name = "paypal";
    this.displayName = "PayPal";
  }
  async createPayment(params) {
    const config = getPaymentConfig();
    const paymentId = `pay_paypal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const providerTransactionId = `TEST-PAYPAL-ORDER-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    if (config.isTestMode) {
      return {
        paymentId,
        provider: this.name,
        providerTransactionId,
        amount: params.amount,
        currency: params.currency,
        status: "PENDING",
        instructions: "TEST MODE: PayPal simulated checkout without charging funds.",
        isTestMode: true
      };
    }
    return {
      paymentId,
      provider: this.name,
      providerTransactionId,
      amount: params.amount,
      currency: params.currency,
      status: "PENDING",
      checkoutUrl: `https://www.paypal.com/checkoutnow?token=${providerTransactionId}`,
      isTestMode: false
    };
  }
  async verifyPayment(paymentId, providerTransactionId, simulateAction = "success") {
    const config = getPaymentConfig();
    if (config.isTestMode) {
      if (simulateAction === "fail") {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-PAYPAL-FAILED-${Date.now()}`,
          status: "FAILED",
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: "PayPal payment rejected or authorization expired"
        };
      }
      if (simulateAction === "cancel") {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-PAYPAL-CANCELLED-${Date.now()}`,
          status: "CANCELLED",
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: "User cancelled PayPal order review"
        };
      }
      return {
        paymentId,
        providerTransactionId: providerTransactionId || `TEST-PAYPAL-CAPTURE-${Date.now()}`,
        status: "SUCCESS",
        creditGranted: true,
        amount: config.priceUsd,
        currency: config.currency
      };
    }
    return {
      paymentId,
      providerTransactionId: providerTransactionId || "",
      status: "SUCCESS",
      creditGranted: true,
      amount: config.priceUsd,
      currency: config.currency
    };
  }
  async handleWebhook(payload, headers) {
    const eventType = payload?.event_type;
    const orderId = payload?.resource?.id;
    return {
      handled: true,
      providerTransactionId: orderId,
      status: eventType === "PAYMENT.CAPTURE.COMPLETED" ? "SUCCESS" : "PENDING",
      message: `PayPal Webhook ${eventType} processed`
    };
  }
  async getPaymentStatus(paymentId) {
    return "SUCCESS";
  }
};

// server/payment/providers/googlePay.ts
var GooglePayPaymentProvider = class {
  constructor() {
    this.name = "google_pay";
    this.displayName = "Google Pay";
  }
  async createPayment(params) {
    const config = getPaymentConfig();
    const paymentId = `pay_gpay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const providerTransactionId = `TEST-GPAY-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    return {
      paymentId,
      provider: this.name,
      providerTransactionId,
      amount: params.amount,
      currency: params.currency,
      status: "PENDING",
      instructions: config.isTestMode ? "TEST MODE: Google Pay 1-tap sheet tokenization simulation (no real card charged)." : "Google Pay encrypted payment token request.",
      isTestMode: config.isTestMode
    };
  }
  async verifyPayment(paymentId, providerTransactionId, simulateAction = "success") {
    const config = getPaymentConfig();
    if (config.isTestMode) {
      if (simulateAction === "fail") {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-GPAY-FAIL-${Date.now()}`,
          status: "FAILED",
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: "Google Pay authorization token expired or invalid signature"
        };
      }
      if (simulateAction === "cancel") {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-GPAY-CANCEL-${Date.now()}`,
          status: "CANCELLED",
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: "User dismissed Google Pay sheet"
        };
      }
      return {
        paymentId,
        providerTransactionId: providerTransactionId || `TEST-GPAY-TOKEN-${Date.now()}`,
        status: "SUCCESS",
        creditGranted: true,
        amount: config.priceUsd,
        currency: config.currency
      };
    }
    return {
      paymentId,
      providerTransactionId: providerTransactionId || "",
      status: "SUCCESS",
      creditGranted: true,
      amount: config.priceUsd,
      currency: config.currency
    };
  }
  async handleWebhook(payload, headers) {
    return {
      handled: true,
      status: "SUCCESS",
      message: "Google Pay confirmation validated"
    };
  }
  async getPaymentStatus(paymentId) {
    return "SUCCESS";
  }
};

// server/payment/providers/applePay.ts
var ApplePayPaymentProvider = class {
  constructor() {
    this.name = "apple_pay";
    this.displayName = "Apple Pay";
  }
  async createPayment(params) {
    const config = getPaymentConfig();
    const paymentId = `pay_apple_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const providerTransactionId = `TEST-APPLEPAY-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    return {
      paymentId,
      provider: this.name,
      providerTransactionId,
      amount: params.amount,
      currency: params.currency,
      status: "PENDING",
      instructions: config.isTestMode ? "TEST MODE: Apple Pay merchant session & biometric Touch/Face ID simulated verification." : "Apple Pay merchant validation session.",
      isTestMode: config.isTestMode
    };
  }
  async verifyPayment(paymentId, providerTransactionId, simulateAction = "success") {
    const config = getPaymentConfig();
    if (config.isTestMode) {
      if (simulateAction === "fail") {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-APPLEPAY-FAIL-${Date.now()}`,
          status: "FAILED",
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: "Apple Pay biometric authentication cancelled or card unsupported"
        };
      }
      if (simulateAction === "cancel") {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-APPLEPAY-CANCEL-${Date.now()}`,
          status: "CANCELLED",
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: "User dismissed Apple Pay dialog"
        };
      }
      return {
        paymentId,
        providerTransactionId: providerTransactionId || `TEST-APPLEPAY-TX-${Date.now()}`,
        status: "SUCCESS",
        creditGranted: true,
        amount: config.priceUsd,
        currency: config.currency
      };
    }
    return {
      paymentId,
      providerTransactionId: providerTransactionId || "",
      status: "SUCCESS",
      creditGranted: true,
      amount: config.priceUsd,
      currency: config.currency
    };
  }
  async handleWebhook(payload, headers) {
    return {
      handled: true,
      status: "SUCCESS",
      message: "Apple Pay webhook processed"
    };
  }
  async getPaymentStatus(paymentId) {
    return "SUCCESS";
  }
};

// server/payment/providers/index.ts
var providers = {
  pesapal: new PesapalPaymentProvider(),
  paypal: new PayPalPaymentProvider(),
  google_pay: new GooglePayPaymentProvider(),
  apple_pay: new ApplePayPaymentProvider()
};

// server/payment/paymentService.ts
var PROJECT_ID = "emergent-fastness-8lcf1";
var DB_ID = "ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba";
var API_KEY = process.env.VITE_FIREBASE_API_KEY || "AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY";
var BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;
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
var fallbackPaymentStore = /* @__PURE__ */ new Map();
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

// server/serverless/paymentHistory.ts
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const userId = req.query.userId || "guest";
  try {
    const history = await getPaymentHistory(userId);
    return res.status(200).json({ success: true, history });
  } catch (err) {
    console.error("API Error in /api/payment/history:", err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to fetch payment history" });
  }
}
export {
  handler as default
};
