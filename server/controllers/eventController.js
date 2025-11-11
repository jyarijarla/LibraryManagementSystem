const db = require('../db');

async function getAllEvents() {

    try {

        const [rows] = await db.query (`
            SELECT * FROM Calendar;
            ORDER BY Event_Date ASC, Start_Time ASC
            `);

            return rows; // rows is the array of events
        } catch(err) {
            console.error('Error fetching events:', err)
            throw err;
            

            }
    }

module.exports = {
    getAllEvents

};
