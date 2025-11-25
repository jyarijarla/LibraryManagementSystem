const db = require('../db');

db.query('DESCRIBE user', (err, results) => {
    if (err) {
        console.error('Error describing user table:', err);
        process.exit(1);
    }
    console.log('User Table Schema:');
    results.forEach(row => {
        console.log(`${row.Field} (${row.Type})`);
    });
    process.exit(0);
});
