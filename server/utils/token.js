const crypto = require('node:crypto');

const TOKEN_TTL_SECONDS = Number.parseInt(process.env.AUTH_TOKEN_TTL || '', 10) || 60 * 60 * 4; // 4 hours default
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'development-secret-change-me';

function base64UrlEncode(input) {
  const value = typeof input === 'string' ? input : JSON.stringify(input);
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString();
}

function createSignature(payload) {
  return crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
}

function generateToken(payload, options = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresIn || TOKEN_TTL_SECONDS;
  const exp = issuedAt + expiresIn;

  // Add security fingerprint to prevent token theft
  const fingerprint = options.fingerprint || null;
  const tokenPayload = {
    ...payload,
    iat: issuedAt,
    exp,
    fp: fingerprint, // fingerprint hash
    jti: crypto.randomBytes(16).toString('hex') // unique token ID for revocation
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(tokenPayload);
  const signature = createSignature(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function timingSafeEquals(a, b) {
  const buffA = Buffer.from(a);
  const buffB = Buffer.from(b);
  if (buffA.length !== buffB.length) {
    return false;
  }
  return crypto.timingSafeEqual(buffA, buffB);
}

function verifyToken(token, options = {}) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token missing');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = createSignature(`${encodedHeader}.${encodedPayload}`);
  if (!timingSafeEquals(signature, expectedSignature)) {
    throw new Error('Invalid token signature');
  }

  const payloadJson = base64UrlDecode(encodedPayload);
  const payload = JSON.parse(payloadJson);
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }

  // Verify fingerprint if provided
  if (options.fingerprint && payload.fp && payload.fp !== options.fingerprint) {
    throw new Error('Token fingerprint mismatch - possible token theft');
  }

  return payload;
}

function createFingerprint(ip, userAgent) {
  const data = `${ip}:${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}



module.exports = {
  generateToken,
  verifyToken,
  createFingerprint
};
