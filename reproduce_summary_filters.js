const reportController = require('./server/controllers/reportController');

async function reproduceFilters() {
    console.log('--- Reproducing Summary Filters ---');

    const baseQuery = {
        from: '2025-10-24',
        to: '2025-11-23'
    };

    const testCases = [
        { name: 'No Filters', query: { ...baseQuery } },
        { name: 'Filter by Member (John Doe)', query: { ...baseQuery, memberNames: 'John Doe' } },
        { name: 'Filter by Asset Type (Book)', query: { ...baseQuery, assetTypes: 'Book' } },
        { name: 'Filter by Status (Overdue)', query: { ...baseQuery, status: 'Overdue' } }
    ];

    for (const test of testCases) {
        console.log(`\nTesting: ${test.name}`);
        const req = { params: { id: 35 }, query: test.query };
        const res = {
            statusCode: 200,
            setHeader: () => { },
            end: (data) => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        console.error('Error:', json.error);
                        console.error('Details:', json.details);
                    } else {
                        console.log('Stats:', JSON.stringify(json).substring(0, 150) + '...');
                    }
                } catch (e) {
                    console.log('Response:', data);
                }
            }
        };

        try {
            await reportController.getLibrarianSummary(req, res);
        } catch (error) {
            console.error('Crash:', error);
        }
    }
}

reproduceFilters();
