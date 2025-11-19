const db = require('./db');

db.query('DESCRIBE asset', (err, results) => {
    if (err) {
        console.error('Error describing table:', err);
        process.exit(1);
    }
    console.log('Asset Table Schema:');
    console.table(results);
    process.exit(0);
});
