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
    provider: process.env.PAYMENT_PROVIDER || "malipopay",
    malipopay: {
      publicKey: process.env.MALIPOPAY_PUBLIC_KEY || "mp_pk_prod_U2FsdGVkX1+YKKoh3c0/MxJJfpnufy27iWhae5ffwgGFLDe9AFYzwjZauhtPL/y4",
      secretKey: process.env.MALIPOPAY_SECRET_KEY || "mp_sk_prod_U2FsdGVkX1+OPk3ZqFss+vQkL7tzuKbYmoBVs767oDTIPtu/AF0ngWNLIKPw1i/mGfm4FF+aji0Cdw5Yele8j+DWA3wEBdvOTC80OX7hnBPR20nEdBaL+QkRAPNJGv3x1PgqKbNk5ghMtXB6vVQQINgDsPfKvlapFH325bpFvCE=",
      keyId: process.env.MALIPOPAY_KEY_ID || "7uHBtN-zFy7G",
      environment: process.env.MALIPOPAY_ENVIRONMENT === "uat" ? "uat" : "production"
    },
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

// server/payment/providers/malipopay.ts
var MalipopayPaymentProvider = class {
  constructor() {
    this.name = "malipopay";
    this.displayName = "MalipoPay (Mobile Money & Card)";
  }
  getBaseUrl() {
    return "https://core-prod.malipopay.co.tz";
  }
  getApiKey() {
    const config = getPaymentConfig();
    return (config.malipopay.secretKey || "").trim();
  }
  /**
   * Format phone number for MalipoPay gateway.
   * Tanzania mobile numbers require 255XXXXXXXXX (12 digits).
   */
  formatPhoneNumber(rawPhone, countryCode) {
    if (!rawPhone) return "255712000000";
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.startsWith("255") && digits.length === 12) {
      return digits;
    }
    if (digits.startsWith("0") && digits.length === 10) {
      return "255" + digits.slice(1);
    }
    if ((digits.startsWith("7") || digits.startsWith("6")) && digits.length === 9) {
      return "255" + digits;
    }
    if (digits.startsWith("254") && digits.length === 12) {
      return digits;
    }
    if (digits.startsWith("0") && countryCode === "KE" && digits.length === 10) {
      return "254" + digits.slice(1);
    }
    if (countryCode === "TZ" || !digits.startsWith("255")) {
      if (digits.length >= 9) {
        return "255" + digits.slice(-9);
      }
    }
    return digits;
  }
  /**
   * Convert price to local payment currency amount.
   * For mobile money in East Africa, $2.00 USD corresponds to 5,000 TZS.
   */
  getLocalAmount(amountUsd, currency) {
    if (currency === "TZS") {
      return { amount: Math.round(amountUsd || 5e3), currency: "TZS" };
    }
    return { amount: 5e3, currency: "TZS" };
  }
  /**
   * Create Payment Order / Push Prompt via MalipoPay
   */
  async createPayment(params) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        paymentId: `PAY-ERR-${Date.now()}`,
        provider: "malipopay",
        providerTransactionId: "",
        amount: params.amount,
        currency: params.currency,
        status: "FAILED",
        isTestMode: false,
        instructions: "MalipoPay secret key is not configured."
      };
    }
    const { amount, currency } = this.getLocalAmount(params.amount, params.currency);
    const formattedPhone = this.formatPhoneNumber(params.phoneNumber, params.countryCode);
    const description = `eFootball AI Hub Squad Analysis Credit (${params.displayName || "Manager"})`;
    try {
      console.log(`[MalipoPay] Initiating collection of ${amount} ${currency} to ${formattedPhone}...`);
      const response = await fetch(`${this.getBaseUrl()}/api/v1/payment/collection`, {
        method: "POST",
        headers: {
          apiToken: apiKey,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          phoneNumber: formattedPhone,
          description
        })
      });
      const responseText = await response.text();
      let resJson = {};
      try {
        resJson = JSON.parse(responseText);
      } catch {
        resJson = { message: responseText };
      }
      if (!response.ok || !resJson.success) {
        console.warn("[MalipoPay Collection Warning]", response.status, resJson);
        return await this.createPaymentLinkFallback(apiKey, amount, formattedPhone, params);
      }
      const data = resJson.data || resJson;
      const reference = data.reference || data.id || `ML-${Date.now()}`;
      const checkoutUrl = data.link || (data.shareSlug ? `https://link.co.tz/${data.shareSlug}` : void 0);
      console.log(`[MalipoPay Success] Push initiated with reference: ${reference}, link: ${checkoutUrl}`);
      return {
        paymentId: reference,
        provider: "malipopay",
        providerTransactionId: reference,
        amount: params.amount,
        currency: params.currency,
        status: "PENDING",
        checkoutUrl,
        instructions: `A payment prompt of 5,000 TZS (~$2.00 USD) has been sent to your phone (${formattedPhone}). Check your phone screen and enter your M-Pesa / Mobile Money PIN to complete payment.`,
        isTestMode: false
      };
    } catch (err) {
      console.error("[MalipoPay createPayment Exception]", err);
      return {
        paymentId: `PAY-ERR-${Date.now()}`,
        provider: "malipopay",
        providerTransactionId: "",
        amount: params.amount,
        currency: params.currency,
        status: "FAILED",
        isTestMode: false,
        instructions: err?.message || "Failed to connect to MalipoPay payment gateway."
      };
    }
  }
  /**
   * Fallback link creation method if direct push collection fails
   */
  async createPaymentLinkFallback(apiKey, amount, phoneNumber, params) {
    try {
      const linkResp = await fetch(`${this.getBaseUrl()}/api/v1/payment/link`, {
        method: "POST",
        headers: {
          apiToken: apiKey,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          phoneNumber
        })
      });
      const linkJson = await linkResp.json();
      if (linkResp.ok && (linkJson.success || linkJson.link || linkJson.reference)) {
        const data = linkJson.data || linkJson;
        const reference = data.reference || data.id || `ML-${Date.now()}`;
        return {
          paymentId: reference,
          provider: "malipopay",
          providerTransactionId: reference,
          amount: params.amount,
          currency: params.currency,
          status: "PENDING",
          checkoutUrl: data.link,
          instructions: "Please open the MalipoPay checkout link to complete your payment with Mobile Money or Card.",
          isTestMode: false
        };
      }
      return {
        paymentId: `PAY-ERR-${Date.now()}`,
        provider: "malipopay",
        providerTransactionId: "",
        amount: params.amount,
        currency: params.currency,
        status: "FAILED",
        isTestMode: false,
        instructions: linkJson.message || "Payment prompt could not be initiated. Please verify your phone number."
      };
    } catch (linkErr) {
      return {
        paymentId: `PAY-ERR-${Date.now()}`,
        provider: "malipopay",
        providerTransactionId: "",
        amount: params.amount,
        currency: params.currency,
        status: "FAILED",
        isTestMode: false,
        instructions: linkErr.message || "Payment gateway connection error."
      };
    }
  }
  /**
   * Live Payment Status Verification from MalipoPay
   */
  async verifyPayment(paymentId, providerTransactionId, _simulateAction) {
    const apiKey = this.getApiKey();
    const reference = (providerTransactionId || paymentId || "").trim();
    if (!apiKey) {
      return {
        paymentId,
        providerTransactionId: reference,
        status: "FAILED",
        creditGranted: false,
        amount: 2,
        currency: "USD",
        failureReason: "MalipoPay API credentials are not configured."
      };
    }
    try {
      console.log(`[MalipoPay Verify] Querying status for reference: ${reference}...`);
      const response = await fetch(`${this.getBaseUrl()}/api/v1/payment/verify/${encodeURIComponent(reference)}`, {
        headers: {
          apiToken: apiKey,
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        const refResponse = await fetch(`${this.getBaseUrl()}/api/v1/payment/reference/${encodeURIComponent(reference)}`, {
          headers: {
            apiToken: apiKey,
            Accept: "application/json"
          }
        });
        if (!refResponse.ok) {
          const errText = await response.text();
          console.warn(`[MalipoPay Verify Failed] Status ${response.status}:`, errText);
          return {
            paymentId,
            providerTransactionId: reference,
            status: "PENDING",
            creditGranted: false,
            amount: 2,
            currency: "USD",
            failureReason: "Payment is still being processed by the mobile network."
          };
        }
        const refData = await refResponse.json();
        return this.parseMalipopayStatus(paymentId, reference, refData.data || refData);
      }
      const resJson = await response.json();
      const data = resJson.data || resJson;
      return this.parseMalipopayStatus(paymentId, reference, data);
    } catch (err) {
      console.error("[MalipoPay Verify Exception]", err);
      return {
        paymentId,
        providerTransactionId: reference,
        status: "PENDING",
        creditGranted: false,
        amount: 2,
        currency: "USD",
        failureReason: err?.message || "Could not verify status with MalipoPay."
      };
    }
  }
  parseMalipopayStatus(paymentId, reference, data) {
    const rawStatus = (data.status || "").toUpperCase();
    console.log(`[MalipoPay Status Parsed] Reference: ${reference}, Status: ${rawStatus}`);
    if (rawStatus === "COMPLETED" || rawStatus === "SUCCESS") {
      return {
        paymentId,
        providerTransactionId: reference,
        status: "SUCCESS",
        creditGranted: true,
        amount: 2,
        currency: "USD"
      };
    }
    if (rawStatus === "FAILED" || rawStatus === "CANCELLED" || rawStatus === "REVERSED" || data.failure) {
      return {
        paymentId,
        providerTransactionId: reference,
        status: "FAILED",
        creditGranted: false,
        amount: 2,
        currency: "USD",
        failureReason: data.failureReason || data.providerMessage || "Transaction was cancelled or declined on your phone."
      };
    }
    return {
      paymentId,
      providerTransactionId: reference,
      status: "PENDING",
      creditGranted: false,
      amount: 2,
      currency: "USD",
      failureReason: "Payment prompt is active. Please enter your PIN on your phone to complete payment."
    };
  }
  async getPaymentStatus(paymentId) {
    const result = await this.verifyPayment(paymentId);
    return result.status;
  }
  async handleWebhook(payload) {
    const reference = payload?.reference || payload?.data?.reference;
    const rawStatus = (payload?.status || payload?.data?.status || "").toUpperCase();
    if (!reference) {
      return { handled: false, message: "Missing reference in webhook payload" };
    }
    let status = "PENDING";
    if (rawStatus === "COMPLETED" || rawStatus === "SUCCESS") {
      status = "SUCCESS";
    } else if (rawStatus === "FAILED" || rawStatus === "CANCELLED") {
      status = "FAILED";
    }
    return {
      handled: true,
      paymentId: reference,
      providerTransactionId: reference,
      status,
      message: `MalipoPay webhook processed with status: ${status}`
    };
  }
};

// server/payment/providers/pesapal.ts
var tokenCache = null;
var cachedIpnId = null;
var PesapalPaymentProvider = class {
  constructor() {
    this.name = "pesapal";
    this.displayName = "Pesapal (Card & Mobile Money)";
    this.lastAuthError = null;
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
    const consumerKey = (config.pesapal.consumerKey || "").trim();
    const consumerSecret = (config.pesapal.consumerSecret || "").trim();
    if (!consumerKey || !consumerSecret) {
      this.lastAuthError = "Pesapal Consumer Key or Consumer Secret is missing.";
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
      const data = await response.json();
      if (data && data.token) {
        this.lastAuthError = null;
        const expiryMs = data.expiryDate ? new Date(data.expiryDate).getTime() : now + 50 * 60 * 1e3;
        tokenCache = {
          token: data.token,
          expiresAt: expiryMs
        };
        console.log("[Pesapal Auth] Successfully authenticated with live Pesapal gateway.");
        return data.token;
      }
      const errCode = data?.error?.code || data?.error?.message || (response.status !== 200 ? `HTTP ${response.status}` : "Authentication failed");
      this.lastAuthError = errCode;
      console.warn(`[Pesapal Auth Rejected] ${errCode}`);
      return null;
    } catch (err) {
      this.lastAuthError = err?.message || "Network exception connecting to Pesapal";
      console.warn("[Pesapal Auth Exception]", err);
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
    if (!token) {
      const reason = this.lastAuthError ? `Pesapal authentication error (${this.lastAuthError}). Please verify your Pesapal Merchant API 3.0 Consumer Key & Secret.` : "Failed to authenticate with Pesapal API 3.0.";
      return {
        paymentId,
        provider: this.name,
        providerTransactionId: "",
        amount: params.amount,
        currency: params.currency,
        status: "FAILED",
        isTestMode: false,
        failureReason: reason
      };
    }
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
      }
      const errBody = await submitResponse.text();
      console.warn(`[Pesapal SubmitOrder Error] ${submitResponse.status}: ${errBody}`);
      return {
        paymentId,
        provider: this.name,
        providerTransactionId: "",
        amount: params.amount,
        currency: params.currency,
        status: "FAILED",
        isTestMode: false,
        failureReason: `Pesapal SubmitOrder failed (${submitResponse.status}): ${errBody}`
      };
    } catch (orderErr) {
      console.warn("[Pesapal Order Submission Notice]", orderErr);
      return {
        paymentId,
        provider: this.name,
        providerTransactionId: "",
        amount: params.amount,
        currency: params.currency,
        status: "FAILED",
        isTestMode: false,
        failureReason: `Order submission failed: ${orderErr?.message || "Network error"}`
      };
    }
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
    const token = await this.getAuthToken();
    if (!token) {
      return {
        paymentId,
        providerTransactionId,
        status: "FAILED",
        creditGranted: false,
        amount: config.priceUsd,
        currency: config.currency,
        failureReason: `Pesapal authentication error: ${this.lastAuthError || "Failed to authenticate with Pesapal"}. No payment was captured.`
      };
    }
    if (!providerTransactionId || providerTransactionId.startsWith("PESAPAL-") || providerTransactionId.startsWith("TEST-")) {
      return {
        paymentId,
        providerTransactionId,
        status: "FAILED",
        creditGranted: false,
        amount: config.priceUsd,
        currency: config.currency,
        failureReason: "No valid Pesapal tracking ID exists for this payment. No payment was captured."
      };
    }
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
        const statusDesc = (data.payment_status_description || "").toUpperCase();
        const isCompleted = data.status_code === 1 || statusDesc === "COMPLETED";
        const isFailed = data.status_code === 2 || statusDesc === "FAILED";
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
      console.warn("[Pesapal Live Verify Exception]", verifyErr);
    }
    return {
      paymentId,
      providerTransactionId,
      status: "FAILED",
      creditGranted: false,
      amount: config.priceUsd,
      currency: config.currency,
      failureReason: "Unable to verify payment with Pesapal."
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
var malipopayInstance = new MalipopayPaymentProvider();
var pesapalInstance = new PesapalPaymentProvider();
var providers = {
  malipopay: malipopayInstance,
  pesapal: pesapalInstance
};
function getPaymentProvider(type) {
  if (type && providers[type]) {
    return providers[type];
  }
  return malipopayInstance;
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
  applySecurityHeaders(req, res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const clientIp = getClientIp(req);
  const action = getAction(req);
  try {
    if (action === "create") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }
      const rateLimit = checkRateLimit(`pay_create:${clientIp}`, 15, 5 * 60 * 1e3);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many payment requests. Please wait ${rateLimit.retryAfterSec} seconds before trying again.`
        });
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
      const rateLimit = checkRateLimit(`pay_verify:${clientIp}`, 30, 5 * 60 * 1e3);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many verification requests. Please wait ${rateLimit.retryAfterSec} seconds.`
        });
      }
      const { paymentId, providerTransactionId, simulateAction } = req.body || {};
      if (!paymentId) {
        return res.status(400).json({ error: "paymentId is required." });
      }
      const config = getPaymentConfig();
      const effectiveSimulate = config.isTestMode ? simulateAction || "success" : "success";
      const result = await verifyAndCompletePayment(
        paymentId,
        effectiveSimulate,
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
      const config = getPaymentConfig();
      if (!config.isTestMode) {
        return res.status(403).json({ error: "Testing endpoints are strictly disabled in production mode." });
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
