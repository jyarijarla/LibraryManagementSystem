const db = require('./db');
const bcrypt = require('bcryptjs');

async function setupUsersTable() {
  console.log('🚀 Setting up users table...\n');

  // Create users table
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(20),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      dob DATE,
      role ENUM('student', 'admin') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_email (email),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  return new Promise((resolve, reject) => {
    db.query(createTableQuery, async (err) => {
      if (err) {
        console.error('❌ Error creating users table:', err.message);
        reject(err);
        return;
      }

      console.log('✅ Users table created successfully\n');

      // Create test users
      try {
        const hashedPasswordStudent = await bcrypt.hash('password123', 10);
        const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);

        // Insert test student
        const insertStudentQuery = `
          INSERT IGNORE INTO users 
          (username, password, email, phone, first_name, last_name, dob, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertStudentQuery,
          ['student123', hashedPasswordStudent, 'student@test.com', '555-0100', 'John', 'Doe', '2000-01-15', 'student'],
          (err) => {
            if (err) {
              console.error('❌ Error creating test student:', err.message);
            } else {
              console.log('✅ Test student account created');
              console.log('   Username: student123');
              console.log('   Password: password123\n');
            }
          }
        );

        // Insert test admin
        const insertAdminQuery = `
          INSERT IGNORE INTO users 
          (username, password, email, phone, first_name, last_name, dob, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertAdminQuery,
          ['admin', hashedPasswordAdmin, 'admin@test.com', '555-0200', 'Admin', 'User', '1990-05-20', 'admin'],
          (err) => {
            if (err) {
              console.error('❌ Error creating test admin:', err.message);
            } else {
              console.log('✅ Test admin account created');
              console.log('   Username: admin');
              console.log('   Password: admin123\n');
            }

            console.log('🎉 Setup complete!\n');
            resolve();
          }
        );
      } catch (error) {
        console.error('❌ Error hashing passwords:', error.message);
        reject(error);
      }
    });
  });
}

// Run setup
setupUsersTable()
  .then(() => {
    console.log('✨ All done! You can now start the server.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  });
