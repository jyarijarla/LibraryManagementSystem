//Library imports
require("dotenv").config();//pulls env vars from server/.env
const mysql = require("mysql2");

//connecting to server
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true
  },
  waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = db;