const { verifyToken, createFingerprint } = require('../utils/token');
const crypto = require('crypto');
const db = require('../db');

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set();
const usedNonces = new Map(); // Track used nonces to prevent replay attacks

// Security constants
const NONCE_EXPIRY_MS = 300000; // 5 minutes
const REQUEST_TIMESTAMP_TOLERANCE_MS = 60000; // 1 minute tolerance
const SECRET_PEPPER = process.env.SECRET_PEPPER || crypto.randomBytes(32).toString('hex');

// Role-based rate limits (stricter for non-admin roles)
const ROLE_RATE_LIMITS = {
  'student': 30,      // Students get 30 requests/min max
  'librarian': 100,   // Librarians get 100 requests/min
  'admin': 200        // Admins get full limit
};
// Allowed roles in the system (any other role is instantly rejected)
const VALID_ROLES = ['student', 'librarian', 'admin'];

function addToBlacklist(jti) {
  tokenBlacklist.add(jti);
  // Auto-cleanup after 24 hours
  setTimeout(() => tokenBlacklist.delete(jti), 24 * 60 * 60 * 1000);
}

// Clean up old nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [nonce, timestamp] of usedNonces.entries()) {
    if (now - timestamp > NONCE_EXPIRY_MS) {
      usedNonces.delete(nonce);
    }
  }
}, 60000); // Clean every minute

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

/**
 * Validate request integrity to prevent replay attacks and request tampering
 * Returns valid if headers are present and correct, or if in development mode
 */
function validateRequestIntegrity(req) {
  const nonce = req.headers['x-request-nonce'];
  const timestamp = req.headers['x-request-timestamp'];
  const signature = req.headers['x-request-signature'];

  // Allow requests without security headers in development (for gradual migration)
  // In production, set ENFORCE_REQUEST_SIGNING=true
  const enforceStrict = process.env.ENFORCE_REQUEST_SIGNING === 'true';

  if (!nonce || !timestamp || !signature) {
    if (enforceStrict) {
      return {
        valid: false,
        reason: 'Missing security headers. Please use official client application.'
      };
    }
    // Allow without headers for now, but log for monitoring
    console.log(`[SECURITY] Request without signing headers: ${req.method} ${req.url}`);
    return { valid: true };
  }

  // If headers are present, validate them strictly
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Date.now();

  if (isNaN(requestTime)) {
    return { valid: false, reason: 'Invalid request timestamp' };
  }

  if (Math.abs(currentTime - requestTime) > REQUEST_TIMESTAMP_TOLERANCE_MS) {
    return { valid: false, reason: 'Request timestamp expired. Please retry.' };
  }

  // Check if nonce has been used (prevent replay attacks)
  if (usedNonces.has(nonce)) {
    return { valid: false, reason: 'Duplicate request detected. Request already processed.' };
  }

  // Verify HMAC signature using client-side key derivation
  const dataToSign = `${req.method}:${req.url}:${timestamp}:${nonce}`;
  const clientKey = crypto.createHash('sha256').update('library-management-secure-client-v1').digest('hex');
  const expectedSignature = crypto
    .createHmac('sha256', clientKey)
    .update(dataToSign)
    .digest('hex');

  if (signature !== expectedSignature) {
    return {
      valid: false,
      reason: 'Request signature verification failed. Possible tampering detected.'
    };
  }

  // Mark nonce as used
  usedNonces.set(nonce, currentTime);

  return { valid: true };
}

// Rate limiting removed - you can add your own implementation later if needed

function authenticateRequest(req, res) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    sendJson(res, 401, { message: 'Authorization header missing' });
    return null;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    // Create fingerprint from current request
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Additional security: Check for common Postman/API tool signatures
    const suspiciousAgents = ['postman', 'insomnia', 'httpclient', 'curl', 'wget', 'python-requests', 'axios/', 'node-fetch'];
    const isSuspicious = suspiciousAgents.some(agent =>
      userAgent.toLowerCase().includes(agent)
    );

    // Check for automated tools but don't block legitimate browsers
    const isLikelyBrowser = /mozilla|chrome|safari|firefox|edge|opera/i.test(userAgent);

    if (isSuspicious && !isLikelyBrowser) {
      console.log(`[SECURITY ALERT] API tool blocked: ${userAgent} from IP: ${clientIp}`);
      sendJson(res, 403, {
        message: 'Automated access detected. Please use the official web application.',
        code: 'AUTOMATED_TOOL_DETECTED'
      });
      return null;
    }

    // Log any non-browser access for monitoring
    if (!isLikelyBrowser) {
      console.log(`[SECURITY WARNING] Non-browser access: ${userAgent} from IP: ${clientIp}`);
    }

    console.log(`DEBUG: IP=${clientIp}, UA=${userAgent}`);
    const fingerprint = createFingerprint(clientIp, userAgent);

    // Verify token with fingerprint check
    const payload = verifyToken(token, { fingerprint });

    // CRITICAL: Validate role is in allowed list (prevent fake roles in token)
    if (!VALID_ROLES.includes(payload.role)) {
      console.log(`[SECURITY ALERT] INVALID ROLE IN TOKEN: "${payload.role}" from IP: ${clientIp}`);
      sendJson(res, 403, {
        message: 'Invalid role detected. Access denied.',
        code: 'INVALID_ROLE'
      });
      return null;
    }

    // Check if token is blacklisted
    if (payload.jti && tokenBlacklist.has(payload.jti)) {
      sendJson(res, 401, { message: 'Token has been revoked' });
      return null;
    }

    // Verify user still exists and is active in database
    return new Promise((resolve) => {
      db.query(
        'SELECT User_ID, Role, Username FROM user WHERE User_ID = ?',
        [payload.userId],
        (err, results) => {
          if (err || results.length === 0) {
            sendJson(res, 401, { message: 'User account not found or has been deleted' });
            resolve(null);
            return;
          }

          const user = results[0];

          // Verify role matches using database query to prevent hardcoded role bypass
          db.query(
            'SELECT role_name FROM role_type WHERE role_id = ?',
            [user.Role],
            (roleErr, roleResults) => {
              if (roleErr || roleResults.length === 0) {
                sendJson(res, 401, { message: 'Invalid user role' });
                resolve(null);
                return;
              }

              const dbRole = roleResults[0].role_name;

              // CRITICAL: Verify role from database matches token AND is valid
              if (dbRole !== payload.role) {
                console.log(`[SECURITY ALERT] ROLE MISMATCH: Token says "${payload.role}" but DB says "${dbRole}" for user ${payload.userId}`);
                sendJson(res, 401, { message: 'Role verification failed. Access denied.' });
                resolve(null);
                return;
              }

              // Double-check role is valid even if it matches
              if (!VALID_ROLES.includes(dbRole)) {
                console.log(`[SECURITY ALERT] INVALID ROLE IN DATABASE: "${dbRole}" for user ${payload.userId}`);
                sendJson(res, 403, { message: 'Invalid role in system. Access denied.' });
                resolve(null);
                return;
              }

              req.user = {
                id: payload.userId,
                role: payload.role,
                username: user.Username,
                tokenId: payload.jti,
                ip: clientIp
              };
              resolve(req.user);
            }
          );
        }
      );
    });
  } catch (error) {
    const errorMessage = error.message.includes('fingerprint')
      ? 'Security validation failed. Token cannot be used from this device.'
      : 'Invalid or expired token';
    sendJson(res, 401, { message: errorMessage });
    return null;
  }
}

function enforceRoles(req, res, allowedRoles = []) {
  if (!allowedRoles.length) {
    return true;
  }

  if (!req.user) {
    sendJson(res, 500, { message: 'User context missing. Ensure authenticateRequest is called first.' });
    return false;
  }

  if (!allowedRoles.includes(req.user.role)) {
    sendJson(res, 403, { message: 'Access denied for this role' });
    return false;
  }

  return true;
}

function revokeToken(req, res) {
  if (req.user && req.user.tokenId) {
    addToBlacklist(req.user.tokenId);
    sendJson(res, 200, { message: 'Logged out successfully' });
  } else {
    sendJson(res, 400, { message: 'No active session' });
  }
}

module.exports = {
  authenticateRequest,
  enforceRoles,
  revokeToken,
  addToBlacklist
};
