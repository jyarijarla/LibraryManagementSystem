const { verifyToken, createFingerprint } = require('../utils/token');
const db = require('../db');

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set();

function addToBlacklist(jti) {
  tokenBlacklist.add(jti);
  // Auto-cleanup after 24 hours
  setTimeout(() => tokenBlacklist.delete(jti), 24 * 60 * 60 * 1000);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
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
    const fingerprint = createFingerprint(clientIp, userAgent);

    // Verify token with fingerprint check
    const payload = verifyToken(token, { fingerprint });
    
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
          
          // Verify role matches
          let expectedRole;
          if (user.Role === 2) expectedRole = 'admin';
          else if (user.Role === 3) expectedRole = 'librarian';
          else expectedRole = 'student';

          if (expectedRole !== payload.role) {
            sendJson(res, 401, { message: 'User role has changed. Please login again.' });
            resolve(null);
            return;
          }

          req.user = {
            id: payload.userId,
            role: payload.role,
            username: user.Username,
            tokenId: payload.jti
          };
          resolve(req.user);
        }
      );
    });
  } catch (error) {
    const errorMessage = error.message.includes('fingerprint') 
      ? 'Fuck You Hung'
      : 'Invalid or expired token';
    sendJson(res, 401, { message: errorMessage, error: error.message });
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
