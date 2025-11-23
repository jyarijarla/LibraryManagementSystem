const db = require('../db');

exports.borrowAsset = async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const { assetID } = req.body
    console.log("Recieved data:", { assetID })
    if (!assetID) {
      console.log("Missing required Fields")
      throw Object.assign(new Error('Missing required fields'), { status: 400 })
    }
    const userID = req.user.id
    await connection.beginTransaction();
    //check for existing asset
    const [assetCheck] = await connection.query(
      `SELECT Asset_ID FROM asset WHERE Asset_ID = ?`, [assetID]
    )
    if (!assetCheck[0]) {
      throw Object.assign(new Error("Asset not found"), { status: 404 });
    }
    //select rentable to borrow
    let selRentable;
    try {
      const [getRentables] = await connection.query(
        `SELECT Rentable_ID FROM rentable WHERE Asset_ID = ? AND Availability = 1`,
        [assetID]
      );
      if (!getRentables[0]) {
        console.log("No rentable available for asset:", assetID);
        throw Object.assign(new Error("No rentable available"), { status: 404 });
      }
      selRentable = getRentables[0].Rentable_ID;
    }
    catch (error) {
      console.log("Error fetching rentables:", error);
      throw Object.assign(new Error("Rentable query failed"), { status: 500 });
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
    try {
      const [borrowInsertQuery] = await connection.query(
        `INSERT INTO borrow (Borrower_ID, Rentable_ID, Due_Date) VALUES (?, ?, ?)`,
        [userID, selRentable, dueDateString]
      );
      newBorrowID = borrowInsertQuery.insertId;
      console.log("Borrow ID assigned:", newBorrowID);

      // Update rentable availability to 0 (Borrowed)
      await connection.query(
        `UPDATE rentable SET Availability = 0 WHERE Rentable_ID = ?`,
        [selRentable]
      );
    }
    catch (error) {
      console.log("Insert failed:", error);
      throw Object.assign(new Error("Insertion into borrow failed"), { status: 409 })
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
      .end(JSON.stringify({ message: error.message, status: error.status || 500 }))
  }
  finally {
    connection.release();
  }
}

exports.holdAsset = async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const { assetID } = req.body
    const userID = req.user.id;
    console.log("Recieved data:", { userID, assetID })
    if (!userID || !assetID) {
      console.log("Missing required Fields")
      throw Object.assign(new Error('Missing required fields'), { status: 400 })
    }
    await connection.beginTransaction();
    //check for existing asset
    const [assetCheck] = await connection.query(
      `SELECT Asset_ID FROM asset WHERE Asset_ID = ?`, [assetID]
    )
    if (!assetCheck[0]) {
      throw Object.assign(new Error("Asset not found"), { status: 404 });
    }
    //select rentable to hold
    let selRentable;
    try {
      const [getRentables] = await connection.query(
        `SELECT Rentable_ID FROM rentable WHERE Asset_ID = ? AND Availability = 1`,
        [assetID]
      );
      if (!getRentables[0]) {
        console.log("No rentable available for asset:", assetID);
        throw Object.assign(new Error("No rentable available"), { status: 404 });
      }
      selRentable = getRentables[0].Rentable_ID;
    }
    catch (error) {
      console.log("Error fetching rentables:", error);
      throw Object.assign(new Error("Rentable query failed"), { status: 500 });
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
    try {
      const [holdInsertQuery] = await connection.query(
        `INSERT INTO hold (Holder_ID, Rentable_ID, Hold_Expires) VALUES (?, ?, ?)`,
        [userID, selRentable, holdExpiresString]
      );
      newHoldID = holdInsertQuery.insertId;
      console.log("Hold ID assigned:", newHoldID);
      //Update availability
      await connection.query(
        `UPDATE rentable SET Availability = 3 WHERE Rentable_ID = ?`,
        [selRentable]
      );
    }
    catch (error) {
      console.log("Insert failed:", error);
      throw Object.assign(new Error("Insertion into hold failed"), { status: 409 })
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
      .end(JSON.stringify({ message: error.message, status: error.status || 500 }))
  }
  finally {
    connection.release();
  }
}

exports.cancelHold = async (req, res) => {
  const { holdID } = req.body
  if (!assetID) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ message: "Missing required fields" }));
  }
  try {
    const [cancelResult] = await db.promise().query(`CALL db_cancel_hold(?)`,
      [holdID]
    )
    console.log("Hold canceled successfuly")
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Waitlist added successfully',
    }));
  } catch (error) {
    console.log("Error canceling hold:", error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: error.message, status: 500 }))
  }
}

exports.userCancelHold = async (req, res) => {
  const userID = req.user.id

  const [validHolder] = await db.promise().query(
    `SELECT Borrower_ID FROM borrow WHERE Borrow_ID = ? AND Return_Date IS NULL`,
    [borrowID]
  )
  if (validBorrower.length === 0) {
    return res.writeHead(404, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Borrow does not exist' }));
  }
  if (validBorrower[0] != userID) {
    return res.writeHead(401, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Unauthorized return' }));
  }
  const newReq = {
    ...req,
    params: { id: borrowID },
  };
  return cancelHold(newReq, res);
}

exports.waitlistAsset = async (req, res) => {
  const { assetID } = req.body
  if (!assetID) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ message: "Missing required fields" }));
  }
  const userID = req.user.id;
  const connection = await db.promise().getConnection();
  try {
    connection.beginTransaction();

    const [assetCheck] = await connection.query(
      `SELECT * FROM asset WHERE Asset_ID = ? LIMIT 1`, [assetID]
    )
    if (assetCheck.length === 0) {
      throw Object.assign(new Error("Asset not found"), { status: 404 })
    }
    const [waitlistInsertQuery] = await connection.query(
      'INSERT INTO waitlist (Waitlister_ID, Asset_ID) VALUES (?, ?)',
      [userID, assetID]
    )
    newWaitlistID = waitlistInsertQuery.insertId;

    await connection.commit();
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: "Waitlist entry created", id: newWaitlistID }));
  } catch (error) {
    //waitlist failed
    await connection.rollback();
    console.log("Error in waitlistAsset:", error);
    res.writeHead(error.status || 500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: error.message, status: error.status || 500 }))
  }
  finally {
    connection.release();
  }
}
// Issue any asset (book, CD, audiobook, movie, technology, study-room)
// Issue any asset (book, CD, audiobook, movie, technology, study-room)
exports.issueAsset = async (req, res) => {
  // Map asset type to table name
  const assetTypeMap = {
    'books': 'book_inventory',
    'cds': 'cd_inventory',
    'audiobooks': 'audiobook_inventory',
    'movies': 'movie_inventory',
    'technology': 'technology_inventory',
    'study-rooms': 'study_room'
  };
  const { memberId, assetId, assetType, issueDate, dueDate, quantity = 1 } = req.body;

  if (!memberId || !assetId || !issueDate || !dueDate) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'All fields are required' }));
  }

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

  // Use a transaction for multi-copy issue
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Check Availability
    const [assetResults] = await connection.query(availabilityQuery, [assetId]);

    if (assetResults.length === 0) {
      throw Object.assign(new Error('Asset not found'), { status: 404 });
    }

    if (assetResults[0].Available_Copies < quantity) {
      throw Object.assign(new Error(`Not enough copies available. Requested: ${quantity}, Available: ${assetResults[0].Available_Copies}`), { status: 400 });
    }

    // 2. Get available rentable_ids
    const [rentableResults] = await connection.query(
      'SELECT Rentable_ID FROM rentable WHERE Asset_ID = ? AND Availability = 1 LIMIT ?',
      [assetId, parseInt(quantity)]
    );

    if (rentableResults.length < quantity) {
      throw Object.assign(new Error('Mismatch in available copies count'), { status: 500 });
    }

    const librarianId = req.user?.id || null;
    const rentablesToIssue = rentableResults.map(r => r.Rentable_ID);

    // 3. Create Borrow Records
    const borrowValues = rentablesToIssue.map(rid => [memberId, rid, issueDate, dueDate, librarianId]);
    await connection.query(
      'INSERT INTO borrow (Borrower_ID, Rentable_ID, Borrow_Date, Due_Date, Processed_By) VALUES ?',
      [borrowValues]
    );

    // 4. Update Availability
    if (assetType === 'study-rooms') {
      await connection.query('UPDATE study_room SET Availability = 0 WHERE Asset_ID = ?', [assetId]);
    } else {
      await connection.query('UPDATE rentable SET Availability = 0 WHERE Rentable_ID IN (?)', [rentablesToIssue]);
    }

    await connection.commit();

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: `Successfully issued ${quantity} cop${quantity > 1 ? 'ies' : 'y'}`,
      count: quantity
    }));

  } catch (error) {
    await connection.rollback();
    console.error('Error issuing asset:', error);
    res.writeHead(error.status || 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: error.message || 'Failed to issue asset' }));
  } finally {
    connection.release();
  }
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

  try {
    await connection.beginTransaction();

    //Get rentable to be returned
    const [borrowRecord] = await connection.query(
      'SELECT Rentable_ID, Due_Date, Fee_Incurred FROM borrow WHERE Borrow_ID = ? AND Return_Date IS NULL',
      [id]
    );

    if (!borrowRecord.length) {
      throw Object.assign(new Error('Borrow record not found or already returned'), { status: 404 });
    }
    const rentableId = borrowRecord[0].Rentable_ID;
    const dueDate = new Date(borrowRecord[0].Due_Date);
    const currentFee = parseFloat(borrowRecord[0].Fee_Incurred || 0);
    const today = new Date();

    // Calculate fine using date-only difference to match MySQL DATEDIFF
    let totalFine = 0;
    const todayDateOnly = new Date(today.setHours(0, 0, 0, 0));
    const dueDateOnly = new Date(dueDate.setHours(0, 0, 0, 0));

    if (todayDateOnly > dueDateOnly) {
      const diffTime = Math.abs(todayDateOnly - dueDateOnly);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Get fine rate and max days from config
      const [configResult] = await connection.query("SELECT Config_Key, Config_Value FROM system_config WHERE Config_Key IN ('FINE_RATE_PER_DAY', 'FINE_MAX_DAYS')");

      let fineRate = 1.00;
      let maxDays = 30;

      configResult.forEach(row => {
        if (row.Config_Key === 'FINE_RATE_PER_DAY') fineRate = parseFloat(row.Config_Value);
        if (row.Config_Key === 'FINE_MAX_DAYS') maxDays = parseInt(row.Config_Value);
      });

      // Cap the days overdue
      const cappedDays = Math.min(diffDays, maxDays);
      totalFine = cappedDays * fineRate;
    }

    // Calculate remaining debt: Total Fine - Paid Amount (currentFee)
    // Ensure debt is not negative (in case of overpayment or logic quirk)
    const newFee = Math.max(0, totalFine - currentFee);

    // Update borrow record with return date, fine (Debt), and Processed_By
    const updateQuery = 'UPDATE borrow SET Return_Date = NOW(), Fee_Incurred = ?, Processed_By = ? WHERE Borrow_ID = ? AND Return_Date IS NULL';

    await connection.query(updateQuery, [newFee, req.user.id, id]);

    await connection.query(
      `UPDATE rentable SET Availability = 1 WHERE Rentable_ID = ?`, [rentableId]
    );

    // Auto-resolve low stock alert if stock is now sufficient
    try {
      // Get Asset_ID and Type
      const [assetInfo] = await connection.query(
        `SELECT r.Asset_ID, a.Asset_Type 
         FROM rentable r 
         JOIN asset a ON r.Asset_ID = a.Asset_ID 
         WHERE r.Rentable_ID = ?`,
        [rentableId]
      );

      if (assetInfo.length > 0) {
        const { Asset_ID, Asset_Type } = assetInfo[0];

        // Get current available count
        const [countResult] = await connection.query(
          `SELECT COUNT(*) as count FROM rentable WHERE Asset_ID = ? AND Availability = 1`,
          [Asset_ID]
        );
        const availableCount = countResult[0].count;

        // Determine threshold
        let threshold = 1; // Default
        if (Asset_Type === 'books') threshold = 2;
        // Fetch from config if needed, but hardcoding for speed/reliability as per current setup
        // ideally we'd fetch 'LOW_STOCK_THRESHOLD_' + Asset_Type.toUpperCase()

        // If stock is healthy, remove alert
        if (availableCount > threshold) {
          await connection.query(
            `DELETE FROM low_stock_alerts WHERE Asset_ID = ?`,
            [Asset_ID]
          );
          console.log(`Auto-resolved low stock alert for Asset ${Asset_ID} (Count: ${availableCount})`);
        }
      }
    } catch (resolveErr) {
      console.error('Error auto-resolving low stock alert:', resolveErr);
      // Don't fail the return transaction just because alert cleanup failed
    }

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
  const { borrowID } = req.params;
  const userID = req.user.id

  const [validBorrower] = await db.promise().query(
    `SELECT Borrower_ID FROM borrow WHERE Borrow_ID = ? AND Return_Date IS NULL`,
    [borrowID]
  )
  if (validBorrower.length === 0) {
    console.error("Borrow length is 0")
    res.writeHead(404, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ message: 'Borrow does not exist' }));
  }
  if (validBorrower[0].Borrower_ID != userID) {
    console.error("User given", userID, "does not match borrow requester", validBorrower[0].Borrower_ID)
    res.writeHead(401, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ message: 'Unauthorized return' }));
  }

  const newReq = {
    ...req,
    params: { id: borrowID },
  };
  return exports.returnAsset(newReq, res);
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

const helpGetBorrows = async (user_id, has_returned = true, columns = ['*']) => {//helper
  const colString = columns.join(', ')
  const condition = has_returned ? '' : 'AND Return_Date IS NULL';
  const [borrowResults] = await db.promise().query(
    `SELECT ${colString} FROM borrow WHERE Borrower_ID=? ${(condition)}`,
    [user_id]
  );
  return borrowResults;
}

const helpGetHolds = async (user_id, has_inactive = true, columns = ['*']) => {//helper
  const colString = columns.join(', ')
  const condition = has_inactive ? '' : 'AND active_key IS NULL';
  const [holdResults] = await db.promise().query(
    `SELECT ${colString} FROM hold WHERE Holder_ID=? ${(condition)}`,
    [user_id]
  );
  return holdResults;
}

const helpGetWaits = async (user_id, has_inactive = true, columns = ['*']) => {//helper
  const colString = columns.join(', ')
  const condition = has_inactive ? '' : 'AND active_key IS NULL';
  const [waitsResults] = await db.promise().query(
    `SELECT ${colString} FROM waitlist WHERE Waitlister_ID=? ${(condition)}`,
    [user_id]
  );
  return waitsResults;
}

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

// Get borrows for the logged-in user
exports.getUserBorrows = async (req, res) => {
  const userId = req.user.id;
  try {
    const borrows = await helpGetBorrows(userId, true); // true to include returned items

    // Enhance with asset details if needed, but helpGetBorrows might be raw
    // Let's use a custom query to get full details similar to getAllRecords but filtered
    const query = `
      SELECT 
        b.Borrow_ID,
        b.Borrower_ID as User_ID,
        r.Asset_ID,
        COALESCE(bk.Title, cd.Title, ab.Title, mv.Title, CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Asset_Title,
        COALESCE(bk.Author, cd.Artist, ab.Author, mv.Title, t.Model_Num, sr.Room_Number) as Author_Artist,
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
        b.Fee_Incurred as feeIncurred,
        CASE 
            WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() THEN DATEDIFF(CURDATE(), b.Due_Date)
            ELSE 0
        END as Overdue_Days
      FROM borrow b
      JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
      LEFT JOIN book bk ON r.Asset_ID = bk.Asset_ID
      LEFT JOIN cd ON r.Asset_ID = cd.Asset_ID
      LEFT JOIN audiobook ab ON r.Asset_ID = ab.Asset_ID
      LEFT JOIN movie mv ON r.Asset_ID = mv.Asset_ID
      LEFT JOIN technology t ON r.Asset_ID = t.Asset_ID
      LEFT JOIN study_room sr ON r.Asset_ID = sr.Asset_ID
      WHERE b.Borrower_ID = ?
      ORDER BY b.Borrow_Date DESC
    `;

    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching user borrows:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('Error in getUserBorrows:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Failed to fetch user borrows', error: error.message }));
  }
};

// Get dashboard stats for the logged-in student
exports.getStudentDashboardStats = async (req, res) => {
  const userId = req.user.id;

  try {
    const connection = await db.promise();

    // 1. Summary Counts
    const summaryQueries = {
      borrowed: `SELECT COUNT(*) as count FROM borrow WHERE Borrower_ID = ? AND Return_Date IS NULL`,
      overdue: `SELECT COUNT(*) as count FROM borrow WHERE Borrower_ID = ? AND Return_Date IS NULL AND Due_Date < CURDATE()`,
      bookings: `SELECT COUNT(*) as count FROM borrow b 
                 JOIN rentable r ON b.Rentable_ID = r.Rentable_ID 
                 JOIN study_room sr ON r.Asset_ID = sr.Asset_ID 
                 WHERE b.Borrower_ID = ? AND b.Return_Date IS NULL AND b.Due_Date >= NOW()`,
      // Note: Room bookings are stored in borrow table? 
      // Based on issueAsset, yes, study rooms are issued. 
      // But usually bookings are future events. 
      // If "Book a Room" creates a borrow record immediately, then this works.
      // If there's a separate booking system, we need to check. 
      // Looking at issueAsset: it inserts into borrow. 
      // Looking at holdAsset: it inserts into hold.
      // Let's assume "Upcoming Room Bookings" are active borrows of study rooms that haven't happened yet? 
      // Or maybe they are Holds? 
      // "Reservations/Holds" usually implies books waiting to be picked up.
      // "Room Bookings" might be a specific type of Hold or Borrow.
      // For now, let's assume Room Bookings are Holds on Study Rooms or Borrows of Study Rooms.
      // If it's a future booking, it's likely a Hold or a Borrow with future dates.
      // Let's check if there's a 'booking' table. No.
      // Let's assume Room Bookings are Borrows of type 'Study Room' that are active.
      reservations: `SELECT COUNT(*) as count FROM hold WHERE Holder_ID = ? AND active_key IS NULL`,
    };

    // Fines Calculation
    const [configRes] = await connection.query("SELECT Config_Value FROM system_config WHERE Config_Key = 'FINE_RATE_PER_DAY'");
    const fineRate = configRes.length ? parseFloat(configRes[0].Config_Value) : 1.00;

    const fineQuery = `
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN b.Return_Date IS NULL AND b.Due_Date < CURDATE() 
              THEN DATEDIFF(CURDATE(), b.Due_Date) * ?
              WHEN b.Return_Date IS NOT NULL AND b.Fee_Incurred > 0
              THEN b.Fee_Incurred
              ELSE 0 
            END
          ), 0) as total
        FROM borrow b
        WHERE b.Borrower_ID = ?
    `;

    // 2. Preview Lists
    const previewQueries = {
      // Current Borrowings (excluding rooms)
      borrowings: `
        SELECT 
          b.Borrow_ID,
          COALESCE(bk.Title, cd.Title, ab.Title, mv.Title, CONCAT('Tech-', t.Model_Num)) as Title,
          b.Due_Date,
          CASE 
            WHEN b.Due_Date < CURDATE() THEN 'Overdue'
            ELSE 'Active'
          END as Status
        FROM borrow b
        JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
        LEFT JOIN book bk ON r.Asset_ID = bk.Asset_ID
        LEFT JOIN cd ON r.Asset_ID = cd.Asset_ID
        LEFT JOIN audiobook ab ON r.Asset_ID = ab.Asset_ID
        LEFT JOIN movie mv ON r.Asset_ID = mv.Asset_ID
        LEFT JOIN technology t ON r.Asset_ID = t.Asset_ID
        LEFT JOIN study_room sr ON r.Asset_ID = sr.Asset_ID
        WHERE b.Borrower_ID = ? AND b.Return_Date IS NULL AND sr.Asset_ID IS NULL
        ORDER BY b.Due_Date ASC
        LIMIT 3
      `,
      // Upcoming Room Bookings (Borrows of study rooms)
      bookings: `
        SELECT 
          b.Borrow_ID,
          CONCAT('Room ', sr.Room_Number) as Room,
          b.Borrow_Date as Start_Time,
          b.Due_Date as End_Time
        FROM borrow b
        JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
        JOIN study_room sr ON r.Asset_ID = sr.Asset_ID
        WHERE b.Borrower_ID = ? AND b.Return_Date IS NULL
        ORDER BY b.Borrow_Date ASC
        LIMIT 2
      `,
      // Reservations / Holds
      reservations: `
        SELECT 
          h.Hold_ID,
          COALESCE(bk.Title, cd.Title, ab.Title, mv.Title, CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Title,
          h.Hold_Date,
          'Pending' as Status -- Simplified status
        FROM hold h
        JOIN rentable r ON h.Rentable_ID = r.Rentable_ID
        LEFT JOIN book bk ON r.Asset_ID = bk.Asset_ID
        LEFT JOIN cd ON r.Asset_ID = cd.Asset_ID
        LEFT JOIN audiobook ab ON r.Asset_ID = ab.Asset_ID
        LEFT JOIN movie mv ON r.Asset_ID = mv.Asset_ID
        LEFT JOIN technology t ON r.Asset_ID = t.Asset_ID
        LEFT JOIN study_room sr ON r.Asset_ID = sr.Asset_ID
        WHERE h.Holder_ID = ? AND h.active_key IS NULL
        ORDER BY h.Hold_Date DESC
        LIMIT 2
      `
    };

    const stats = {
      summary: { borrowed: 0, overdue: 0, bookings: 0, reservations: 0, fines: 0 },
      preview: { borrowings: [], bookings: [], reservations: [] }
    };

    // Execute Summary Queries
    const [borrowedRes] = await connection.query(summaryQueries.borrowed, [userId]);
    stats.summary.borrowed = borrowedRes[0].count;

    const [overdueRes] = await connection.query(summaryQueries.overdue, [userId]);
    stats.summary.overdue = overdueRes[0].count;

    const [bookingsRes] = await connection.query(summaryQueries.bookings, [userId]);
    stats.summary.bookings = bookingsRes[0].count;

    const [reservationsRes] = await connection.query(summaryQueries.reservations, [userId]);
    stats.summary.reservations = reservationsRes[0].count;

    const [finesRes] = await connection.query(fineQuery, [fineRate, userId]);
    stats.summary.fines = parseFloat(finesRes[0].total || 0).toFixed(2);

    // Execute Preview Queries
    const [borrowingsList] = await connection.query(previewQueries.borrowings, [userId]);
    stats.preview.borrowings = borrowingsList;

    const [bookingsList] = await connection.query(previewQueries.bookings, [userId]);
    stats.preview.bookings = bookingsList;

    const [reservationsList] = await connection.query(previewQueries.reservations, [userId]);
    stats.preview.reservations = reservationsList;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));

  } catch (error) {
    console.error('Error fetching student dashboard stats:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Failed to fetch stats', error: error.message }));
  }
};
