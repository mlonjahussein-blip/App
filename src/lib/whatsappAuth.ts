// WhatsApp Authentication & Country Code Utilities

export interface CountryCodeItem {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
  placeholder: string;
}

export const POPULAR_COUNTRIES: CountryCodeItem[] = [
  { code: 'TZ', dialCode: '+255', name: 'Tanzania', flag: '🇹🇿', placeholder: '712 345 678' },
  { code: 'KE', dialCode: '+254', name: 'Kenya', flag: '🇰🇪', placeholder: '712 345 678' },
  { code: 'NG', dialCode: '+234', name: 'Nigeria', flag: '🇳🇬', placeholder: '801 234 5678' },
  { code: 'UG', dialCode: '+256', name: 'Uganda', flag: '🇺🇬', placeholder: '712 345 678' },
  { code: 'ZA', dialCode: '+27', name: 'South Africa', flag: '🇿🇦', placeholder: '71 234 5678' },
  { code: 'GH', dialCode: '+233', name: 'Ghana', flag: '🇬🇭', placeholder: '20 123 4567' },
  { code: 'EG', dialCode: '+20', name: 'Egypt', flag: '🇪🇬', placeholder: '10 1234 5678' },
  { code: 'RW', dialCode: '+250', name: 'Rwanda', flag: '🇷🇼', placeholder: '78 123 4567' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧', placeholder: '7911 123456' },
  { code: 'US', dialCode: '+1', name: 'United States & Canada', flag: '🇺🇸', placeholder: '555 123 4567' },
  { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳', placeholder: '98765 43210' },
  { code: 'ID', dialCode: '+62', name: 'Indonesia', flag: '🇮🇩', placeholder: '812 3456 7890' },
  { code: 'BR', dialCode: '+55', name: 'Brazil', flag: '🇧🇷', placeholder: '11 91234 5678' },
  { code: 'ES', dialCode: '+34', name: 'Spain', flag: '🇪🇸', placeholder: '612 34 56 78' },
  { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { code: 'DE', dialCode: '+49', name: 'Germany', flag: '🇩🇪', placeholder: '151 2345678' },
  { code: 'IT', dialCode: '+39', name: 'Italy', flag: '🇮🇹', placeholder: '320 123 4567' },
  { code: 'JP', dialCode: '+81', name: 'Japan', flag: '🇯🇵', placeholder: '90 1234 5678' },
  { code: 'SA', dialCode: '+966', name: 'Saudi Arabia', flag: '🇸🇦', placeholder: '50 123 4567' },
  { code: 'AE', dialCode: '+971', name: 'UAE', flag: '🇦🇪', placeholder: '50 123 4567' },
  { code: 'MA', dialCode: '+212', name: 'Morocco', flag: '🇲🇦', placeholder: '6 12 34 56 78' },
  { code: 'MX', dialCode: '+52', name: 'Mexico', flag: '🇲🇽', placeholder: '55 1234 5678' },
  { code: 'CO', dialCode: '+57', name: 'Colombia', flag: '🇨🇴', placeholder: '300 123 4567' },
  { code: 'AR', dialCode: '+54', name: 'Argentina', flag: '🇦🇷', placeholder: '9 11 1234 5678' }
];

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
  
  // Use official WhatsApp API deep link targeting the recipient's number
  const whatsappLink = `https://api.whatsapp.com/send?phone=${rawDigits}&text=${encodeURIComponent(messageText)}`;

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
    if (res.ok) {
      const data = await res.json();
      hasGateway = data.gateway !== 'direct_verification';
      serverMessage = data.message || '';
    }
  } catch (err) {
    console.warn('Backend WhatsApp dispatch notice:', err);
  }

  return {
    success: true,
    message: hasGateway
      ? `Verification code dispatched to your WhatsApp (+${rawDigits}).`
      : `WhatsApp code generated. Open WhatsApp or use the code to complete registration.`,
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
