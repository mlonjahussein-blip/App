// WhatsApp Authentication & Country Code Utilities
import {
  CountryCodeItem,
  ALL_WORLD_COUNTRIES,
  searchCountries
} from './countriesData.ts';

export type { CountryCodeItem };
export { ALL_WORLD_COUNTRIES, searchCountries };

export const POPULAR_COUNTRIES: CountryCodeItem[] = ALL_WORLD_COUNTRIES;

export function cleanPhoneDigits(raw: string): string {
  if (!raw) return '';
  return raw.replace(/[^0-9]/g, '');
}

export function formatFullWhatsAppNumber(dialCode: string, localPhone: string): string {
  const cleanDial = dialCode.trim().startsWith('+') ? dialCode.trim() : `+${dialCode.trim()}`;
  let cleanLocal = localPhone.trim().replace(/[^0-9]/g, '');
  // Remove leading zero if entered with dialCode
  if (cleanLocal.startsWith('0')) {
    cleanLocal = cleanLocal.substring(1);
  }
  return `${cleanDial}${cleanLocal}`;
}

export function normalizeWhatsAppNumber(input: string, fallbackDialCode: string = '+255'): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) {
    const clean = '+' + cleanPhoneDigits(trimmed);
    return clean;
  }
  // Check if user entered leading 00
  if (trimmed.startsWith('00')) {
    return '+' + cleanPhoneDigits(trimmed.substring(2));
  }
  return formatFullWhatsAppNumber(fallbackDialCode, trimmed);
}

// In-memory / localStorage OTP cache
const OTP_STORAGE_KEY = 'ef_pending_whatsapp_otps';

interface StoredOtpRecord {
  phone: string;
  code: string;
  expiresAt: number;
  managerName?: string;
}

function getStoredOtps(): Record<string, StoredOtpRecord> {
  try {
    const raw = localStorage.getItem(OTP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOtp(record: StoredOtpRecord) {
  try {
    const all = getStoredOtps();
    all[record.phone] = record;
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Failed to save OTP locally:', e);
  }
}

/**
 * Generate and dispatch 6-digit WhatsApp OTP
 */
export async function sendWhatsAppVerificationCode(
  phoneNumber: string,
  managerName?: string,
  purpose: 'signup' | 'signin' = 'signup'
): Promise<{ success: boolean; message: string; code: string; expiresAt: number; whatsappLink: string; hasGateway?: boolean }> {
  const cleanPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + cleanPhoneDigits(phoneNumber);
  
  if (cleanPhoneDigits(cleanPhone).length < 7) {
    throw new Error('Please enter a valid WhatsApp phone number with country code.');
  }

  // Generate 6 numbers
  const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Save to client store
  saveOtp({
    phone: cleanPhone,
    code: randomCode,
    expiresAt,
    managerName
  });

  // Prepare direct WhatsApp message links with the recipient's phone number
  const rawDigits = cleanPhoneDigits(cleanPhone);
  const messageText = `🎮 *eFootball AI Hub Verification*\n\nHello ${managerName ? `*${managerName}*` : 'Manager'}!\nYour 6-digit WhatsApp verification code is:\n\n👉 *${randomCode}*\n\n(Valid for 10 minutes. Enter this code to complete registration).`;
  
  // Use official WhatsApp universal link
  const whatsappLink = `https://wa.me/${rawDigits}?text=${encodeURIComponent(messageText)}`;

  let hasGateway = false;
  let serverMessage = '';

  // Call backend API to dispatch if WhatsApp Business / Twilio gateway is configured
  try {
    const res = await fetch('/api/auth/send-whatsapp-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: cleanPhone,
        managerName,
        code: randomCode,
        purpose
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      hasGateway = true;
      serverMessage = data.message || `Verification code sent to your WhatsApp (+${rawDigits}).`;
    } else {
      console.warn('[WhatsApp Auth] Backend dispatch note:', data?.error || data?.message);
      // If gateway is not configured or failed, we gracefully proceed with direct WhatsApp link
      hasGateway = false;
      serverMessage = `Verification code ready. Open WhatsApp below to receive your 6-digit code for +${rawDigits}.`;
    }
  } catch (err: any) {
    console.warn('[WhatsApp Auth] Backend dispatch offline or error, falling back to direct link:', err);
    hasGateway = false;
    serverMessage = `Verification code ready. Open WhatsApp below to receive your 6-digit code for +${rawDigits}.`;
  }

  return {
    success: true,
    message: serverMessage || `Verification code ready for WhatsApp (+${rawDigits}).`,
    code: randomCode,
    expiresAt,
    whatsappLink,
    hasGateway
  };
}

/**
 * Verify 6-digit code
 */
export function verifyWhatsAppCode(phoneNumber: string, enteredCode: string): boolean {
  const cleanPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + cleanPhoneDigits(phoneNumber);
  const cleanCode = (enteredCode || '').trim();

  const allOtps = getStoredOtps();
  const record = allOtps[cleanPhone];

  if (!record) {
    // Check if code was cached under raw digits
    const rawDigits = cleanPhoneDigits(cleanPhone);
    const fallbackMatch = Object.values(allOtps).find(
      o => cleanPhoneDigits(o.phone) === rawDigits && o.code === cleanCode && o.expiresAt > Date.now()
    );
    if (fallbackMatch) {
      delete allOtps[fallbackMatch.phone];
      localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(allOtps));
      return true;
    }
    return false;
  }

  if (Date.now() > record.expiresAt) {
    throw new Error('Verification code has expired. Please click "Resend Code".');
  }

  if (record.code !== cleanCode) {
    return false;
  }

  // Clear used OTP
  delete allOtps[cleanPhone];
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(allOtps));
  return true;
}
