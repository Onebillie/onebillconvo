/**
 * Formats a phone number to Irish format (353XXXXXXXXX)
 * Handles various input formats and normalizes them
 * 
 * Examples:
 * - "087 123 4567" -> "353871234567"
 * - "+353 87 123 4567" -> "353871234567"
 * - "00353871234567" -> "353871234567"
 * - "0871234567" -> "353871234567"
 */
export function formatIrishPhone(input: string): string {
  if (!input) return '';
  
  // Remove all spaces, dashes, parentheses, and other formatting
  let cleaned = input.replace(/[\s\-\(\)\.]/g, '');
  
  // Remove leading + sign
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Remove leading 00
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // If starts with 353, it's already in correct format
  if (cleaned.startsWith('353')) {
    return cleaned;
  }
  
  // If starts with 0, replace with 353 (Irish numbers)
  if (cleaned.startsWith('0')) {
    return '353' + cleaned.substring(1);
  }
  
  // If it's just the number without country code (e.g., "871234567")
  // assume it's Irish and add 353
  if (cleaned.length === 9 && /^[1-9]/.test(cleaned)) {
    return '353' + cleaned;
  }
  
  // If it doesn't start with 353 and is a reasonable length, assume Irish
  if (cleaned.length >= 9 && cleaned.length <= 10 && !cleaned.startsWith('353')) {
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return '353' + cleaned;
  }
  
  // Return as-is if we can't determine format
  return cleaned;
}

/**
 * Formats phone number for display with + prefix
 * 
 * Example: "353871234567" -> "+353 87 123 4567"
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  // Ensure it's normalized first
  const normalized = formatIrishPhone(phone);
  
  if (normalized.startsWith('353') && normalized.length === 12) {
    // Irish mobile format: +353 XX XXX XXXX
    return `+353 ${normalized.substring(3, 5)} ${normalized.substring(5, 8)} ${normalized.substring(8)}`;
  }
  
  // Generic format with country code
  if (normalized.length > 3) {
    return `+${normalized}`;
  }
  
  return normalized;
}

/**
 * Validates if a phone number is a valid Irish phone number
 */
export function isValidIrishPhone(phone: string): boolean {
  const normalized = formatIrishPhone(phone);
  
  // Irish numbers should be 353 + 9 digits = 12 digits total
  // Mobile numbers: 353 8X or 353 85-89
  // Landlines: 353 1, 353 21, etc.
  return /^353[0-9]{9}$/.test(normalized);
}
