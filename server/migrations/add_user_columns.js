const db = require('../db');

const alterTableQuery = `
  ALTER TABLE user
  ADD COLUMN Status ENUM('Active', 'Blocked', 'Pending') DEFAULT 'Active',
  ADD COLUMN Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN Last_Login TIMESTAMP NULL;
`;

console.log('Running migration: Adding Status, Created_At, and Last_Login to user table...');

db.query(alterTableQuery, (err, result) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist. Skipping migration.');
        } else {
            console.error('Migration failed:', err);
            process.exit(1);
        }
    } else {
        console.log('Migration successful:', result);
    }
    process.exit(0);
});
