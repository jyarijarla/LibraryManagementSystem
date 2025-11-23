const db = require('../db');

// Helper to send JSON response
const sendJSON = (res, data, statusCode = 200) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
};

// 1. Admin Activity Summary & KPI Cards
exports.getAdminActivitySummary = (req, res) => {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString();
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const query = `
    SELECT 
      COUNT(*) as Total_Actions,
      COUNT(DISTINCT User_ID) as Active_Admins,
      SUM(CASE WHEN Action LIKE 'USER_%' OR Action LIKE 'ROLE_%' THEN 1 ELSE 0 END) as User_Role_Changes,
      SUM(CASE WHEN Action LIKE 'CONFIG_%' THEN 1 ELSE 0 END) as Policy_Changes,
      SUM(CASE WHEN Action = 'USER_CREATE' THEN 1 ELSE 0 END) as New_Users,
      SUM(CASE WHEN Action = 'DATA_EXPORT' THEN 1 ELSE 0 END) as Data_Exports,
      SUM(CASE WHEN Action = 'BACKUP_SUCCESS' THEN 1 ELSE 0 END) as Backup_Success,
      SUM(CASE WHEN Action = 'BACKUP_FAIL' THEN 1 ELSE 0 END) as Backup_Fail
    FROM system_logs
    WHERE Timestamp BETWEEN ? AND ?
  `;

    db.query(query, [start, end], (err, results) => {
        if (err) {
            console.error('Error fetching admin activity summary:', err);
            if (err.code === 'ER_NO_SUCH_TABLE') {
                return sendJSON(res, {
                    Total_Actions: 0,
                    Active_Admins: 0,
                    User_Role_Changes: 0,
                    Policy_Changes: 0,
                    New_Users: 0,
                    Data_Exports: 0,
                    Backup_Success: 0,
                    Backup_Fail: 0
                });
            }
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results[0]);
    });
};

// 2. User & Role Management Section
exports.getUserRoleChanges = (req, res) => {
    const query = `
        SELECT Log_ID, User_ID, Action, Details, Timestamp, IP_Address
        FROM system_logs
        WHERE Action IN ('USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'ROLE_CHANGE', 'PASSWORD_RESET', 'USER_DEACTIVATE', 'USER_ACTIVATE')
        ORDER BY Timestamp DESC
        LIMIT 100
    `;
    db.query(query, (err, results) => {
        if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') return sendJSON(res, []);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};

// 3. Policy / System Configuration Changes
exports.getPolicyChanges = (req, res) => {
    const query = `
        SELECT Log_ID, User_ID, Action, Details, Timestamp
        FROM system_logs
        WHERE Action LIKE 'CONFIG_%'
        ORDER BY Timestamp DESC
        LIMIT 50
    `;
    db.query(query, (err, results) => {
        if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') return sendJSON(res, []);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};

// 4. Catalog & Inventory Overrides
exports.getCatalogOverrides = (req, res) => {
    const query = `
        SELECT Log_ID, User_ID, Action, Details, Timestamp
        FROM system_logs
        WHERE Action LIKE 'CATALOG_%' OR Action LIKE 'INVENTORY_%'
        ORDER BY Timestamp DESC
        LIMIT 50
    `;
    db.query(query, (err, results) => {
        if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') return sendJSON(res, []);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};

// 5. Financial / Fine Control Summary
exports.getFinancialSummary = (req, res) => {
    const query = `
        SELECT Log_ID, User_ID, Action, Details, Timestamp
        FROM system_logs
        WHERE Action LIKE 'FINE_%' OR Action LIKE 'PAYMENT_%'
        ORDER BY Timestamp DESC
        LIMIT 50
    `;
    db.query(query, (err, results) => {
        if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') return sendJSON(res, []);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};

// 6. Data / Security / Compliance Logs
exports.getSecurityLogs = (req, res) => {
    const query = `
        SELECT Log_ID, User_ID, Action, Details, Timestamp, IP_Address
        FROM system_logs
        WHERE Action IN ('LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'DATA_EXPORT')
        ORDER BY Timestamp DESC
        LIMIT 50
    `;
    db.query(query, (err, results) => {
        if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') return sendJSON(res, []);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};

// 7. System Health & Maintenance
exports.getSystemHealth = (req, res) => {
    const query = `
        SELECT Log_ID, User_ID, Action, Details, Timestamp
        FROM system_logs
        WHERE Action IN ('BACKUP_SUCCESS', 'BACKUP_FAIL', 'RESTORE', 'MIGRATION', 'SYSTEM_STARTUP')
        ORDER BY Timestamp DESC
        LIMIT 50
    `;
    db.query(query, (err, results) => {
        if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') return sendJSON(res, []);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};

// 8. Reports Generated / Exports
exports.getReportsGenerated = (req, res) => {
    const query = `
        SELECT Log_ID, User_ID, Action, Details, Timestamp
        FROM system_logs
        WHERE Action = 'REPORT_GENERATED' OR Action = 'DATA_EXPORT'
        ORDER BY Timestamp DESC
        LIMIT 50
    `;
    db.query(query, (err, results) => {
        if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') return sendJSON(res, []);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};

// 9. Appendix: Detailed Audit Trail (Raw)
exports.getAuditTrail = (req, res) => {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM system_logs WHERE 1=1`;
    const params = [];

    if (action) {
        query += ` AND Action = ?`;
        params.push(action);
    }
    if (userId) {
        query += ` AND User_ID = ?`;
        params.push(userId);
    }
    if (startDate && endDate) {
        query += ` AND Timestamp BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }

    query += ` ORDER BY Timestamp DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.query(query, params, (err, results) => {
        if (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') return sendJSON(res, []);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};
