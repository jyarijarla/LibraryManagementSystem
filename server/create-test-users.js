const db = require('./db');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  console.log('🔧 Creating test users for all roles...\n');

  try {
    // Hash passwords for all test accounts
    const hashedPasswordStudent = await bcrypt.hash('student123', 10);
    const hashedPasswordLibrarian = await bcrypt.hash('librarian123', 10);
    const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);

    let completed = 0;
    const total = 3;

    // Insert test student (Role = 1)
    const insertStudentQuery = `
      INSERT INTO user (Username, Password, User_Email, User_Phone, First_Name, Last_Name, Date_Of_Birth, Role, Balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE Username = Username
    `;

    db.query(
      insertStudentQuery,
      ['student', hashedPasswordStudent, 'student@test.com', '555-0100', 'John', 'Doe', '2000-01-15', 1, 0],
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log('✅ Test student already exists (student)');
          } else {
            console.error('❌ Error creating test student:', err.message);
          }
        } else {
          console.log('✅ Test student account created/verified');
          console.log('   Username: student');
          console.log('   Password: student123');
          console.log('   Role: Student\n');
        }
        checkComplete();
      }
    );

    // Insert test librarian (Role = 3)
    const insertLibrarianQuery = `
      INSERT INTO user (Username, Password, User_Email, User_Phone, First_Name, Last_Name, Date_Of_Birth, Role, Balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE Username = Username
    `;

    db.query(
      insertLibrarianQuery,
      ['librarian', hashedPasswordLibrarian, 'librarian@library.com', '555-0150', 'Library', 'Staff', '1985-03-10', 3, 0],
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log('✅ Test librarian already exists (librarian)');
          } else {
            console.error('❌ Error creating test librarian:', err.message);
          }
        } else {
          console.log('✅ Test librarian account created/verified');
          console.log('   Username: librarian');
          console.log('   Password: librarian123');
          console.log('   Role: Librarian\n');
        }
        checkComplete();
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
      ['admin', hashedPasswordAdmin, 'admin@library.com', '555-0200', 'Admin', 'User', '1990-05-20', 2, 0],
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log('✅ Test admin already exists (admin)');
          } else {
            console.error('❌ Error creating test admin:', err.message);
          }
        } else {
          console.log('✅ Test admin account created/verified');
          console.log('   Username: admin');
          console.log('   Password: admin123');
          console.log('   Role: Admin\n');
        }
        checkComplete();
      }
    );

    function checkComplete() {
      completed++;
      if (completed === total) {
        console.log('═'.repeat(50));
        console.log('✅ Test users setup complete!\n');
        console.log('📝 You can now login with:\n');
        console.log('  👨‍🎓 Student:   username: student   | password: student123');
        console.log('  📚 Librarian: username: librarian | password: librarian123');
        console.log('  👨‍💼 Admin:     username: admin     | password: admin123\n');
        console.log('═'.repeat(50));
        
        setTimeout(() => process.exit(0), 1000);
      }
    }

  } catch (error) {
    console.error('❌ Error hashing passwords:', error.message);
    process.exit(1);
  }
}

// Run setup
createTestUsers();
