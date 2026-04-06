import { NextResponse } from 'next/server';

// Rate limiting store - In production, use Redis or similar persistent store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting utility with configurable limits
 * @param identifier - Unique identifier for the rate limit (e.g., IP address)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object indicating if request is limited and reset time
 */
export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { limited: boolean; resetTime?: number } {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Invalid identifier for rate limiting');
  }

  const now = Date.now();
  const windowKey = Math.floor(now / windowMs);
  const key = `${identifier}:${windowKey}`;

  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };

  if (current.count >= maxRequests) {
    return { limited: true, resetTime: current.resetTime };
  }

  current.count++;
  rateLimitStore.set(key, current);

  // Clean up old entries to prevent memory leaks
  // This is a simple cleanup - in production, consider more sophisticated cleanup
  for (const [k, v] of rateLimitStore.entries()) {
    if (now > v.resetTime) {
      rateLimitStore.delete(k);
    }
  }

  return { limited: false };
}

/**
 * Comprehensive validation for certificate data
 * @param data - The certificate data to validate
 * @returns Array of validation error messages
 */
export function validateCertificateData(data: any): string[] {
  const errors: string[] = [];

  // Hash validation - must be 64 character hex string
  if (!data.hash || typeof data.hash !== 'string' || !/^[a-f0-9]{64}$/i.test(data.hash)) {
    errors.push('Invalid hash format - must be 64 character hexadecimal string');
  }

  // Name validations
  if (!data.studentName || typeof data.studentName !== 'string' || data.studentName.trim().length === 0) {
    errors.push('Student name is required');
  } else if (data.studentName.length > 100) {
    errors.push('Student name must be 100 characters or less');
  }

  if (!data.universityName || typeof data.universityName !== 'string' || data.universityName.trim().length === 0) {
    errors.push('University name is required');
  } else if (data.universityName.length > 200) {
    errors.push('University name must be 200 characters or less');
  }

  if (!data.degreeName || typeof data.degreeName !== 'string' || data.degreeName.trim().length === 0) {
    errors.push('Degree name is required');
  } else if (data.degreeName.length > 100) {
    errors.push('Degree name must be 100 characters or less');
  }

  // URL validation
  if (!data.recordUrl || typeof data.recordUrl !== 'string') {
    errors.push('Record URL is required');
  } else {
    try {
      const url = new URL(data.recordUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Record URL must use HTTP or HTTPS protocol');
      }
    } catch {
      errors.push('Record URL must be a valid URL');
    }
  }

  return errors;
}

/**
 * Sanitize input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  // Comprehensive XSS prevention
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#x60;')
    .trim();
}

/**
 * Validate LinkedIn OAuth token format
 * @param token - The token to validate
 * @returns True if token format is valid
 */
export function validateLinkedInToken(token: string): boolean {
  // LinkedIn tokens are typically JWT-like with specific characteristics
  if (typeof token !== 'string' || token.length < 50) return false;

  // Check for valid characters (alphanumeric, hyphens, underscores, dots)
  return /^[A-Za-z0-9\-_.]+$/.test(token);
}

/**
 * Create a secure HTTP response with appropriate security headers
 * @param data - Response data
 * @param status - HTTP status code
 * @returns NextResponse with security headers
 */
export function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Additional security for API responses
  if (status >= 400) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  return response;
}

/**
 * Generate a cryptographically secure random string
 * @param length - Length of the string
 * @returns Random string
 */
function getSecureRandomBytes(length: number): Uint8Array {
  if (typeof globalThis?.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint8Array(length));
  }

  try {
    // Node.js fallback for secure randomness
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { randomBytes } = require('crypto');
    return randomBytes(length);
  } catch {
    throw new Error('Secure random number generator is not available');
  }
}

export function generateSecureRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = getSecureRandomBytes(length);

  return Array.from(randomBytes)
    .map((value) => chars[value % chars.length])
    .join('');
}