const db = require('../db');

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
const getOverdueItems = (req, res) => {
// Simplified query for current database schema - only checking books
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
     COALESCE(br.Fee_Incurred, ROUND(DATEDIFF(CURDATE(), br.Due_Date) * 0.50, 2)) AS Estimated_Late_Fee
   FROM borrow br
   INNER JOIN user u ON br.Borrower_ID = u.User_ID
   LEFT JOIN rentable r ON br.Rentable_ID = r.Rentable_ID
   LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
   LEFT JOIN book b ON a.Asset_ID = b.Asset_ID
   WHERE br.Return_Date IS NULL 
   AND br.Due_Date < CURDATE()
   ORDER BY Days_Overdue DESC
 `;

db.query(query, (err, results) => {
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
const getLibrarianSummary = (req, res) => {
  const librarianId = req.params.id;
  const { from, to } = req.query;

  // Note: Borrow table only has: Borrow_ID, Borrower_ID, Rentable_ID, Borrow_Date, Due_Date, Return_Date, Fee_Incurred
  // No Renew_Date or Processed_By columns exist
  const query = `
    SELECT 
      COUNT(CASE WHEN br.Return_Date IS NULL THEN 1 END) AS books_issued,
      COUNT(CASE WHEN br.Return_Date IS NOT NULL THEN 1 END) AS books_returned,
      COUNT(CASE WHEN br.Renew_Date IS NOT NULL THEN 1 END) AS renewals,
      COALESCE(SUM(CASE WHEN br.Return_Date IS NOT NULL THEN br.Fee_Incurred ELSE 0 END), 0) AS fines_collected,
      COUNT(CASE WHEN br.Return_Date IS NULL AND br.Due_Date < CURDATE() THEN 1 END) AS overdue_books
    FROM borrow br
    WHERE (br.Processed_By = ? OR br.Processed_By IS NULL)
      AND ((br.Borrow_Date >= ? AND br.Borrow_Date <= ?)
       OR (br.Return_Date >= ? AND br.Return_Date <= ?)
       OR (br.Renew_Date >= ? AND br.Renew_Date <= ?))
  `;

  db.query(query, [librarianId, from, to, from, to, from, to], (err, results) => {
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
  });
};

// Librarian Personal Report: Detailed Transactions
const getLibrarianTransactions = (req, res) => {
  const librarianId = req.params.id;
  const { 
    from, 
    to, 
    actions, 
    fineStatuses, 
    memberNames, 
    assetTitles, 
    assetTypes
  } = req.query;

  // Parse comma-separated arrays
  const actionArray = actions ? actions.split(',').filter(a => a) : [];
  const fineStatusArray = fineStatuses ? fineStatuses.split(',').filter(f => f) : [];
  const memberNameArray = memberNames ? memberNames.split(',').filter(m => m) : [];
  const assetTitleArray = assetTitles ? assetTitles.split(',').filter(t => t) : [];
  const assetTypeArray = assetTypes ? assetTypes.split(',').filter(t => t) : [];

  // Filter by librarian who processed the transaction (or show all if no data yet)
  let query = `
    SELECT 
      br.Borrow_ID,
      br.Borrow_Date,
      br.Return_Date,
      br.Renew_Date,
      br.Due_Date,
      CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) AS member_name,
      u.User_ID AS member_id,
      u.User_Email,
      COALESCE(b.Title, cd.Title, ab.Title, mv.Title, t.Model_Num, sr.Room_Number, 'Unknown') AS book_title,
      a.Asset_ID,
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
        WHEN br.Return_Date IS NOT NULL THEN 'Returned'
        WHEN br.Due_Date < CURDATE() THEN 'Overdue'
        ELSE 'Active'
      END AS status,
      COALESCE(br.Fee_Incurred, 0) AS fine,
      CASE 
        WHEN br.Fee_Incurred > 0 AND br.Return_Date IS NOT NULL THEN 'Paid'
        WHEN br.Fee_Incurred > 0 AND br.Return_Date IS NULL THEN 'Unpaid'
        ELSE 'None'
      END AS fine_status,
      CASE
        WHEN br.Return_Date IS NOT NULL THEN 'Returned'
        WHEN br.Renew_Date IS NOT NULL THEN 'Renewed'
        ELSE 'Issued'
      END AS action
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
    WHERE (br.Processed_By = ? OR br.Processed_By IS NULL)
  `;

  const params = [librarianId];

  // Date range filter
  if (from && to) {
    query += ` AND (
      (br.Borrow_Date >= ? AND br.Borrow_Date <= ?) OR
      (br.Return_Date >= ? AND br.Return_Date <= ?) OR
      (br.Renew_Date >= ? AND br.Renew_Date <= ?)
    )`;
    params.push(from, to, from, to, from, to);
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
        fineConditions.push('(br.Fee_Incurred > 0 AND br.Return_Date IS NOT NULL)');
      } else if (status === 'unpaid') {
        fineConditions.push('(br.Fee_Incurred > 0 AND br.Return_Date IS NULL)');
      }
    });
    if (fineConditions.length > 0) {
      query += ` AND (${fineConditions.join(' OR ')})`;
    }
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
};

// Librarian Daily Activity Chart Data
const getLibrarianDailyActivity = (req, res) => {
  const librarianId = req.params.id;
  const { from, to, actions, fineStatuses, memberNames, assetTitles, assetTypes } = req.query;

  // Parse comma-separated arrays
  const actionArray = actions ? actions.split(',').filter(a => a) : [];
  const fineStatusArray = fineStatuses ? fineStatuses.split(',').filter(f => f) : [];
  const memberNameArray = memberNames ? memberNames.split(',').filter(m => m) : [];
  const assetTitleArray = assetTitles ? assetTitles.split(',').filter(t => t) : [];
  const assetTypeArray = assetTypes ? assetTypes.split(',').filter(t => t) : [];

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
  } else {
    // Show all action types if none selected
    selectColumns = [
      `COUNT(CASE WHEN br.Return_Date IS NULL AND br.Renew_Date IS NULL THEN 1 END) AS issued`,
      `COUNT(CASE WHEN br.Return_Date >= ? AND br.Return_Date <= ? THEN 1 END) AS returned`,
      `COUNT(CASE WHEN br.Renew_Date >= ? AND br.Renew_Date <= ? THEN 1 END) AS renewed`
    ];
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
    WHERE (br.Processed_By = ? OR br.Processed_By IS NULL)
      AND br.Borrow_Date >= ? AND br.Borrow_Date <= ?
  `;

  let params = [];
  
  // Add date range parameters for each action type column
  const columnsNeeded = actionArray.length > 0 ? actionArray.length : 3;
  for (let i = 0; i < columnsNeeded; i++) {
    if (actionArray.length === 0 || 
        (i === 0 && actionArray.includes('issued')) ||
        (i === 1 && actionArray.includes('returned')) ||
        (i === 2 && actionArray.includes('renewed'))) {
      // Only returned and renewed need date parameters
      if ((actionArray.length === 0 && i >= 1) || 
          actionArray.includes('returned') || 
          actionArray.includes('renewed')) {
        params.push(from, to);
      }
    }
  }
  
  params.push(librarianId, from, to);

  // Apply same filters as transactions
  // Fine status filter
  if (fineStatusArray.length > 0) {
    const fineConditions = [];
    fineStatusArray.forEach(status => {
      if (status === 'paid') {
        fineConditions.push('(br.Fee_Incurred > 0 AND br.Return_Date IS NOT NULL)');
      } else if (status === 'unpaid') {
        fineConditions.push('(br.Fee_Incurred > 0 AND br.Return_Date IS NULL)');
      }
    });
    if (fineConditions.length > 0) {
      query += ` AND (${fineConditions.join(' OR ')})`;
    }
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

module.exports = {
getMostBorrowedAssets,
getActiveBorrowers,
getOverdueItems,
  getInventorySummary,
  getLibrarianSummary,
  getLibrarianTransactions,
  getLibrarianDailyActivity,
  getLibrarianMembers,
  getLibrarianBooks
};