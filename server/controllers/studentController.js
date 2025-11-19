const db = require('../db');

// Get all students
exports.getAllStudents = (req, res) => {
  const query = `
    SELECT 
      u.User_ID as id,
      u.First_Name as firstname,
      COALESCE(u.Last_Name, '') as lastname,
      DATE_FORMAT(u.Date_Of_Birth, '%Y-%m-%d') as dateOfBirth,
      u.User_Email as email,
      COALESCE(u.Student_ID, u.Username) as studentId,
      u.User_Phone as phone,
      u.Role as role,
      COUNT(CASE WHEN b.Return_Date IS NULL THEN 1 END) as borrowedBooks,
      'Active' as status
    FROM user u
    LEFT JOIN borrow b ON u.User_ID = b.Borrower_ID
    /* no role filter - return all users so admin can manage roles */
    GROUP BY u.User_ID
    ORDER BY u.First_Name ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching students:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

exports.createStudent = (req, res) => {
  const { firstname, lastname, studentId, email, role, password, dateOfBirth, phone } = req.body;
  // Map role string to DB value: Student=1, Admin=2, Librarian=3, Teacher=4
  let roleValue = 1;
  if (role === 'Admin') roleValue = 2;
  else if (role === 'Librarian') roleValue = 3;
  else if (role === 'Teacher') roleValue = 4;

  const query = `
    INSERT INTO user (First_Name, Last_Name, Username, User_Email, User_Phone, Role, Date_Of_Birth, Password, Balance)
    VALUES (?, ?, ?, ?, ?, ?, DATE(?), ?, ?)
  `;
  // Check for duplicate username or email first
  db.query('SELECT COUNT(*) as count FROM user WHERE Username = ? OR User_Email = ?', [studentId, email], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking existing user:', checkErr);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to create student', error: checkErr.message }));
    }

    if (checkResults[0].count > 0) {
      return res.writeHead(409, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Username or email already exists' }));
    }

    // Pass NULL for Date_Of_Birth to satisfy schema constraints when not provided
    // Require dateOfBirth because the DB column does not allow NULL.
    if (!dateOfBirth) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Date of birth is required' }));
    }

    // Validate dateOfBirth is a valid date and not in the future
    const dobCandidate = new Date(dateOfBirth);
    if (isNaN(dobCandidate.getTime())) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Invalid date of birth format' }));
    }
    const today = new Date();
    // Clear time components for comparison
    const dobDay = new Date(dobCandidate.getFullYear(), dobCandidate.getMonth(), dobCandidate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (dobDay > todayDay) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Date of birth cannot be in the future' }));
    }

    // Basic phone validation (allow digits, spaces, +, -, parentheses). Optional.
    if (phone) {
      const phoneClean = String(phone).trim()
      const phoneRegex = /^\+?[0-9\s()\-]{7,20}$/
      if (!phoneRegex.test(phoneClean)) {
        return res.writeHead(400, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Invalid phone number format' }));
      }
    }

    // Default new user's balance to 0 to satisfy non-null DB constraint
    // Ensure we pass a plain YYYY-MM-DD string (dateOfBirth may be ISO or contain timezone)
    const dobParam = typeof dateOfBirth === 'string' && dateOfBirth.length >= 10 ? dateOfBirth.slice(0,10) : dateOfBirth
    console.log('DEBUG createStudent - received dateOfBirth:', dateOfBirth, '-> dobParam:', dobParam)
    db.query(query, [firstname, lastname, studentId, email, phone || null, roleValue, dobParam, password, 0], (err, result) => {
      if (err) {
        console.error('Error creating student:', err);
        const payload = {
          message: 'Failed to create student',
          error: err.message
        };
        if (err.code) payload.code = err.code;
        if (err.sqlMessage) payload.sqlMessage = err.sqlMessage;
        if (err.sqlState) payload.sqlState = err.sqlState;
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify(payload));
      }

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Student created successfully', id: result.insertId }));
    });
  });
};


// Update student
exports.updateStudent = (req, res) => {
  const { id } = req.params;
  const { firstname, lastname, email, studentId, phone, dateOfBirth, role } = req.body;
  // Map role string to DB value: Student=1, Admin=2, Librarian=3, Teacher=4
  let roleValue = null;
  if (role) {
    if (role === 'Admin') roleValue = 2;
    else if (role === 'Librarian') roleValue = 3;
    else if (role === 'Teacher') roleValue = 4;
    else if (role === 'Student') roleValue = 1;
  }

  // Validate DOB if provided and ensure not in future
  if (dateOfBirth) {
    const dobCandidate = new Date(dateOfBirth)
    if (isNaN(dobCandidate.getTime())) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Invalid date of birth format' }))
    }
    const today = new Date()
    const dobDay = new Date(dobCandidate.getFullYear(), dobCandidate.getMonth(), dobCandidate.getDate())
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (dobDay > todayDay) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Date of birth cannot be in the future' }))
    }
  }

  // Basic phone validation if provided
  if (phone) {
    const phoneClean = String(phone).trim()
    const phoneRegex = /^\+?[0-9\s()\-]{7,20}$/
    if (!phoneRegex.test(phoneClean)) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Invalid phone number format' }))
    }
  }

  const dobParam = typeof dateOfBirth === 'string' && dateOfBirth.length >= 10 ? dateOfBirth.slice(0,10) : dateOfBirth || null
  console.log('DEBUG updateStudent - received dateOfBirth:', dateOfBirth, '-> dobParam:', dobParam, 'role:', role, 'roleValue:', roleValue)

  const setClauses = [
    'First_Name = ?',
    'Last_Name = ?',
    'User_Email = ?',
    'Username = ?',
    'User_Phone = ?',
    "Date_Of_Birth = DATE(?)"
  ]

  if (roleValue !== null) setClauses.push('Role = ?')

  const query = `UPDATE user SET ${setClauses.join(', ')} WHERE User_ID = ?`

  const params = [firstname, lastname, email, studentId, phone || null, dobParam]
  if (roleValue !== null) params.push(roleValue)
  params.push(id)

  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error updating student:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to update student', error: err.message }));
    }
    
    if (result.affectedRows === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Student not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Student updated successfully' }));
  });
};

// Delete student
exports.deleteStudent = (req, res) => {
  const { id } = req.params;
  
  // Check if student has active borrows
  db.query(
    'SELECT COUNT(*) as count FROM borrow WHERE Borrower_ID = ? AND Return_Date IS NULL',
    [id],
    (err, results) => {
      if (err) {
        console.error('Error checking borrows:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
      }
      
      if (results[0].count > 0) {
        return res.writeHead(400, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Cannot delete student with active borrowed items' }));
      }
      
      db.query('DELETE FROM user WHERE User_ID = ? AND Role = 1', [id], (err, result) => {
        if (err) {
          console.error('Error deleting student:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Failed to delete student', error: err.message }));
        }
        
        if (result.affectedRows === 0) {
          return res.writeHead(404, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Student not found' }));
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Student deleted successfully' }));
      });
    }
  );
};
