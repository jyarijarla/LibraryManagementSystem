const db = require('./db');

// Check existing tables
db.query('SHOW TABLES', (err, results) => {
  if (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
  
  console.log('📊 Existing tables in database:');
  console.log(results);
  
  // Check if users table exists
  const tableNames = results.map(row => Object.values(row)[0]);
  
  if (tableNames.includes('users')) {
    console.log('\n✅ Users table exists! Checking its structure...');
    
    db.query('DESCRIBE users', (err, results) => {
      if (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
      
      console.log('\n📋 Users table structure:');
      console.table(results);
      
      // Check if we have the right columns
      const columns = results.map(row => row.Field);
      const requiredColumns = ['username', 'password', 'email', 'phone', 'first_name', 'last_name', 'dob', 'role'];
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('\n⚠️  Missing columns:', missingColumns.join(', '));
        console.log('You may need to contact your database admin to add these columns.');
      } else {
        console.log('\n✅ Users table has all required columns!');
      }
      
      process.exit(0);
    });
  } else {
    console.log('\n❌ Users table does not exist.');
    console.log('You need to contact your database admin to create it with this SQL:');
    console.log(`
CREATE TABLE users (
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
);
    `);
    process.exit(0);
  }
});
