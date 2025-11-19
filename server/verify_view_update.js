const db = require('./db');

async function verifyView() {
    const connection = await db.promise();
    try {
        // 1. Pick a book
        const [books] = await connection.query("SELECT * FROM book_inventory LIMIT 1");
        const book = books[0];
        console.log(`Initial State: ${book.Title} (Asset ID: ${book.Asset_ID})`);
        console.log(`Available Copies: ${book.Available_Copies}`);

        // 2. Find an available rentable
        const [rentables] = await connection.query("SELECT Rentable_ID FROM rentable WHERE Asset_ID = ? AND Availability = 1 LIMIT 1", [book.Asset_ID]);

        if (rentables.length === 0) {
            console.log("No available copies to test issue.");
            process.exit(0);
        }
        const rentableId = rentables[0].Rentable_ID;

        // 3. Simulate Issue
        console.log(`Simulating Issue for Rentable ID: ${rentableId}...`);
        await connection.query("UPDATE rentable SET Availability = 0 WHERE Rentable_ID = ?", [rentableId]);

        // 4. Check View Again
        const [booksAfter] = await connection.query("SELECT Available_Copies FROM book_inventory WHERE Asset_ID = ?", [book.Asset_ID]);
        console.log(`After Issue: Available Copies: ${booksAfter[0].Available_Copies}`);

        // 5. Revert (Simulate Return)
        console.log(`Simulating Return...`);
        await connection.query("UPDATE rentable SET Availability = 1 WHERE Rentable_ID = ?", [rentableId]);

        // 6. Check View Again
        const [booksFinal] = await connection.query("SELECT Available_Copies FROM book_inventory WHERE Asset_ID = ?", [book.Asset_ID]);
        console.log(`After Return: Available Copies: ${booksFinal[0].Available_Copies}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verifyView();
