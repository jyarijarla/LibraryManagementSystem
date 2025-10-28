const db = require('./db');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  console.log('Creating test users...\n');

  try {
    const hashedPasswordStudent = await bcrypt.hash('password123', 10);
    const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);

    // Insert test student (Role = 1)
    const insertStudentQuery = `
      INSERT INTO user (Username, Password, User_Email, User_Phone, First_Name, Last_Name, Date_Of_Birth, Role, Balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE Username = Username
    `;

    db.query(
      insertStudentQuery,
      ['student123', hashedPasswordStudent, 'student@test.com', '555-0100', 'John', 'Doe', '2000-01-15', 1, 0],
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log('Test student already exists (student123)');
          } else {
            console.error(' Error creating test student:', err.message);
          }
        } else {
          console.log(' Test student account created/verified');
          console.log('   Username: student123');
          console.log('   Password: password123');
          console.log('   Role: Student\n');
        }
      }
    );

    // Insert test admin (Role = 2)
    const insertAdminQuery = `
      INSERT INTO user (Username, Password, User_Email, User_Phone, First_Name, Last_Name, Date_Of_Birth, Role, Balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE Username = Username
    `;

    db.query(
      insertAdminQuery,
      ['admin', hashedPasswordAdmin, 'admin@test.com', '555-0200', 'Admin', 'User', '1990-05-20', 2, 0],
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log('  Test admin already exists (admin)');
          } else {
            console.error(' Error creating test admin:', err.message);
          }
        } else {
          console.log(' Test admin account created/verified');
          console.log('   Username: admin');
          console.log('   Password: admin123');
          console.log('   Role: Admin\n');
        }

        console.log(' Test users setup complete!\n');
        console.log('You can now login with:');
        console.log('  Student: student / student123');
        console.log('  Admin: admin / admin123\n');
        
        setTimeout(() => process.exit(0), 1000);
      }
    );
  } catch (error) {
    console.error(' Error hashing passwords:', error.message);
    process.exit(1);
  }
}

// Run setup
createTestUsers();
