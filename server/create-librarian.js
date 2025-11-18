require("dotenv").config();
const db = require('./db');
const bcrypt = require('bcryptjs');

// Create a test librarian account
const createLibrarian = async () => {
  const librarianData = {
    username: 'librarian1',
    firstName: 'Hao',
    lastName: 'Pham',
    email: 'librarian1@library.com',
    phone: '555-0123',
    dateOfBirth: '1990-05-15',
    password: process.env.LIBRARIAN_PASSWORD, // Use env variable for security
    role: 3 // Role 3 = Librarian (1=Student, 2=Admin, 3=Librarian)
  };

  console.log('🔍 Checking if librarian already exists...');
  
  // Check if librarian already exists
  db.query(
    'SELECT * FROM user WHERE Username = ? OR User_Email = ?',
    [librarianData.username, librarianData.email],
    async (err, results) => {
      if (err) {
        console.error('❌ Error checking existing user:', err);
        process.exit(1);
      }

      if (results.length > 0) {
        console.log('\n✅ Librarian account already exists!');
        console.log('================================');
        console.log('📧 Email:', librarianData.email);
        console.log('👤 Username:', librarianData.username);
        console.log('🔑 Password: ********** (hidden for security)');
        console.log('👥 Existing Role:', results[0].Role);
        console.log('================================');
        
        // Check if role is correct
        if (results[0].Role !== 3) {
          console.log('\n⚠️  WARNING: Account exists but with WRONG ROLE!');
          console.log('Expected Role: 3 (Librarian)');
          console.log('Actual Role:', results[0].Role);
          console.log('\nPlease delete this account first and run the script again.');
        }
        
        process.exit(0);
      }

      console.log('📝 Creating new librarian account...');
      console.log('🔐 Hashing password...');

      // Hash the password using bcrypt
      const hashedPassword = await bcrypt.hash(librarianData.password, 10);

      // Insert new librarian
      db.query(
        `INSERT INTO user (Username, First_Name, Last_Name, User_Email, User_Phone, Date_Of_Birth, Password, Role, Balance) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00)`,
        [
          librarianData.username,
          librarianData.firstName,
          librarianData.lastName,
          librarianData.email,
          librarianData.phone,
          librarianData.dateOfBirth,
          hashedPassword, // Use hashed password
          librarianData.role
        ],
        (err, result) => {
          if (err) {
            console.error('❌ Error creating librarian:', err);
            process.exit(1);
          }

          console.log('\n✅ Librarian account created successfully!');
          console.log('================================');
          console.log('📧 Email:', librarianData.email);
          console.log('👤 Username:', librarianData.username);
          console.log('🔑 Password: ********** (hidden for security)');
          console.log('👥 Role: Librarian (Role ID: 3)');
          console.log('🆔 User ID:', result.insertId);
          console.log('================================');
          console.log('\n🎉 You can now login with these credentials!');
          console.log('1. Go to the login page');
          console.log('2. Select "Librarian" as role');
          console.log('3. Enter username: librarian1');
          console.log('4. Enter password from LIBRARIAN_PASSWORD env variable');
          process.exit(0);
        }
      );
    }
  );
};

// Run the function
createLibrarian();
