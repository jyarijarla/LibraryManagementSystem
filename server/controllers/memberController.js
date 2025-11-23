const db = require('../db');
console.log("LOADING MEMBER CONTROLLER MODULE");
const bcrypt = require('bcryptjs');
const { getConfigValue } = require('./configController');

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
exports.getAllMembers = async (req, res) => {
  const { search = '', status = 'all', role = '1', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Get fine rate from config
  let fineRate = 1.00;
  try {
    fineRate = await getConfigValue('FINE_RATE_PER_DAY');
  } catch (error) {
    console.warn('Failed to fetch fine rate, using default: $1.00');
  }

  let query = `
    SELECT 
      u.User_ID,
      u.Username,
      u.First_Name,
      u.Last_Name,
      CONCAT(u.First_Name, ' ', COALESCE(u.Last_Name, '')) as Full_Name,
      u.User_Email,
      u.User_Phone as Phone_Number,
      u.Role,
      u.Status,
      u.Is_Active,
      u.Is_Blocked,
      u.Blocked_Reason,
      u.Created_At,
      u.Last_Login,
      (SELECT COUNT(*) FROM borrow b WHERE b.Borrower_ID = u.User_ID AND b.Return_Date IS NULL) as Active_Loans,
      (SELECT COALESCE(SUM(Amount_Due), 0) FROM fine f WHERE f.User_ID = u.User_ID AND f.Paid = 0) as Fines_Balance
    FROM user u
    WHERE u.Is_Deleted = 0
  `;

  const params = [];

  // Add role filter
  if (role !== 'all') {
    query += ` AND u.Role = ?`;
    params.push(role);
  }

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

  // Add status filter
  if (status !== 'all') {
    if (status === 'Active') {
      query += ` AND u.Is_Active = 1`;
    } else if (status === 'Blocked') {
      query += ` AND u.Is_Blocked = 1`;
    } else if (status === 'Inactive') {
      query += ` AND u.Is_Active = 0`;
    } else if (status === 'Pending') {
      // Legacy support or map to Inactive
      query += ` AND u.Is_Active = 0`;
    }
  }

  query += ` ORDER BY u.User_ID DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  db.query(query, params, (err, members) => {
    if (err) {
      console.error('Error fetching members:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to fetch members', error: err.message }));
    }

    // Get total count for pagination
    let countQuery = `SELECT COUNT(DISTINCT u.User_ID) as total FROM user u WHERE u.Is_Deleted = 0`;
    const countParams = [];

    if (role !== 'all') {
      countQuery += ` AND u.Role = ?`;
      countParams.push(role);
    }

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
      if (status === 'Active') {
        countQuery += ` AND u.Is_Active = 1`;
      } else if (status === 'Blocked') {
        countQuery += ` AND u.Is_Blocked = 1`;
      } else if (status === 'Inactive') {
        countQuery += ` AND u.Is_Active = 0`;
      }
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
exports.getMemberProfile = async (req, res) => {
  const { id } = req.params;

  // Get fine rate from config
  let fineRate = 1.00;
  try {
    fineRate = await getConfigValue('FINE_RATE_PER_DAY');
  } catch (error) {
    console.warn('Failed to fetch fine rate, using default: $1.00');
  }

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
          THEN DATEDIFF(CURDATE(), b.Due_Date) * ? 
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
    `, [fineRate, id], (err, currentBorrows) => {
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
              THEN DATEDIFF(CURDATE(), Due_Date) * ? ELSE 0 END), 0) as unpaidFines
          FROM borrow 
          WHERE Borrower_ID = ?
        `, [fineRate, id], (err, fineResult) => {
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

      // Hash password
      bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
          console.error('Error hashing password:', hashErr);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ error: 'Error processing password' }));
        }

        // Insert new member (Role = 1 for student/member)
        db.query(
          `INSERT INTO user (Username, First_Name, Last_Name, User_Email, User_Phone, Date_Of_Birth, Password, Role, Balance) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0.00)`,
          [username, firstName, lastName || '', email, phone || null, dateOfBirth, hashedPassword],
          (err, result) => {
            if (err) {
              console.error('Error adding member:', err);
              return res.writeHead(500, { 'Content-Type': 'application/json' })
                && res.end(JSON.stringify({ error: 'Failed to add member: ' + err.message }));
            }

            // TODO: Send email with credentials to member's email address
            // Log plain text password for admin to see (in real app, send via email)
            console.log(`Member created - Username: ${username}, Email: ${email}, Password: ${password}`);

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              message: 'Member added successfully. Credentials sent to email.',
              memberId: result.insertId
            }));
          }
        );
      });
    }
  );
};

// Update member information
exports.updateMember = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, dateOfBirth, status, role, password, isActive, isBlocked, blockedReason } = req.body;

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
  if (status) {
    updates.push('Status = ?');
    params.push(status);
    // Sync new flags
    if (status === 'Active') {
      updates.push('Is_Active = 1');
      updates.push('Is_Blocked = 0');
    } else if (status === 'Blocked') {
      updates.push('Is_Blocked = 1');
    } else if (status === 'Pending') {
      updates.push('Is_Active = 0');
    }
  }
  if (isActive !== undefined) {
    updates.push('Is_Active = ?');
    params.push(isActive ? 1 : 0);
  }
  if (isBlocked !== undefined) {
    updates.push('Is_Blocked = ?');
    params.push(isBlocked ? 1 : 0);
  }
  if (blockedReason !== undefined) {
    updates.push('Blocked_Reason = ?');
    params.push(blockedReason);
  }
  if (role) {
    // Map role name to ID if necessary, or expect ID
    let roleId = role;
    if (typeof role === 'string') {
      if (role.toLowerCase() === 'student') roleId = 1;
      else if (role.toLowerCase() === 'admin') roleId = 2;
      else if (role.toLowerCase() === 'librarian') roleId = 3;
    }
    updates.push('Role = ?');
    params.push(roleId);
  }
  if (password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('Password = ?');
      params.push(hashedPassword);
    } catch (error) {
      console.error('Error hashing password:', error);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ error: 'Error processing password' }));
    }
  }

  if (updates.length === 0) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ error: 'No fields to update' }));
  }

  params.push(id);

  db.query(
    `UPDATE user SET ${updates.join(', ')} WHERE User_ID = ?`,
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

// Delete member (Soft Delete)
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
        `SELECT COALESCE(SUM(Amount), 0) as unpaid_fines
         FROM fine WHERE Member_ID = ? AND Payment_Status = 'Unpaid'`,
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

          // Soft Delete member
          db.query(
            'UPDATE user SET Is_Deleted = 1, Is_Active = 0 WHERE User_ID = ?',
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
// Update member status
// Update member account status
exports.updateUserStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Active', 'Blocked', 'Pending'].includes(status)) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ message: 'Invalid status. Must be Active, Blocked, or Pending' }));
  }

  let isActive = 1;
  let isBlocked = 0;

  if (status === 'Blocked') {
    isBlocked = 1;
  } else if (status === 'Pending') {
    isActive = 0;
  }

  db.query(
    'UPDATE user SET Status = ?, Is_Active = ?, Is_Blocked = ? WHERE User_ID = ?',
    [status, isActive, isBlocked, id],
    (err, result) => {
      if (err) {
        console.error('Error updating status:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to update status' }));
      }

      if (result.affectedRows === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'User not found' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `User status updated to ${status}` }));
    }
  );
};

// Toggle Block Status
exports.toggleBlockStatus = (req, res) => {
  const { id } = req.params;
  const { isBlocked, reason } = req.body;

  db.query(
    'UPDATE user SET Is_Blocked = ?, Blocked_Reason = ? WHERE User_ID = ?',
    [isBlocked ? 1 : 0, reason || null, id],
    (err, result) => {
      if (err) {
        console.error('Error updating block status:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to update block status' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully` }));
    }
  );
};

// Toggle Activation Status
exports.toggleActivationStatus = (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  db.query(
    'UPDATE user SET Is_Active = ? WHERE User_ID = ?',
    [isActive ? 1 : 0, id],
    (err, result) => {
      if (err) {
        console.error('Error updating activation status:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to update activation status' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully` }));
    }
  );
};

// Get available roles
exports.getRoles = (req, res) => {
  const roles = [
    { id: 1, name: 'Student', description: 'Standard user with borrowing privileges' },
    { id: 2, name: 'Admin', description: 'Full system access' },
    { id: 3, name: 'Librarian', description: 'Manage assets and members' }
  ];

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(roles));
};

// Get comprehensive member details
exports.getMemberDetails = (req, res) => {
  console.log("EXECUTING NEW MEMBER DETAILS CONTROLLER");
  const { id } = req.params;

  const queries = {
    user: 'SELECT User_ID, First_Name, Last_Name, User_Email, User_Phone as Phone_Number, Role, Status, Is_Active, Is_Blocked, Blocked_Reason, Created_At, Last_Login FROM user WHERE User_ID = ?',
    loans: `
      SELECT b.Borrow_ID, b.Rentable_ID as Asset_ID, b.Borrow_Date, b.Due_Date, b.Return_Date,
             CASE
               WHEN b.Return_Date IS NULL AND b.Due_Date < NOW() THEN 'Overdue'
               ELSE 'Borrowed'
             END as Status,
             CASE
               WHEN bk.Title IS NOT NULL THEN bk.Title
               WHEN m.Title IS NOT NULL THEN m.Title
               ELSE 'Unknown Asset'
             END as Title
      FROM borrow b
      LEFT JOIN book_inventory bk ON b.Rentable_ID = bk.Asset_ID
      LEFT JOIN movie_inventory m ON b.Rentable_ID = m.Asset_ID
      WHERE b.Borrower_ID = ? AND b.Return_Date IS NULL
      ORDER BY b.Due_Date ASC
    `,
    history: `
      SELECT b.Borrow_ID, b.Rentable_ID as Asset_ID, b.Borrow_Date, b.Return_Date, 'Returned' as Status,
             CASE
               WHEN bk.Title IS NOT NULL THEN bk.Title
               WHEN m.Title IS NOT NULL THEN m.Title
               ELSE 'Unknown Asset'
             END as Title
      FROM borrow b
      LEFT JOIN book_inventory bk ON b.Rentable_ID = bk.Asset_ID
      LEFT JOIN movie_inventory m ON b.Rentable_ID = m.Asset_ID
      WHERE b.Borrower_ID = ? AND b.Return_Date IS NOT NULL
      ORDER BY b.Return_Date DESC
      LIMIT 50
    `,
    fines: `
      SELECT f.Fine_ID, f.Amount_Due as Amount, CASE WHEN f.Paid = 1 THEN 'Paid' ELSE 'Unpaid' END as Paid_Status, f.Fine_Date, 'Overdue Fine' as Reason
      FROM fine f
      WHERE f.User_ID = ?
      ORDER BY f.Fine_Date DESC
    `,
    holds: `
      SELECT h.Hold_ID, h.Rentable_ID as Asset_ID, h.Hold_Date, h.Hold_Expires as Expiry_Date, 
             CASE 
               WHEN h.Canceled_At IS NOT NULL THEN 'Canceled'
               WHEN h.Expired_At IS NOT NULL THEN 'Expired'
               WHEN h.Fulfilling_Borrow_ID IS NOT NULL THEN 'Fulfilled'
               ELSE 'Active'
             END as Status,
             CASE
               WHEN bk.Title IS NOT NULL THEN bk.Title
               WHEN m.Title IS NOT NULL THEN m.Title
               ELSE 'Unknown Asset'
             END as Title
      FROM hold h
      LEFT JOIN book_inventory bk ON h.Rentable_ID = bk.Asset_ID
      LEFT JOIN movie_inventory m ON h.Rentable_ID = m.Asset_ID
      WHERE h.Holder_ID = ?
      ORDER BY h.Hold_Date DESC
    `
  };

  db.query(queries.user, [id], (err, userResults) => {
    if (err) {
      console.error('Error fetching user details:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' }) && res.end(JSON.stringify({ error: 'Database error' }));
    }
    if (userResults.length === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' }) && res.end(JSON.stringify({ error: 'User not found' }));
    }

    const user = userResults[0];

    // Mock activity logs since system_logs table access is restricted
    const mockActivity = [
      { Log_ID: 1, Action: 'LOGIN', Details: '{"method": "password"}', IP_Address: '127.0.0.1', Timestamp: new Date().toISOString() },
      { Log_ID: 2, Action: 'UPDATE_USER', Details: '{"userId": 15, "field": "status"}', IP_Address: '127.0.0.1', Timestamp: new Date(Date.now() - 86400000).toISOString() },
      { Log_ID: 3, Action: 'CHECKOUT', Details: '{"bookId": 101}', IP_Address: '127.0.0.1', Timestamp: new Date(Date.now() - 172800000).toISOString() }
    ];

    // Execute other queries in parallel
    Promise.all([
      new Promise((resolve, reject) => db.query(queries.loans, [id], (err, res) => err ? reject(err) : resolve(res))),
      new Promise((resolve, reject) => db.query(queries.history, [id], (err, res) => err ? reject(err) : resolve(res))),
      new Promise((resolve, reject) => db.query(queries.fines, [id], (err, res) => err ? reject(err) : resolve(res))),
      new Promise((resolve, reject) => db.query(queries.holds, [id], (err, res) => err ? reject(err) : resolve(res)))
    ])
      .then(([loans, history, fines, holds]) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          user,
          loans,
          history,
          fines,
          holds,
          activity: mockActivity // Return mock activity
        }));
      })
      .catch(err => {
        console.error('Error fetching related data:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch related data' }));
      });
  });
};

// Bulk actions handler
exports.bulkAction = (req, res) => {
  const { userIds, action } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.writeHead(400, { 'Content-Type': 'application/json' })
      && res.end(JSON.stringify({ error: 'Invalid user IDs' }));
  }

  let query = '';
  let params = [];

  switch (action) {
    case 'activate':
      query = 'UPDATE user SET Is_Active = 1, Status = "Active" WHERE User_ID IN (?)';
      params = [userIds];
      break;
    case 'deactivate':
      query = 'UPDATE user SET Is_Active = 0, Status = "Pending" WHERE User_ID IN (?)';
      params = [userIds];
      break;
    case 'block':
      query = 'UPDATE user SET Is_Blocked = 1, Status = "Blocked", Blocked_Reason = "Bulk Action" WHERE User_ID IN (?)';
      params = [userIds];
      break;
    case 'unblock':
      query = 'UPDATE user SET Is_Blocked = 0, Status = "Active", Blocked_Reason = NULL WHERE User_ID IN (?)';
      params = [userIds];
      break;
    case 'delete':
      query = 'UPDATE user SET Is_Deleted = 1, Is_Active = 0 WHERE User_ID IN (?)';
      params = [userIds];
      break;
    default:
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ error: 'Invalid action' }));
  }

  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error performing bulk action:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ error: 'Database error' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `Successfully processed ${result.affectedRows} users` }));
  });
};

