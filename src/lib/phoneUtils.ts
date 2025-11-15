/**
 * E.164 Phone Number Formatting Utilities
 * 
 * E.164 is the international standard for phone numbers: +[country code][number]
 * Example: +353858007335
 * 
 * This is the canonical storage format for all phone numbers in the database.
 * All phone numbers are stored in E.164 format and converted at runtime for display or API usage.
 */

export interface PhoneFormats {
  e164: string;           // +353858007335 (Twilio, SMS, DB storage)
  whatsapp: string;       // 353858007335 (WhatsApp API - no + prefix)
  display: string;        // +353 85 800 7335 (UI display - formatted)
  national: string;       // 085 800 7335 (Irish local format)
  raw: string;           // Original input
}

/**
 * Master phone formatter - converts any input to all standard formats
 * 
 * Handles various input formats:
 * - "+353 85 800 7335" (international with formatting)
 * - "353858007335" (international without +)
 * - "085 800 7335" (Irish local)
 * - "00353858007335" (international with 00 prefix)
 * 
 * @param input - Any phone number format
 * @returns Object containing all standard formats
 */
export function formatPhone(input: string): PhoneFormats {
  if (!input) {
    return {
      e164: '',
      whatsapp: '',
      display: '',
      national: '',
      raw: input
    };
  }

  // Clean input - remove all non-digit characters except +
  let cleaned = input.replace(/[\s\-\(\)\.]/g, '');
  
  // Remove + prefix for normalization
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Remove 00 prefix (international dialing code)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // Normalize to country code format (353...)
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    // Irish local format: 0XX XXX XXXX -> 353XX XXX XXXX
    cleaned = '353' + cleaned.substring(1);
  } else if (cleaned.length === 9 && /^[1-9]/.test(cleaned)) {
    // 9-digit number without leading 0, assume Irish
    cleaned = '353' + cleaned;
  } else if (!cleaned.startsWith('353') && cleaned.length >= 9) {
    // Number without country code, add 353
    cleaned = '353' + cleaned.replace(/^0/, '');
  }

  // Validate length (353 + 9 digits = 12 total for Irish numbers)
  if (cleaned.length !== 12 || !cleaned.startsWith('353')) {
    console.warn(`Invalid Irish phone number: ${input} (normalized: ${cleaned})`);
    // Return best effort formatting
    return {
      e164: cleaned.startsWith('353') ? `+${cleaned}` : cleaned,
      whatsapp: cleaned,
      display: input,
      national: input,
      raw: input
    };
  }

  // Generate all standard formats
  const e164 = `+${cleaned}`;                           // +353858007335
  const whatsapp = cleaned;                             // 353858007335 (no +)
  const national = `0${cleaned.substring(3)}`;          // 0858007335
  
  // Display format: +353 85 800 7335
  const display = `+353 ${cleaned.substring(3, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;

  return { e164, whatsapp, display, national, raw: input };
}

/**
 * Convert any phone number format to E.164 (canonical storage format)
 * 
 * @param phone - Phone number in any format
 * @returns E.164 format: +353858007335
 */
export function toE164(phone: string): string {
  return formatPhone(phone).e164;
}

/**
 * Convert any phone number format to WhatsApp format (no + prefix)
 * 
 * @param phone - Phone number in any format
 * @returns WhatsApp format: 353858007335
 */
export function toWhatsApp(phone: string): string {
  return formatPhone(phone).whatsapp;
}

/**
 * Convert any phone number format to user-friendly display format
 * 
 * @param phone - Phone number in any format
 * @returns Display format: +353 85 800 7335
 */
export function toDisplay(phone: string): string {
  return formatPhone(phone).display;
}

/**
 * Convert any phone number format to Irish national format
 * 
 * @param phone - Phone number in any format
 * @returns National format: 085 800 7335
 */
export function toNational(phone: string): string {
  return formatPhone(phone).national;
}

/**
 * Validate if a phone number is a valid Irish phone number
 * 
 * @param phone - Phone number in any format
 * @returns true if valid Irish number, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  const formatted = formatPhone(phone);
  return /^\+353[0-9]{9}$/.test(formatted.e164);
}

/**
 * Compare two phone numbers for equality (format-agnostic)
 * 
 * @param phone1 - First phone number in any format
 * @param phone2 - Second phone number in any format
 * @returns true if phones represent the same number
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  const p1 = formatPhone(phone1).e164;
  const p2 = formatPhone(phone2).e164;
  return p1 === p2 && p1 !== '';
}

// Backwards compatibility exports (deprecated, use above functions instead)
export const formatIrishPhone = toE164;
export const formatPhoneForDisplay = toDisplay;
export const isValidIrishPhone = isValidPhone;
