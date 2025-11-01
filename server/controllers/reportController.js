const db = require('../db');

// Report 1: Most Borrowed Assets
const getMostBorrowedAssets = (req, res) => {
  const query = `
    SELECT 
      a.Asset_ID,
      a.Title,
      a.Type,
      COUNT(br.Borrow_ID) AS Total_Borrows,
      a.Copies AS Total_Copies,
      a.Available_Copies,
      ROUND((COUNT(br.Borrow_ID) / a.Copies), 2) AS Borrow_Rate_Per_Copy
    FROM asset a
    LEFT JOIN borrow_record br ON a.Asset_ID = br.Asset_ID
    GROUP BY a.Asset_ID, a.Title, a.Type, a.Copies, a.Available_Copies
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
      u.Balance AS Account_Balance
    FROM user u
    LEFT JOIN borrow_record br ON u.User_ID = br.User_ID
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
      a.Asset_ID,
      a.Title,
      a.Type,
      br.Borrow_Date,
      br.Due_Date,
      DATEDIFF(CURDATE(), br.Due_Date) AS Days_Overdue,
      CASE 
        WHEN DATEDIFF(CURDATE(), br.Due_Date) <= 7 THEN 'Warning'
        WHEN DATEDIFF(CURDATE(), br.Due_Date) <= 14 THEN 'Urgent'
        ELSE 'Critical'
      END AS Severity,
      ROUND(DATEDIFF(CURDATE(), br.Due_Date) * 0.50, 2) AS Estimated_Late_Fee
    FROM borrow_record br
    INNER JOIN user u ON br.User_ID = u.User_ID
    INNER JOIN asset a ON br.Asset_ID = a.Asset_ID
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
      a.Type AS Asset_Type,
      COUNT(DISTINCT a.Asset_ID) AS Unique_Items,
      SUM(a.Copies) AS Total_Copies,
      SUM(a.Available_Copies) AS Total_Available,
      SUM(a.Copies - a.Available_Copies) AS Currently_Borrowed,
      ROUND((SUM(a.Copies - a.Available_Copies) / SUM(a.Copies)) * 100, 2) AS Utilization_Percentage
    FROM asset a
    GROUP BY a.Type
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
