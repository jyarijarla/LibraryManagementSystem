const db = require('../db');
const bcrypt = require('bcryptjs');

/**
 * GET /api/audit-logs
 * Optional query params: action, admin (username), limit, offset
 */
exports.getAuditLogs = (req, res) => {
  const { action, admin, limit = 200, offset = 0 } = req.query;

  let sql = `
    SELECT
      al.Log_ID,
      al.Created_At,
      al.User_ID,
      u.Username as Admin_Username,
      al.Action,
      al.Table_Name,
      al.Record_ID,
      al.Description
    FROM audit_log al
    LEFT JOIN user u ON al.User_ID = u.User_ID
    WHERE 1=1
  `;

  const params = [];

  if (action) {
    sql += ` AND al.Action = ?`;
    params.push(action);
  }

  if (admin) {
    // allow username match or admin id numeric
    if (/^\d+$/.test(String(admin))) {
      sql += ` AND al.User_ID = ?`;
      params.push(admin);
    } else {
      sql += ` AND u.Username LIKE ?`;
      params.push(`%${admin}%`);
    }
  }

  sql += ` ORDER BY al.Created_At DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10) || 200, parseInt(offset, 10) || 0);

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching audit logs:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Failed to fetch audit logs', error: err.message }));
    }

    // Map to frontend-friendly shape
    const logs = (results || []).map(r => ({
      id: r.Log_ID,
      timestamp: r.Created_At,
      adminId: r.User_ID,
      admin: r.Admin_Username || `#${r.User_ID}`,
      action: r.Action,
      table: r.Table_Name,
      recordId: r.Record_ID,
      description: r.Description
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(logs));
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
    const [delRes] = await db.promise().query('DELETE FROM audit_log WHERE Log_ID = ?', [logId]);
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
