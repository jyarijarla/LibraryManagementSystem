//Library imports
require("dotenv").config();//pulls env vars from server/.env
const mysql = require("mysql2");

//connecting to server
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

//test connection
db.query('SELECT 1', (err, results) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
  } else {
    console.log('✅ Connection successful:', results);
  }
});

module.exports = db;