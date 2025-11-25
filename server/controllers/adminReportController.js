const db = require('../db');

// Helper to send JSON response
const sendJSON = (res, data, statusCode = 200) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
};

// --- 1. Overall Library Health (KPIs + System Jobs) ---
exports.getDashboardStats = (req, res) => {
    const queries = {
        activeLoans: "SELECT COUNT(*) as count FROM borrow WHERE Return_Date IS NULL",
        overdueLoans: "SELECT COUNT(*) as count FROM borrow WHERE Return_Date IS NULL AND Due_Date < CURDATE()",
        totalItems: "SELECT COUNT(*) as count FROM rentable WHERE Availability = 1",
        activeHolds: "SELECT COUNT(*) as count FROM hold WHERE Canceled_At IS NULL AND Fulfilling_Borrow_ID IS NULL",
        outstandingFines: "SELECT SUM(Amount_Due) as value FROM fine WHERE Paid = 0",
        blockedStudents: "SELECT COUNT(*) as count FROM user WHERE Role = 1 AND Is_Blocked = 1",
        // System jobs status (mocked for now as we don't have a jobs table)
        lastBackup: "SELECT 'Success' as status, NOW() - INTERVAL 2 HOUR as time",
        overdueScan: "SELECT 'Completed' as status, CURDATE() as time"
    };

    const stats = {};
    let completed = 0;
    const keys = Object.keys(queries);

    keys.forEach(key => {
        // For mocked queries that don't use DB, just return the value directly
        if (key === 'lastBackup' || key === 'overdueScan') {
            stats[key] = key === 'lastBackup' ? { status: 'Success', time: new Date(Date.now() - 7200000) } : { status: 'Completed', time: new Date() };
            completed++;
            if (completed === keys.length) sendResponse();
            return;
        }

        db.query(queries[key], (err, results) => {
            if (err) {
                console.error(`Error fetching ${key}:`, err);
                stats[key] = 0;
            } else {
                stats[key] = results[0]?.value || results[0]?.count || 0;
            }
            completed++;
            if (completed === keys.length) sendResponse();
        });
    });

    function sendResponse() {
        const overdueRate = stats.activeLoans > 0 ? ((stats.overdueLoans / stats.activeLoans) * 100).toFixed(1) : 0;
        sendJSON(res, {
            ...stats,
            overdueRate: `${overdueRate}%`
        });
    }
};

// --- 2. Circulation Truth (Raw Loans Table) ---
exports.getCirculationData = (req, res) => {
    const { startDate, endDate, branch, category, status } = req.query;

    let query = `
        SELECT 
            b.Borrow_ID,
            u.First_Name, u.Last_Name, u.User_ID,
            CASE 
                WHEN bk.Title IS NOT NULL THEN bk.Title
                WHEN cd.Title IS NOT NULL THEN cd.Title
                WHEN ab.Title IS NOT NULL THEN ab.Title
                WHEN m.Title IS NOT NULL THEN m.Title
                WHEN t.Model_Num IS NOT NULL THEN CONCAT(t.Type, ' - ', t.Model_Num)
                ELSE 'Unknown Item'
            END as Title,
            at.type_name as Category,
            b.Borrow_Date,
            b.Due_Date,
            b.Return_Date,
            CASE 
                WHEN b.Return_Date IS NOT NULL THEN 'Returned'
                WHEN b.Due_Date < CURDATE() THEN 'Overdue'
                ELSE 'Active'
            END as Loan_Status,
            f.Amount_Due as Fine_Amount
        FROM borrow b
        JOIN user u ON b.Borrower_ID = u.User_ID
        JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
        JOIN asset a ON r.Asset_ID = a.Asset_ID
        JOIN asset_type at ON a.Asset_TypeID = at.type_id
        LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
        LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
        LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
        LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
        LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
        LEFT JOIN fine f ON b.Borrow_ID = f.Borrow_ID
        WHERE 1=1
    `;

    const params = [];

    if (startDate) {
        query += " AND b.Borrow_Date >= ?";
        params.push(startDate);
    }
    if (endDate) {
        query += " AND b.Borrow_Date <= ?";
        params.push(endDate);
    }
    if (category) {
        query += " AND at.type_name = ?";
        params.push(category);
    }
    if (status) {
        if (status === 'Active') query += " AND b.Return_Date IS NULL AND b.Due_Date >= CURDATE()";
        else if (status === 'Overdue') query += " AND b.Return_Date IS NULL AND b.Due_Date < CURDATE()";
        else if (status === 'Returned') query += " AND b.Return_Date IS NOT NULL";
    }

    query += " ORDER BY b.Borrow_Date DESC LIMIT 100";

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error in getCirculationData:', err);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};

// --- 3. Overdue & Risk Control ---
exports.getOverdueData = (req, res) => {
    const query = `
        SELECT 
            b.Borrow_ID,
            u.First_Name, u.Last_Name, u.User_Email,
            CASE 
                WHEN bk.Title IS NOT NULL THEN bk.Title
                ELSE 'Item'
            END as Title,
            at.type_name as Category,
            b.Due_Date,
            DATEDIFF(CURDATE(), b.Due_Date) as Days_Overdue,
            COALESCE(f.Amount_Due, 0) as Current_Fine,
            CASE
                WHEN DATEDIFF(CURDATE(), b.Due_Date) BETWEEN 1 AND 7 THEN '1-7 Days'
                WHEN DATEDIFF(CURDATE(), b.Due_Date) BETWEEN 8 AND 30 THEN '8-30 Days'
                WHEN DATEDIFF(CURDATE(), b.Due_Date) BETWEEN 31 AND 90 THEN '31-90 Days'
                ELSE '90+ Days'
            END as Aging_Bucket
        FROM borrow b
        JOIN user u ON b.Borrower_ID = u.User_ID
        JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
        JOIN asset a ON r.Asset_ID = a.Asset_ID
        JOIN asset_type at ON a.Asset_TypeID = at.type_id
        LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
        LEFT JOIN fine f ON b.Borrow_ID = f.Borrow_ID
        WHERE b.Return_Date IS NULL AND b.Due_Date < CURDATE()
        ORDER BY Days_Overdue DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error in getOverdueData:', err);
            return sendJSON(res, { error: 'Database error' }, 500);
        }

        // Calculate buckets
        const buckets = {
            '1-7 Days': 0,
            '8-30 Days': 0,
            '31-90 Days': 0,
            '90+ Days': 0
        };

        results.forEach(row => {
            if (buckets[row.Aging_Bucket] !== undefined) {
                buckets[row.Aging_Bucket]++;
            }
        });

        sendJSON(res, {
            rawTable: results,
            buckets
        });
    });
};

// --- 4. Holds / Waitlist Pressure ---
exports.getHoldsData = (req, res) => {
    const query = `
        SELECT 
            h.Hold_ID,
            u.First_Name, u.Last_Name,
            CASE 
                WHEN bk.Title IS NOT NULL THEN bk.Title
                ELSE 'Item'
            END as Title,
            h.Hold_Date,
            DATEDIFF(CURDATE(), h.Hold_Date) as Wait_Days,
            '1' as Queue_Position, -- Placeholder as queue logic is complex
            h.Hold_Expires
        FROM hold h
        JOIN user u ON h.Holder_ID = u.User_ID
        JOIN rentable r ON h.Rentable_ID = r.Rentable_ID
        JOIN asset a ON r.Asset_ID = a.Asset_ID
        LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
        WHERE h.Canceled_At IS NULL AND h.Fulfilling_Borrow_ID IS NULL
        ORDER BY h.Hold_Date ASC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error in getHoldsData:', err);
            return sendJSON(res, { error: 'Database error' }, 500);
        }

        const avgWaitTime = results.length > 0
            ? (results.reduce((acc, curr) => acc + curr.Wait_Days, 0) / results.length).toFixed(1)
            : 0;

        sendJSON(res, {
            rawTable: results,
            metrics: {
                totalHolds: results.length,
                avgWaitTime: `${avgWaitTime} Days`
            }
        });
    });
};

// --- 5. Inventory & Collection Health ---
exports.getInventoryHealth = (req, res) => {
    const query = `
        SELECT 
            a.Asset_ID,
            at.type_name as Type,
            CASE 
                WHEN bk.Title IS NOT NULL THEN bk.Title
                WHEN cd.Title IS NOT NULL THEN cd.Title
                ELSE 'Unknown'
            END as Title,
            (SELECT COUNT(*) FROM rentable WHERE Asset_ID = a.Asset_ID) as Total_Copies,
            (SELECT COUNT(*) FROM rentable WHERE Asset_ID = a.Asset_ID AND Availability = 1) as Available_Copies,
            (SELECT COUNT(*) FROM borrow b JOIN rentable r ON b.Rentable_ID = r.Rentable_ID WHERE r.Asset_ID = a.Asset_ID) as Lifetime_Borrows
        FROM asset a
        JOIN asset_type at ON a.Asset_TypeID = at.type_id
        LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
        LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
        LIMIT 100
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error in getInventoryHealth:', err);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};

// --- 6. Financial Picture ---
exports.getFinancialData = (req, res) => {
    const query = `
        SELECT 
            f.Fine_ID,
            u.First_Name, u.Last_Name,
            f.Original_Amount as Amount_Due,
            f.Paid,
            f.Fine_Date,
            CASE 
                WHEN f.Payment_Status = 'Paid' THEN 'Collected'
                ELSE f.Payment_Status
            END as Status
        FROM fine f
        JOIN borrow b ON f.Borrow_ID = b.Borrow_ID
        JOIN user u ON b.Borrower_ID = u.User_ID
        ORDER BY f.Fine_Date DESC
        LIMIT 100
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error in getFinancialData:', err);
            return sendJSON(res, { error: 'Database error' }, 500);
        }
        sendJSON(res, results);
    });
};

// --- 7. User & Staff Oversight ---
exports.getUserStaffData = (req, res) => {
    const studentQuery = `
        SELECT 
            COUNT(*) as Total_Students,
            SUM(CASE WHEN created_at > NOW() - INTERVAL 30 DAY THEN 1 ELSE 0 END) as New_Registrations,
            SUM(CASE WHEN Is_Blocked = 1 AND Is_Deleted = 0 THEN 1 ELSE 0 END) as Blocked_Users,
            SUM(CASE WHEN Is_Deleted = 1 THEN 1 ELSE 0 END) as Deleted_Users
        FROM user WHERE Role = 1
    `;

    const staffQuery = `
        SELECT 
            u.First_Name, u.Last_Name,
            COUNT(b.Borrow_ID) as Transactions_Handled
        FROM user u
        LEFT JOIN borrow b ON u.User_ID = b.Processed_By
        WHERE u.Role IN (2, 3) -- Admin and Librarian
        GROUP BY u.User_ID
    `;

    db.query(studentQuery, (err, studentResults) => {
        if (err) return sendJSON(res, { error: 'Database error' }, 500);

        db.query(staffQuery, (err2, staffResults) => {
            if (err2) return sendJSON(res, { error: 'Database error' }, 500);

            sendJSON(res, {
                students: studentResults[0],
                staff: staffResults
            });
        });
    });
};

// --- 8. Policy Impact ---
exports.getPolicyImpact = (req, res) => {
    // Mock data for policy changes as we don't have a dedicated table yet
    const changes = [
        { Date: '2025-11-01', Setting: 'Fine Rate', Old: '$0.50', New: '$0.75', Changed_By: 'Admin' },
        { Date: '2025-10-15', Setting: 'Max Loans', Old: '5', New: '10', Changed_By: 'Admin' }
    ];
    sendJSON(res, changes);
};

// --- 9. Audit & Security ---
exports.getSecurityReport = (req, res) => {
    const query = `
        SELECT Log_ID, User_ID, Action, CAST(Details AS CHAR) as Details, Timestamp, IP_Address
        FROM system_logs
        ORDER BY Timestamp DESC LIMIT 100
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching security report:', err);
            return sendJSON(res, []);
        }
        sendJSON(res, results);
    });
};
