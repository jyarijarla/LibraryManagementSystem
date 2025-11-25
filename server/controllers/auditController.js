const db = require('../db');

// Mock data for when DB table is unavailable
const mockLogs = [
  { Log_ID: 1, User_ID: 1, Action: 'LOGIN', Details: '{"method": "password"}', IP_Address: '127.0.0.1', Timestamp: new Date().toISOString() },
  { Log_ID: 2, User_ID: 1, Action: 'UPDATE_ASSET', Details: '{"assetId": 101, "field": "status"}', IP_Address: '127.0.0.1', Timestamp: new Date(Date.now() - 3600000).toISOString() },
  { Log_ID: 3, User_ID: 2, Action: 'CHECKOUT', Details: '{"bookId": 55}', IP_Address: '192.168.1.50', Timestamp: new Date(Date.now() - 7200000).toISOString() },
  { Log_ID: 4, User_ID: 1, Action: 'USER_CREATE', Details: '{"newUserId": 15}', IP_Address: '127.0.0.1', Timestamp: new Date(Date.now() - 86400000).toISOString() },
  { Log_ID: 5, User_ID: 3, Action: 'LOGIN_FAILED', Details: '{"reason": "wrong_password"}', IP_Address: '10.0.0.5', Timestamp: new Date(Date.now() - 90000000).toISOString() }
];
exports.mockLogs = mockLogs;

/**
 * Get audit logs
 * GET /api/audit-logs
 */
exports.getLogs = (req, res) => {
  const query = `
        SELECT 
            l.Log_ID, l.User_ID, l.Action, CAST(l.Details AS CHAR) as Details, l.IP_Address, l.Timestamp,
            u.First_Name, u.Last_Name, u.Username
        FROM system_logs l
        LEFT JOIN user u ON l.User_ID = u.User_ID
        ORDER BY l.Timestamp DESC LIMIT 100
    `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching audit logs:', err);
      // Fallback to mock data if table doesn't exist
      if (err.code === 'ER_NO_SUCH_TABLE') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(mockLogs));
      }
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Database error' }));
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  });
};

/**
 * Create an audit log entry
 * Internal helper, not an endpoint
 */
exports.createLog = (userId, action, details, ipAddress) => {
  // console.log(`[AUDIT LOG] User: ${userId}, Action: ${action}, Details: ${JSON.stringify(details)}, IP: ${ipAddress}`);

  const query = 'INSERT INTO system_logs (User_ID, Action, Details, IP_Address) VALUES (?, ?, ?, ?)';
  db.query(query, [userId, action, JSON.stringify(details), ipAddress], (err) => {
    if (err) {
      // Silent fail for now if table doesn't exist, but log to console
      if (err.code !== 'ER_NO_SUCH_TABLE') {
        console.error('Failed to write audit log:', err);
      }
    }
  });
};

/**
 * POST /api/audit-logs/:id/delete
 * Body: { password }
 * Requires admin auth (server route enforces)
 */
exports.deleteAuditLog = async (req, res) => {
  try {
    const logId = req.params.id;
    const { password } = req.body || {};

    if (!logId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ message: 'Missing log id' }));
    }

    if (!password) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ message: 'Password is required to delete audit logs' }));
    }

    // Ensure authenticated user (authenticateRequest in server will attach req.user)
    const userId = req.user && req.user.id;
    if (!userId) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ message: 'Authentication required' }));
    }

    // Fetch user's hashed password from DB
    const [rows] = await db.promise().query('SELECT Password FROM user WHERE User_ID = ?', [userId]);
    if (!rows || rows.length === 0) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ message: 'User not found' }));
    }

    const hashed = rows[0].Password || '';
    const ok = await bcrypt.compare(password, hashed);
    if (!ok) {
      // Invalid password — do not return 401 here because client global fetch
      // interceptor treats 401 as expired token and logs the user out.
      // Use 403 Forbidden so the client can show an inline "Invalid password" message.
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ message: 'Invalid password' }));
    }

    // Perform delete
    const [delRes] = await db.promise().query('DELETE FROM system_logs WHERE Log_ID = ?', [logId]);
    if (delRes.affectedRows && delRes.affectedRows > 0) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ message: 'Audit log deleted' }));
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ message: 'Audit log not found' }));
  } catch (err) {
    console.error('Error deleting audit log:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ message: 'Failed to delete audit log', error: err.message }));
  }
};
