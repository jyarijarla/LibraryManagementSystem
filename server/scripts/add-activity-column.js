const db = require('../db');

const query = "ALTER TABLE user ADD COLUMN Last_Activity DATETIME DEFAULT NULL";

db.query(query, (err, result) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column Last_Activity already exists.');
        } else {
            console.error('Error adding column:', err);
            process.exit(1);
        }
    } else {
        console.log('Column Last_Activity added successfully.');
    }
    process.exit(0);
});
