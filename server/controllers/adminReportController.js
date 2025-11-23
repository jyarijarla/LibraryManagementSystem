const db = require('../db');
const { mockLogs } = require('./auditController');

// Helper to send JSON response
const sendJSON = (res, data, statusCode = 200) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
};

// Fallback helpers so the Admin Reports tab still shows data even if system_logs is empty or missing
const getFallbackLogs = () => Array.isArray(mockLogs) ? mockLogs : [];

const buildSummaryFromLogs = (logs = []) => {
    const uniqueUsers = new Set();
    const summary = {
        Total_Actions: logs.length,
        Active_Admins: 0,
        User_Role_Changes: 0,
        Policy_Changes: 0,
        New_Users: 0,
        Data_Exports: 0,
        Backup_Success: 0,
        Backup_Fail: 0
    };

    logs.forEach(log => {
        if (log.User_ID != null) uniqueUsers.add(log.User_ID);
        const action = log.Action || '';
        if (action.startsWith('USER_') || action.startsWith('ROLE_')) summary.User_Role_Changes++;
        if (action.startsWith('CONFIG_') || action.startsWith('POLICY_')) summary.Policy_Changes++;
        if (action === 'USER_CREATE') summary.New_Users++;
        if (action === 'DATA_EXPORT') summary.Data_Exports++;
        if (action === 'BACKUP_SUCCESS') summary.Backup_Success++;
        if (action === 'BACKUP_FAIL') summary.Backup_Fail++;
    });

    summary.Active_Admins = uniqueUsers.size;
    return summary;
};

const shouldUseFallback = (err, results) => err?.code === 'ER_NO_SUCH_TABLE' || (Array.isArray(results) && results.length === 0);
const filterFallbackLogs = (predicate) => getFallbackLogs().filter(predicate);

// 1. Admin Activity Summary & KPI Cards
exports.getAdminActivitySummary = (req, res) => {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if no dates provided
    let end = endDate || new Date().toISOString();
    let start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Ensure full day coverage if only date is provided (YYYY-MM-DD)
    if (!start.includes('T')) start = `${start}T00:00:00.000Z`;
    if (!end.includes('T')) end = `${end}T23:59:59.999Z`;

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
                return sendJSON(res, buildSummaryFromLogs(getFallbackLogs()));
            }
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        const row = results?.[0];
        const isEmptySummary = row && Object.values(row).every(val => val === 0 || val === null);
        if (!row || isEmptySummary) {
            return sendJSON(res, buildSummaryFromLogs(getFallbackLogs()));
        }
        sendJSON(res, row);
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
    const fallback = filterFallbackLogs(log =>
        ['USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'ROLE_CHANGE', 'PASSWORD_RESET', 'USER_DEACTIVATE', 'USER_ACTIVATE'].includes(log.Action)
    );
    db.query(query, (err, results) => {
        if (shouldUseFallback(err, results)) return sendJSON(res, fallback);
        if (err) return sendJSON(res, { error: 'Database error' }, 500);
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
    const fallback = filterFallbackLogs(log => (log.Action || '').startsWith('CONFIG_'));
    db.query(query, (err, results) => {
        if (shouldUseFallback(err, results)) return sendJSON(res, fallback);
        if (err) return sendJSON(res, { error: 'Database error' }, 500);
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
    const fallback = filterFallbackLogs(log => {
        const action = log.Action || '';
        return action.startsWith('CATALOG_') || action.startsWith('INVENTORY_');
    });
    db.query(query, (err, results) => {
        if (shouldUseFallback(err, results)) return sendJSON(res, fallback);
        if (err) return sendJSON(res, { error: 'Database error' }, 500);
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
    const fallback = filterFallbackLogs(log => {
        const action = log.Action || '';
        return action.startsWith('FINE_') || action.startsWith('PAYMENT_');
    });
    db.query(query, (err, results) => {
        if (shouldUseFallback(err, results)) return sendJSON(res, fallback);
        if (err) return sendJSON(res, { error: 'Database error' }, 500);
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
    const fallback = filterFallbackLogs(log => ['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'DATA_EXPORT'].includes(log.Action));
    db.query(query, (err, results) => {
        if (shouldUseFallback(err, results)) return sendJSON(res, fallback);
        if (err) return sendJSON(res, { error: 'Database error' }, 500);
        sendJSON(res, results);
    });
};

// 7. System Health & Maintenance
exports.getSystemHealth = (req, res) => {
    const queryLogs = `
        SELECT Log_ID, User_ID, Action, Details, Timestamp
        FROM system_logs
        WHERE Action IN ('BACKUP_SUCCESS', 'BACKUP_FAIL', 'RESTORE', 'MIGRATION', 'SYSTEM_STARTUP')
        ORDER BY Timestamp DESC
        LIMIT 50
    `;

    const queryStats = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN Action LIKE '%FAIL%' OR Action LIKE '%ERROR%' THEN 1 ELSE 0 END) as errors,
            SUM(CASE WHEN Action = 'BACKUP_SUCCESS' THEN 1 ELSE 0 END) as backupSuccess,
            SUM(CASE WHEN Action = 'BACKUP_FAIL' THEN 1 ELSE 0 END) as backupFail
        FROM system_logs
        WHERE Timestamp > NOW() - INTERVAL 24 HOUR
    `;

    db.query(queryLogs, (err, logs) => {
        if (err) return sendJSON(res, { error: 'Database error' }, 500);

        db.query(queryStats, (err2, stats) => {
            if (err2) return sendJSON(res, { error: 'Database error' }, 500);

            const total = stats[0].total || 1;
            const errors = stats[0].errors || 0;
            const errorRate = ((errors / total) * 100).toFixed(2);

            const backupTotal = (stats[0].backupSuccess || 0) + (stats[0].backupFail || 0);
            const backupSuccessRate = backupTotal > 0 ? ((stats[0].backupSuccess / backupTotal) * 100).toFixed(1) : 100;

            sendJSON(res, {
                logs,
                stats: {
                    errorRate: `${errorRate}%`,
                    backupSuccessRate: `${backupSuccessRate}%`,
                    totalErrors: errors,
                    recentBackups: backupTotal
                }
            });
        });
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
    const fallback = filterFallbackLogs(log => ['REPORT_GENERATED', 'DATA_EXPORT'].includes(log.Action));
    db.query(query, (err, results) => {
        if (shouldUseFallback(err, results)) return sendJSON(res, fallback);
        if (err) return sendJSON(res, { error: 'Database error' }, 500);
        sendJSON(res, results);
    });
};

// 9. Appendix: Detailed Audit Trail (Raw)
exports.getAuditTrail = (req, res) => {
    const { page = 1, limit = 50, action, userId, startDate, endDate, role, search } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    let query = `
        SELECT s.*, u.Username, r.role_name as Role_Name
        FROM system_logs s
        LEFT JOIN user u ON s.User_ID = u.User_ID
        LEFT JOIN role_type r ON u.Role = r.role_id
        WHERE 1=1
    `;
    const params = [];

    if (action) {
        query += ` AND s.Action = ?`;
        params.push(action);
    }
    if (userId) {
        query += ` AND s.User_ID = ?`;
        params.push(userId);
    }
    if (role) {
        query += ` AND r.role_name = ?`;
        params.push(role);
    }
    if (search) {
        query += ` AND (u.Username LIKE ? OR s.Action LIKE ? OR s.Details LIKE ? OR s.IP_Address LIKE ?)`;
        const term = `%${search}%`;
        params.push(term, term, term, term);
    }
    if (startDate && endDate) {
        query += ` AND s.Timestamp BETWEEN ? AND ?`;
        // Append time to ensure full day coverage if only date is provided
        const start = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`;
        const end = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
        params.push(start, end);
    }

    query += ` ORDER BY s.Timestamp DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 getAuditTrail Query:', query);
    console.log('🔍 getAuditTrail Params:', params);

    const fallbackResults = filterFallbackLogs(log => {
        if (action && log.Action !== action) return false;
        if (userId && String(log.User_ID) !== String(userId)) return false;
        if (startDate && endDate) {
            const ts = new Date(log.Timestamp).getTime();
            const startTs = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`).getTime();
            const endTs = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`).getTime();
            if (Number.isFinite(ts) && (ts < startTs || ts > endTs)) return false;
        }
        return true;
    });

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('❌ getAuditTrail Error:', err);
            if (err.code === 'ER_NO_SUCH_TABLE') return sendJSON(res, fallbackResults.slice(0, limitNum));
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        console.log('✅ getAuditTrail Results:', results.length);
        if (shouldUseFallback(err, results)) {
            return sendJSON(res, fallbackResults.slice(offset, offset + limitNum));
        }
        sendJSON(res, results);
    });
};

// --- Executive Dashboard Aggregations ---

// 10. High-level Dashboard Stats
exports.getDashboardStats = (req, res) => {
    const queries = {
        totalUsers: "SELECT COUNT(*) as count FROM user WHERE Is_Deleted = 0",
        activeLoans: "SELECT COUNT(*) as count FROM borrow WHERE Status = 'Borrowed'",
        revenue: "SELECT SUM(Fine_Amount) as total FROM fine WHERE Payment_Status = 'Paid'",
        systemHealth: "SELECT COUNT(*) as errors FROM system_logs WHERE Action LIKE '%FAIL%' AND Timestamp > NOW() - INTERVAL 24 HOUR"
    };

    const stats = {};
    let completed = 0;
    const keys = Object.keys(queries);

    keys.forEach(key => {
        db.query(queries[key], (err, results) => {
            if (err) {
                console.error(`Error fetching ${key}:`, err);
                stats[key] = 0;
            } else {
                stats[key] = results[0].count || results[0].total || 0;
            }
            completed++;
            if (completed === keys.length) {
                sendJSON(res, stats);
            }
        });
    });
};

// 11. Activity Trends (Line Chart)
exports.getActivityTrends = (req, res) => {
    const query = `
        SELECT DATE(Timestamp) as date, COUNT(*) as count
        FROM system_logs
        WHERE Timestamp > NOW() - INTERVAL 30 DAY
        GROUP BY DATE(Timestamp)
        ORDER BY date ASC
    `;
    db.query(query, (err, results) => {
        if (err) return sendJSON(res, { error: 'Database error' }, 500);
        sendJSON(res, results);
    });
};

// 12. User Growth Stats (Bar Chart)
exports.getUserGrowthStats = (req, res) => {
    const query = `
        SELECT 
            DATE(Timestamp) as date,
            SUM(CASE WHEN Action = 'USER_CREATE' THEN 1 ELSE 0 END) as newUsers,
            SUM(CASE WHEN Action = 'USER_DELETE' THEN 1 ELSE 0 END) as deletedUsers
        FROM system_logs
        WHERE Timestamp > NOW() - INTERVAL 90 DAY
        GROUP BY DATE(Timestamp)
        ORDER BY date ASC
    `;
    db.query(query, (err, results) => {
        if (err) return sendJSON(res, { error: 'Database error' }, 500);
        sendJSON(res, results);
    });
};

// 13. Financial Trends (Area Chart)
exports.getFinancialTrends = (req, res) => {
    // Note: This relies on logs for historical trend. 
    // Ideally, we'd have a 'transactions' table. Using logs as proxy.
    const query = `
        SELECT 
            DATE(Timestamp) as date,
            SUM(CASE WHEN Action = 'PAYMENT_PROCESSED' THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(Details, '$.amount')) AS DECIMAL(10,2)) ELSE 0 END) as revenue
        FROM system_logs
        WHERE Action = 'PAYMENT_PROCESSED' AND Timestamp > NOW() - INTERVAL 90 DAY
        GROUP BY DATE(Timestamp)
        ORDER BY date ASC
    `;
    db.query(query, (err, results) => {
        if (err) return sendJSON(res, { error: 'Database error' }, 500);
        sendJSON(res, results);
    });
};

// 14. Inventory Health (Pie Chart)
exports.getInventoryHealth = (req, res) => {
    // Aggregating from multiple inventory tables
    const queries = [
        "SELECT 'Books' as type, SUM(Copies) as total, SUM(Available_Copies) as available FROM book_inventory",
        "SELECT 'Movies' as type, SUM(Copies) as total, SUM(Available_Copies) as available FROM movie_inventory",
        "SELECT 'Tech' as type, SUM(Copies) as total, SUM(Available_Copies) as available FROM technology_inventory"
    ];

    const finalResults = [];
    let completed = 0;

    queries.forEach(q => {
        db.query(q, (err, results) => {
            if (!err && results[0].total) {
                finalResults.push({
                    type: results[0].type,
                    total: results[0].total,
                    available: results[0].available,
                    borrowed: results[0].total - results[0].available
                });
            }
            completed++;
            if (completed === queries.length) {
                sendJSON(res, finalResults);
            }
        });
    });
};
