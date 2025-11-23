const db = require('./db');

const actions = [
    'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'ROLE_CHANGE', 'PASSWORD_RESET',
    'CONFIG_UPDATE', 'CATALOG_OVERRIDE', 'FINE_WAIVE', 'PAYMENT_PROCESSED',
    'LOGIN_FAILED', 'DATA_EXPORT', 'BACKUP_SUCCESS', 'BACKUP_FAIL', 'SYSTEM_STARTUP'
];

const details = {
    'USER_CREATE': { newUserId: 101, role: 'student' },
    'USER_UPDATE': { userId: 55, field: 'email', oldValue: 'old@test.com', newValue: 'new@test.com' },
    'ROLE_CHANGE': { userId: 33, oldRole: 'student', newRole: 'librarian' },
    'CONFIG_UPDATE': { configKey: 'FINE_RATE', oldValue: '0.50', newValue: '1.00' },
    'CATALOG_OVERRIDE': { assetId: 202, action: 'FORCE_AVAILABLE' },
    'FINE_WAIVE': { fineId: 505, amount: 15.00, reason: 'Good behavior' },
    'LOGIN_FAILED': { reason: 'Invalid password' },
    'BACKUP_SUCCESS': { size: '500MB', duration: '2m' }
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateLogs = async () => {
    console.log('🌱 Seeding system_logs...');

    const values = [];
    const now = Date.now();

    for (let i = 0; i < 50; i++) {
        const action = actions[getRandomInt(0, actions.length - 1)];
        const detail = details[action] || { info: 'Generic action details' };
        const userId = getRandomInt(1, 5); // Assuming users 1-5 exist
        const ip = `192.168.1.${getRandomInt(1, 255)}`;

        // Random time in last 30 days
        const timestamp = new Date(now - getRandomInt(0, 30 * 24 * 60 * 60 * 1000));

        values.push([userId, action, JSON.stringify(detail), ip, timestamp]);
    }

    const query = 'INSERT INTO system_logs (User_ID, Action, Details, IP_Address, Timestamp) VALUES ?';

    db.query(query, [values], (err, res) => {
        if (err) {
            console.error('❌ Error seeding logs:', err);
            process.exit(1);
        }
        console.log(`✅ Successfully inserted ${res.affectedRows} logs.`);
        process.exit(0);
    });
};

generateLogs();
