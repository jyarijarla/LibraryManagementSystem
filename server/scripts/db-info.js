require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../db');

console.log('--- Environment Variables (server/.env) ---');
console.log('DB_HOST =', process.env.DB_HOST);
console.log('DB_USER =', process.env.DB_USER);
console.log('DB_NAME =', process.env.DB_NAME);
console.log('-----------------------------------------');

// Try a simple query to ensure we are hitting the same DB
db.query('SELECT DATABASE() as db, VERSION() as version', (err, rows) => {
  if (err) {
    console.error('Error running test query:', err.message);
    process.exit(1);
  }
  console.log('Connected database info:', rows[0]);
  process.exit(0);
});
