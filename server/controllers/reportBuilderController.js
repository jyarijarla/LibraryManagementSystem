const db = require('../db');

// Allowlist for tables and columns to prevent SQL injection
const SCHEMA = {
    user: {
        table: 'user',
        columns: ['User_ID', 'First_Name', 'Last_Name', 'Email', 'Role', 'Is_Deleted', 'Balance'],
        joins: {
            borrow: { table: 'borrow', on: 'user.User_ID = borrow.Borrower_ID' },
            fine: { table: 'fine', on: 'user.User_ID = fine.User_ID' },
            system_logs: { table: 'system_logs', on: 'user.User_ID = system_logs.User_ID' }
        }
    },
    borrow: {
        table: 'borrow',
        columns: ['Borrow_ID', 'Borrower_ID', 'Rentable_ID', 'Borrow_Date', 'Due_Date', 'Return_Date', 'Fee_Incurred'],
        joins: {
            user: { table: 'user', on: 'borrow.Borrower_ID = user.User_ID' },
            fine: { table: 'fine', on: 'borrow.Borrow_ID = fine.Borrow_ID' },
            rentable: { table: 'rentable', on: 'borrow.Rentable_ID = rentable.Rentable_ID' }
        }
    },
    fine: {
        table: 'fine',
        columns: ['Fine_ID', 'Borrow_ID', 'User_ID', 'Amount_Due', 'Paid', 'Fine_Date'],
        joins: {
            user: { table: 'user', on: 'fine.User_ID = user.User_ID' },
            borrow: { table: 'borrow', on: 'fine.Borrow_ID = borrow.Borrow_ID' }
        }
    },
    system_logs: {
        table: 'system_logs',
        columns: ['Log_ID', 'User_ID', 'Action', 'Details', 'Timestamp', 'IP_Address'],
        joins: {
            user: { table: 'user', on: 'system_logs.User_ID = user.User_ID' }
        }
    },
    rentable: {
        table: 'rentable',
        columns: ['Rentable_ID', 'Asset_ID', 'Condition', 'Availability'],
        joins: {
            borrow: { table: 'borrow', on: 'rentable.Rentable_ID = borrow.Rentable_ID' },
            asset: { table: 'asset', on: 'rentable.Asset_ID = asset.Asset_ID' }
        }
    },
    asset: {
        table: 'asset',
        columns: ['Asset_ID', 'Asset_Type'],
        joins: {
            rentable: { table: 'rentable', on: 'asset.Asset_ID = rentable.Asset_ID' },
            book: { table: 'book', on: 'asset.Asset_ID = book.Asset_ID' },
            movie: { table: 'movie', on: 'asset.Asset_ID = movie.Asset_ID' },
            cd: { table: 'cd', on: 'asset.Asset_ID = cd.Asset_ID' },
            technology: { table: 'technology', on: 'asset.Asset_ID = technology.Asset_ID' }
        }
    },
    book: { table: 'book', columns: ['Asset_ID', 'Title', 'Author', 'ISBN', 'Category'] },
    movie: { table: 'movie', columns: ['Asset_ID', 'Title', 'Director', 'Genre'] },
    cd: { table: 'cd', columns: ['Asset_ID', 'Title', 'Artist', 'Genre'] },
    technology: { table: 'technology', columns: ['Asset_ID', 'Model_Num', 'Brand'] }
};

exports.buildReport = (req, res) => {
    const { source, joins = [], filters = [], columns = [] } = req.body;

    // 1. Validate Source
    if (!SCHEMA[source]) {
        return res.writeHead(400, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Invalid data source' }));
    }

    const primaryTable = SCHEMA[source].table;
    let query = `SELECT `;
    const params = [];

    // 2. Build Columns
    const selectedColumns = [];
    if (columns.length === 0) {
        // Default to all columns of primary table if none selected
        SCHEMA[source].columns.forEach(col => selectedColumns.push(`${primaryTable}.${col}`));
    } else {
        columns.forEach(col => {
            const [table, field] = col.split('.');
            if (SCHEMA[table] && SCHEMA[table].columns.includes(field)) {
                selectedColumns.push(`${table}.${field}`);
            }
        });
    }
    query += selectedColumns.join(', ') || '*';
    query += ` FROM ${primaryTable}`;

    // 3. Build Joins
    joins.forEach(joinTarget => {
        const joinConfig = SCHEMA[source].joins[joinTarget] || (SCHEMA[joinTarget] && SCHEMA[joinTarget].joins && SCHEMA[joinTarget].joins[source] ? { table: SCHEMA[joinTarget].table, on: SCHEMA[joinTarget].joins[source].on } : null);

        // Check if it's a valid join from the source
        if (SCHEMA[source].joins[joinTarget]) {
            query += ` LEFT JOIN ${SCHEMA[joinTarget].table} ON ${SCHEMA[source].joins[joinTarget].on}`;
        }
        // Check reverse join (e.g. if source=borrow, join=user, check if user has join to borrow? No, usually defined one way in schema map for simplicity, but let's support direct lookups)
        // Actually, let's stick to the defined structure. If user wants to join 'book' from 'user', they might need 'borrow' first.
        // For simplicity of this MVP, we only allow direct joins defined in SCHEMA.
    });

    // 4. Build Filters
    if (filters.length > 0) {
        query += ` WHERE 1=1`;
        filters.forEach(filter => {
            const { field, operator, value, logic } = filter;
            const [table, col] = field.split('.');

            if (SCHEMA[table] && SCHEMA[table].columns.includes(col)) {
                const validOps = ['=', '!=', '>', '<', '>=', '<=', 'LIKE'];
                if (validOps.includes(operator)) {
                    query += ` ${logic || 'AND'} ${table}.${col} ${operator} ?`;
                    params.push(value);
                }
            }
        });
    }

    query += ` LIMIT 100`;

    console.log('Generated Query:', query);
    console.log('Params:', params);

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Report Builder Error:', err);
            return res.writeHead(500, { 'Content-Type': 'application/json' })
                && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
    });
};

exports.getSchema = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(SCHEMA));
};
