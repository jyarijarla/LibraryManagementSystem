const db = require('./db');

db.query("SHOW TABLES LIKE 'low_stock_alerts'", (err, results) => {
    if (err) {
        console.error('Error checking table:', err);
        process.exit(1);
    }
    if (results.length > 0) {
        console.log('Table low_stock_alerts exists.');
    } else {
        console.log('Table low_stock_alerts does NOT exist.');
    }
    process.exit(0);
});
