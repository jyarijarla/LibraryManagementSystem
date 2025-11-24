const db = require('../db');

// Get all holds with detailed information
exports.getAllHolds = (req, res) => {
  const query = `
    SELECT 
      h.Hold_ID,
      h.Hold_Date,
      h.Hold_Expires,
      h.Canceled_At,
      h.Fulfilling_Borrow_ID,
      u.User_ID,
      CONCAT(u.First_Name, ' ', IFNULL(u.Last_Name, '')) AS Member_Name,
      u.User_Email,
      COALESCE(bk.Title, cd.Title, ab.Title, m.Title, 
        CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Asset_Title,
      at.type_name as Asset_Type,
      CASE 
        WHEN h.Canceled_At IS NOT NULL THEN 'Cancelled'
        WHEN h.Fulfilling_Borrow_ID IS NOT NULL THEN 'Fulfilled'
        WHEN h.Hold_Expires < CURDATE() THEN 'Expired'
        ELSE 'Active'
      END as Status
    FROM hold h
    JOIN user u ON h.Holder_ID = u.User_ID
    JOIN rentable r ON h.Rentable_ID = r.Rentable_ID
    JOIN asset a ON r.Asset_ID = a.Asset_ID
    JOIN asset_type at ON a.Asset_TypeID = at.type_id
    LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
    LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    ORDER BY h.Hold_Date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching holds:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to fetch holds' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

// Create a new hold
exports.createHold = (req, res) => {
  const { memberId, assetId } = req.body;

  if (!memberId || !assetId) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Member ID and Asset ID are required' }));
  }

  // First get a rentable ID for this asset
  // Ideally we should pick one that isn't already held or borrowed, but for now just pick any valid one
  // In a real system, we'd manage a queue. Here we'll just attach to the first rentable.
  db.query('SELECT Rentable_ID FROM rentable WHERE Asset_ID = ? LIMIT 1', [assetId], (err, results) => {
    if (err || results.length === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Asset not found or no copies available' }));
    }

    const rentableId = results[0].Rentable_ID;
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 7); // Default 7 day hold

    const query = `
      INSERT INTO hold (Holder_ID, Rentable_ID, Hold_Expires)
      VALUES (?, ?, ?)
    `;

    db.query(query, [memberId, rentableId, expiresDate], (err, result) => {
      if (err) {
        console.error('Error creating hold:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to create hold' }));
      }

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Hold created successfully',
        holdId: result.insertId
      }));
    });
  });
};

// Cancel a hold
exports.cancelHold = (req, res) => {
  const holdId = req.params.id;

  const query = `
    UPDATE hold 
    SET Canceled_At = NOW() 
    WHERE Hold_ID = ? AND Canceled_At IS NULL AND Fulfilling_Borrow_ID IS NULL
  `;

  db.query(query, [holdId], (err, result) => {
    if (err) {
      console.error('Error cancelling hold:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to cancel hold' }));
    }
    if (result.affectedRows === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Hold not found or already processed' }));
    }
    db.query(
      `UPDATE rentable SET Availability = 1 WHERE Rentable_ID = 63`,
      (err, result) => {
        if (err || result.affectedRows === 0) {
          console.error("Very bad error: Hold canceled but rentable availability not updated");
          return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Hold partialy canceled, notify dev' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Hold cancelled successfully' }));
      }
    )
  });
};

exports.holdAsset = async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const { assetID } = req.params
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

exports.userCancelHold = async (req, res) => {
  const userID = req.user.id
  const { holdID } = req.params

  const [validHolder] = await db.promise().query(
    `SELECT Holder_ID FROM hold WHERE Hold_ID = ? AND active_key IS NOT NULL`,
    [holdID]
  )
  if (validHolder.length === 0) {
    console.error("validHolder empty")
    return res.writeHead(404, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Hold does not exist or already canceled' }));
  }
  if (validHolder[0].Holder_ID != userID) {
    console.error("Holder_ID:", validHolder[0].Holder_ID, "does not match userID:", userID )
    return res.writeHead(401, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Unauthorized hold cancel' }));
  }
  const newReq = {
    ...req,
    params: { id: holdID },
  };
  return exports.cancelHold(newReq, res);
}

exports.waitlistAsset = async (req, res) => {
  const { assetID } = req.params
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

// Get holds for the logged-in user
exports.getUserHolds = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT 
      h.Hold_ID,
      h.Hold_Date,
      h.Hold_Expires,
      h.Canceled_At,
      h.Fulfilling_Borrow_ID,
      h.active_key,
      COALESCE(bk.Title, cd.Title, ab.Title, m.Title, 
        CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Asset_Title,
      at.type_name as Asset_Type,
      CASE 
        WHEN h.Canceled_At IS NOT NULL THEN 'Cancelled'
        WHEN h.Fulfilling_Borrow_ID IS NOT NULL THEN 'Fulfilled'
        WHEN h.Hold_Expires < CURDATE() THEN 'Expired'
        ELSE 'Active'
      END as Status
    FROM hold h
    JOIN rentable r ON h.Rentable_ID = r.Rentable_ID
    JOIN asset a ON r.Asset_ID = a.Asset_ID
    JOIN asset_type at ON a.Asset_TypeID = at.type_id
    LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
    LEFT JOIN cd ON a.Asset_ID = cd.Asset_ID
    LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
    LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
    LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
    LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
    WHERE h.Holder_ID = ?
    ORDER BY h.Hold_Date DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user holds:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to fetch user holds' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};