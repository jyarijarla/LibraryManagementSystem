const db = require('../db');

exports.borrowAsset = async (req, res) => {
  const connection = await db.promise().getConnection();
    try {
      const { assetID } = req.body
      console.log("Recieved data:", {assetID})
      if(!assetID) {
        console.log("Missing required Fields")
        throw Object.assign(new Error('Missing required fields'), {status: 400})
      }
      const userID = req.user.id
      await connection.beginTransaction();
      //check for existing asset
      const [assetCheck] = await connection.query(
        `SELECT Asset_ID FROM asset WHERE Asset_ID = ?`, [assetID]
      )
      if(!assetCheck[0]) {
        throw Object.assign(new Error("Asset not found"), {status: 404});
      }
      //select rentable to borrow
      let selRentable;
      try{
        const [getRentables] = await connection.query(
          `SELECT Rentable_ID FROM rentable WHERE Asset_ID = ? AND Availability = 1`,
          [assetID]
        );
        if(!getRentables[0]){
          console.log("No rentable available for asset:", assetID);
          throw Object.assign(new Error("No rentable available"), {status: 404});
        }
        selRentable = getRentables[0].Rentable_ID;
      }
      catch (error) {
        console.log("Error fetching rentables:", error);
        throw Object.assign(new Error("Rentable query failed"), {status: 500});
      }
      //get user role
      const [userRoleQuery] = await connection.query(
        `SELECT Role FROM user WHERE User_ID = ?`, [userID]
      );
      const userRole = userRoleQuery[0].Role;
      //get basic borrow day limit
      const [borrowDaysQuery] = await connection.query(
        `SELECT borrow_days FROM role_type WHERE role_id = ?`, [userRole]
      )
      const borrowDays = borrowDaysQuery[0].borrow_days;
      //calculate due date based on role
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + borrowDays);
      const dueDateString = dueDate.toISOString().split('T')[0]; //YYYY-MM-DD
      //borrow rentable
      let newBorrowID;
      try{
        const [borrowInsertQuery] = await connection.query(
          `INSERT INTO borrow (Borrower_ID, Rentable_ID, Due_Date) VALUES (?, ?, ?)`, 
          [userID, selRentable, dueDateString]
        );
        newBorrowID = borrowInsertQuery.insertId;
        console.log("Borrow ID assigned:", newBorrowID);
      }
      catch(error){
        console.log("Insert failed:", error);
        throw Object.assign(new Error("Insertion into borrow failed") , {status: 409})
      }
      //end transaction successfully
      await connection.commit();
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Borrow added successfully',
        borrowID: newBorrowID,
      }));
    }
    catch (error) {
      //borrow failed
      await connection.rollback();
      console.log("Error in borrowAsset:", error);
      res.writeHead(error.status || 500, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({message: error.message, status: error.status || 500}))
    }
    finally {
      connection.release();
    }
}
exports.holdAsset = async (req, res) => {
  const connection = await db.promise().getConnection();
    try {
      const { userID, assetID } = req.body
      console.log("Recieved data:", {userID, assetID})
      if(!userID || !assetID) {
        console.log("Missing required Fields")
        throw Object.assign(new Error('Missing required fields'), {status: 400})
      }
      await connection.beginTransaction();
      //check for existing asset
      const [assetCheck] = await connection.query(
        `SELECT Asset_ID FROM asset WHERE Asset_ID = ?`, [assetID]
      )
      if(!assetCheck[0]) {
        throw Object.assign(new Error("Asset not found"), {status: 404});
      }
      //select rentable to hold
      let selRentable;
      try{
        const [getRentables] = await connection.query(
          `SELECT Rentable_ID FROM rentable WHERE Asset_ID = ? AND Availability = 1`,
          [assetID]
        );
        if(!getRentables[0]){
          console.log("No rentable available for asset:", assetID);
          throw Object.assign(new Error("No rentable available"), {status: 404});
        }
        selRentable = getRentables[0].Rentable_ID;
      }
      catch (error) {
        console.log("Error fetching rentables:", error);
        throw Object.assign(new Error("Rentable query failed"), {status: 500});
      }
      //get user role
      const [userRoleQuery] = await connection.query(
        `SELECT Role FROM user WHERE User_ID = ?`, [userID]
      );
      const userRole = userRoleQuery[0].Role;
      //get basic hold day limit
      const [holdDaysQuery] = await connection.query(
        `SELECT hold_days FROM role_type WHERE role_id = ?`, [userRole]
      )
      const holdDays = holdDaysQuery[0].hold_days;
      //calculate hold expire based on role
      const holdExpires = new Date();
      holdExpires.setDate(holdExpires.getDate() + holdDays);
      const holdExpiresString = holdExpires.toISOString().split('T')[0]; //YYYY-MM-DD
      //hold rentable
      let newHoldID;
      try{
        const [holdInsertQuery] = await connection.query(
          `INSERT INTO hold (Holder_ID, Rentable_ID, Hold_Expires) VALUES (?, ?, ?)`, 
          [userID, selRentable, holdExpiresString]
        );
        newHoldID = holdInsertQuery.insertId;
        console.log("Hold ID assigned:", newHoldID);
      }
      catch(error){
        console.log("Insert failed:", error);
        throw Object.assign(new Error("Insertion into hold failed") , {status: 409})
      }
      //end transaction successfully
      await connection.commit();
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Hold added successfully',
        holdID: newHoldID,
      }));
    }
    catch (error) {
      //hold failed
      await connection.rollback();
      console.log("Error in holdAsset:", error);
      res.writeHead(error.status || 500, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({message: error.message, status: error.status || 500}))
    }
    finally {
      connection.release();
    }
}
// Issue any asset (book, CD, audiobook, movie, technology, study-room)
exports.issueAsset = (req, res) => {
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

  const availabilityQuery = assetType === 'study-rooms'
    ? `
        SELECT 
          CASE WHEN sr.Availability = 1 THEN 1 ELSE 0 END AS Available_Copies,
          sr.Asset_ID,
          1 AS Copies
        FROM study_room sr
        WHERE sr.Asset_ID = ?
      `
    : `SELECT Available_Copies, Asset_ID, Copies FROM ${viewName} WHERE Asset_ID = ?`;
  
  // Check if asset is available using the appropriate data source
  db.query(
    availabilityQuery,
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
          
          // Get librarian ID from authenticated user (if available)
          const librarianId = req.user?.id || null;
          
          // Insert borrow record with Processed_By field
          db.query(
            'INSERT INTO borrow (Borrower_ID, Rentable_ID, Borrow_Date, Due_Date, Processed_By) VALUES (?, ?, ?, ?, ?)',
            [memberId, rentableId, issueDate, dueDate, librarianId],
            (err, insertResult) => {
              if (err) {
                console.error('Error inserting borrow record:', err);
                return res.writeHead(500, { 'Content-Type': 'application/json' })
                  && res.end(JSON.stringify({ message: 'Failed to issue asset', error: err.message }));
              }
              
              const sendResponse = () => {
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  message: 'Asset issued successfully',
                  borrowId: insertResult.insertId
                }));
              };

              if (assetType === 'study-rooms') {
                db.query(
                  'UPDATE study_room SET Availability = 0 WHERE Asset_ID = ?',
                  [assetResults[0].Asset_ID],
                  (updateErr) => {
                    if (updateErr) {
                      console.error('Error updating study room availability:', updateErr);
                    }
                    sendResponse();
                  }
                );
              } else {
                sendResponse();
              }
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
      u.First_Name,
      u.Last_Name,
      r.Asset_ID,
      COALESCE(bk.Title, cd.Title, ab.Title, mv.Title, CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Title,
      COALESCE(bk.Author, cd.Artist, ab.Author, mv.Title, t.Model_Num, sr.Room_Number) as Author_Artist,
      CASE 
        WHEN bk.ISBN IS NOT NULL AND bk.ISBN != '' THEN bk.ISBN 
        ELSE 'N/A' 
      END as ISBN,
      DATE_FORMAT(b.Borrow_Date, '%Y-%m-%d %H:%i:%s') as Borrow_Date,
      DATE_FORMAT(b.Due_Date, '%Y-%m-%d') as Due_Date,
      CASE 
        WHEN b.Return_Date IS NULL THEN NULL 
        ELSE DATE_FORMAT(b.Return_Date, '%Y-%m-%d %H:%i:%s') 
      END as Return_Date,
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

// Return asset
exports.returnAsset = async (req, res) => {
  const { id } = req.params;
  const { fineAmount } = req.body || {};

  const connection = await db.promise().getConnection();

  try{
    await connection.beginTransaction();

    //Get rentable to be returned
    const [borrowRecord] = await connection.query(
      'SELECT Rentable_ID FROM borrow WHERE Borrow_ID = ? AND Return_Date IS NULL',
      [id]
    );
    
    if(!borrowRecord.length) {
      throw Object.assign(new Error('Borrow record not found or already returned'), {status: 404});
    }
    const rentableId = borrowRecord[0].Rentable_ID;
    // Update borrow record with return date and fine
    const updateQuery = fineAmount 
    ? 'UPDATE borrow SET Return_Date = NOW(), Fee_Incurred = ? WHERE Borrow_ID = ? AND Return_Date IS NULL'
    : 'UPDATE borrow SET Return_Date = NOW() WHERE Borrow_ID = ? AND Return_Date IS NULL';
  
    const params = fineAmount ? [fineAmount, id] : [id];

    await connection.query(updateQuery, params);
    
    await connection.query(
      `UPDATE rentable SET Availability = 1 WHERE Rentable_ID = ?`, [rentableId]
    );
  
    await connection.commit();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Asset returned successfully',
    }));
  } catch (error) {
    await connection.rollback();
    console.error('Error returning book:', error);
      return res.writeHead(error.status || 500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to return asset', error: error.message }));
    } finally {
      connection.release();
  }
};

// Return asset
exports.userReturnAsset = async (req, res) => {
  const { borrowID, fineAmount = 0 } = req.body;
  const userID = req.user.id

  const [validBorrow] = await db.promise().query(
    `SELECT Borrow_ID FROM borrow WHERE Borrow_ID = ? AND Borrower_ID = ?`,
    [borrowID, userID]
  )
  if(validBorrow.length === 0){
    console.error('Error checking asset availability:', err);
    return res.writeHead(403, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
  }
  
  const connection = await db.promise().getConnection();

  try{
    await connection.beginTransaction();

    //Get rentable to be returned
    const [borrowRecord] = await connection.query(
      'SELECT Rentable_ID FROM borrow WHERE Borrow_ID = ? AND Return_Date IS NULL',
      [borrowID]
    );
    
    if(!borrowRecord.length) {
      throw Object.assign(new Error('Borrow record not found or already returned'), {status: 404});
    }
    const rentableId = borrowRecord[0].Rentable_ID;
    // Update borrow record with return date and fine
    const updateQuery = fineAmount 
    ? 'UPDATE borrow SET Return_Date = NOW(), Fee_Incurred = ? WHERE Borrow_ID = ? AND Return_Date IS NULL'
    : 'UPDATE borrow SET Return_Date = NOW() WHERE Borrow_ID = ? AND Return_Date IS NULL';
  
    const params = fineAmount ? [fineAmount, borrowID] : [borrowID];

    await connection.query(updateQuery, params);
    
    await connection.query(
      `UPDATE rentable SET Availability = 1 WHERE Rentable_ID = ?`, [rentableId]
    );
  
    await connection.commit();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Asset returned successfully',
    }));
  } catch (error) {
    await connection.rollback();
    console.error('Error returning book:', error);
      return res.writeHead(error.status || 500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to return asset', error: error.message }));
    } finally {
      connection.release();
  }
};

// Renew asset
exports.renewAsset = (req, res) => {
  const { id } = req.params;
  const { newDueDate } = req.body;
  
  if (!newDueDate) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'New due date is required' }));
  }
  
  // Update due date and set renew date for active borrow
  db.query(
    'UPDATE borrow SET Due_Date = ?, Renew_Date = CURDATE() WHERE Borrow_ID = ? AND Return_Date IS NULL',
    [newDueDate, id],
    (err, result) => {
      if (err) {
        console.error('Error renewing asset:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to renew asset', error: err.message }));
      }
      
      if (result.affectedRows === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Borrow record not found or already returned' }));
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Asset renewed successfully',
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
