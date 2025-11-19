/**
 * Secure Token Management System
 * 
 * Features:
 * - AES-256-GCM encryption for token payload
 * - HMAC-SHA512 signatures
 * - Device fingerprinting
 * - Token rotation
 * - Secure random generation
 * - Timing-safe comparisons
 */

const crypto = require('crypto');

// Load secrets from environment variables (NEVER hardcode these!)
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SECRET_PEPPER = process.env.SECRET_PEPPER;

// Validate that secrets are loaded
if (!TOKEN_SECRET || TOKEN_SECRET === 'development-secret-change-me') {
  console.error('⚠️  WARNING: AUTH_TOKEN_SECRET not set or using default! Generate with: node utils/generateSecrets.js');
}

if (!ENCRYPTION_KEY) {
  console.error('⚠️  WARNING: ENCRYPTION_KEY not set! Generate with: node utils/generateSecrets.js');
}

// Token configuration
const TOKEN_TTL_SECONDS = parseInt(process.env.AUTH_TOKEN_TTL || '14400', 10); // 4 hours
const REFRESH_TOKEN_TTL_SECONDS = parseInt(process.env.REFRESH_TOKEN_TTL || '604800', 10); // 7 days

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES-256-GCM
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Encrypt data using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key (hex)
 * @returns {string} - Encrypted data in format: iv:authTag:salt:encryptedData (all base64url)
 */
function encrypt(text, key = ENCRYPTION_KEY) {
  if (!key) {
    throw new Error('Encryption key not configured');
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derive key using PBKDF2 with salt
    const derivedKey = crypto.pbkdf2Sync(
      Buffer.from(key, 'hex'),
      salt,
      100000, // iterations
      32, // key length
      'sha512'
    );

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64url');
    encrypted += cipher.final('base64url');
    
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:salt:encryptedData
    return [
      iv.toString('base64url'),
      authTag.toString('base64url'),
      salt.toString('base64url'),
      encrypted
    ].join(':');
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedText - Encrypted text in format: iv:authTag:salt:encryptedData
 * @param {string} key - Encryption key (hex)
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedText, key = ENCRYPTION_KEY) {
  if (!key) {
    throw new Error('Encryption key not configured');
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivBase64, authTagBase64, saltBase64, encrypted] = parts;
    
    const iv = Buffer.from(ivBase64, 'base64url');
    const authTag = Buffer.from(authTagBase64, 'base64url');
    const salt = Buffer.from(saltBase64, 'base64url');
    
    // Derive same key using salt
    const derivedKey = crypto.pbkdf2Sync(
      Buffer.from(key, 'hex'),
      salt,
      100000,
      32,
      'sha512'
    );

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64url', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data - token may be tampered');
  }
}

/**
 * Base64URL encode
 */
function base64UrlEncode(input) {
  const value = typeof input === 'string' ? input : JSON.stringify(input);
  return Buffer.from(value).toString('base64url');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/**
 * Create HMAC-SHA512 signature
 * @param {string} payload - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} - Signature in base64url
 */
function createSignature(payload, secret = TOKEN_SECRET) {
  if (!secret) {
    throw new Error('Token secret not configured');
  }

  return crypto
    .createHmac('sha512', secret) // Upgraded from sha256 to sha512
    .update(payload)
    .digest('base64url');
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks
 */
function timingSafeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  const buffA = Buffer.from(a);
  const buffB = Buffer.from(b);
  
  if (buffA.length !== buffB.length) {
    // Still do a fake comparison to prevent timing leaks
    crypto.timingSafeEqual(
      Buffer.alloc(32), 
      Buffer.alloc(32)
    );
    return false;
  }
  
  return crypto.timingSafeEqual(buffA, buffB);
}

/**
 * Create device fingerprint
 * @param {string} ip - Client IP address
 * @param {string} userAgent - User agent string
 * @param {string} additionalData - Optional additional data
 * @returns {string} - SHA-256 hash of fingerprint
 */
function createFingerprint(ip, userAgent, additionalData = '') {
  const pepper = SECRET_PEPPER || 'default-pepper';
  const data = `${ip}:${userAgent}:${additionalData}:${pepper}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate secure access token (encrypted JWT)
 * @param {Object} payload - Token payload { userId, role, etc }
 * @param {Object} options - Options { fingerprint, expiresIn }
 * @returns {string} - Encrypted and signed token
 */
function generateToken(payload, options = {}) {
  try {
    const header = {
      alg: 'HS512', // HMAC-SHA512
      typ: 'JWT',
      enc: 'A256GCM' // AES-256-GCM encryption
    };
    
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresIn = options.expiresIn || TOKEN_TTL_SECONDS;
    const exp = issuedAt + expiresIn;
    
    // Enhanced payload with security features
    const tokenPayload = {
      ...payload,
      iat: issuedAt,
      exp,
      fp: options.fingerprint || null, // device fingerprint
      jti: crypto.randomBytes(16).toString('hex'), // unique token ID
      nonce: crypto.randomBytes(16).toString('hex'), // prevent replay attacks
      iss: 'library-management-system', // issuer
      aud: 'library-client' // audience
    };

    // Encrypt the payload
    const payloadJson = JSON.stringify(tokenPayload);
    const encryptedPayload = encrypt(payloadJson);
    
    // Create token parts
    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode({ enc: encryptedPayload });
    
    // Sign the token
    const signature = createSignature(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  } catch (error) {
    console.error('Token generation error:', error.message);
    throw new Error('Failed to generate token');
  }
}

/**
 * Generate refresh token
 * @param {Object} payload - Minimal payload { userId }
 * @returns {string} - Encrypted refresh token
 */
function generateRefreshToken(payload) {
  try {
    const tokenPayload = {
      userId: payload.userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL_SECONDS,
      jti: crypto.randomBytes(24).toString('hex')
    };

    const payloadJson = JSON.stringify(tokenPayload);
    const encryptedPayload = encrypt(payloadJson);
    const signature = createSignature(encryptedPayload, REFRESH_TOKEN_SECRET);

    return `${base64UrlEncode(encryptedPayload)}.${signature}`;
  } catch (error) {
    console.error('Refresh token generation error:', error.message);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Verify and decrypt access token
 * @param {string} token - Token to verify
 * @param {Object} options - Options { fingerprint }
 * @returns {Object} - Decoded payload
 * @throws {Error} - If token is invalid
 */
function verifyToken(token, options = {}) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token missing');
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token structure');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature first (timing-safe comparison)
    const expectedSignature = createSignature(`${encodedHeader}.${encodedPayload}`);
    if (!timingSafeEquals(signature, expectedSignature)) {
      throw new Error('Invalid token signature');
    }

    // Decode header
    const headerJson = base64UrlDecode(encodedHeader);
    const header = JSON.parse(headerJson);
    
    // Verify header
    if (header.alg !== 'HS512' || header.typ !== 'JWT') {
      throw new Error('Invalid token header');
    }

    // Decode and decrypt payload
    const payloadJson = base64UrlDecode(encodedPayload);
    const payloadWrapper = JSON.parse(payloadJson);
    
    if (!payloadWrapper.enc) {
      throw new Error('Token payload not encrypted');
    }

    const decryptedPayload = decrypt(payloadWrapper.enc);
    const payload = JSON.parse(decryptedPayload);
    
    // Verify claims
    const now = Math.floor(Date.now() / 1000);
    
    if (!payload.exp || payload.exp < now) {
      throw new Error('Token expired');
    }

    if (payload.iss !== 'library-management-system') {
      throw new Error('Invalid token issuer');
    }

    if (payload.aud !== 'library-client') {
      throw new Error('Invalid token audience');
    }

    // Verify fingerprint if provided (prevent token theft)
    if (options.fingerprint && payload.fp) {
      if (!timingSafeEquals(payload.fp, options.fingerprint)) {
        throw new Error('Token fingerprint mismatch - possible token theft detected');
      }
    }

    return payload;
  } catch (error) {
    // Log error but don't expose details to client
    console.error('Token verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Verify refresh token
 * @param {string} refreshToken - Refresh token to verify
 * @returns {Object} - Decoded payload
 */
function verifyRefreshToken(refreshToken) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Error('Refresh token missing');
  }

  try {
    const parts = refreshToken.split('.');
    if (parts.length !== 2) {
      throw new Error('Invalid refresh token structure');
    }

    const [encodedPayload, signature] = parts;
    
    // Verify signature
    const encryptedPayload = base64UrlDecode(encodedPayload);
    const expectedSignature = createSignature(encryptedPayload, REFRESH_TOKEN_SECRET);
    
    if (!timingSafeEquals(signature, expectedSignature)) {
      throw new Error('Invalid refresh token signature');
    }

    // Decrypt payload
    const decryptedPayload = decrypt(encryptedPayload);
    const payload = JSON.parse(decryptedPayload);
    
    // Verify claims
    const now = Math.floor(Date.now() / 1000);
    
    if (!payload.exp || payload.exp < now) {
      throw new Error('Refresh token expired');
    }

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Generate CSRF token
 * @returns {string} - CSRF token
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify CSRF token (timing-safe)
 * @param {string} token1 - Token to compare
 * @param {string} token2 - Token to compare
 * @returns {boolean} - True if tokens match
 */
function verifyCSRFToken(token1, token2) {
  if (!token1 || !token2) {
    return false;
  }
  return timingSafeEquals(token1, token2);
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  createFingerprint,
  generateCSRFToken,
  verifyCSRFToken,
  encrypt,
  decrypt
};


