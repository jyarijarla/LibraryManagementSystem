const db = require('../db');

const getAllEvents = (req, res) => {
  try {
    const query = `
      SELECT Event_ID, Title, Event_Date, Start_Time, End_Time, Details, Image_URL, recurring
      FROM Calendar
      ORDER BY Event_Date ASC, Start_Time ASC
    `;

    console.log('📅 getAllEvents - Executing query:', query);

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Error fetching events:');
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        console.error('SQL State:', err.sqlState);
        console.error('Full error:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error', details: err.message }));
      }

      console.log('✅ Events fetched successfully, count:', results.length);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('❌ Error in getAllEvents:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error', details: error.message }));
  }
};

module.exports = {
  getAllEvents,
};
