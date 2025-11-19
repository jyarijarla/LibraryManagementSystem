const db = require('./db');

const seedData = async () => {
    const connection = await db.promise().getConnection();
    try {
        console.log('🌱 Starting seed process...');

        // 1. Find a Student User
        const [users] = await connection.query("SELECT User_ID, First_Name FROM user WHERE Role = 1 LIMIT 1");
        let userId;
        if (users.length === 0) {
            console.log('⚠️ No student found. Creating one...');
            // Create a dummy student
            const [res] = await connection.query(`
                INSERT INTO user (Username, First_Name, Last_Name, User_Email, User_Phone, Role, Password, Balance)
                VALUES ('demostudent', 'Demo', 'Student', 'demo@student.edu', '555-0199', 1, 'password123', 0)
            `);
            userId = res.insertId;
            console.log(`✅ Created student: Demo Student (ID: ${userId})`);
        } else {
            userId = users[0].User_ID;
            console.log(`✅ Using existing student: ${users[0].First_Name} (ID: ${userId})`);
        }

        // 2. Ensure we have enough Rentables (Assets)
        // We need at least 5 rentables to create diverse scenarios
        const [rentables] = await connection.query("SELECT Rentable_ID, Asset_ID FROM rentable LIMIT 10");

        // If not enough rentables, let's just assume we can use what we have or fail if 0
        if (rentables.length < 5) {
            console.log('⚠️ Not enough rentables found. Please ensure assets exist in the DB first.');
            // In a real scenario, we'd create assets here, but for now let's assume some exist or just use what we have cyclically
        }

        const getRentableId = (index) => rentables[index % rentables.length].Rentable_ID;

        // Force update availability to 1 (Available) for these rentables so triggers don't block us
        const rentableIds = rentables.map(r => r.Rentable_ID);
        if (rentableIds.length > 0) {
            await connection.query(`UPDATE rentable SET Availability = 1 WHERE Rentable_ID IN (${rentableIds.join(',')})`);
            console.log('🔧 Reset availability for selected rentables.');
        }

        // 3. Clear existing borrows for this user to avoid clutter/duplicates for this demo
        await connection.query("DELETE FROM borrow WHERE Borrower_ID = ?", [userId]);
        await connection.query("DELETE FROM hold WHERE Holder_ID = ?", [userId]);
        console.log('🧹 Cleared existing data for user.');

        // 4. Create Scenarios

        const today = new Date();
        const day = 24 * 60 * 60 * 1000;

        // Scenario A: Active Overdue (Fine Pending)
        // Due 5 days ago, borrowed 10 days ago.
        const overdueDate = new Date(today.getTime() - 5 * day);
        const borrowDateA = new Date(today.getTime() - 10 * day);

        await connection.query(`
            INSERT INTO borrow (Borrower_ID, Rentable_ID, Borrow_Date, Due_Date, Return_Date, Fee_Incurred, Processed_By)
            VALUES (?, ?, ?, ?, NULL, 0, 1)
        `, [userId, getRentableId(0), borrowDateA, overdueDate]);
        console.log('✅ Created Active Overdue Loan');

        // Scenario B: Returned Overdue (Unpaid Fine)
        // Due 10 days ago, Returned 5 days ago. 5 days overdue.
        // Fine = 5 days * $1.00 (assuming) = $5.00. Fee_Incurred should be 5.00 (Debt).
        const dueDateB = new Date(today.getTime() - 10 * day);
        const borrowDateB = new Date(today.getTime() - 20 * day);
        const returnDateB = new Date(today.getTime() - 5 * day);

        await connection.query(`
            INSERT INTO borrow (Borrower_ID, Rentable_ID, Borrow_Date, Due_Date, Return_Date, Fee_Incurred, Processed_By)
            VALUES (?, ?, ?, ?, ?, 5.00, 1)
        `, [userId, getRentableId(1), borrowDateB, dueDateB, returnDateB]);
        console.log('✅ Created Returned Overdue Loan (Unpaid Fine)');

        // Scenario C: Active On-Time
        // Borrowed yesterday, Due in 6 days.
        const borrowDateC = new Date(today.getTime() - 1 * day);
        const dueDateC = new Date(today.getTime() + 6 * day);

        await connection.query(`
            INSERT INTO borrow (Borrower_ID, Rentable_ID, Borrow_Date, Due_Date, Return_Date, Fee_Incurred, Processed_By)
            VALUES (?, ?, ?, ?, NULL, 0, 1)
        `, [userId, getRentableId(2), borrowDateC, dueDateC]);
        console.log('✅ Created Active On-Time Loan');

        // Scenario D: Returned On-Time (History)
        // Borrowed 20 days ago, Due 10 days ago, Returned 12 days ago.
        const borrowDateD = new Date(today.getTime() - 20 * day);
        const dueDateD = new Date(today.getTime() - 10 * day);
        const returnDateD = new Date(today.getTime() - 12 * day);

        await connection.query(`
            INSERT INTO borrow (Borrower_ID, Rentable_ID, Borrow_Date, Due_Date, Return_Date, Fee_Incurred, Processed_By)
            VALUES (?, ?, ?, ?, ?, 0, 1)
        `, [userId, getRentableId(3), borrowDateD, dueDateD, returnDateD]);
        console.log('✅ Created Returned On-Time Loan (History)');

        // Scenario E: Active Hold
        // Hold placed today, expires in 3 days.
        const holdExpires = new Date(today.getTime() + 3 * day);

        // We need a Rentable_ID for hold
        const rentableIdForHold = rentables[4 % rentables.length].Rentable_ID;

        await connection.query(`
            INSERT INTO hold (Holder_ID, Rentable_ID, Hold_Date, Hold_Expires)
            VALUES (?, ?, ?, ?)
        `, [userId, rentableIdForHold, today, holdExpires]);
        console.log('✅ Created Active Hold');

        console.log('🎉 Seed completed successfully!');

    } catch (error) {
        console.error('❌ Seed failed:', error);
    } finally {
        connection.release();
        process.exit();
    }
};

seedData();
