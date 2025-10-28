// Middleware to verify user authentication (checking if userId is provided)
function authenticateUser(req, res, next) {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId || !userRole) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'User authentication required' }));
    return;
  }

  // Attach user info to request
  req.user = {
    id: Number.parseInt(userId, 10),
    role: userRole
  };
  
  next();
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Admin access required' }));
    return;
  }
  next();
}

// Middleware to check if user is student
function requireStudent(req, res, next) {
  if (req.user.role !== 'student') {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Student access required' }));
    return;
  }
  next();
}

module.exports = {
  authenticateUser,
  requireAdmin,
  requireStudent
};
