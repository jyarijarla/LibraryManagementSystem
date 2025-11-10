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

module.exports = {
  getMostBorrowedAssets,
  getActiveBorrowers,
  getOverdueItems,
  getInventorySummary
};
