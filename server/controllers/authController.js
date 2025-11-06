const bcrypt = require('bcryptjs');
const db = require('../db');

// Login Handler
async function login(req, res) {
  const { username, password, role } = req.body;

  // Validate input
  if (!username || !password) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Username and password are required' }));
    return;
  }

  try {
    // Query user from database (Role is tinyint: 1=student, 2=admin, 3=librarian)
    let roleValue;
    if (role === 'admin') roleValue = 2;
    else if (role === 'librarian') roleValue = 3;
    else roleValue = 1; // student
    
    const query = 'SELECT * FROM user WHERE Username = ? AND Role = ?';
    
    db.query(query, [username, roleValue], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Database error', error: err.message }));
        return;
      }

      if (results.length === 0) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Invalid credentials' }));
        return;
      }

      const user = results[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.Password);
      if (!isValidPassword) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Invalid credentials' }));
        return;
      }

      // Map role to string
      let userRole;
      if (user.Role === 2) userRole = 'admin';
      else if (user.Role === 3) userRole = 'librarian';
      else userRole = 'student';

      // Return user data (without password) - client will store in localStorage
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        message: 'Login successful',
        user: {
          id: user.User_ID,
          username: user.Username,
          email: user.User_Email,
          firstName: user.First_Name,
          lastName: user.Last_Name,
          phone: user.User_Phone,
          dob: user.Date_Of_Birth,
          role: userRole,
          balance: Number.parseFloat(user.Balance)
        }
      }));
    });
  } catch (error) {
    console.error('Login error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Server error', error: error.message }));
  }
}

// Signup Handler
async function signup(req, res) {
  const { username, password, email, phone, firstName, lastName, dob, studentId, role } = req.body;

  // Validate input
  if (!username || !password || !email || !firstName || !role) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      message: 'Username, password, email, first name, and role are required' 
    }));
    return;
  }

  // Validate Student ID for students
  if (role === 'student' && !studentId) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Student ID is required for student accounts' }));
    return;
  }

  if (role === 'student' && !/^\d+$/.test(studentId)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Student ID must contain only numbers' }));
    return;
  }

  // Validate password length
  if (password.length < 6) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Password must be at least 6 characters' }));
    return;
  }

  // Only students can create accounts through signup
  // Admin and Librarian accounts must be created by library management
  if (role === 'admin' || role === 'librarian') {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      message: 'Admin and Librarian accounts cannot be created through signup. Please contact library management.' 
    }));
    return;
  }

  try {
    // Check if username, email, or studentId already exists
    const checkQuery = role === 'student' 
      ? 'SELECT * FROM user WHERE Username = ? OR User_Email = ? OR Student_ID = ?'
      : 'SELECT * FROM user WHERE Username = ? OR User_Email = ?';
    
    const checkParams = role === 'student' 
      ? [username, email, studentId]
      : [username, email];
    
    db.query(checkQuery, checkParams, async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Database error', error: err.message }));
        return;
      }

      if (results.length > 0) {
        const existingUser = results[0];
        if (existingUser.Username === username) {
          res.statusCode = 409;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Username already exists' }));
          return;
        }
        if (existingUser.User_Email === email) {
          res.statusCode = 409;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Email already exists' }));
          return;
        }
        if (role === 'student' && existingUser.Student_ID === studentId) {
          res.statusCode = 409;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Student ID already exists' }));
          return;
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Role mapping: student=1, admin=2, librarian=3
      let roleValue;
      if (role === 'admin') roleValue = 2;
      else if (role === 'librarian') roleValue = 3;
      else roleValue = 1; // student

      // Insert new user - use placeholder 'N/A' for Student_ID if column doesn't exist yet
      const insertQuery = role === 'student'
        ? `INSERT INTO user (Username, Password, User_Email, User_Phone, First_Name, Last_Name, Date_Of_Birth, Role, Balance, Student_ID)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?)`
        : `INSERT INTO user (Username, Password, User_Email, User_Phone, First_Name, Last_Name, Date_Of_Birth, Role, Balance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00)`;

      const insertParams = role === 'student'
        ? [username, hashedPassword, email, phone || null, firstName, lastName || null, dob || null, roleValue, studentId]
        : [username, hashedPassword, email, phone || null, firstName, lastName || null, dob || null, roleValue];

      db.query(
        insertQuery,
        insertParams,
        (err, result) => {
          if (err) {
            console.error('Database error:', err);
            // If Student_ID column doesn't exist yet, fall back to old insert
            if (err.code === 'ER_BAD_FIELD_ERROR' && role === 'student') {
              const fallbackQuery = `
                INSERT INTO user (Username, Password, User_Email, User_Phone, First_Name, Last_Name, Date_Of_Birth, Role, Balance)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00)
              `;
              db.query(
                fallbackQuery,
                [username, hashedPassword, email, phone || null, firstName, lastName || null, dob || null, roleValue],
                (fallbackErr, fallbackResult) => {
                  if (fallbackErr) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ message: 'Failed to create user', error: fallbackErr.message }));
                    return;
                  }
                  res.statusCode = 201;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    message: 'Account created successfully (Student ID will be available after database update)',
                    user: {
                      id: fallbackResult.insertId,
                      username,
                      email,
                      firstName,
                      lastName: lastName || null,
                      phone: phone || null,
                      dob: dob || null,
                      role,
                      balance: 0
                    }
                  }));
                }
              );
              return;
            }
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Failed to create user', error: err.message }));
            return;
          }

          // Return user data - client will store in localStorage
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            message: 'Account created successfully',
            user: {
              id: result.insertId,
              username,
              email,
              firstName,
              lastName: lastName || null,
              phone: phone || null,
              dob: dob || null,
              studentId: studentId || null,
              role,
              balance: 0
            }
          }));
        }
      );
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Server error', error: error.message }));
  }
}

// Route handler for /api/login and /api/signup
async function authHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname === '/api/login' && req.method === 'POST') {
    await login(req, res);
  } else if (url.pathname === '/api/signup' && req.method === 'POST') {
    await signup(req, res);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Route not found' }));
  }
}

module.exports = authHandler;