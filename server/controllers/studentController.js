const db = require('../db');

// Get all students
exports.getAllStudents = (req, res) => {
  const query = `
    SELECT 
      u.User_ID as id,
      CONCAT(u.First_Name, ' ', COALESCE(u.Last_Name, '')) as name,
      u.User_Email as email,
      u.Username as studentId,
      u.User_Phone as phone,
      COUNT(CASE WHEN b.Return_Date IS NULL THEN 1 END) as borrowedBooks,
      'Active' as status
    FROM user u
    LEFT JOIN borrow b ON u.User_ID = b.Borrower_ID
    WHERE u.Role = 3
    GROUP BY u.User_ID
    ORDER BY u.First_Name ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching students:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

// Update student
exports.updateStudent = (req, res) => {
  const { id } = req.params;
  const { name, email, studentId, phone } = req.body;
  
  // Split name into first and last
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || null;
  
  const query = `
    UPDATE user 
    SET First_Name = ?, Last_Name = ?, User_Email = ?, Username = ?, User_Phone = ?
    WHERE User_ID = ? AND Role = 3
  `;
  
  db.query(query, [firstName, lastName, email, studentId, phone || null, id], (err, result) => {
    if (err) {
      console.error('Error updating student:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to update student', error: err.message }));
    }
    
    if (result.affectedRows === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Student not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Student updated successfully' }));
  });
};

// Delete student
exports.deleteStudent = (req, res) => {
  const { id } = req.params;
  
  // Check if student has active borrows
  db.query(
    'SELECT COUNT(*) as count FROM borrow WHERE Borrower_ID = ? AND Return_Date IS NULL',
    [id],
    (err, results) => {
      if (err) {
        console.error('Error checking borrows:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
      }
      
      if (results[0].count > 0) {
        return res.writeHead(400, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Cannot delete student with active borrowed items' }));
      }
      
      db.query('DELETE FROM user WHERE User_ID = ? AND Role = 3', [id], (err, result) => {
        if (err) {
          console.error('Error deleting student:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Failed to delete student', error: err.message }));
        }
        
        if (result.affectedRows === 0) {
          return res.writeHead(404, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Student not found' }));
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Student deleted successfully' }));
      });
    }
  );
};
