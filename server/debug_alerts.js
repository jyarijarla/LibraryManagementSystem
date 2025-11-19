const db = require('./db');

async function checkDebugInfo() {
    const connection = await db.promise();
    try {
        // 1. Check Config
        const [configs] = await connection.query("SELECT * FROM system_config WHERE Config_Key LIKE 'LOW_STOCK_%'");
        console.log('--- Threshold Configs ---');
        console.table(configs);

        // 2. Check Alerts
        const [alerts] = await connection.query("SELECT * FROM low_stock_alerts ORDER BY Created_At DESC LIMIT 5");
        console.log('--- Recent Alerts ---');
        console.table(alerts);

        // 3. Check Book Stock (sample)
        const [books] = await connection.query("SELECT Asset_ID, Title, Available_Copies FROM book_inventory WHERE Available_Copies <= 2 LIMIT 5");
        console.log('--- Low Stock Books ---');
        console.table(books);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDebugInfo();
