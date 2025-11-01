const db = require('../db');

// Report 1: Most Borrowed Assets
const getMostBorrowedAssets = (req, res) => {
  const query = `
    SELECT 
      r.Rentable_ID,
      COALESCE(b.Title, ab.Title, m.Title, 'Unknown') AS Title,
      CASE 
        WHEN b.ISBN IS NOT NULL THEN 'Book'
        WHEN ab.ISBN IS NOT NULL THEN 'Audiobook'
        WHEN cd.CD_ID IS NOT NULL THEN 'CD'
        WHEN m.Movie_ID IS NOT NULL THEN 'Movie'
        WHEN t.Tech_ID IS NOT NULL THEN 'Technology'
        WHEN sr.Room_Number IS NOT NULL THEN 'Study Room'
        ELSE 'Unknown'
      END AS Type,
      COUNT(br.Borrow_ID) AS Total_Borrows,
      r.Num_Copies AS Total_Copies,
      r.Num_Available AS Available_Copies,
      ROUND((COUNT(br.Borrow_ID) / NULLIF(r.Num_Copies, 0)), 2) AS Borrow_Rate_Per_Copy
    FROM rentable r
    LEFT JOIN borrow br ON r.Rentable_ID = br.Rentable_ID
    LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book b ON a.Asset_ID = b.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    GROUP BY r.Rentable_ID, Title, Type, r.Num_Copies, r.Num_Available
    ORDER BY Total_Borrows DESC
    LIMIT 10
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching most borrowed assets:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to fetch most borrowed assets' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  });
};

// Report 2: Active Borrowers
const getActiveBorrowers = (req, res) => {
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
    WHERE u.User_RoleID = 1
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
      res.end(JSON.stringify({ error: 'Failed to fetch active borrowers' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  });
};

// Report 3: Overdue Items
const getOverdueItems = (req, res) => {
  const query = `
    SELECT 
      br.Borrow_ID,
      CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) AS Borrower_Name,
      u.User_Email,
      u.User_Phone,
      r.Rentable_ID AS Asset_ID,
      COALESCE(b.Title, ab.Title, m.Title, 'Unknown') AS Title,
      CASE 
        WHEN b.ISBN IS NOT NULL THEN 'Book'
        WHEN ab.ISBN IS NOT NULL THEN 'Audiobook'
        WHEN cd.CD_ID IS NOT NULL THEN 'CD'
        WHEN m.Movie_ID IS NOT NULL THEN 'Movie'
        WHEN t.Tech_ID IS NOT NULL THEN 'Technology'
        WHEN sr.Room_Number IS NOT NULL THEN 'Study Room'
        ELSE 'Unknown'
      END AS Type,
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
    INNER JOIN rentable r ON br.Rentable_ID = r.Rentable_ID
    LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book b ON a.Asset_ID = b.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    WHERE br.Return_Date IS NULL 
    AND br.Due_Date < CURDATE()
    ORDER BY Days_Overdue DESC, Severity
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching overdue items:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to fetch overdue items' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  });
};

// Bonus Report: Inventory Summary
const getInventorySummary = (req, res) => {
  const query = `
    SELECT 
      CASE 
        WHEN b.ISBN IS NOT NULL THEN 'Book'
        WHEN ab.ISBN IS NOT NULL THEN 'Audiobook'
        WHEN cd.CD_ID IS NOT NULL THEN 'CD'
        WHEN m.Movie_ID IS NOT NULL THEN 'Movie'
        WHEN t.Tech_ID IS NOT NULL THEN 'Technology'
        WHEN sr.Room_Number IS NOT NULL THEN 'Study Room'
        ELSE 'Unknown'
      END AS Asset_Type,
      COUNT(DISTINCT r.Rentable_ID) AS Unique_Items,
      SUM(r.Num_Copies) AS Total_Copies,
      SUM(r.Num_Available) AS Total_Available,
      SUM(r.Num_Copies - r.Num_Available) AS Currently_Borrowed,
      ROUND((SUM(r.Num_Copies - r.Num_Available) / NULLIF(SUM(r.Num_Copies), 0)) * 100, 2) AS Utilization_Percentage
    FROM rentable r
    LEFT JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book b ON a.Asset_ID = b.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    GROUP BY Asset_Type
    ORDER BY Total_Copies DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching inventory summary:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to fetch inventory summary' }));
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
