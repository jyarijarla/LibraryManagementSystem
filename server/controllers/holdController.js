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

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hold cancelled successfully' }));
  });
};