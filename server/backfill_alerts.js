const db = require('./db');

async function backfillAlerts() {
    const connection = await db.promise();
    try {
        // 1. Get thresholds
        const [configs] = await connection.query("SELECT Config_Key, Config_Value FROM system_config WHERE Config_Key LIKE 'LOW_STOCK_THRESHOLD_%'");
        const thresholds = {};
        configs.forEach(c => thresholds[c.Config_Key] = parseInt(c.Config_Value));

        const defaultThreshold = thresholds['LOW_STOCK_THRESHOLD_DEFAULT'] || 1;

        // 2. Get all assets with their types and counts
        const query = `
      SELECT 
        a.Asset_ID, 
        a.Asset_Type, 
        COALESCE(bk.Title, m.Title, cd.Title, ab.Title, t.Description, CONCAT('Room ', sr.Room_Number)) as Title,
        (SELECT COUNT(*) FROM rentable r WHERE r.Asset_ID = a.Asset_ID AND r.Availability = 1) as Available_Count
      FROM asset a
      LEFT JOIN book bk ON a.Asset_ID = bk.Asset_ID
      LEFT JOIN movie m ON a.Asset_ID = m.Asset_ID
      LEFT JOIN cd cd ON a.Asset_ID = cd.Asset_ID
      LEFT JOIN audiobook ab ON a.Asset_ID = ab.Asset_ID
      LEFT JOIN technology t ON a.Asset_ID = t.Asset_ID
      LEFT JOIN study_room sr ON a.Asset_ID = sr.Asset_ID
      WHERE a.Asset_Type IS NOT NULL
    `;

        const [assets] = await connection.query(query);

        let addedCount = 0;

        for (const asset of assets) {
            let threshold = defaultThreshold;
            if (asset.Asset_Type === 'books') threshold = thresholds['LOW_STOCK_THRESHOLD_BOOKS'] || 2;
            else if (asset.Asset_Type === 'cds') threshold = thresholds['LOW_STOCK_THRESHOLD_CDS'] || 1;
            // ... map others if needed, or rely on default for now as most are 1

            if (asset.Available_Count <= threshold) {
                // Check if alert exists
                const [existing] = await connection.query(
                    "SELECT Alert_ID FROM low_stock_alerts WHERE Asset_ID = ? AND Created_At >= DATE_SUB(NOW(), INTERVAL 1 DAY)",
                    [asset.Asset_ID]
                );

                if (existing.length === 0) {
                    await connection.query(
                        `INSERT INTO low_stock_alerts (Asset_ID, Asset_Type, Asset_Title, Available_Copies, Threshold_Value, Triggered_By_Name)
             VALUES (?, ?, ?, ?, ?, 'system-backfill')`,
                        [asset.Asset_ID, asset.Asset_Type, asset.Title, asset.Available_Count, threshold]
                    );
                    console.log(`Added alert for ${asset.Title} (Copies: ${asset.Available_Count}, Threshold: ${threshold})`);
                    addedCount++;
                }
            }
        }

        console.log(`Backfill complete. Added ${addedCount} alerts.`);
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

backfillAlerts();
