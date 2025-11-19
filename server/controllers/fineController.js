const db = require('../db');
const { getConfigValue } = require('./configController');

/**
 * Fine Management Controller
 * 
 * Features:
 * - Automatic fine calculation for overdue items (rate from database)
 * - Manual fine adjustments by librarian
 * - Payment processing and recording
 * - Fine status tracking (Unpaid, Paid, Waived, Partial)
 * - Fine history and reports
 */

/**
 * Get the current fine configuration from database
 * Falls back to defaults if configuration is not available
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
 * Calculate fine amount based on due date
 * @param {Date} dueDate - The due date of the borrowed item
 * @param {number} fineRate - Fine rate per day (optional)
 * @param {number} maxDays - Max days to charge (optional)
 * @returns {Promise<number>} - Fine amount in dollars
 */
const calculateFineAmount = async (dueDate, fineRate = null, maxDays = null) => {
  const today = new Date();
  const due = new Date(dueDate);

  // Only calculate fine if overdue
  if (today <= due) return 0;

  // Get config if not provided
  if (fineRate === null || maxDays === null) {
    const config = await getFineConfig();
    fineRate = config.rate;
    maxDays = config.maxDays;
  }

  // Calculate days overdue, capped at maxDays
  const daysOverdue = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  return Math.min(daysOverdue, maxDays) * fineRate;
};

/**
 * Get all fines with optional filters
 * GET /api/fines?status=unpaid&userId=5&severity=critical
 */
exports.getAllFines = async (req, res) => {
  const { status, userId, severity, fromDate, toDate } = req.query;

  // Get fine rate and max days from config
  const { rate: fineRate, maxDays } = await getFineConfig();

  let query = `
    SELECT 
      b.Borrow_ID,
      b.Borrower_ID as User_ID,
      CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) as Borrower_Name,
      u.User_Email,
      u.User_Phone,
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
      END as Asset_Type,
      b.Borrow_Date,
      b.Due_Date,
      b.Return_Date,
      DATEDIFF(CURDATE(), b.Due_Date) as Days_Overdue,
      COALESCE(b.Fee_Incurred, 
        CASE 
          WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() 
          THEN LEAST(DATEDIFF(CURDATE(), b.Due_Date), ?) * ?
          WHEN b.Return_Date IS NOT NULL AND b.Return_Date > b.Due_Date
          THEN LEAST(DATEDIFF(b.Return_Date, b.Due_Date), ?) * ?
          ELSE 0 
        END
      ) as Fine_Amount,
      CASE 
        WHEN b.Fee_Incurred IS NULL AND b.Return_Date IS NULL AND b.Due_Date < CURDATE() THEN 'Unpaid'
        WHEN b.Fee_Incurred = 0 THEN 'Paid'
        WHEN b.Fee_Incurred > 0 AND b.Return_Date IS NOT NULL THEN 'Unpaid'
        ELSE 'Unpaid'
      END as Fine_Status,
      CASE 
        WHEN DATEDIFF(CURDATE(), b.Due_Date) > 30 THEN 'Critical'
        WHEN DATEDIFF(CURDATE(), b.Due_Date) > 14 THEN 'Urgent'
        WHEN DATEDIFF(CURDATE(), b.Due_Date) > 7 THEN 'Warning'
        WHEN DATEDIFF(CURDATE(), b.Due_Date) > 0 THEN 'Low'
        ELSE 'None'
      END as Severity,
      b.Processed_By
    FROM borrow b
    JOIN user u ON b.Borrower_ID = u.User_ID
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

  // Add fine rate and max days parameters
  const params = [maxDays, fineRate, maxDays, fineRate];

  // Filter by status
  if (status === 'unpaid') {
    query += ` AND (
      (b.Return_Date IS NULL AND b.Due_Date < CURDATE() AND (LEAST(DATEDIFF(CURDATE(), b.Due_Date), ?) * ?) > COALESCE(b.Fee_Incurred, 0)) OR
      (b.Return_Date IS NOT NULL AND b.Fee_Incurred > 0)
    )`;
  } else if (status === 'paid') {
    query += ` AND (
      (b.Return_Date IS NOT NULL AND b.Fee_Incurred = 0 AND b.Return_Date > b.Due_Date) OR
      (b.Return_Date IS NULL AND b.Due_Date < CURDATE() AND (LEAST(DATEDIFF(CURDATE(), b.Due_Date), ?) * ?) <= COALESCE(b.Fee_Incurred, 0))
    )`;
    // Add params for unpaid/paid calculation
    params.push(maxDays, fineRate);
  } else if (status === 'overdue') {
    query += ` AND b.Return_Date IS NULL AND b.Due_Date < CURDATE()`;
  }

  // Filter by user
  if (userId) {
    query += ` AND b.Borrower_ID = ?`;
    params.push(userId);
  }

  // Filter by severity
  if (severity) {
    const severityMap = {
      'critical': 30,
      'urgent': 14,
      'warning': 7,
      'low': 1
    };
    const days = severityMap[severity.toLowerCase()];
    if (days) {
      query += ` AND DATEDIFF(CURDATE(), b.Due_Date) >= ?`;
      params.push(days);
    }
  }

  // Filter by date range
  if (fromDate) {
    query += ` AND b.Borrow_Date >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    query += ` AND b.Borrow_Date <= ?`;
    params.push(toDate);
  }

  query += ` 
    HAVING Fine_Amount > 0
    ORDER BY Days_Overdue DESC, Fine_Amount DESC
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching fines:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to fetch fines', error: err.message }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

/**
 * Get fine details for a specific borrow record
 * GET /api/fines/:borrowId
 */
exports.getFineById = async (req, res) => {
  const { borrowId } = req.params;

  // Get fine rate and max days from config
  const { rate: fineRate, maxDays } = await getFineConfig();

  const query = `
    SELECT 
      b.Borrow_ID,
      b.Borrower_ID as User_ID,
      CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) as Borrower_Name,
      u.User_Email,
      u.User_Phone,
      u.Balance as User_Balance,
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
      END as Asset_Type,
      b.Borrow_Date,
      b.Due_Date,
      b.Return_Date,
      DATEDIFF(COALESCE(b.Return_Date, CURDATE()), b.Due_Date) as Days_Overdue,
      b.Fee_Incurred as Paid_Amount,
      CASE 
        WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() 
        THEN LEAST(DATEDIFF(CURDATE(), b.Due_Date), ?) * ?
        WHEN b.Return_Date IS NOT NULL AND b.Return_Date > b.Due_Date
        THEN LEAST(DATEDIFF(b.Return_Date, b.Due_Date), ?) * ?
        ELSE 0 
      END as Calculated_Fine,
      b.Processed_By,
      CONCAT(lib.First_Name, ' ', IFNULL(lib.Last_Name, '')) as Processed_By_Name
    FROM borrow b
    JOIN user u ON b.Borrower_ID = u.User_ID
    JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
    LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
    LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    LEFT JOIN user lib ON b.Processed_By = lib.User_ID
    WHERE b.Borrow_ID = ?
  `;

  db.query(query, [maxDays, fineRate, maxDays, fineRate, borrowId], (err, results) => {
    if (err) {
      console.error('Error fetching fine details:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to fetch fine details', error: err.message }));
    }

    if (results.length === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Borrow record not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results[0]));
  });
};

/**
 * Process fine payment
 * POST /api/fines/:borrowId/pay
 * Body: { amount, paymentMethod, notes, processedBy }
 */
exports.processFinePayment = (req, res) => {
  const borrowId = req.params.id;
  const { amount, paymentMethod = 'Cash', notes, processedBy } = req.body;

  if (!amount || amount <= 0) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Valid payment amount is required' }));
  }

  // Start transaction
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Connection error:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database connection failed' }));
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Transaction failed to start' }));
      }

      // Get current fine details including Return_Date
      connection.query(
        'SELECT Borrower_ID, Fee_Incurred, Return_Date FROM borrow WHERE Borrow_ID = ?',
        [borrowId],
        (err, borrowResults) => {
          if (err || borrowResults.length === 0) {
            return connection.rollback(() => {
              connection.release();
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Borrow record not found' }));
            });
          }

          const currentFee = parseFloat(borrowResults[0].Fee_Incurred || 0);
          const isReturned = borrowResults[0].Return_Date !== null;
          let newFee;

          if (isReturned) {
            // Returned item: Fee_Incurred represents DEBT. Subtract payment.
            newFee = Math.max(0, currentFee - parseFloat(amount));
          } else {
            // Active item: Fee_Incurred represents PAID AMOUNT. Add payment.
            newFee = currentFee + parseFloat(amount);
          }

          // Update borrow record with payment and processor
          connection.query(
            'UPDATE borrow SET Fee_Incurred = ?, Processed_By = ? WHERE Borrow_ID = ?',
            [newFee, processedBy, borrowId],
            (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ message: 'Failed to record payment', error: err.message }));
                });
              }

              // Commit transaction
              connection.commit((err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Failed to commit payment' }));
                  });
                }

                connection.release();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  message: 'Payment processed successfully',
                  borrowId: borrowId,
                  amountPaid: parseFloat(amount),
                  newBalance: newFee,
                  paymentMethod: paymentMethod
                }));
              });
            }
          );
        }
      );
    });
  });
};

/**
 * Waive fine for a borrow record
 * POST /api/fines/:borrowId/waive
 * Body: { reason, processedBy }
 */
exports.waiveFine = (req, res) => {
  const borrowId = req.params.id;
  const { reason, processedBy } = req.body;

  if (!reason || !processedBy) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Reason and processor ID are required' }));
  }

  // Set Fee_Incurred to 0 to mark as waived
  const query = `
    UPDATE borrow 
    SET Fee_Incurred = 0 
    WHERE Borrow_ID = ?
  `;

  db.query(query, [borrowId], (err, result) => {
    if (err) {
      console.error('Error waiving fine:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to waive fine', error: err.message }));
    }

    if (result.affectedRows === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Borrow record not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Fine waived successfully',
      borrowId: borrowId,
      reason: reason,
      processedBy: processedBy
    }));
  });
};

/**
 * Get fine statistics and summary
 * GET /api/fines/stats
 */
exports.getFineStats = (req, res) => {
  // Get fine rate from config
  db.query("SELECT Config_Value FROM system_config WHERE `Config_Key` = 'FINE_RATE_PER_DAY'", (err, configResults) => {
    if (err) {
      console.error('Error fetching fine rate:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Error fetching fine stats' }));
    }

    const fineRate = configResults.length ? parseFloat(configResults[0].Config_Value) : 1.00;

    // Get max days
    db.query("SELECT Config_Value FROM system_config WHERE `Config_Key` = 'FINE_MAX_DAYS'", (err, maxDaysResults) => {
      const maxDays = maxDaysResults.length ? parseInt(maxDaysResults[0].Config_Value) : 30;

      const query = `
      SELECT 
        COUNT(CASE 
          WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() 
          THEN 1 
        END) as total_overdue_items,
        
        COUNT(DISTINCT CASE 
          WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() 
          THEN b.Borrower_ID 
        END) as users_with_overdue,
        
        COALESCE(SUM(CASE 
          WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() 
          THEN (LEAST(DATEDIFF(CURDATE(), b.Due_Date), ?) * ?) - COALESCE(b.Fee_Incurred, 0)
          WHEN b.Return_Date IS NOT NULL AND b.Fee_Incurred > 0 
          THEN b.Fee_Incurred
          ELSE 0 
        END), 0) as total_unpaid_fines,
        
        COALESCE(SUM(CASE 
          WHEN b.Return_Date IS NOT NULL AND b.Return_Date > b.Due_Date
          THEN (LEAST(DATEDIFF(b.Return_Date, b.Due_Date), ?) * ?) - COALESCE(b.Fee_Incurred, 0)
          WHEN b.Return_Date IS NULL AND b.Fee_Incurred > 0
          THEN b.Fee_Incurred
          ELSE 0 
        END), 0) as total_collected_fines,
        
        COUNT(CASE 
          WHEN DATEDIFF(CURDATE(), b.Due_Date) > 30 AND b.Return_Date IS NULL 
          THEN 1 
        END) as critical_overdues,
        
        COUNT(CASE 
          WHEN DATEDIFF(CURDATE(), b.Due_Date) BETWEEN 15 AND 30 AND b.Return_Date IS NULL 
          THEN 1 
        END) as urgent_overdues,
        
        COUNT(CASE 
          WHEN DATEDIFF(CURDATE(), b.Due_Date) BETWEEN 8 AND 14 AND b.Return_Date IS NULL 
          THEN 1 
        END) as warning_overdues,
        
        COALESCE(AVG(CASE 
          WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() 
          THEN DATEDIFF(CURDATE(), b.Due_Date) 
        END), 0) as avg_days_overdue
        
      FROM borrow b
      WHERE b.Due_Date IS NOT NULL
    `;

      db.query(query, [maxDays, fineRate, maxDays, fineRate], (err, results) => {
        if (err) {
          console.error('Error fetching fine stats:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Error fetching fine stats' }));
        }

        const stats = results[0];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          totalOverdueItems: parseInt(stats.total_overdue_items || 0),
          usersWithOverdue: parseInt(stats.users_with_overdue || 0),
          totalUnpaidFines: parseFloat(stats.total_unpaid_fines || 0).toFixed(2),
          totalCollectedFines: parseFloat(stats.total_collected_fines || 0).toFixed(2),
          criticalOverdues: parseInt(stats.critical_overdues || 0),
          urgentOverdues: parseInt(stats.urgent_overdues || 0),
          warningOverdues: parseInt(stats.warning_overdues || 0),
          avgDaysOverdue: parseFloat(stats.avg_days_overdue || 0).toFixed(1),
          fineRatePerDay: fineRate
        }));
      });
    });
  });
};

/**
 * Get user's fine history
 * GET /api/fines/user/:userId
 */
exports.getUserFines = async (req, res) => {
  const { userId } = req.params;

  // Get fine config
  const { rate: fineRate, maxDays } = await getFineConfig();

  const query = `
SELECT
b.Borrow_ID,
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
END as Asset_Type,
  b.Borrow_Date,
  b.Due_Date,
  b.Return_Date,
  CASE 
        WHEN b.Return_Date IS NOT NULL 
        THEN DATEDIFF(b.Return_Date, b.Due_Date)
        ELSE DATEDIFF(CURDATE(), b.Due_Date)
END as Days_Overdue,
  COALESCE(b.Fee_Incurred,
    CASE 
          WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() 
          THEN LEAST(DATEDIFF(CURDATE(), b.Due_Date), ?) * ?
    WHEN b.Return_Date IS NOT NULL AND b.Return_Date > b.Due_Date
          THEN LEAST(DATEDIFF(b.Return_Date, b.Due_Date), ?) * ?
    ELSE 0 
        END
  ) as Fine_Amount,
  CASE 
        WHEN b.Fee_Incurred > 0 AND b.Return_Date IS NOT NULL THEN 'Paid'
        WHEN b.Fee_Incurred = 0 AND b.Return_Date IS NOT NULL THEN 'Waived'
        WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() THEN 'Pending'
        ELSE 'None'
END as Status
    FROM borrow b
    JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
    LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
    LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    WHERE b.Borrower_ID = ?
  AND(
    b.Due_Date < CURDATE() OR 
        b.Fee_Incurred > 0 OR
    (b.Return_Date IS NOT NULL AND b.Return_Date > b.Due_Date)
  )
    ORDER BY b.Due_Date DESC
  `;

  db.query(query, [maxDays, fineRate, maxDays, fineRate, userId], (err, results) => {
    if (err) {
      console.error('Error fetching user fines:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to fetch user fines', error: err.message }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

/**
 * Process online fine payment by student
 * POST /api/fines/:id/pay-online
 */
exports.payFineOnline = (req, res) => {
  const borrowId = req.params.id;
  const userId = req.user.id;
  const { amount, paymentMethod = 'Online' } = req.body;

  // Start transaction
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Connection error:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database connection failed' }));
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Transaction failed to start' }));
      }

      // Verify ownership and get fine details
      connection.query(
        'SELECT Borrower_ID, Fee_Incurred, Return_Date FROM borrow WHERE Borrow_ID = ?',
        [borrowId],
        (err, borrowResults) => {
          if (err || borrowResults.length === 0) {
            return connection.rollback(() => {
              connection.release();
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Borrow record not found' }));
            });
          }

          if (borrowResults[0].Borrower_ID !== userId) {
            return connection.rollback(() => {
              connection.release();
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Unauthorized to pay this fine' }));
            });
          }

          const currentFee = parseFloat(borrowResults[0].Fee_Incurred || 0);
          const isReturned = borrowResults[0].Return_Date !== null;
          let newFee;

          // For online payment, we assume paying the full amount or a specific amount
          // Logic mirrors processFinePayment but simplified for student
          if (isReturned) {
            // Returned item: Fee_Incurred is Debt. Pay it off.
            newFee = Math.max(0, currentFee - parseFloat(amount));
          } else {
            // Active item: Fee_Incurred is Paid Amount. Add to it.
            // Wait, if item is NOT returned, Fee_Incurred usually stores what has been paid? 
            // Let's check getAllFines logic:
            // WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() THEN LEAST(...) * ?
            // So Fee_Incurred is NOT the fine amount for active items. It's likely 0 or previously paid amount?
            // In processFinePayment: "Active item: Fee_Incurred represents PAID AMOUNT. Add payment."
            newFee = currentFee + parseFloat(amount);
          }

          // Update borrow record
          connection.query(
            'UPDATE borrow SET Fee_Incurred = ? WHERE Borrow_ID = ?',
            [newFee, borrowId],
            (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ message: 'Failed to record payment', error: err.message }));
                });
              }

              connection.commit((err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Failed to commit payment' }));
                  });
                }

                connection.release();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  message: 'Payment successful',
                  newBalance: newFee
                }));
              });
            }
          );
        }
      );
    });
  });
};

module.exports = exports;
