const db = require('./db');

const createTableQuery = `
CREATE TABLE IF NOT EXISTS system_logs (
    Log_ID INT AUTO_INCREMENT PRIMARY KEY,
    User_ID INT UNSIGNED,
    Action VARCHAR(255) NOT NULL,
    Details JSON,
    IP_Address VARCHAR(45),
    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (User_ID) REFERENCES user(User_ID) ON DELETE SET NULL
);
`;

db.query(createTableQuery, (err, results) => {
    if (err) {
        console.error('Error creating system_logs table:', err);
        process.exit(1);
    }
    console.log('system_logs table created successfully:', results);
    process.exit(0);
});
