const db = require('../db');

const getAllEvents = (req, res) => {
  try {
    const query = `
      SELECT Event_ID, Title, Event_Date, Start_Time, End_Time, Details, Image_URL, recurring
      FROM Calendar
      WHERE deleted = 0
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

// Create Event
const createEvent = (req, res) => {
  try {
      const {Title, Event_Date, Start_Time, End_Time, Details, Image_URL, recurring} = req.body || {};

    // validation

    if (!Title || !Event_Date) {
      return res.writeHead(400, {'Content-Type': 'application/json'})
        .end(JSON.stringify({error: 'Title and Event_Date are required'}));
    }
 
    const insertQuery = `
      INSERT INTO Calendar (Title, Event_Date, Start_Time, End_Time, Details, Image_URL, recurring)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
 
    const params = [Title, Event_Date, Start_Time, End_Time, Details || null, Image_URL || null, recurring ?? 0];

db.query(insertQuery, params, (err, result) => {
      if (err) {
        console.error('❌ Error inserting event:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database insert error', details: err.message }));
      }

      const insertedId = result.insertId;
      console.log(`✅ Event created (ID: ${insertedId})`);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ Event_ID: insertedId }));
    });
  } catch (error) {
    console.error('❌ Error in createEvent:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error', details: error.message }));
  }
};

// New: delete event by id
const deleteEvent = (req, res) => {
  try {
    const eventId = req.params?.id || (req.body && req.body.Event_ID);
    if (!eventId) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Event ID required' }));
    }

    const delQuery = `UPDATE Calendar Set deleted = 1 WHERE Event_ID = ?`;
    db.query(delQuery, [eventId], (err, result) => {
      if (err) {
        console.error('❌ Error deleting event:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database delete error', details: err.message }));
      }

      if (result.affectedRows === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Event not found' }));
      }

      console.log(`🗑️ Event deleted (ID: ${eventId})`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  } catch (error) {
    console.error('❌ Error in deleteEvent:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error', details: error.message }));
  }
};

module.exports = {
  getAllEvents,
  createEvent,
  deleteEvent,
};

  
