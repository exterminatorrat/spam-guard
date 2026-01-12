/**
 * SpamGuard API - Serverless Email Validation
 * Zero dependencies, production-ready
 */

// Top 20 most common disposable email domains (Priority blocklist)
const FAMOUS_DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'mailinator.com',
  'guerrillamail.com',
  'yopmail.com',
  '10minutemail.com',
  'throwaway.email',
  'maildrop.cc',
  'temp-mail.org',
  'getnada.com',
  'fakeinbox.com',
  'trashmail.com',
  'mohmal.com',
  'sharklasers.com',
  'guerrillamail.biz',
  'spam4.me',
  'mailnesia.com',
  'tempr.email',
  'dispostable.com',
  'getairmail.com',
  'temp-mail.io'
]);

/**
 * Calculate Shannon Entropy
 * Formula: -Σ(p * log2(p))
 */
function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;

  const frequencies = {};
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  const length = str.length;

  for (const char in frequencies) {
    const probability = frequencies[char] / length;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

/**
 * Calculate digit density (percentage of numeric characters)
 */
function calculateDigitRatio(str) {
  if (!str || str.length === 0) return 0;
  const digitCount = (str.match(/\d/g) || []).length;
  return digitCount / str.length;
}

/**
 * Calculate vowel ratio (percentage of vowel characters)
 */
function calculateVowelRatio(str) {
  if (!str || str.length === 0) return 0;
  const vowelCount = (str.match(/[aeiouAEIOU]/g) || []).length;
  return vowelCount / str.length;
}

/**
 * Fetch remote disposable email blocklist
 */
async function fetchRemoteBlocklist() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf',
      { 
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const domains = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    return new Set(domains);
  } catch (error) {
    console.error('Remote blocklist fetch failed:', error.message);
    return null; // Graceful degradation
  }
}

/**
 * Main validation logic
 */
async function validateEmail(email) {
  const result = {
    email: email,
    is_valid_format: true,
    is_disposable: false,
    risk_score: 0,
    recommended_action: 'allow',
    details: {
      entropy: 0,
      digit_ratio: 0,
      vowel_ratio: 0,
      flags: []
    }
  };

  // Extract username and domain
  const emailParts = email.split('@');
  if (emailParts.length !== 2) {
    result.is_valid_format = false;
    result.risk_score = 100;
    result.recommended_action = 'block';
    result.details.flags.push('Invalid email format');
    return result;
  }

  const [username, domain] = emailParts;
  const domainLower = domain.toLowerCase();

  // ============================================
  // CHECK 1: Famous Disposable Domains (Priority)
  // ============================================
  if (FAMOUS_DISPOSABLE_DOMAINS.has(domainLower)) {
    result.is_disposable = true;
    result.risk_score = 100;
    result.recommended_action = 'block';
    result.details.flags.push('Known disposable domain (hardcoded blocklist)');
    return result; // Skip remote fetch
  }

  // ============================================
  // CHECK 2: Remote Blocklist (Comprehensive)
  // ============================================
  const remoteBlocklist = await fetchRemoteBlocklist();
  if (remoteBlocklist && remoteBlocklist.has(domainLower)) {
    result.is_disposable = true;
    result.risk_score = 100;
    result.recommended_action = 'block';
    result.details.flags.push('Disposable domain (remote blocklist)');
    return result;
  }

  // ============================================
  // CHECK 3: Shannon Entropy (Math Analysis)
  // ============================================
  const entropy = calculateEntropy(username);
  result.details.entropy = Math.round(entropy * 100) / 100;

  if (username.length >= 5) {
    if (entropy > 3.8) {
      result.risk_score += 60;
      result.details.flags.push('High entropy detected (likely random string)');
    } else if (entropy > 2.8) {
      result.risk_score += 10;
      result.details.flags.push('Moderate entropy (somewhat random pattern)');
    }
  }

  // ============================================
  // CHECK 4: Heuristics (Bot Patterns)
  // ============================================

  // Digit Density
  const digitRatio = calculateDigitRatio(username);
  result.details.digit_ratio = Math.round(digitRatio * 100) / 100;

  if (digitRatio > 0.3) {
    result.risk_score += 30;
    result.details.flags.push(`High digit density (${Math.round(digitRatio * 100)}%)`);
  }

  // Vowel Check (Keyboard smash detector)
  const vowelRatio = calculateVowelRatio(username);
  result.details.vowel_ratio = Math.round(vowelRatio * 100) / 100;

  if (username.length > 4 && vowelRatio < 0.1) {
    result.risk_score += 40;
    result.details.flags.push(`Low vowel ratio (${Math.round(vowelRatio * 100)}% - possible keyboard smash)`);
  }

  // ============================================
  // Scoring & Recommendation
  // ============================================
  result.risk_score = Math.min(result.risk_score, 100);

  if (result.risk_score >= 70) {
    result.recommended_action = 'block';
  } else if (result.risk_score >= 40) {
    result.recommended_action = 'flag';
  } else {
    result.recommended_action = 'allow';
  }

  if (result.details.flags.length === 0) {
    result.details.flags.push('No suspicious patterns detected');
  }

  return result;
}

/**
 * Vercel Serverless Function Handler
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract email from query parameters (handle URL encoding)
  let email = req.query.email || req.body?.email;

  // Input validation
  if (!email) {
    return res.status(400).json({
      error: 'Missing required parameter: email',
      usage: 'GET /api/check?email=user@example.com'
    });
  }

  // Decode URL encoding (handles + signs and %20 spaces)
  email = decodeURIComponent(email.replace(/\+/g, '%2B'));

  // Email format validation (RFC 5322 simplified - allows + signs)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
      email: email
    });
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Perform validation
    const result = await validateEmail(normalizedEmail);

    // Return JSON response
    return res.status(200).json(result);
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to validate email'
    });
  }
}
