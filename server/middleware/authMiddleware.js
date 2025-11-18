const { verifyToken, createFingerprint } = require('../utils/token');
const crypto = require('crypto');
const db = require('../db');

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set();
const usedNonces = new Map(); // Track used nonces to prevent replay attacks
const requestCounts = new Map(); // Track request rates per user
const suspiciousIPs = new Set(); // Track suspicious IPs

// Security constants
const MAX_REQUESTS_PER_MINUTE = 5; // Rate limit
const NONCE_EXPIRY_MS = 300000; // 5 minutes
const REQUEST_TIMESTAMP_TOLERANCE_MS = 60000; // 1 minute tolerance
const SECRET_PEPPER = process.env.SECRET_PEPPER || crypto.randomBytes(32).toString('hex');

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

// Reset rate limiting counters
setInterval(() => {
  requestCounts.clear();
}, 60000); // Reset every minute

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

/**
 * Check rate limiting per user and IP combination
 */
function checkRateLimit(userId, clientIp) {
  const key = `${userId}:${clientIp}`;
  const current = requestCounts.get(key) || 0;
  
  if (current >= MAX_REQUESTS_PER_MINUTE) {
    // Mark IP as suspicious after repeated rate limit violations
    suspiciousIPs.add(clientIp);
    setTimeout(() => suspiciousIPs.delete(clientIp), 3600000); // Block for 1 hour
    
    return { 
      allowed: false, 
      reason: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_MINUTE} requests per minute allowed.` 
    };
  }
  
  // Check if IP is marked as suspicious
  if (suspiciousIPs.has(clientIp)) {
    return { 
      allowed: false, 
      reason: 'Access temporarily blocked due to suspicious activity.' 
    };
  }
  
  requestCounts.set(key, current + 1);
  return { allowed: true };
}

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
    const suspiciousAgents = ['postman', 'insomnia', 'httpclient', 'curl', 'wget', 'python-requests'];
    const isSuspicious = suspiciousAgents.some(agent => 
      userAgent.toLowerCase().includes(agent)
    );
    
    // Block suspicious agents if strict mode is enabled
    const blockApiTools = process.env.BLOCK_API_TOOLS === 'true';
    if (isSuspicious && blockApiTools) {
      sendJson(res, 403, { 
        message: 'Access from automated tools is not allowed. Please use the official application.' 
      });
      return null;
    }
    
    // Log suspicious access attempts even if not blocking
    if (isSuspicious) {
      console.log(`[SECURITY] Suspicious User-Agent detected: ${userAgent} from IP: ${clientIp}`);
    }
    
    const fingerprint = createFingerprint(clientIp, userAgent);

    // Verify token with fingerprint check
    const payload = verifyToken(token, { fingerprint });
    
    // Validate request integrity (replay attack prevention)
    const integrityCheck = validateRequestIntegrity(req);
    if (!integrityCheck.valid) {
      sendJson(res, 401, { message: integrityCheck.reason });
      return null;
    }
    
    // Check rate limiting
    const rateLimitCheck = checkRateLimit(payload.userId, clientIp);
    if (!rateLimitCheck.allowed) {
      sendJson(res, 429, { message: rateLimitCheck.reason });
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
              
              if (dbRole !== payload.role) {
                sendJson(res, 401, { message: 'User role has changed. Please login again.' });
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
