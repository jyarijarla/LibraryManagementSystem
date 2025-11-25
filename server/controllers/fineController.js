const db = require('../db');
const { getConfigValue } = require('./configController');

/**
 * Fine Management Controller
 * 
 * Features:
 * - Database-driven fine tracking (uses `fine` table)
 * - Automatic synchronization with borrow records
 * - Payment processing and recording
 * - Fine status tracking (Unpaid, Paid, Waived)
 */

/**
 * Helper to send JSON response
 */
const sendJSON = (res, statusCode, data) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

/**
 * Get the current fine configuration from database
 */
const getFineConfig = async () => {
  try {
    const [rate, maxDays] = await Promise.all([
      getConfigValue('FINE_RATE_PER_DAY'),
      getConfigValue('FINE_MAX_DAYS')
    ]);
    return {
      rate: parseFloat(rate || 1.00),
      maxDays: parseInt(maxDays || 30)
    };
  } catch (error) {
    console.warn('Failed to fetch fine config, using defaults', error.message);
    return { rate: 1.00, maxDays: 30 };
  }
};

/**
 * Synchronize fines for all overdue items
 * This ensures the `fine` table is up-to-date with daily accruals
 */
const syncFines = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      const { rate: fineRate, maxDays } = await getFineConfig();

      // Get all potentially finable records
      const query = `
        SELECT 
          b.Borrow_ID, 
          b.Borrower_ID, 
          b.Due_Date, 
          b.Return_Date,
          b.Fee_Incurred,
          f.Fine_ID,
          f.Amount_Due,
          f.Paid,
          f.Fine_Date
        FROM borrow b
        LEFT JOIN fine f ON b.Borrow_ID = f.Borrow_ID
        WHERE 
          (b.Return_Date IS NULL AND b.Due_Date < CURDATE()) OR
          (b.Return_Date IS NOT NULL AND b.Return_Date > b.Due_Date)
      `;

      db.query(query, async (err, results) => {
        if (err) return reject(err);

        const updates = [];
        const inserts = [];

        for (const record of results) {
          const dueDate = new Date(record.Due_Date);
          const returnDate = record.Return_Date ? new Date(record.Return_Date) : new Date();

          // Calculate days overdue
          const diffTime = Math.abs(returnDate - dueDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Calculate total fine amount
          const daysToCharge = Math.min(diffDays, maxDays);
          const totalFine = (daysToCharge * fineRate);

          let amountDue = totalFine;
          let isPaid = 0;

          if (record.Fine_ID) {
            // Existing fine record
            // If item is NOT returned, fine might have increased
            if (!record.Return_Date) {
              const today = new Date().toISOString().slice(0, 10);
              const fineDate = record.Fine_Date ? new Date(record.Fine_Date).toISOString().slice(0, 10) : null;

              if (fineDate !== today && !record.Paid) {
                const lastSync = new Date(record.Fine_Date);
                const now = new Date();
                const daysSinceSync = Math.floor((now - lastSync) / (1000 * 60 * 60 * 24));

                if (daysSinceSync > 0) {
                  if (diffDays <= maxDays) {
                    const additionalFine = daysSinceSync * fineRate;
                    updates.push([record.Amount_Due + additionalFine, record.Fine_ID]);
                  }
                }
              }
            }
          } else {
            // New fine to insert
            inserts.push([record.Borrow_ID, record.Borrower_ID, amountDue, isPaid]);
          }
        }

        if (inserts.length > 0) {
          const values = inserts.map(row => `(${row.join(',')}, CURDATE())`).join(',');
          db.query(`INSERT INTO fine (Borrow_ID, User_ID, Amount_Due, Paid, Fine_Date) VALUES ${values}`, (err) => {
            if (err) console.error('Error inserting synced fines:', err);
          });
        }

        if (updates.length > 0) {
          updates.forEach(update => {
            db.query('UPDATE fine SET Amount_Due = ?, Fine_Date = CURDATE() WHERE Fine_ID = ?', update);
          });
        }

        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Get all fines
 */
exports.getAllFines = async (req, res) => {
  const { status, userId, severity } = req.query;

  try {
    await syncFines();

    let query = `
      SELECT 
        f.Fine_ID,
        f.Amount_Due,
        f.Paid,
        f.Fine_Date,
        b.Borrow_ID,
        b.Borrow_Date,
        b.Due_Date,
        b.Return_Date,
        DATEDIFF(IFNULL(b.Return_Date, CURDATE()), b.Due_Date) as Days_Overdue,
        u.User_ID,
        CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) as Borrower_Name,
        u.User_Email,
        COALESCE(bk.Title, cd.Title, ab.Title, m.Title, 
          CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Item_Title,
        CASE 
          WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
          WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
          WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
          WHEN m.Asset_ID IS NOT NULL THEN 'Movie'
          WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
          WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
          ELSE 'Unknown'
        END as Asset_Type
      FROM fine f
      JOIN borrow b ON f.Borrow_ID = b.Borrow_ID
      JOIN user u ON f.User_ID = u.User_ID
      JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
      LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
      LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
      LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
      LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
      LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
      LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
      LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
      WHERE 1=1
    `;

    const params = [];

    if (status === 'unpaid') {
      query += ` AND f.Paid = 0 AND f.Amount_Due > 0`;
    } else if (status === 'paid') {
      query += ` AND f.Paid = 1`;
    }

    if (userId) {
      query += ` AND f.User_ID = ?`;
      params.push(userId);
    }

    if (severity) {
      const severityMap = { 'critical': 30, 'urgent': 14, 'warning': 7, 'low': 1 };
      const days = severityMap[severity.toLowerCase()];
      if (days) {
        query += ` AND DATEDIFF(IFNULL(b.Return_Date, CURDATE()), b.Due_Date) >= ?`;
        params.push(days);
      }
    }

    query += ` ORDER BY f.Amount_Due DESC`;

    db.query(query, params, (err, results) => {
      if (err) throw err;

      // Map results to match expected frontend format
      const mappedResults = results.map(row => ({
        ...row,
        Fine_Amount: row.Amount_Due, // Frontend expects Fine_Amount
        Fine_Status: row.Paid ? 'Paid' : 'Unpaid',
        Severity: row.Days_Overdue > 30 ? 'Critical' :
          row.Days_Overdue > 14 ? 'Urgent' :
            row.Days_Overdue > 7 ? 'Warning' : 'Low'
      }));

      sendJSON(res, 200, mappedResults);
    });

  } catch (err) {
    console.error('Error getting fines:', err);
    sendJSON(res, 500, { message: 'Failed to fetch fines' });
  }
};

/**
 * Get fine details by ID
 */
exports.getFineById = async (req, res) => {
  const { borrowId } = req.params; // Note: Route uses borrowId, but we might want fineId

  // For backward compatibility, we look up by Borrow_ID
  const query = `
    SELECT 
      f.Fine_ID,
      f.Amount_Due,
      f.Paid,
      b.*,
      u.First_Name, u.Last_Name, u.User_Email, u.User_Phone, u.Balance as User_Balance,
      COALESCE(bk.Title, cd.Title, ab.Title, m.Title, 
        CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Item_Title,
      CASE 
          WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
          WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
          WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
          WHEN m.Asset_ID IS NOT NULL THEN 'Movie'
          WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
          WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
          ELSE 'Unknown'
      END as Asset_Type
    FROM fine f
    JOIN borrow b ON f.Borrow_ID = b.Borrow_ID
    JOIN user u ON f.User_ID = u.User_ID
    JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
    LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
    LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    WHERE f.Borrow_ID = ?
  `;

  db.query(query, [borrowId], (err, results) => {
    if (err) {
      console.error(err);
      return sendJSON(res, 500, { message: 'Error fetching fine details' });
    }
    if (!results.length) return sendJSON(res, 404, { message: 'Fine not found' });

    const row = results[0];
    sendJSON(res, 200, {
      ...row,
      Fine_Amount: row.Amount_Due,
      Calculated_Fine: row.Amount_Due, // For compatibility
      Days_Overdue: Math.ceil((new Date() - new Date(row.Due_Date)) / (1000 * 60 * 60 * 24))
    });
  });
};

/**
 * Process Fine Payment
 */
exports.processFinePayment = (req, res) => {
  const borrowId = req.params.id;
  const { amount, paymentMethod, processedBy } = req.body;

  if (!amount || amount <= 0) {
    return sendJSON(res, 400, { message: 'Invalid amount' });
  }

  db.getConnection((err, connection) => {
    if (err) return sendJSON(res, 500, { message: 'Database error' });

    connection.beginTransaction(async (err) => {
      if (err) {
        connection.release();
        return sendJSON(res, 500, { message: 'Transaction error' });
      }

      try {
        // Get current fine
        const [fine] = await new Promise((resolve, reject) => {
          connection.query('SELECT * FROM fine WHERE Borrow_ID = ? FOR UPDATE', [borrowId], (err, res) => {
            if (err) reject(err);
            else resolve(res);
          });
        });

        if (!fine) {
          throw new Error('Fine record not found');
        }

        const newAmount = Math.max(0, fine.Amount_Due - amount);
        const isPaid = newAmount === 0 ? 1 : 0;

        // Update fine table
        await new Promise((resolve, reject) => {
          connection.query(
            'UPDATE fine SET Amount_Due = ?, Paid = ? WHERE Fine_ID = ?',
            [newAmount, isPaid, fine.Fine_ID],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Update borrow table for legacy compatibility/audit
        await new Promise((resolve, reject) => {
          connection.query(
            'UPDATE borrow SET Fee_Incurred = ?, Processed_By = ? WHERE Borrow_ID = ?',
            [newAmount, processedBy, borrowId], // Note: Fee_Incurred meaning changes to "Balance" here
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        connection.commit((err) => {
          if (err) throw err;
          connection.release();
          sendJSON(res, 200, {
            message: 'Payment processed',
            newBalance: newAmount,
            paidFull: isPaid === 1
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          sendJSON(res, 500, { message: error.message });
        });
      }
    });
  });
};

/**
 * Waive Fine
 */
exports.waiveFine = (req, res) => {
  const borrowId = req.params.id;

  db.query(
    'UPDATE fine SET Amount_Due = 0, Paid = 1 WHERE Borrow_ID = ?',
    [borrowId],
    (err, result) => {
      if (err) return sendJSON(res, 500, { message: 'Error waiving fine' });
      if (result.affectedRows === 0) return sendJSON(res, 404, { message: 'Fine not found' });

      // Also update borrow table
      db.query('UPDATE borrow SET Fee_Incurred = 0 WHERE Borrow_ID = ?', [borrowId]);

      sendJSON(res, 200, { message: 'Fine waived successfully' });
    }
  );
};

/**
 * Get Fine Stats
 */
exports.getFineStats = async (req, res) => {
  try {
    await syncFines();

    const { rate: fineRate, maxDays } = await getFineConfig();

    const query = `
      SELECT 
        COUNT(CASE WHEN f.Paid = 0 THEN 1 END) as total_overdue_items,
        COUNT(DISTINCT CASE WHEN f.Paid = 0 THEN f.User_ID END) as users_with_overdue,
        SUM(CASE WHEN f.Paid = 0 THEN f.Amount_Due ELSE 0 END) as total_unpaid_fines,
        
        SUM(
          GREATEST(0,
            CASE 
              WHEN b.Return_Date IS NOT NULL THEN 
                (LEAST(DATEDIFF(b.Return_Date, b.Due_Date), ?) * ?) - f.Amount_Due
              ELSE 
                (LEAST(DATEDIFF(CURDATE(), b.Due_Date), ?) * ?) - f.Amount_Due
            END
          )
        ) as total_collected_fines,

        COUNT(CASE WHEN f.Paid = 0 AND DATEDIFF(CURDATE(), b.Due_Date) <= 7 THEN 1 END) as warning_overdues,
        COUNT(CASE WHEN f.Paid = 0 AND DATEDIFF(CURDATE(), b.Due_Date) BETWEEN 8 AND 30 THEN 1 END) as urgent_overdues,
        COUNT(CASE WHEN f.Paid = 0 AND DATEDIFF(CURDATE(), b.Due_Date) > 30 THEN 1 END) as critical_overdues,

        AVG(CASE WHEN f.Paid = 0 THEN DATEDIFF(CURDATE(), b.Due_Date) END) as avg_days_overdue
      FROM fine f
      JOIN borrow b ON f.Borrow_ID = b.Borrow_ID
    `;

    db.query(query, [maxDays, fineRate, maxDays, fineRate], (err, results) => {
      if (err) throw err;
      const stats = results[0];

      sendJSON(res, 200, {
        totalOverdueItems: stats.total_overdue_items || 0,
        usersWithOverdue: stats.users_with_overdue || 0,
        totalUnpaidFines: stats.total_unpaid_fines || 0,
        totalCollectedFines: parseFloat(stats.total_collected_fines || 0).toFixed(2),
        criticalOverdues: stats.critical_overdues || 0,
        urgentOverdues: stats.urgent_overdues || 0,
        warningOverdues: stats.warning_overdues || 0,
        avgDaysOverdue: Math.round(stats.avg_days_overdue || 0)
      });
    });
  } catch (err) {
    sendJSON(res, 500, { message: 'Error fetching stats' });
  }
};

/**
 * Get User Fines
 */
exports.getUserFines = async (req, res) => {
  const { userId } = req.params;

  try {
    await syncFines();

    const query = `
      SELECT 
        f.*,
        b.Borrow_Date, b.Due_Date, b.Return_Date,
        COALESCE(bk.Title, cd.Title, ab.Title, m.Title, 
          CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Item_Title,
        CASE 
          WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
          WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
          WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
          WHEN m.Asset_ID IS NOT NULL THEN 'Movie'
          WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
          WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
          ELSE 'Unknown'
        END as Asset_Type
      FROM fine f
      JOIN borrow b ON f.Borrow_ID = b.Borrow_ID
      JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
      LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
      LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
      LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
      LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
      LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
      LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
      LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
      WHERE f.User_ID = ?
    `;

    db.query(query, [userId], (err, results) => {
      if (err) throw err;

      const mapped = results.map(row => ({
        ...row,
        Fine_Amount: row.Amount_Due,
        Status: row.Paid ? 'Paid' : 'Unpaid',
        Days_Overdue: Math.ceil((new Date() - new Date(row.Due_Date)) / (1000 * 60 * 60 * 24))
      }));

      sendJSON(res, 200, mapped);
    });
  } catch (err) {
    sendJSON(res, 500, { message: 'Error fetching user fines' });
  }
};
exports.getBorrowerFines = async (req, res) => {
  const userID = req.user.id;
  try {
    db.promise().query(
      `SELECT * FROM fine
      WHERE User_ID = ?`, [userID]
    )
    console.log("Fines fetched successfuly")
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(historyResult))
  } catch (error) {
    console.error('Fines fetching data:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'Database error', error: error.message }));
  }
}

exports.payFineOnline = exports.processFinePayment; // Reuse logic for now
module.exports = exports;
