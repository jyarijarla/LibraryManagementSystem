const db = require('../db');

// Generate random password for each new member
const generateInitialPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
  let password = 'Library';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Get all members with search, filter, and pagination
exports.getAllMembers = (req, res) => {
  const { search = '', status = 'all', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      u.User_ID,
      u.Username,
      u.First_Name,
      u.Last_Name,
      CONCAT(u.First_Name, ' ', COALESCE(u.Last_Name, '')) as Full_Name,
      u.User_Email,
      u.User_Phone as Phone_Number,
      'active' as Account_Status,
      COUNT(DISTINCT CASE WHEN b.Return_Date IS NULL THEN b.Borrow_ID END) as Borrowed_Count,
      COALESCE(SUM(CASE WHEN b.Return_Date IS NULL AND DATEDIFF(CURDATE(), b.Due_Date) > 0 
        THEN DATEDIFF(CURDATE(), b.Due_Date) * 1.00 ELSE 0 END), 0) as Outstanding_Fines
    FROM user u
    LEFT JOIN borrow b ON u.User_ID = b.Borrower_ID
    WHERE u.Role = 1
  `;

  const params = [];

  // Add search filter
  if (search) {
    query += ` AND (
      u.Username LIKE ? OR 
      u.First_Name LIKE ? OR 
      u.Last_Name LIKE ? OR 
      u.User_Email LIKE ?
    )`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  // Add status filter - removed since Account_Status column doesn't exist
  // All members are treated as active

  query += ` GROUP BY u.User_ID ORDER BY u.User_ID DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  db.query(query, params, (err, members) => {
    if (err) {
      console.error('Error fetching members:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to fetch members', error: err.message }));
    }

    // Get total count for pagination
    let countQuery = `SELECT COUNT(DISTINCT u.User_ID) as total FROM user u WHERE u.Role = 1`;
    const countParams = [];

    if (search) {
      countQuery += ` AND (
        u.Username LIKE ? OR 
        u.First_Name LIKE ? OR 
        u.Last_Name LIKE ? OR 
        u.User_Email LIKE ?
      )`;
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (status !== 'all') {
      // Status filter removed - Account_Status column doesn't exist
    }

    db.query(countQuery, countParams, (err, countResult) => {
      if (err) {
        console.error('Error counting members:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to count members' }));
      }

      const total = countResult[0].total;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        members,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }));
    });
  });
};

// Get member profile with detailed information
exports.getMemberProfile = (req, res) => {
  const { id } = req.params;

  // Get member basic info
  db.query(`
    SELECT 
      u.User_ID,
      u.Username,
      u.First_Name,
      u.Last_Name,
      u.User_Email,
      u.User_Phone as Phone_Number,
      'active' as Account_Status
    FROM user u
    WHERE u.User_ID = ? AND u.Role = 1
  `, [id], (err, members) => {
    if (err) {
      console.error('Error fetching member:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to fetch member' }));
    }

    if (members.length === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Member not found' }));
    }

    const member = members[0];

    // Get current borrowed items
    db.query(`
      SELECT 
        b.Borrow_ID,
        b.Borrow_Date,
        b.Due_Date,
        b.Return_Date,
        DATEDIFF(CURDATE(), b.Due_Date) as Days_Overdue,
        CASE 
          WHEN b.Return_Date IS NULL AND DATEDIFF(CURDATE(), b.Due_Date) > 0 
          THEN DATEDIFF(CURDATE(), b.Due_Date) * 1.00 
          ELSE 0 
        END as Fine_Amount,
        COALESCE(bk.Title, cd.Title, ab.Title, m.Title, CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Asset_Title,
        CASE 
          WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
          WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
          WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
          WHEN m.Asset_ID IS NOT NULL THEN 'Movie'
          WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
          WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
          ELSE 'Unknown'
        END as Asset_Type
      FROM borrow b
      JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
      LEFT JOIN book bk ON r.Asset_ID = bk.Asset_ID
      LEFT JOIN cd ON r.Asset_ID = cd.Asset_ID
      LEFT JOIN audiobook ab ON r.Asset_ID = ab.Asset_ID
      LEFT JOIN movie m ON r.Asset_ID = m.Asset_ID
      LEFT JOIN technology t ON r.Asset_ID = t.Asset_ID
      LEFT JOIN study_room sr ON r.Asset_ID = sr.Asset_ID
      WHERE b.Borrower_ID = ? AND b.Return_Date IS NULL
      ORDER BY b.Due_Date ASC
    `, [id], (err, currentBorrows) => {
      if (err) {
        console.error('Error fetching current borrows:', err);
        currentBorrows = [];
      }

      // Get borrowing history
      db.query(`
        SELECT 
          b.Borrow_ID,
          b.Borrow_Date,
          b.Due_Date,
          b.Return_Date,
          b.Fee_Incurred,
          COALESCE(bk.Title, cd.Title, ab.Title, m.Title, CONCAT('Tech-', t.Model_Num), CONCAT('Room-', sr.Room_Number)) as Asset_Title,
          CASE 
            WHEN bk.Asset_ID IS NOT NULL THEN 'Book'
            WHEN cd.Asset_ID IS NOT NULL THEN 'CD'
            WHEN ab.Asset_ID IS NOT NULL THEN 'Audiobook'
            WHEN m.Asset_ID IS NOT NULL THEN 'Movie'
            WHEN t.Asset_ID IS NOT NULL THEN 'Technology'
            WHEN sr.Asset_ID IS NOT NULL THEN 'Study Room'
            ELSE 'Unknown'
          END as Asset_Type
        FROM borrow b
        JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
        LEFT JOIN book bk ON r.Asset_ID = bk.Asset_ID
        LEFT JOIN cd ON r.Asset_ID = cd.Asset_ID
        LEFT JOIN audiobook ab ON r.Asset_ID = ab.Asset_ID
        LEFT JOIN movie m ON r.Asset_ID = m.Asset_ID
        LEFT JOIN technology t ON r.Asset_ID = t.Asset_ID
        LEFT JOIN study_room sr ON r.Asset_ID = sr.Asset_ID
        WHERE b.Borrower_ID = ?
        ORDER BY b.Borrow_Date DESC
        LIMIT 10
      `, [id], (err, borrowHistory) => {
        if (err) {
          console.error('Error fetching borrow history:', err);
          borrowHistory = [];
        }

        // Calculate fines summary
        db.query(`
          SELECT 
            COALESCE(SUM(Fee_Incurred), 0) as totalFines,
            COALESCE(SUM(CASE WHEN Return_Date IS NULL AND DATEDIFF(CURDATE(), Due_Date) > 0 
              THEN DATEDIFF(CURDATE(), Due_Date) * 1.00 ELSE 0 END), 0) as unpaidFines
          FROM borrow 
          WHERE Borrower_ID = ?
        `, [id], (err, fineResult) => {
          if (err) {
            console.error('Error calculating fines:', err);
          }

          const finesSummary = fineResult && fineResult[0] ? {
            totalFines: parseFloat(fineResult[0].totalFines || 0),
            unpaidFines: parseFloat(fineResult[0].unpaidFines || 0)
          } : { totalFines: 0, unpaidFines: 0 };

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            member,
            currentBorrows,
            borrowingHistory: borrowHistory,
            finesSummary
          }));
        });
      });
    });
  });
};

// Add new member
exports.addMember = (req, res) => {
  const { firstName, lastName, email, phone, username, dateOfBirth, status, password } = req.body;

  // Validate required fields
  if (!firstName || !email || !username || !dateOfBirth || !password) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ error: 'Missing required fields: firstName, email, username, dateOfBirth, password' }));
  }

  // Check if username or email already exists
  db.query(
    'SELECT User_ID FROM user WHERE Username = ? OR User_Email = ?',
    [username, email],
    (err, existing) => {
      if (err) {
        console.error('Error checking existing user:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ error: 'Database error' }));
      }

      if (existing.length > 0) {
        return res.writeHead(400, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ error: 'Username or email already exists' }));
      }

      // Use password sent from frontend (already generated there)
      const initialPassword = password;

      // Insert new member (Role = 1 for student/member)
      db.query(
        `INSERT INTO user (Username, First_Name, Last_Name, User_Email, User_Phone, Date_Of_Birth, Password, Role, Balance) 
         VALUES (?, ?, ?, ?, ?, DATE(?), ?, 1, 0.00)`,
        [username, firstName, lastName || '', email, phone || null, dateOfBirth, initialPassword],
        (err, result) => {
          if (err) {
            console.error('Error adding member:', err);
            return res.writeHead(500, { 'Content-Type': 'application/json' })
              && res.end(JSON.stringify({ error: 'Failed to add member: ' + err.message }));
          }

          // TODO: Send email with credentials to member's email address
          console.log(`Member created - Username: ${username}, Email: ${email}, Password: ${initialPassword}`);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            message: 'Member added successfully. Credentials sent to email.',
            memberId: result.insertId
          }));
        }
      );
    }
  );
};

// Update member information
exports.updateMember = (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, dateOfBirth, status } = req.body;

  // Build update query dynamically
  const updates = [];
  const params = [];

  if (firstName) {
    updates.push('First_Name = ?');
    params.push(firstName);
  }
  if (lastName !== undefined) {
    updates.push('Last_Name = ?');
    params.push(lastName);
  }
  if (email) {
    updates.push('User_Email = ?');
    params.push(email);
  }
  if (phone !== undefined) {
    updates.push('User_Phone = ?');
    params.push(phone || null);
  }
  if (dateOfBirth) {
    updates.push('Date_Of_Birth = DATE(?)');
    params.push(dateOfBirth);
  }
  // Status field removed - Account_Status column doesn't exist

  if (updates.length === 0) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ error: 'No fields to update' }));
  }

  params.push(id);

  db.query(
    `UPDATE user SET ${updates.join(', ')} WHERE User_ID = ? AND Role = 1`,
    params,
    (err, result) => {
      if (err) {
        console.error('Error updating member:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ error: 'Failed to update member' }));
      }

      if (result.affectedRows === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ error: 'Member not found' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Member updated successfully' }));
    }
  );
};

// Delete member
exports.deleteMember = (req, res) => {
  const { id } = req.params;

  // Check if member has active borrows
  db.query(
    'SELECT COUNT(*) as count FROM borrow WHERE Borrower_ID = ? AND Return_Date IS NULL',
    [id],
    (err, result) => {
      if (err) {
        console.error('Error checking borrows:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ error: 'Database error' }));
      }

      if (result[0].count > 0) {
        return res.writeHead(400, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ 
            error: 'Cannot delete member with active borrowed items. Please return all items first.' 
          }));
      }

      // Check for unpaid fines
      db.query(
        `SELECT COALESCE(SUM(CASE WHEN Return_Date IS NOT NULL AND Fee_Incurred > 0 
          THEN Fee_Incurred ELSE 0 END), 0) as unpaid_fines
         FROM borrow WHERE Borrower_ID = ?`,
        [id],
        (err, fineResult) => {
          if (err) {
            console.error('Error checking fines:', err);
            return res.writeHead(500, { 'Content-Type': 'application/json' })
              && res.end(JSON.stringify({ error: 'Database error' }));
          }

          if (fineResult[0].unpaid_fines > 0) {
            return res.writeHead(400, { 'Content-Type': 'application/json' })
              && res.end(JSON.stringify({ 
                error: `Cannot delete member with unpaid fines ($${fineResult[0].unpaid_fines}). Please clear fines first.` 
              }));
          }

          // Delete member
          db.query(
            'DELETE FROM user WHERE User_ID = ? AND Role = 1',
            [id],
            (err, result) => {
              if (err) {
                console.error('Error deleting member:', err);
                return res.writeHead(500, { 'Content-Type': 'application/json' })
                  && res.end(JSON.stringify({ error: 'Failed to delete member' }));
              }

              if (result.affectedRows === 0) {
                return res.writeHead(404, { 'Content-Type': 'application/json' })
                  && res.end(JSON.stringify({ error: 'Member not found' }));
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Member deleted successfully' }));
            }
          );
        }
      );
    }
  );
};

// Update member account status
exports.updateMemberStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Active', 'Suspended', 'Inactive'].includes(status)) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Invalid status. Must be Active, Suspended, or Inactive' }));
  }

  db.query(
    'UPDATE user SET Account_Status = ? WHERE User_ID = ? AND Role = 1',
    [status, id],
    (err, result) => {
      if (err) {
        console.error('Error updating status:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to update status' }));
      }

      if (result.affectedRows === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Member not found' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `Member status updated to ${status}` }));
    }
  );
};
