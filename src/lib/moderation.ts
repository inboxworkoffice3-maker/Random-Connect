/**
 * Real-time content & contact-sharing moderation engine
 * Specialized for Indian formats (phone numbers, WhatsApp, Instagram, Telegram, leetspeak)
 */

export interface ModerationResult {
  isBlocked: boolean;
  reason?: 'contact_sharing' | 'abusive_language' | 'rate_limit';
  warningMessage?: string;
  detectedPattern?: string;
}

// Convert spelled out Hindi/English numbers to digits for bypass detection
const numberWordsMap: Record<string, string> = {
  zero: '0', shunya: '0',
  one: '1', ek: '1',
  two: '2', do: '2',
  three: '3', teen: '3',
  four: '4', char: '4', chaar: '4',
  five: '5', paanch: '5', panch: '5',
  six: '6', chhah: '6', chhe: '6',
  seven: '7', saat: '7',
  eight: '8', aath: '8',
  nine: '9', nau: '9',
};

// Common Indian & international offensive terms
const profanityList = [
  'chutiya', 'bhenchod', 'madarchod', 'gandu', 'bhosdike', 'harami', 'kameena',
  'randi', 'bhadwe', 'lauda', 'loda', 'gaand', 'asshole', 'bastard', 'bitch',
  'fuck', 'cunt', 'nigger', 'faggot', 'whore', 'slut'
];

/**
 * Normalize text to detect obfuscated content
 */
export function normalizeText(input: string): string {
  let normalized = input.toLowerCase();

  // Replace common symbols and leetspeak
  normalized = normalized
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[!]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[1]/g, 'l')
    .replace(/[(]dot[)]/g, '.')
    .replace(/\[dot\]/g, '.')
    .replace(/\{dot\}/g, '.')
    .replace(/\s+dot\s+/g, '.');

  return normalized;
}

/**
 * Check if text contains phone numbers or spelled-out phone digits
 */
function containsPhoneNumber(text: string): boolean {
  // Strip non-digits and test length
  const digitsOnly = text.replace(/\D/g, '');
  
  // Standard 10-digit Indian mobile number patterns (typically starting with 6, 7, 8, 9)
  // or numbers with 91 / 0 prefix (11 or 12 digits)
  if (digitsOnly.length >= 10) {
    if (/(?:\+?91|0)?[6-9]\d{9}/.test(digitsOnly)) {
      return true;
    }
  }

  // Regex for spaced / punctuated phone numbers e.g., "98765 43210" or "9876-543-210"
  const spacedPhoneRegex = /(?:\+?91[\s.-]?)?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4}/;
  if (spacedPhoneRegex.test(text)) {
    return true;
  }

  // Check for spelled-out phone numbers (e.g., "nine eight two zero...")
  const words = text.toLowerCase().split(/[\s,.-]+/);
  let consecutiveNumberWords = 0;
  for (const word of words) {
    if (numberWordsMap[word] || /^\d+$/.test(word)) {
      consecutiveNumberWords++;
      if (consecutiveNumberWords >= 7) {
        return true;
      }
    } else {
      consecutiveNumberWords = 0;
    }
  }

  return false;
}

/**
 * Check if text contains social handles or messaging links
 */
function containsSocialOrContact(text: string): boolean {
  const normalized = normalizeText(text);

  // WhatsApp patterns
  const waPatterns = [
    /wa\.me\/\d+/,
    /whatsapp/i,
    /whtsp/i,
    /whats\s*app/i,
    /wp\s*no/i,
    /wa\s*no/i,
    /wa\s*number/i
  ];
  if (waPatterns.some(p => p.test(normalized))) return true;

  // Instagram patterns
  const igPatterns = [
    /instagram\.com\/[a-zA-Z0-9_.]+/i,
    /insta\s*(?:id|handle|pe|par|gram)?/i,
    /\big\s*:\s*[a-zA-Z0-9_.]+/i,
    /follow\s*me\s*on\s*insta/i
  ];
  if (igPatterns.some(p => p.test(normalized))) return true;

  // Telegram / Snapchat / Email
  const socialPatterns = [
    /t\.me\/[a-zA-Z0-9_]+/i,
    /telegram/i,
    /snapchat/i,
    /\bsc\s*:\s*[a-zA-Z0-9_.]+/i,
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
  ];
  if (socialPatterns.some(p => p.test(normalized))) return true;

  return false;
}

/**
 * Check for abusive speech
 */
function containsAbusiveLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return profanityList.some(badWord => {
    const regex = new RegExp(`\\b${badWord}\\b`, 'i');
    return regex.test(lower);
  });
}

/**
 * Main moderation inspection function
 */
export function inspectMessageSafety(rawText: string): ModerationResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { isBlocked: false };
  }

  // 1. Contact sharing detection
  if (containsPhoneNumber(trimmed) || containsSocialOrContact(trimmed)) {
    return {
      isBlocked: true,
      reason: 'contact_sharing',
      warningMessage: 'Sharing phone numbers, WhatsApp, or Instagram handles is prohibited to protect user safety and prevent scams.',
      detectedPattern: 'contact_info'
    };
  }

  // 2. Abusive language detection
  if (containsAbusiveLanguage(trimmed)) {
    return {
      isBlocked: true,
      reason: 'abusive_language',
      warningMessage: 'Your message was withheld due to abusive or inappropriate language violating Community Guidelines.',
      detectedPattern: 'profanity'
    };
  }

  return { isBlocked: false };
}
