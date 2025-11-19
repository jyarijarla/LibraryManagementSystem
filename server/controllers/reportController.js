const db = require('../db');
const { getConfigValue } = require('./configController');

// Report 1: Most Borrowed Assets
const getMostBorrowedAssets = (req, res) => {
  const query = `
    SELECT 
      a.Asset_ID,
      COALESCE(bk.Title, cd.Title, ab.Title, mv.Title, 'Unknown') AS Title,
      CASE
        WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
        WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
        WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
        WHEN mv.Asset_ID IS NOT NULL THEN 'Movie'
        ELSE 'Other'
      END AS Type,
      COUNT(b.Borrow_ID) AS Total_Borrows,
      COUNT(DISTINCT r.Rentable_ID) AS Total_Copies,
      SUM(CASE WHEN r.Availability = 1 THEN 1 ELSE 0 END) AS Available_Copies
    FROM asset a
    LEFT JOIN rentable r ON a.Asset_ID = r.Asset_ID
    LEFT JOIN borrow b ON r.Rentable_ID = b.Rentable_ID
    LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
    LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN movie mv ON a.Asset_ID = mv.Asset_ID
    WHERE bk.Asset_ID IS NOT NULL OR cd.Asset_ID IS NOT NULL OR ab.Asset_ID IS NOT NULL OR mv.Asset_ID IS NOT NULL
    GROUP BY a.Asset_ID, Title, Type
    HAVING COUNT(b.Borrow_ID) > 0
    ORDER BY Total_Borrows DESC
    LIMIT 10
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching most borrowed assets:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to fetch most borrowed assets', details: err.message }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  });
};

// Report 2: Active Borrowers
const getActiveBorrowers = (req, res) => {
  // Fixed query to use Role instead of User_RoleID
  const query = `
    SELECT 
      u.User_ID,
      CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) AS Full_Name,
      u.User_Email,
      COUNT(CASE WHEN br.Return_Date IS NULL THEN 1 END) AS Currently_Borrowed,
      COUNT(br.Borrow_ID) AS Total_Borrows_All_Time,
      SUM(CASE 
        WHEN br.Return_Date IS NULL AND br.Due_Date < CURDATE() 
        THEN DATEDIFF(CURDATE(), br.Due_Date) 
        ELSE 0 
      END) AS Total_Days_Overdue,
      COALESCE(u.Balance, 0) AS Account_Balance
    FROM user u
    LEFT JOIN borrow br ON u.User_ID = br.Borrower_ID
    WHERE u.Role = 1
    GROUP BY u.User_ID, u.First_Name, u.Last_Name, u.User_Email, u.Balance
    HAVING COUNT(br.Borrow_ID) > 0
    ORDER BY Currently_Borrowed DESC, Total_Borrows_All_Time DESC
    LIMIT 20
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching active borrowers:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to fetch active borrowers', details: err.message }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  });
};

// Report 3: Overdue Items
const getOverdueItems = async (req, res) => {
  try {
    // Get fine rate from database config
    const fineRate = await getConfigValue('FINE_RATE_PER_DAY');

    const query = `
      SELECT 
        br.Borrow_ID,
        CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) AS Borrower_Name,
        u.User_Email,
        u.User_Phone,
        br.Rentable_ID AS Asset_ID,
        COALESCE(b.Title, 'Unknown Item') AS Title,
        'Book' AS Type,
        br.Borrow_Date,
        br.Due_Date,
        DATEDIFF(CURDATE(), br.Due_Date) AS Days_Overdue,
        CASE 
          WHEN DATEDIFF(CURDATE(), br.Due_Date) <= 7 THEN 'Warning'
          WHEN DATEDIFF(CURDATE(), br.Due_Date) <= 14 THEN 'Urgent'
          ELSE 'Critical'
        END AS Severity,
        COALESCE(br.Fee_Incurred, ROUND(LEAST(DATEDIFF(CURDATE(), br.Due_Date), 30) * ?, 2)) AS Estimated_Late_Fee
      FROM borrow br
      INNER JOIN user u ON br.Borrower_ID = u.User_ID
      LEFT JOIN rentable r ON br.Rentable_ID = r.Rentable_ID
      LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
      LEFT JOIN book b ON a.Asset_ID = b.Asset_ID
      WHERE br.Return_Date IS NULL 
      AND br.Due_Date < CURDATE()
      ORDER BY Days_Overdue DESC
    `;

    db.query(query, [fineRate], (err, results) => {
      if (err) {
        console.error('Error fetching overdue items:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to fetch overdue items', details: err.message }));
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('Error in getOverdueItems:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to fetch overdue items', details: error.message }));
  }
};

// Bonus Report: Inventory Summary
const getInventorySummary = (req, res) => {
  // Simplified query for current database schema - only checking books
  const query = `
    SELECT 
      'Book' AS Asset_Type,
      COUNT(DISTINCT r.Rentable_ID) AS Unique_Items,
      SUM(r.Num_Copies) AS Total_Copies,
      SUM(r.Num_Available) AS Total_Available,
      SUM(r.Num_Copies - r.Num_Available) AS Currently_Borrowed,
      ROUND((SUM(r.Num_Copies - r.Num_Available) / NULLIF(SUM(r.Num_Copies), 0)) * 100, 2) AS Utilization_Percentage
    FROM rentable r
    LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book b ON a.Asset_ID = b.Asset_ID
    WHERE b.Asset_ID IS NOT NULL
    ORDER BY Total_Copies DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching inventory summary:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to fetch inventory summary', details: err.message }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  });
};

// Librarian Personal Report: Summary Statistics
const getLibrarianSummary = async (req, res) => {
  const librarianId = req.params.id;
  const { from, to } = req.query;

  try {
    // Get fine rate from database config
    let fineRate = 1.00;
    try {
      fineRate = await getConfigValue('FINE_RATE_PER_DAY');
    } catch (e) {
      console.warn('Failed to fetch fine rate, using default 1.00');
    }

    /**
     * We report issued/returned/renewed within the selected window, broken down by asset type.
     * Processed_By is optional; include rows with matching librarian or NULL (legacy data).
     * For unpaid fines, we show ALL current unpaid fines (system-wide, not filtered by librarian) since they are a current liability.
     */
    const query = `
      SELECT 
        COUNT(CASE WHEN br.Borrow_Date BETWEEN ? AND ? THEN 1 END) AS assets_issued_total,
        COUNT(CASE WHEN br.Return_Date BETWEEN ? AND ? THEN 1 END) AS assets_returned_total,
        COUNT(CASE WHEN br.Renew_Date BETWEEN ? AND ? THEN 1 END) AS renewals,
        COALESCE(SUM(CASE 
          WHEN br.Return_Date BETWEEN ? AND ? AND br.Return_Date > br.Due_Date
          THEN (LEAST(DATEDIFF(br.Return_Date, br.Due_Date), 30) * ?) - COALESCE(br.Fee_Incurred, 0)
          ELSE 0 
        END), 0) AS fines_collected,
        (SELECT COALESCE(SUM(CASE 
          WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() 
          THEN (LEAST(DATEDIFF(CURDATE(), b.Due_Date), 30) * ?) - COALESCE(b.Fee_Incurred, 0)
          WHEN b.Return_Date IS NOT NULL AND b.Fee_Incurred > 0 
          THEN b.Fee_Incurred
          ELSE 0 
        END), 0)
         FROM borrow b
         WHERE (b.Processed_By = ? OR b.Processed_By IS NULL)) AS fines_unpaid,
        (SELECT COUNT(*) 
         FROM borrow b3 
         WHERE b3.Return_Date IS NULL 
         AND b3.Due_Date < CURDATE()
         AND (b3.Processed_By = ? OR b3.Processed_By IS NULL)) AS overdue_books,
        (SELECT COUNT(*) 
         FROM borrow b2 
         WHERE b2.Return_Date IS NULL 
         AND b2.Borrow_Date <= ?
         AND (b2.Processed_By = ? OR b2.Processed_By IS NULL)) AS active_loans,
        COUNT(CASE WHEN br.Borrow_Date BETWEEN ? AND ? AND bk.Asset_ID IS NOT NULL THEN 1 END) AS books_issued,
        COUNT(CASE WHEN br.Borrow_Date BETWEEN ? AND ? AND cd.Asset_ID IS NOT NULL THEN 1 END) AS cds_issued,
        COUNT(CASE WHEN br.Borrow_Date BETWEEN ? AND ? AND ab.Asset_ID IS NOT NULL THEN 1 END) AS audiobooks_issued,
        COUNT(CASE WHEN br.Borrow_Date BETWEEN ? AND ? AND mv.Asset_ID IS NOT NULL THEN 1 END) AS movies_issued,
        COUNT(CASE WHEN br.Borrow_Date BETWEEN ? AND ? AND t.Asset_ID IS NOT NULL THEN 1 END) AS technology_issued,
        COUNT(CASE WHEN br.Borrow_Date BETWEEN ? AND ? AND sr.Asset_ID IS NOT NULL THEN 1 END) AS study_rooms_issued
      FROM borrow br
      JOIN rentable r ON br.Rentable_ID = r.Rentable_ID
      LEFT JOIN book bk ON r.Asset_ID = bk.Asset_ID
      LEFT JOIN cd ON r.Asset_ID = cd.Asset_ID
      LEFT JOIN audiobook ab ON r.Asset_ID = ab.Asset_ID
      LEFT JOIN movie mv ON r.Asset_ID = mv.Asset_ID
      LEFT JOIN technology t ON r.Asset_ID = t.Asset_ID
      LEFT JOIN study_room sr ON r.Asset_ID = sr.Asset_ID
      WHERE (br.Processed_By = ? OR br.Processed_By IS NULL)
        AND (
          (br.Borrow_Date BETWEEN ? AND ?)
          OR (br.Return_Date BETWEEN ? AND ?)
          OR (br.Renew_Date BETWEEN ? AND ?)
        )
    `;

    db.query(
      query,
      [
        from, to,               // issued window
        from, to,               // returned window
        from, to,               // renewals window
        from, to, fineRate,     // fines collected window + rate
        fineRate, librarianId,  // fines_unpaid subquery rate + librarian
        librarianId,            // overdue_books subquery librarian
        to, librarianId,        // active_loans subquery + librarian
        from, to,               // books issued window
        from, to,               // cds issued
        from, to,               // audiobooks issued
        from, to,               // movies issued
        from, to,               // technology issued
        from, to,               // study rooms issued
        librarianId,            // WHERE clause librarian filter
        from, to,               // filter window for WHERE clause
        from, to,
        from, to
      ],
      (err, results) => {
        if (err) {
          console.error('Error fetching librarian summary:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to fetch summary', details: err.message }));
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(results[0] || {}));
      }
    );
  } catch (error) {
    console.error('Error in getLibrarianSummary:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to fetch summary', details: error.message }));
  }
};

// Librarian Personal Report: Detailed Transactions
const getLibrarianTransactions = async (req, res) => {
  const librarianId = req.params.id;
  const {
    from,
    to,
    actions,
    fineStatuses,
    memberNames,
    assetTitles,
    assetTypes,
    fineStatus,
    status,
    staffId,
    fineMin,
    fineMax,
    overdueBucket,
    roomId,
    roomStartTime,
    roomEndTime
  } = req.query;

  try {
    // Get fine rate from database config
    const fineRate = await getConfigValue('FINE_RATE_PER_DAY');

    // Parse comma-separated arrays
    const actionArray = actions ? actions.split(',').filter(a => a) : [];
    const fineStatusArray = fineStatuses ? fineStatuses.split(',').filter(f => f) : [];
    const memberNameArray = memberNames ? memberNames.split(',').filter(m => m) : [];
    const assetTitleArray = assetTitles ? assetTitles.split(',').filter(t => t) : [];
    const assetTypeArray = assetTypes ? assetTypes.split(',').filter(t => t) : [];
    const statusArray = status ? status.split(',').filter(s => s) : [];

    // Filter by librarian who processed the transaction (or show all if no data yet)
    // If staffId is provided, filter by that specific staff member
    // Otherwise, if librarianId is provided in params, use that (legacy behavior or default view)
    // Note: The original query filtered by Processed_By = librarianId OR NULL. 
    // We will modify this to be more flexible.

    let query = `
      SELECT 
        br.Borrow_ID,
        br.Borrow_Date,
        br.Return_Date,
        br.Renew_Date,
        br.Due_Date,
        CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) AS member_name,
        u.User_ID AS member_id,
        COALESCE(u.Student_ID, u.Username) AS member_identifier,
        u.User_Email,
        COALESCE(b.Title, cd.Title, ab.Title, mv.Title, t.Model_Num, sr.Room_Number, 'Unknown') AS book_title,
        a.Asset_ID,
        r.Rentable_ID AS barcode,
        CASE
          WHEN b.Asset_ID IS NOT NULL THEN 'Book'
          WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
          WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
          WHEN mv.Asset_ID IS NOT NULL THEN 'Movie'
          WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
          WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
          ELSE 'Other'
        END AS asset_type,
        CASE 
          WHEN br.Return_Date IS NOT NULL THEN 'Completed'
          WHEN br.Due_Date < CURDATE() AND br.Return_Date IS NULL THEN 'Overdue'
          ELSE 'Active Loan'
        END AS status,
        COALESCE(br.Fee_Incurred, 0) AS Fee_Incurred,
        CASE 
          WHEN br.Return_Date IS NOT NULL AND br.Fee_Incurred > 0 THEN 'Unpaid'
          WHEN br.Return_Date IS NOT NULL AND br.Fee_Incurred = 0 AND DATEDIFF(br.Return_Date, br.Due_Date) > 0 THEN 'Paid'
          WHEN br.Return_Date IS NULL AND br.Due_Date < CURDATE() THEN 'Unpaid'
          ELSE 'None'
        END AS fine_status,
        CASE
          WHEN br.Return_Date IS NOT NULL THEN 'Returned'
          WHEN br.Renew_Date IS NOT NULL THEN 'Renewed'
          ELSE 'Issued'
        END AS action,
        CASE
          WHEN br.Return_Date IS NOT NULL THEN COALESCE(br.Fee_Incurred, 0)
          WHEN br.Due_Date < CURDATE() AND br.Return_Date IS NULL THEN LEAST(DATEDIFF(CURDATE(), br.Due_Date), 30) * ?
          ELSE 0
        END AS Fine_Amount,
        br.Processed_By
      FROM borrow br
      INNER JOIN user u ON br.Borrower_ID = u.User_ID
      LEFT JOIN rentable r ON br.Rentable_ID = r.Rentable_ID
      LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
      LEFT JOIN book b ON a.Asset_ID = b.Asset_ID
      LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
      LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
      LEFT JOIN movie mv ON a.Asset_ID = mv.Asset_ID
      LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
      LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
      WHERE 1=1
    `;

    const params = [fineRate];

    // Staff ID Filter
    if (staffId) {
      query += ` AND br.Processed_By = ?`;
      params.push(staffId);
    } else {
      // Default behavior: filter by current librarian or NULL (legacy)
      query += ` AND (br.Processed_By = ? OR br.Processed_By IS NULL)`;
      params.push(librarianId);
    }

    // Date range filter
    if (from && to) {
      query += ` AND (
      (br.Borrow_Date >= ? AND br.Borrow_Date <= ?) OR
      (br.Return_Date >= ? AND br.Return_Date <= ?) OR
      (br.Renew_Date >= ? AND br.Renew_Date <= ?) OR
      (br.Due_Date >= ? AND br.Due_Date <= ?)
    )`;
      params.push(from, to, from, to, from, to, from, to);
    }

    // Status Filter (Active, Completed, Overdue)
    if (statusArray.length > 0) {
      const statusConditions = [];
      statusArray.forEach(s => {
        if (s.toLowerCase() === 'active') {
          statusConditions.push('(br.Return_Date IS NULL AND (br.Due_Date >= CURDATE() OR br.Due_Date IS NULL))');
        } else if (s.toLowerCase() === 'completed') {
          statusConditions.push('(br.Return_Date IS NOT NULL)');
        } else if (s.toLowerCase() === 'overdue') {
          statusConditions.push('(br.Return_Date IS NULL AND br.Due_Date < CURDATE())');
        }
      });
      if (statusConditions.length > 0) {
        query += ` AND (${statusConditions.join(' OR ')})`;
      }
    }

    // Action type filter - multiple selections
    if (actionArray.length > 0) {
      const actionConditions = [];
      actionArray.forEach(action => {
        if (action === 'issued') {
          actionConditions.push('(br.Return_Date IS NULL AND br.Renew_Date IS NULL)');
        } else if (action === 'returned') {
          actionConditions.push('(br.Return_Date IS NOT NULL)');
        } else if (action === 'renewed') {
          actionConditions.push('(br.Renew_Date IS NOT NULL)');
        } else if (action === 'overdue') {
          actionConditions.push('(br.Due_Date < CURDATE() AND br.Return_Date IS NULL)');
        }
      });
      if (actionConditions.length > 0) {
        query += ` AND (${actionConditions.join(' OR ')})`;
      }
    }

    // Fine status filter - multiple selections
    if (fineStatusArray.length > 0) {
      const fineConditions = [];
      fineStatusArray.forEach(status => {
        if (status === 'paid') {
          fineConditions.push('(br.Return_Date IS NOT NULL AND br.Fee_Incurred = 0 AND DATEDIFF(br.Return_Date, br.Due_Date) > 0)');
        } else if (status === 'unpaid') {
          fineConditions.push('((br.Return_Date IS NOT NULL AND br.Fee_Incurred > 0) OR (br.Return_Date IS NULL AND br.Due_Date < CURDATE()))');
        }
      });
      if (fineConditions.length > 0) {
        query += ` AND (${fineConditions.join(' OR ')})`;
      }
    }

    // Fine status filter - paid or unpaid (legacy single select)
    if (fineStatus) {
      if (fineStatus === 'paid') {
        query += ` AND br.Return_Date IS NOT NULL AND br.Fee_Incurred = 0 AND DATEDIFF(br.Return_Date, br.Due_Date) > 0`;
      } else if (fineStatus === 'unpaid') {
        query += ` AND ((br.Return_Date IS NOT NULL AND br.Fee_Incurred > 0) OR (br.Return_Date IS NULL AND br.Due_Date < CURDATE()))`;
      } else if (fineStatus === 'hasFine') {
        query += ` AND ((br.Return_Date IS NOT NULL AND COALESCE(br.Fee_Incurred, 0) > 0) OR (br.Return_Date IS NULL AND br.Due_Date < CURDATE()))`;
      } else if (fineStatus === 'noFine') {
        query += ` AND ((br.Return_Date IS NOT NULL AND (br.Fee_Incurred IS NULL OR br.Fee_Incurred = 0)) OR (br.Return_Date IS NULL AND br.Due_Date >= CURDATE()))`;
      }
    }

    // Fine Amount Range Filter
    if (fineMin !== undefined || fineMax !== undefined) {
      // Calculate fine amount logic again for filtering
      const fineCalc = `
        CASE
          WHEN br.Return_Date IS NOT NULL THEN COALESCE(br.Fee_Incurred, 0)
          WHEN br.Due_Date < CURDATE() AND br.Return_Date IS NULL THEN LEAST(DATEDIFF(CURDATE(), br.Due_Date), 30) * ?
          ELSE 0
        END
      `;
      // We need to inject the fine rate parameter for each usage of fineCalc

      if (fineMin !== undefined) {
        query += ` AND (${fineCalc}) >= ?`;
        params.push(fineRate, fineMin);
      }
      if (fineMax !== undefined) {
        query += ` AND (${fineCalc}) <= ?`;
        params.push(fineRate, fineMax);
      }
    }

    // Overdue Bucket Filter
    if (overdueBucket) {
      // 1-7, 8-30, 30+
      if (overdueBucket === '1-7') {
        query += ` AND (br.Return_Date IS NULL AND DATEDIFF(CURDATE(), br.Due_Date) BETWEEN 1 AND 7)`;
      } else if (overdueBucket === '8-30') {
        query += ` AND (br.Return_Date IS NULL AND DATEDIFF(CURDATE(), br.Due_Date) BETWEEN 8 AND 30)`;
      } else if (overdueBucket === '30+') {
        query += ` AND (br.Return_Date IS NULL AND DATEDIFF(CURDATE(), br.Due_Date) > 30)`;
      }
    }

    // Study Room Filters
    if (roomId) {
      query += ` AND sr.Room_Number = ?`;
      params.push(roomId);
    }

    // Member name filter - multiple selections
    if (memberNameArray.length > 0) {
      const memberConditions = memberNameArray.map(() => `CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) = ?`);
      query += ` AND (${memberConditions.join(' OR ')})`;
      params.push(...memberNameArray);
    }

    // Asset title filter - multiple selections
    if (assetTitleArray.length > 0) {
      const titleConditions = assetTitleArray.map(() => `(
      b.Title = ? OR 
      cd.Title = ? OR 
      ab.Title = ? OR 
      mv.Title = ? OR
      CONCAT('Tech: ', t.Model_Num) = ? OR
      CONCAT('Room ', sr.Room_Number) = ?
    )`);
      query += ` AND (${titleConditions.join(' OR ')})`;
      assetTitleArray.forEach(title => {
        params.push(title, title, title, title, title, title);
      });
    }

    // Asset type filter - multiple selections
    if (assetTypeArray.length > 0) {
      const typeConditions = [];
      assetTypeArray.forEach(type => {
        if (type === 'Book') {
          typeConditions.push('b.Asset_ID IS NOT NULL');
        } else if (type === 'CD') {
          typeConditions.push('cd.Asset_ID IS NOT NULL');
        } else if (type === 'Audiobook') {
          typeConditions.push('ab.Asset_ID IS NOT NULL');
        } else if (type === 'Movie') {
          typeConditions.push('mv.Asset_ID IS NOT NULL');
        } else if (type === 'Technology') {
          typeConditions.push('t.Asset_ID IS NOT NULL');
        } else if (type === 'Study Room') {
          typeConditions.push('sr.Asset_ID IS NOT NULL');
        }
      });
      if (typeConditions.length > 0) {
        query += ` AND (${typeConditions.join(' OR ')})`;
      }
    }

    query += ` ORDER BY br.Borrow_Date DESC LIMIT 1000`;

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching librarian transactions:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to fetch transactions', details: err.message }));
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('Error in getLibrarianTransactions:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to fetch transactions', details: error.message }));
  }
};

// Librarian Daily Activity Chart Data
const getLibrarianDailyActivity = async (req, res) => {
  const librarianId = req.params.id;
  const {
    from,
    to,
    actions,
    fineStatuses,
    memberNames,
    assetTitles,
    assetTypes,
    status,
    staffId,
    fineMin,
    fineMax,
    overdueBucket,
    roomId
  } = req.query;

  // Validate required parameters
  if (!from || !to) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing required parameters: from and to dates are required' }));
    return;
  }

  try {
    // Get fine rate from database config
    const fineRate = await getConfigValue('FINE_RATE_PER_DAY');

    // Parse comma-separated arrays
    const actionArray = actions ? actions.split(',').filter(a => a) : [];
    const fineStatusArray = fineStatuses ? fineStatuses.split(',').filter(f => f) : [];
    const memberNameArray = memberNames ? memberNames.split(',').filter(m => m) : [];
    const assetTitleArray = assetTitles ? assetTitles.split(',').filter(t => t) : [];
    const assetTypeArray = assetTypes ? assetTypes.split(',').filter(t => t) : [];
    const statusArray = status ? status.split(',').filter(s => s) : [];

    // Build dynamic query based on selected actions
    let dateField = 'br.Borrow_Date';
    let selectColumns = [];

    // If specific actions are selected, only show those columns
    if (actionArray.length > 0) {
      if (actionArray.includes('issued')) {
        selectColumns.push(`COUNT(CASE WHEN br.Return_Date IS NULL AND br.Renew_Date IS NULL THEN 1 END) AS issued`);
      }
      if (actionArray.includes('returned')) {
        selectColumns.push(`COUNT(CASE WHEN br.Return_Date >= ? AND br.Return_Date <= ? THEN 1 END) AS returned`);
      }
      if (actionArray.includes('renewed')) {
        selectColumns.push(`COUNT(CASE WHEN br.Renew_Date >= ? AND br.Renew_Date <= ? THEN 1 END) AS renewed`);
      }
      if (actionArray.includes('overdue')) {
        selectColumns.push(`COUNT(CASE WHEN br.Due_Date < CURDATE() AND br.Return_Date IS NULL THEN 1 END) AS overdue`);
      }
    } else {
      // Show all action types if none selected
      selectColumns = [
        `COUNT(CASE WHEN br.Return_Date IS NULL AND br.Renew_Date IS NULL THEN 1 END) AS issued`,
        `COUNT(CASE WHEN br.Return_Date >= ? AND br.Return_Date <= ? THEN 1 END) AS returned`,
        `COUNT(CASE WHEN br.Renew_Date >= ? AND br.Renew_Date <= ? THEN 1 END) AS renewed`
      ];
    }

    // Ensure we always have at least one column (fallback)
    if (selectColumns.length === 0) {
      selectColumns.push(`COUNT(*) AS total`);
    }

    // Filter by librarian who processed the transaction (or show all if no data yet)
    let query = `
      SELECT 
        DATE(br.Borrow_Date) AS date,
        ${selectColumns.join(', ')}
      FROM borrow br
      LEFT JOIN user u ON br.Borrower_ID = u.User_ID
      LEFT JOIN rentable r ON br.Rentable_ID = r.Rentable_ID
      LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
      LEFT JOIN book b ON a.Asset_ID = b.Asset_ID
      LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
      LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
      LEFT JOIN movie mv ON a.Asset_ID = mv.Asset_ID
      LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
      LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
      WHERE br.Borrow_Date >= ? AND br.Borrow_Date <= ?
    `;

    let params = [];

    // Add date range parameters for returned and renewed columns (they have ? placeholders in SELECT)
    // Count how many times we need to add from/to for the SELECT columns
    let returnedCount = 0;
    let renewedCount = 0;

    if (actionArray.length > 0) {
      if (actionArray.includes('returned')) {
        returnedCount = 1;
      }
      if (actionArray.includes('renewed')) {
        renewedCount = 1;
      }
    } else {
      // Show all actions - need parameters for returned and renewed
      returnedCount = 1;
      renewedCount = 1;
    }

    // Add parameters for returned columns
    for (let i = 0; i < returnedCount; i++) {
      params.push(from, to);
    }

    // Add parameters for renewed columns
    for (let i = 0; i < renewedCount; i++) {
      params.push(from, to);
    }

    // Add parameters for WHERE clause: from, to
    params.push(from, to);

    // Staff ID Filter
    if (staffId) {
      query += ` AND br.Processed_By = ?`;
      params.push(staffId);
    } else {
      // Default behavior: filter by current librarian or NULL (legacy)
      query += ` AND (br.Processed_By = ? OR br.Processed_By IS NULL)`;
      params.push(librarianId);
    }

    // Apply same filters as transactions

    // Status Filter (Active, Completed, Overdue)
    if (statusArray.length > 0) {
      const statusConditions = [];
      statusArray.forEach(s => {
        if (s.toLowerCase() === 'active') {
          statusConditions.push('(br.Return_Date IS NULL AND (br.Due_Date >= CURDATE() OR br.Due_Date IS NULL))');
        } else if (s.toLowerCase() === 'completed') {
          statusConditions.push('(br.Return_Date IS NOT NULL)');
        } else if (s.toLowerCase() === 'overdue') {
          statusConditions.push('(br.Return_Date IS NULL AND br.Due_Date < CURDATE())');
        }
      });
      if (statusConditions.length > 0) {
        query += ` AND (${statusConditions.join(' OR ')})`;
      }
    }

    // Fine status filter
    if (fineStatusArray.length > 0) {
      const fineConditions = [];
      fineStatusArray.forEach(status => {
        if (status === 'paid') {
          fineConditions.push('(br.Return_Date IS NOT NULL AND br.Fee_Incurred = 0 AND DATEDIFF(br.Return_Date, br.Due_Date) > 0)');
        } else if (status === 'unpaid') {
          fineConditions.push('((br.Return_Date IS NOT NULL AND br.Fee_Incurred > 0) OR (br.Return_Date IS NULL AND br.Due_Date < CURDATE()))');
        }
      });
      if (fineConditions.length > 0) {
        query += ` AND (${fineConditions.join(' OR ')})`;
      }
    }

    // Fine Amount Range Filter
    if (fineMin !== undefined || fineMax !== undefined) {
      // Calculate fine amount logic again for filtering
      const fineCalc = `
        CASE
          WHEN br.Return_Date IS NOT NULL THEN COALESCE(br.Fee_Incurred, 0)
          WHEN br.Due_Date < CURDATE() AND br.Return_Date IS NULL THEN LEAST(DATEDIFF(CURDATE(), br.Due_Date), 30) * ?
          ELSE 0
        END
      `;

      if (fineMin !== undefined) {
        query += ` AND (${fineCalc}) >= ?`;
        params.push(fineRate, fineMin);
      }
      if (fineMax !== undefined) {
        query += ` AND (${fineCalc}) <= ?`;
        params.push(fineRate, fineMax);
      }
    }

    // Overdue Bucket Filter
    if (overdueBucket) {
      if (overdueBucket === '1-7') {
        query += ` AND (br.Return_Date IS NULL AND DATEDIFF(CURDATE(), br.Due_Date) BETWEEN 1 AND 7)`;
      } else if (overdueBucket === '8-30') {
        query += ` AND (br.Return_Date IS NULL AND DATEDIFF(CURDATE(), br.Due_Date) BETWEEN 8 AND 30)`;
      } else if (overdueBucket === '30+') {
        query += ` AND (br.Return_Date IS NULL AND DATEDIFF(CURDATE(), br.Due_Date) > 30)`;
      }
    }

    // Study Room Filters
    if (roomId) {
      query += ` AND sr.Room_Number = ?`;
      params.push(roomId);
    }

    // Member name filter
    if (memberNameArray.length > 0) {
      const memberConditions = memberNameArray.map(() => `CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) = ?`);
      query += ` AND (${memberConditions.join(' OR ')})`;
      params.push(...memberNameArray);
    }

    // Asset title filter
    if (assetTitleArray.length > 0) {
      const titleConditions = assetTitleArray.map(() => `(
        b.Title = ? OR 
        cd.Title = ? OR 
        ab.Title = ? OR 
        mv.Title = ? OR
        CONCAT('Tech: ', t.Model_Num) = ? OR
        CONCAT('Room ', sr.Room_Number) = ?
      )`);
      query += ` AND (${titleConditions.join(' OR ')})`;
      assetTitleArray.forEach(title => {
        params.push(title, title, title, title, title, title);
      });
    }

    // Asset type filter
    if (assetTypeArray.length > 0) {
      const typeConditions = [];
      assetTypeArray.forEach(type => {
        if (type === 'Book') {
          typeConditions.push('b.Asset_ID IS NOT NULL');
        } else if (type === 'CD') {
          typeConditions.push('cd.Asset_ID IS NOT NULL');
        } else if (type === 'Audiobook') {
          typeConditions.push('ab.Asset_ID IS NOT NULL');
        } else if (type === 'Movie') {
          typeConditions.push('mv.Asset_ID IS NOT NULL');
        } else if (type === 'Technology') {
          typeConditions.push('t.Asset_ID IS NOT NULL');
        } else if (type === 'Study Room') {
          typeConditions.push('sr.Asset_ID IS NOT NULL');
        }
      });
      if (typeConditions.length > 0) {
        query += ` AND (${typeConditions.join(' OR ')})`;
      }
    }

    query += ` GROUP BY DATE(br.Borrow_Date) ORDER BY date ASC`;

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching daily activity:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to fetch daily activity', details: err.message }));
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('Error in getLibrarianDailyActivity:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to fetch daily activity', details: error.message }));
  }
};

// Get list of member names for autocomplete
const getLibrarianMembers = (req, res) => {
  const librarianId = req.params.id;

  const query = `
    SELECT DISTINCT 
      u.User_ID,
      CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) AS member_name,
      u.User_Email,
      CASE 
        WHEN u.Role = 1 THEN 'Student'
        WHEN u.Role = 2 THEN 'Admin'
        WHEN u.Role = 3 THEN 'Librarian'
        ELSE 'Unknown'
      END AS role
    FROM user u
    WHERE u.Role = 1
    ORDER BY member_name ASC
    LIMIT 200
  `;

  db.query(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching members:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to fetch members' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  });
};

// Get list of book titles for autocomplete
const getLibrarianBooks = (req, res) => {
  const librarianId = req.params.id;

  const query = `
    SELECT DISTINCT 
      a.Asset_ID,
      COALESCE(b.Title, cd.Title, ab.Title, mv.Title, CONCAT('Tech: ', t.Model_Num), CONCAT('Room ', sr.Room_Number), 'Unknown') AS book_title,
      CASE
        WHEN b.Asset_ID IS NOT NULL THEN 'Book'
        WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
        WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
        WHEN mv.Asset_ID IS NOT NULL THEN 'Movie'
        WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
        WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
        ELSE 'Other'
      END AS asset_type
    FROM borrow br
    LEFT JOIN rentable r ON br.Rentable_ID = r.Rentable_ID
    LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book b ON a.Asset_ID = b.Asset_ID
    LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN movie mv ON a.Asset_ID = mv.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    WHERE (br.Processed_By = ? OR br.Processed_By IS NULL)
    ORDER BY book_title ASC
    LIMIT 100
  `;

  db.query(query, [librarianId], (err, results) => {
    if (err) {
      console.error('Error fetching books:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to fetch books' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  });
};

// Study room bookings list for report tab
const getLibrarianRoomBookings = (req, res) => {
  const librarianId = req.params.id;
  const {
    from,
    to,
    status,
    rooms,
    memberNames,
    memberTypes,
    memberSearch,
    capacityMin,
    capacityMax,
    durationBucket,
    timeOfDay,
    staffId
  } = req.query;

  if (!from || !to) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing required parameters: from and to dates are required' }));
    return;
  }

  const statusArray = status ? status.split(',').filter(Boolean) : [];
  const roomArray = rooms ? rooms.split(',').filter(Boolean) : [];
  const memberNameArray = memberNames ? memberNames.split(',').filter(Boolean) : [];
  const memberTypeArray = memberTypes ? memberTypes.split(',').filter(Boolean) : [];
  const capacityMinNumber = capacityMin !== undefined && capacityMin !== '' ? Number(capacityMin) : null;
  const capacityMaxNumber = capacityMax !== undefined && capacityMax !== '' ? Number(capacityMax) : null;

  let query = `
    SELECT 
      br.Borrow_ID AS Booking_ID,
      br.Borrow_Date,
      br.Due_Date,
      br.Return_Date,
      DATE(br.Borrow_Date) AS Booking_Date,
      TIME(br.Borrow_Date) AS Start_Time,
      TIME(br.Return_Date) AS Actual_End_Time,
      sr.Room_Number,
      sr.Capacity,
      CONCAT(member.First_Name, ' ', IFNULL(member.Last_Name, '')) AS Member_Name,
      member.User_ID AS Member_ID,
      rt.role_name AS Member_Role,
      CONCAT(staff.First_Name, ' ', IFNULL(staff.Last_Name, '')) AS Approved_By,
      br.Processed_By AS Approved_By_ID,
      CASE
        WHEN br.Return_Date IS NOT NULL THEN 'Completed'
        WHEN br.Due_Date < CURDATE() THEN 'Overdue'
        WHEN DATE(br.Borrow_Date) > CURDATE() THEN 'Upcoming'
        ELSE 'Active'
      END AS Booking_Status,
      DATEDIFF(br.Due_Date, DATE(br.Borrow_Date)) + 1 AS Duration_Days,
      TIMESTAMPDIFF(HOUR, br.Borrow_Date, COALESCE(br.Return_Date, CONCAT(br.Due_Date, ' 23:59:59'))) AS Duration_Hours,
      br.Borrow_Date AS Created_At
    FROM borrow br
    INNER JOIN rentable r ON br.Rentable_ID = r.Rentable_ID
    INNER JOIN asset a ON r.Asset_ID = a.Asset_ID
    INNER JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    INNER JOIN user member ON br.Borrower_ID = member.User_ID
    LEFT JOIN role_type rt ON member.Role = rt.role_id
    LEFT JOIN user staff ON br.Processed_By = staff.User_ID
    WHERE 1=1
  `;

  const params = [];

  if (staffId) {
    query += ` AND br.Processed_By = ?`;
    params.push(staffId);
  } else {
    query += ` AND (br.Processed_By = ? OR br.Processed_By IS NULL)`;
    params.push(librarianId);
  }

  query += ` AND DATE(br.Borrow_Date) <= ? 
    AND DATE(COALESCE(br.Return_Date, br.Due_Date)) >= ?`;
  params.push(to, from);

  if (statusArray.length > 0) {
    const statusConditions = [];
    statusArray.forEach((statusValue) => {
      const val = statusValue.toLowerCase();
      if (val === 'completed') {
        statusConditions.push('br.Return_Date IS NOT NULL');
      } else if (val === 'overdue') {
        statusConditions.push('(br.Return_Date IS NULL AND br.Due_Date < CURDATE())');
      } else if (val === 'upcoming') {
        statusConditions.push('(DATE(br.Borrow_Date) > CURDATE() AND br.Return_Date IS NULL)');
      } else if (val === 'active') {
        statusConditions.push('(br.Return_Date IS NULL AND br.Due_Date >= CURDATE() AND DATE(br.Borrow_Date) <= CURDATE())');
      }
    });
    if (statusConditions.length > 0) {
      query += ` AND (${statusConditions.join(' OR ')})`;
    }
  }

  if (roomArray.length > 0) {
    const placeholders = roomArray.map(() => '?').join(',');
    query += ` AND sr.Room_Number IN (${placeholders})`;
    params.push(...roomArray);
  }

  if (memberNameArray.length > 0) {
    const memberConditions = memberNameArray.map(() => `CONCAT(member.First_Name, ' ', IFNULL(member.Last_Name, '')) = ?`);
    query += ` AND (${memberConditions.join(' OR ')})`;
    params.push(...memberNameArray);
  }

  if (memberSearch) {
    query += ` AND CONCAT(member.First_Name, ' ', IFNULL(member.Last_Name, '')) LIKE ?`;
    params.push(`%${memberSearch}%`);
  }

  if (memberTypeArray.length > 0) {
    const roleMap = {
      student: 1,
      admin: 2,
      librarian: 3,
      teacher: 4
    };
    const roleIds = memberTypeArray
      .map(type => roleMap[type.toLowerCase()])
      .filter(id => id !== undefined);
    if (roleIds.length > 0) {
      const placeholders = roleIds.map(() => '?').join(',');
      query += ` AND member.Role IN (${placeholders})`;
      params.push(...roleIds);
    }
  }

  if (capacityMinNumber !== null && !Number.isNaN(capacityMinNumber)) {
    query += ` AND sr.Capacity >= ?`;
    params.push(capacityMinNumber);
  }

  if (capacityMaxNumber !== null && !Number.isNaN(capacityMaxNumber)) {
    query += ` AND sr.Capacity <= ?`;
    params.push(capacityMaxNumber);
  }

  if (durationBucket) {
    const durationCalc = 'DATEDIFF(br.Due_Date, DATE(br.Borrow_Date)) + 1';
    if (durationBucket === 'short') {
      query += ` AND ${durationCalc} <= 1`;
    } else if (durationBucket === 'standard') {
      query += ` AND ${durationCalc} BETWEEN 2 AND 7`;
    } else if (durationBucket === 'extended') {
      query += ` AND ${durationCalc} > 7`;
    }
  }

  if (timeOfDay) {
    if (timeOfDay === 'morning') {
      query += ' AND HOUR(br.Borrow_Date) BETWEEN 5 AND 11';
    } else if (timeOfDay === 'afternoon') {
      query += ' AND HOUR(br.Borrow_Date) BETWEEN 12 AND 17';
    } else if (timeOfDay === 'evening') {
      query += ' AND HOUR(br.Borrow_Date) BETWEEN 18 AND 23';
    }
  }

  query += ' ORDER BY br.Borrow_Date DESC LIMIT 500';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching room bookings:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to fetch room bookings', details: err.message }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  });
};

// Study room metadata (numbers, capacities, member roles)
const getRoomReportMetadata = async (req, res) => {
  const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });

  try {
    const roomsPromise = runQuery('SELECT Room_Number, Capacity, Availability FROM study_room ORDER BY Room_Number ASC');
    const rolesPromise = runQuery('SELECT role_id, role_name FROM role_type ORDER BY role_name ASC');

    const [rooms, memberRoles] = await Promise.all([roomsPromise, rolesPromise]);
    const capacities = rooms.map(room => Number(room.Capacity) || 0);
    const capacityRange = capacities.length > 0
      ? { min: Math.min(...capacities), max: Math.max(...capacities) }
      : { min: 0, max: 0 };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ rooms, memberRoles, capacityRange }));
  } catch (error) {
    console.error('Error fetching room metadata:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to fetch room metadata', details: error.message }));
  }
};

module.exports = {
  getMostBorrowedAssets,
  getActiveBorrowers,
  getOverdueItems,
  getInventorySummary,
  getLibrarianSummary,
  getLibrarianTransactions,
  getLibrarianDailyActivity,
  getLibrarianMembers,
  getLibrarianBooks,
  getLibrarianRoomBookings,
  getRoomReportMetadata
};
