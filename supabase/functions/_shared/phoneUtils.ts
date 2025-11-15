/**
 * Shared Phone Number Utilities for Deno Edge Functions
 * 
 * E.164 format is the canonical storage format: +[country code][number]
 * Example: +353858007335
 */

/**
 * Format any phone number input to E.164 standard format
 * 
 * Handles various input formats:
 * - "+353 85 800 7335" (international with formatting)
 * - "353858007335" (international without +)
 * - "085 800 7335" (Irish local)
 * - "00353858007335" (international with 00 prefix)
 * 
 * @param input - Phone number in any format
 * @returns E.164 format: +353858007335
 */
export function formatPhone(input: string): string {
  if (!input) return '';
  
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
  
  // Return E.164 format with + prefix
  return cleaned.startsWith('353') ? `+${cleaned}` : cleaned;
}

/**
 * Convert phone number to WhatsApp format (no + prefix)
 * 
 * @param phone - Phone number in any format
 * @returns WhatsApp format: 353858007335
 */
export function toWhatsApp(phone: string): string {
  const formatted = formatPhone(phone);
  return formatted.replace(/^\+/, ''); // Remove + for WhatsApp
}

/**
 * Convert phone number to Twilio format (E.164 with +)
 * 
 * @param phone - Phone number in any format
 * @returns Twilio format: +353858007335
 */
export function toTwilio(phone: string): string {
  return formatPhone(phone); // E.164 with +
}

/**
 * Compare two phone numbers for equality (format-agnostic)
 * 
 * @param phone1 - First phone number in any format
 * @param phone2 - Second phone number in any format
 * @returns true if phones represent the same number
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  const p1 = formatPhone(phone1);
  const p2 = formatPhone(phone2);
  return p1 === p2 && p1 !== '';
}
