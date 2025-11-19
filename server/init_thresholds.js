const db = require('./db');

const configs = [
    { key: 'LOW_STOCK_THRESHOLD_BOOKS', value: '2', type: 'integer', desc: 'Low stock threshold for books' },
    { key: 'LOW_STOCK_THRESHOLD_CDS', value: '1', type: 'integer', desc: 'Low stock threshold for CDs' },
    { key: 'LOW_STOCK_THRESHOLD_AUDIOBOOKS', value: '1', type: 'integer', desc: 'Low stock threshold for Audiobooks' },
    { key: 'LOW_STOCK_THRESHOLD_MOVIES', value: '1', type: 'integer', desc: 'Low stock threshold for Movies' },
    { key: 'LOW_STOCK_THRESHOLD_TECHNOLOGY', value: '1', type: 'integer', desc: 'Low stock threshold for Technology' },
    { key: 'LOW_STOCK_THRESHOLD_DEFAULT', value: '1', type: 'integer', desc: 'Default low stock threshold' }
];

const insertConfig = (config) => {
    return new Promise((resolve, reject) => {
        const query = `
      INSERT INTO system_config (Config_Key, Config_Value, Config_Type, Config_Description)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE Config_Value = VALUES(Config_Value)
    `;
        db.query(query, [config.key, config.value, config.type, config.desc], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

async function initConfigs() {
    try {
        for (const config of configs) {
            await insertConfig(config);
            console.log(`Configured ${config.key}`);
        }
        console.log('All thresholds configured.');
        process.exit(0);
    } catch (err) {
        console.error('Error configuring thresholds:', err);
        process.exit(1);
    }
}

initConfigs();
