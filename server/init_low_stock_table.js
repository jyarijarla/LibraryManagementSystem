const db = require('./db');

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS low_stock_alerts (
    Alert_ID INT AUTO_INCREMENT PRIMARY KEY,
    Asset_ID INT NOT NULL,
    Asset_Type VARCHAR(50) NOT NULL,
    Asset_Title VARCHAR(255),
    Available_Copies INT DEFAULT 0,
    Threshold_Value INT DEFAULT 0,
    Triggered_By_UserID INT NULL,
    Triggered_By_Name VARCHAR(120),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

db.query(createTableQuery, (err, result) => {
    if (err) {
        console.error('Error creating table:', err);
        process.exit(1);
    }
    console.log('Table low_stock_alerts created or already exists.');
    process.exit(0);
});
