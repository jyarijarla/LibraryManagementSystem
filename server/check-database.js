require('dotenv').config({ path: __dirname + '/.env' });
const mysql = require('mysql2');

// Create direct connection (not using the db.js pool)
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true }
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database\n');
});

// Check tables
connection.query('SHOW TABLES', (err, tables) => {
  if (err) {
    console.error('Error fetching tables:', err);
    connection.end();
    process.exit(1);
  }
  
  console.log('\n📋 Tables in database:');
  tables.forEach(table => {
    const tableName = Object.values(table)[0];
    console.log(`  - ${tableName}`);
  });
  
  // Check if triggers already exist
  connection.query('SHOW TRIGGERS', (err, triggers) => {
    if (err) {
      console.error('Error fetching triggers:', err);
      connection.end();
      process.exit(1);
    }
    
    console.log('\n🔧 Existing Triggers:');
    if (triggers.length === 0) {
      console.log('  (No triggers found)');
    } else {
      triggers.forEach(trigger => {
        console.log(`  - ${trigger.Trigger}: ${trigger.Event} ${trigger.Timing} on ${trigger.Table}`);
      });
    }
    
    // Check asset table structure
    connection.query('DESCRIBE asset', (err, columns) => {
      if (err) {
        console.error('Error describing asset table:', err);
        connection.end();
        process.exit(1);
      }
      
      console.log('\n📦 Asset table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`);
      });
      
      // Check borrow table structure
      connection.query('DESCRIBE borrow', (err, columns) => {
        if (err) {
          console.error('Error describing borrow table:', err);
          connection.end();
          process.exit(1);
        }
        
        console.log('\n📝 Borrow table structure:');
        columns.forEach(col => {
          console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`);
        });
        
        console.log('\n✅ Database inspection complete!\n');
        connection.end();
        process.exit(0);
      });
    });
  });
});
