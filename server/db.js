//Library imports
require("dotenv").config({ path: __dirname + '/.env' }); //pulls env vars from server/.env
const mysql = require("mysql2");

//connecting to server
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true  // Changed to true to enforce certificate validation
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection and log success
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  
  console.log('✅ DB Connected');
  console.log(`📦 Database: ${process.env.DB_NAME}`);
  console.log(`🌐 Host: ${process.env.DB_HOST}`);
  
  // Release the connection back to the pool
  connection.release();
});

// Handle pool errors
db.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

module.exports = db;