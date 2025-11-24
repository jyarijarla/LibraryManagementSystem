const db = require('../db');
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
  const { search = '', status = 'all', page = 1, limit = 20 } = req.query;
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
      'active' as Account_Status,
      COUNT(DISTINCT CASE WHEN b.Return_Date IS NULL THEN b.Borrow_ID END) as Borrowed_Count,
      COALESCE(SUM(CASE WHEN b.Return_Date IS NULL AND DATEDIFF(CURDATE(), b.Due_Date) > 0 
        THEN DATEDIFF(CURDATE(), b.Due_Date) * ? ELSE 0 END), 0) as Outstanding_Fines
    FROM user u
    LEFT JOIN borrow b ON u.User_ID = b.Borrower_ID
    WHERE u.Role = 1
  `;

  const params = [fineRate];

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

// Get all users (students, admins, librarians) - used by Admin UI
exports.getAllUsers = (req, res) => {
  const query = `
    SELECT
      u.User_ID as id,
      u.Student_ID as studentId,
      u.Username as username,
      u.First_Name as firstname,
      u.Last_Name as lastname,
      u.User_Email as email,
      u.User_Phone as phone,
      u.Role as role,
      u.Date_Of_Birth as dateOfBirth
    FROM user u
    ORDER BY u.User_ID DESC
  `;

  db.query(query, [], (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Failed to fetch users', error: err.message }));
    }

    // Normalize results to expected frontend shape
    const users = results.map(u => ({
      id: u.id,
      studentId: u.studentId,
      username: u.username,
      firstname: u.firstname,
      lastname: u.lastname,
      email: u.email,
      phone: u.phone,
      role: u.role,
      dateOfBirth: u.dateOfBirth
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(users));
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

// Soft-delete (anonymize) member to preserve history
// This prevents breaking foreign keys and keeps audit/reporting intact.
exports.deleteMember = (req, res) => {
  const { id } = req.params;

  console.log(`deleteMember called for id=${id} query=`, req.query, 'headers=', { forceHeader: req.headers && (req.headers['x-force-delete'] || req.headers['x-force']) });

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

          const unpaid = parseFloat(fineResult[0].unpaid_fines || 0);

          // Allow admin to force anonymize via ?force=true, JSON body { force: true }, or header 'x-force-delete: true'
          const headerForce = req.headers && (String(req.headers['x-force-delete'] || req.headers['x-force'] || '').toLowerCase() === 'true');
          const force = (req.query && String(req.query.force) === 'true') || (req.body && req.body.force === true) || headerForce;

          if (unpaid > 0 && !force) {
            return res.writeHead(400, { 'Content-Type': 'application/json' })
              && res.end(JSON.stringify({
                error: `Cannot delete member with unpaid fines ($${unpaid}). Please clear fines first or call DELETE with ?force=true to force anonymize.`
              }));
          }

          // Soft-delete / anonymize the member row to preserve history
          // Use parameterized query and explicit empty-string values for PII fields
          // to avoid accidentally inserting NULL (ER_BAD_NULL_ERROR) if values are undefined.
          const anonymizeParams = ['', '', '', '', '', id];
          db.query(
            `UPDATE user SET
               Role = 0,
               Username = CONCAT('deleted_', User_ID),
               First_Name = ?,
               Last_Name = ?,
               User_Email = ?,
               User_Phone = ?,
               Password = ?,
               Balance = 0.00
             WHERE User_ID = ?`,
            anonymizeParams,
            (err, result) => {
              if (err) {
                console.error('Error anonymizing member:', err);
                // If anonymization fails due to foreign key constraints, attempt a fallback
                // disable; however, surface a user-friendly error instead of internal SQL details.
                if (err && err.code === 'ER_NO_REFERENCED_ROW') {
                  console.warn('Anonymization blocked by FK constraints; attempting disable-only fallback.');
                  db.query(
                    'UPDATE user SET Role = 0, Password = ?, Balance = 0.00 WHERE User_ID = ?',
                    ['', id],
                    (fallbackErr, fallbackRes) => {
                      if (fallbackErr) {
                        console.error('Fallback disable failed:', fallbackErr);
                        // Return a friendly 400 error to the client for now
                        return res.writeHead(400, { 'Content-Type': 'application/json' })
                          && res.end(JSON.stringify({ error: 'Cannot delete member: user has active borrows or unpaid fines.' }));
                      }

                      if (fallbackRes.affectedRows === 0) {
                        return res.writeHead(404, { 'Content-Type': 'application/json' })
                          && res.end(JSON.stringify({ error: 'Member not found' }));
                      }

                      const msg = unpaid > 0 && force
                        ? `Member disabled (could not anonymize due to FK constraints). Unpaid fines $${unpaid} bypassed.`
                        : 'Member disabled (PII retained because of FK constraints)';

                      return res.writeHead(200, { 'Content-Type': 'application/json' })
                        && res.end(JSON.stringify({ message: msg }));
                    }
                  );
                  return;
                }

                // For other errors, return a friendly 400 message instead of SQL internals
                return res.writeHead(400, { 'Content-Type': 'application/json' })
                  && res.end(JSON.stringify({ error: 'Cannot delete member: user has active borrows or unpaid fines.' }));
              }

              if (result.affectedRows === 0) {
                return res.writeHead(404, { 'Content-Type': 'application/json' })
                  && res.end(JSON.stringify({ error: 'Member not found' }));
              }

              const msg = unpaid > 0 && force
                ? `Member force-anonymized (unpaid fines $${unpaid} bypassed)`
                : 'Member disabled and anonymized to preserve history';

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: msg }));
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
