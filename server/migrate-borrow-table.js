const db = require('./db');

console.log('🔄 Starting database migration for borrow table...\n');

// Add Renew_Date and Processed_By columns to borrow table
const migrations = [
  {
    name: 'Add Renew_Date column',
    query: `ALTER TABLE borrow ADD COLUMN Renew_Date DATE NULL AFTER Return_Date`,
    checkQuery: `SHOW COLUMNS FROM borrow LIKE 'Renew_Date'`
  },
  {
    name: 'Add Processed_By column',
    query: `ALTER TABLE borrow ADD COLUMN Processed_By INT NULL AFTER Renew_Date`,
    checkQuery: `SHOW COLUMNS FROM borrow LIKE 'Processed_By'`
  },
  {
    name: 'Add foreign key for Processed_By',
    query: `ALTER TABLE borrow ADD CONSTRAINT fk_borrow_processed_by 
            FOREIGN KEY (Processed_By) REFERENCES user(User_ID) ON DELETE SET NULL`,
    checkQuery: `SELECT COUNT(*) as count FROM information_schema.KEY_COLUMN_USAGE 
                 WHERE TABLE_NAME = 'borrow' AND CONSTRAINT_NAME = 'fk_borrow_processed_by'`
  }
];

async function runMigration() {
  for (const migration of migrations) {
    try {
      // Check if migration already applied
      const [checkResults] = await new Promise((resolve, reject) => {
        db.query(migration.checkQuery, (err, results) => {
          if (err) reject(err);
          else resolve([results]);
        });
      });

      // For column checks
      if (migration.checkQuery.includes('SHOW COLUMNS')) {
        if (checkResults.length > 0) {
          console.log(`✅ ${migration.name} - Already exists, skipping`);
          continue;
        }
      }
      // For foreign key checks
      else if (migration.checkQuery.includes('KEY_COLUMN_USAGE')) {
        if (checkResults[0].count > 0) {
          console.log(`✅ ${migration.name} - Already exists, skipping`);
          continue;
        }
      }

      // Run migration
      await new Promise((resolve, reject) => {
        db.query(migration.query, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      console.log(`✅ ${migration.name} - Success`);
    } catch (error) {
      console.error(`❌ ${migration.name} - Failed:`, error.message);
      
      // Continue with other migrations even if one fails
      if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
        console.log(`   Column or constraint already exists, continuing...\n`);
      } else {
        console.log(`   Error details:`, error);
      }
    }
  }

  console.log('\n🎉 Migration completed!\n');
  console.log('📋 New borrow table structure:');
  console.log('   - Borrow_ID');
  console.log('   - Borrower_ID');
  console.log('   - Rentable_ID');
  console.log('   - Borrow_Date');
  console.log('   - Due_Date');
  console.log('   - Return_Date');
  console.log('   - Renew_Date (NEW) ✨');
  console.log('   - Processed_By (NEW) ✨');
  console.log('   - Fee_Incurred\n');

  // Close database connection
  db.end((err) => {
    if (err) {
      console.error('Error closing database connection:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
