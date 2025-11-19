const db = require('./db');

async function fixSchema() {
    const connection = await db.promise();

    try {
        // 1. Add Asset_Type column if it doesn't exist
        try {
            await connection.query(`
        ALTER TABLE asset 
        ADD COLUMN Asset_Type VARCHAR(50) DEFAULT NULL
      `);
            console.log('Added Asset_Type column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Asset_Type column already exists.');
            } else {
                throw err;
            }
        }

        // 2. Populate Asset_Type based on sub-tables
        const updates = [
            { table: 'book', type: 'books' },
            { table: 'cd', type: 'cds' },
            { table: 'audiobook', type: 'audiobooks' },
            { table: 'movie', type: 'movies' },
            { table: 'technology', type: 'technology' },
            { table: 'study_room', type: 'study-rooms' }
        ];

        for (const { table, type } of updates) {
            const query = `
        UPDATE asset a 
        JOIN ${table} t ON a.Asset_ID = t.Asset_ID 
        SET a.Asset_Type = ?
      `;
            const [result] = await connection.query(query, [type]);
            console.log(`Updated ${result.changedRows} assets as '${type}'.`);
        }

        console.log('Asset_Type population complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing schema:', err);
        process.exit(1);
    }
}

fixSchema();
