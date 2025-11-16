const db = require('../db');

// Get all admin notifications
exports.getAdminNotifications = (req, res) => {
  const query = `
    SELECT 
      'overdue' as notification_type,
      b.Borrow_ID as id,
      CONCAT(u.First_Name, ' ', u.Last_Name) as borrower_name,
      u.User_Email as borrower_email,
      u.User_Phone as borrower_phone,
      CASE 
        WHEN bk.Title IS NOT NULL THEN bk.Title
        WHEN m.Title IS NOT NULL THEN m.Title
        WHEN cd.Title IS NOT NULL THEN cd.Title
        WHEN ab.Title IS NOT NULL THEN ab.Title
        WHEN t.Description IS NOT NULL THEN t.Description
        WHEN sr.Room_Number IS NOT NULL THEN CONCAT('Study Room ', sr.Room_Number)
        ELSE 'Unknown Item'
      END as item_title,
      CASE 
        WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
        WHEN m.Asset_ID IS NOT NULL THEN 'Movie'
        WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
        WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
        WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
        WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
        ELSE 'Unknown'
      END as item_type,
      b.Due_Date as due_date,
      DATEDIFF(CURDATE(), b.Due_Date) as days_overdue,
      CASE 
        WHEN DATEDIFF(CURDATE(), b.Due_Date) >= 30 THEN 'Critical'
        WHEN DATEDIFF(CURDATE(), b.Due_Date) >= 14 THEN 'Urgent'
        ELSE 'Warning'
      END as severity,
      a.Asset_ID as asset_id,
      b.Borrow_Date as borrow_date
    FROM borrow b
    JOIN user u ON b.User_ID = u.User_ID
    JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
    JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN cd cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    WHERE b.Return_Date IS NULL 
      AND b.Due_Date < CURDATE()
    
    UNION ALL
    
    SELECT 
      'low_stock' as notification_type,
      a.Asset_ID as id,
      NULL as borrower_name,
      NULL as borrower_email,
      NULL as borrower_phone,
      CASE 
        WHEN bk.Title IS NOT NULL THEN bk.Title
        WHEN m.Title IS NOT NULL THEN m.Title
        WHEN cd.Title IS NOT NULL THEN cd.Title
        WHEN ab.Title IS NOT NULL THEN ab.Title
        WHEN t.Description IS NOT NULL THEN t.Description
        ELSE 'Unknown Item'
      END as item_title,
      CASE 
        WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
        WHEN m.Asset_ID IS NOT NULL THEN 'Movie'
        WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
        WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
        WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
        ELSE 'Unknown'
      END as item_type,
      NULL as due_date,
      NULL as days_overdue,
      'Info' as severity,
      a.Asset_ID as asset_id,
      NULL as borrow_date
    FROM asset a
    LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN cd cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    WHERE a.Asset_ID NOT IN (
      SELECT Asset_ID FROM study_room
    )
    AND (
      SELECT COUNT(*) 
      FROM rentable r 
      WHERE r.Asset_ID = a.Asset_ID AND r.Availability = 1
    ) = 0
    AND (
      SELECT COUNT(*) 
      FROM rentable r 
      WHERE r.Asset_ID = a.Asset_ID
    ) > 0
    
    UNION ALL
    
    SELECT 
      'due_soon' as notification_type,
      b.Borrow_ID as id,
      CONCAT(u.First_Name, ' ', u.Last_Name) as borrower_name,
      u.User_Email as borrower_email,
      u.User_Phone as borrower_phone,
      CASE 
        WHEN bk.Title IS NOT NULL THEN bk.Title
        WHEN m.Title IS NOT NULL THEN m.Title
        WHEN cd.Title IS NOT NULL THEN cd.Title
        WHEN ab.Title IS NOT NULL THEN ab.Title
        WHEN t.Description IS NOT NULL THEN t.Description
        WHEN sr.Room_Number IS NOT NULL THEN CONCAT('Study Room ', sr.Room_Number)
        ELSE 'Unknown Item'
      END as item_title,
      CASE 
        WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
        WHEN m.Asset_ID IS NOT NULL THEN 'Movie'
        WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
        WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
        WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
        WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
        ELSE 'Unknown'
      END as item_type,
      b.Due_Date as due_date,
      DATEDIFF(b.Due_Date, CURDATE()) as days_until_due,
      'Info' as severity,
      a.Asset_ID as asset_id,
      b.Borrow_Date as borrow_date
    FROM borrow b
    JOIN user u ON b.User_ID = u.User_ID
    JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
    JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN cd cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    WHERE b.Return_Date IS NULL 
      AND b.Due_Date >= CURDATE()
      AND b.Due_Date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
    
    ORDER BY 
      CASE notification_type
        WHEN 'overdue' THEN 1
        WHEN 'due_soon' THEN 2
        WHEN 'low_stock' THEN 3
      END,
      CASE severity
        WHEN 'Critical' THEN 1
        WHEN 'Urgent' THEN 2
        WHEN 'Warning' THEN 3
        WHEN 'Info' THEN 4
      END
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching notifications:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

// Get notification counts by type
exports.getNotificationCounts = (req, res) => {
  const query = `
    SELECT 
      COUNT(CASE WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() THEN 1 END) as overdue_count,
      COUNT(CASE WHEN b.Return_Date IS NULL AND b.Due_Date >= CURDATE() AND b.Due_Date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 1 END) as due_soon_count,
      (
        SELECT COUNT(DISTINCT a.Asset_ID)
        FROM asset a
        WHERE a.Asset_ID NOT IN (SELECT Asset_ID FROM study_room)
        AND (SELECT COUNT(*) FROM rentable r WHERE r.Asset_ID = a.Asset_ID AND r.Availability = 1) = 0
        AND (SELECT COUNT(*) FROM rentable r WHERE r.Asset_ID = a.Asset_ID) > 0
      ) as low_stock_count
    FROM borrow b
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching notification counts:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results[0]));
  });
};

// Get critical notifications only (overdue > 14 days)
exports.getCriticalNotifications = (req, res) => {
  const query = `
    SELECT 
      b.Borrow_ID,
      CONCAT(u.First_Name, ' ', u.Last_Name) as borrower_name,
      u.User_Email as borrower_email,
      u.User_Phone as borrower_phone,
      CASE 
        WHEN bk.Title IS NOT NULL THEN bk.Title
        WHEN m.Title IS NOT NULL THEN m.Title
        WHEN cd.Title IS NOT NULL THEN cd.Title
        WHEN ab.Title IS NOT NULL THEN ab.Title
        WHEN t.Description IS NOT NULL THEN t.Description
        WHEN sr.Room_Number IS NOT NULL THEN CONCAT('Study Room ', sr.Room_Number)
        ELSE 'Unknown Item'
      END as item_title,
      CASE 
        WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
        WHEN m.Asset_ID IS NOT NULL THEN 'Movie'
        WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
        WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
        WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
        WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
        ELSE 'Unknown'
      END as item_type,
      b.Due_Date,
      DATEDIFF(CURDATE(), b.Due_Date) as days_overdue,
      b.Borrow_Date,
      a.Asset_ID
    FROM borrow b
    JOIN user u ON b.User_ID = u.User_ID
    JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
    JOIN asset a ON r.Asset_ID = a.Asset_ID
    LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN cd cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    WHERE b.Return_Date IS NULL 
      AND DATEDIFF(CURDATE(), b.Due_Date) >= 14
    ORDER BY DATEDIFF(CURDATE(), b.Due_Date) DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching critical notifications:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

// Create a manual low stock alert from librarian dashboard
exports.createLowStockAlert = (req, res) => {
  const { 
    assetId,
    assetType,
    assetTitle,
    availableCopies = 0,
    threshold = 0,
    triggeredBy = null,
    triggeredByName = null
  } = req.body || {};

  if (!assetId || !assetType) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'assetId and assetType are required' }));
  }

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS low_stock_alerts (
      Alert_ID INT AUTO_INCREMENT PRIMARY KEY,
      Asset_ID INT NOT NULL,
      Asset_Type VARCHAR(50) NOT NULL,
      Asset_Title VARCHAR(255),
      Available_Copies INT DEFAULT 0,
      Threshold_Value INT DEFAULT 0,
      Triggered_By_UserID INT NULL,
      Triggered_By_Name VARCHAR(120),
      Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(createTableQuery, (tableErr) => {
    if (tableErr) {
      console.error('Error ensuring low_stock_alerts table:', tableErr);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to prepare alert storage', error: tableErr.message }));
    }

    const insertQuery = `
      INSERT INTO low_stock_alerts 
        (Asset_ID, Asset_Type, Asset_Title, Available_Copies, Threshold_Value, Triggered_By_UserID, Triggered_By_Name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [
        assetId,
        assetType,
        assetTitle || null,
        Number.isFinite(Number(availableCopies)) ? Number(availableCopies) : 0,
        Number.isFinite(Number(threshold)) ? Number(threshold) : 0,
        triggeredBy || null,
        triggeredByName || null
      ],
      (insertErr, result) => {
        if (insertErr) {
          console.error('Error inserting low stock alert:', insertErr);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Failed to log low stock alert', error: insertErr.message }));
        }

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'Low stock alert sent to admin',
          alertId: result.insertId
        }));
      }
    );
  });
};
