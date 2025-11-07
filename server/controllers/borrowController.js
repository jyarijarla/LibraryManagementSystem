const db = require('../db');

// Issue any asset (book, CD, audiobook, movie, technology, study-room)
exports.issueBook = (req, res) => {
  const { memberId, assetId, assetType, issueDate, dueDate } = req.body;
  
  // Validate required fields
  if (!memberId || !assetId || !issueDate || !dueDate) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Missing required fields' }));
  }
  
  // Map asset type to table name
  const assetTypeMap = {
    'books': 'book_inventory',
    'cds': 'cd_inventory', 
    'audiobooks': 'audiobook_inventory',
    'movies': 'movie_inventory',
    'technology': 'technology_inventory',
    'study-rooms': 'study_room_inventory'
  };
  
  const viewName = assetTypeMap[assetType] || 'book_inventory';
  
  // Check if asset is available using the appropriate view
  db.query(
    `SELECT Available_Copies, Asset_ID, Copies FROM ${viewName} WHERE Asset_ID = ?`,
    [assetId],
    (err, assetResults) => {
      if (err) {
        console.error('Error checking asset availability:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
      }
      
      if (assetResults.length === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Asset not found' }));
      }
      
      if (assetResults[0].Available_Copies <= 0) {
        return res.writeHead(400, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Asset is not available' }));
      }
      
      // Get an available rentable_id for this asset (Availability = 1 means Available)
      db.query(
        'SELECT Rentable_ID FROM rentable WHERE Asset_ID = ? AND Availability = 1 LIMIT 1',
        [assetId],
        (err, rentableResults) => {
          if (err || rentableResults.length === 0) {
            console.error('Error finding available rentable:', err);
            return res.writeHead(400, { 'Content-Type': 'application/json' })
              && res.end(JSON.stringify({ message: 'No available copies found for this asset' }));
          }
          
          const rentableId = rentableResults[0].Rentable_ID;
          
          // Insert borrow record
          db.query(
            'INSERT INTO borrow (Borrower_ID, Rentable_ID, Borrow_Date, Due_Date) VALUES (?, ?, ?, ?)',
            [memberId, rentableId, issueDate, dueDate],
            (err, insertResult) => {
              if (err) {
                console.error('Error inserting borrow record:', err);
                return res.writeHead(500, { 'Content-Type': 'application/json' })
                  && res.end(JSON.stringify({ message: 'Failed to issue asset', error: err.message }));
              }
              
              // Note: Available_Copies is a calculated field in the inventory views
              // It's automatically updated based on borrow records (Return_Date IS NULL)
              // No manual update needed
              
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                message: 'Asset issued successfully',
                borrowId: insertResult.insertId
              }));
            }
          );
        }
      );
    }
  );
};

// Get all borrow records (all asset types)
exports.getAllRecords = (req, res) => {
  const query = `
    SELECT 
      b.Borrow_ID,
      b.Borrower_ID as User_ID,
      CONCAT(u.First_Name, ' ', COALESCE(u.Last_Name, '')) as First_Name,
      u.Last_Name,
      COALESCE(bk.Title, cd.Title, ab.Title, mv.Title, CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Title,
      DATE_FORMAT(b.Borrow_Date, '%Y-%m-%d') as Borrow_Date,
      DATE_FORMAT(b.Due_Date, '%Y-%m-%d') as Due_Date,
      b.Return_Date,
      CASE
        WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
        WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
        WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
        WHEN mv.Asset_ID IS NOT NULL THEN 'Movie'
        WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
        WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
        ELSE 'Unknown'
      END as Asset_Type,
      b.Fee_Incurred as feeIncurred
    FROM borrow b
    JOIN user u ON b.Borrower_ID = u.User_ID
    JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
    LEFT JOIN book bk ON r.Asset_ID = bk.Asset_ID
    LEFT JOIN cd ON r.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON r.Asset_ID = ab.Asset_ID
    LEFT JOIN movie mv ON r.Asset_ID = mv.Asset_ID
    LEFT JOIN technology t ON r.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON r.Asset_ID = sr.Asset_ID
    ORDER BY b.Borrow_Date DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching borrow records:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

// Return book
exports.returnBook = (req, res) => {
  const { id } = req.params;
  const { fineAmount } = req.body || {};
  
  // Update borrow record with return date and fine
  const updateQuery = fineAmount 
    ? 'UPDATE borrow SET Return_Date = CURDATE(), Fee_Incurred = ? WHERE Borrow_ID = ? AND Return_Date IS NULL'
    : 'UPDATE borrow SET Return_Date = CURDATE() WHERE Borrow_ID = ? AND Return_Date IS NULL';
  
  const params = fineAmount ? [fineAmount, id] : [id];
  
  db.query(updateQuery, params, (err, result) => {
    if (err) {
      console.error('Error returning book:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to return book', error: err.message }));
    }
    
    if (result.affectedRows === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Borrow record not found or already returned' }));
    }
    
    // Note: Available_Copies in book_inventory view is automatically updated
    // when Return_Date is set, so no manual update needed
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Book returned successfully',
      fine: fineAmount || 0
    }));
  });
};

// Renew book
exports.renewBook = (req, res) => {
  const { id } = req.params;
  const { newDueDate } = req.body;
  
  if (!newDueDate) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'New due date is required' }));
  }
  
  // Update due date for active borrow
  db.query(
    'UPDATE borrow SET Due_Date = ? WHERE Borrow_ID = ? AND Return_Date IS NULL',
    [newDueDate, id],
    (err, result) => {
      if (err) {
        console.error('Error renewing book:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to renew book', error: err.message }));
      }
      
      if (result.affectedRows === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Borrow record not found or already returned' }));
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Book renewed successfully',
        newDueDate: newDueDate
      }));
    }
  );
};

// Get dashboard stats
exports.getDashboardStats = (req, res) => {
  const queries = {
    totalBooks: 'SELECT COALESCE(SUM(Copies), 0) as count FROM book',
    availableBooks: 'SELECT COALESCE(SUM(Available_Copies), 0) as count FROM book',
    totalStudents: 'SELECT COUNT(*) as count FROM user WHERE Role = 3',
    borrowedBooks: 'SELECT COUNT(*) as count FROM borrow WHERE Return_Date IS NULL'
  };
  
  const results = {};
  let completed = 0;
  
  Object.keys(queries).forEach(key => {
    db.query(queries[key], (err, result) => {
      if (err) {
        console.error(`Error fetching ${key}:`, err);
        results[key] = 0;
      } else {
        results[key] = result[0].count || 0;
      }
      
      completed++;
      if (completed === Object.keys(queries).length) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      }
    });
  });
};
