const db = require('../db');

// Mock data for when DB table is unavailable
const mockLogs = [
    { Log_ID: 1, User_ID: 1, Action: 'LOGIN', Details: '{"method": "password"}', IP_Address: '127.0.0.1', Timestamp: new Date().toISOString() },
    { Log_ID: 2, User_ID: 1, Action: 'UPDATE_ASSET', Details: '{"assetId": 101, "field": "status"}', IP_Address: '127.0.0.1', Timestamp: new Date(Date.now() - 3600000).toISOString() },
    { Log_ID: 3, User_ID: 2, Action: 'CHECKOUT', Details: '{"bookId": 55}', IP_Address: '192.168.1.50', Timestamp: new Date(Date.now() - 7200000).toISOString() },
    { Log_ID: 4, User_ID: 1, Action: 'USER_CREATE', Details: '{"newUserId": 15}', IP_Address: '127.0.0.1', Timestamp: new Date(Date.now() - 86400000).toISOString() },
    { Log_ID: 5, User_ID: 3, Action: 'LOGIN_FAILED', Details: '{"reason": "wrong_password"}', IP_Address: '10.0.0.5', Timestamp: new Date(Date.now() - 90000000).toISOString() }
];

/**
 * Get audit logs
 * GET /api/audit-logs
 */
exports.getLogs = (req, res) => {
    // In a real implementation, we would query the database:
    // const query = 'SELECT * FROM system_logs ORDER BY Timestamp DESC LIMIT 100';
    // db.query(query, ...);

    // For now, return mock data
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockLogs));
};

/**
 * Create an audit log entry
 * Internal helper, not an endpoint
 */
exports.createLog = (userId, action, details, ipAddress) => {
    console.log(`[AUDIT LOG] User: ${userId}, Action: ${action}, Details: ${JSON.stringify(details)}, IP: ${ipAddress}`);

    // In a real implementation:
    /*
    const query = 'INSERT INTO system_logs (User_ID, Action, Details, IP_Address) VALUES (?, ?, ?, ?)';
    db.query(query, [userId, action, JSON.stringify(details), ipAddress], (err) => {
      if (err) console.error('Failed to write audit log:', err);
    });
    */
};
