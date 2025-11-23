const db = require('./db');

db.query('DESCRIBE system_logs', (err, results) => {
    if (err) {
        console.error('Error describing table:', err);
        process.exit(1);
    }
    console.log('System Logs Table Schema:');
    console.table(results);
    process.exit(0);
});
