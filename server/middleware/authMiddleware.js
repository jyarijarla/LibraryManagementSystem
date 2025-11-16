const { verifyToken } = require('../utils/token');

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
    const payload = verifyToken(token);
    req.user = {
      id: payload.userId,
      role: payload.role
    };
    return req.user;
  } catch (error) {
    sendJson(res, 401, { message: 'Invalid or expired token', error: error.message });
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

module.exports = {
  authenticateRequest,
  enforceRoles
};
