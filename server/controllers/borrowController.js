const db = require('../db');

// Get all borrow records
exports.getAllRecords = (req, res) => {
  const query = `
    SELECT 
      b.Borrow_ID as id,
      CONCAT(u.First_Name, ' ', COALESCE(u.Last_Name, '')) as studentName,
      bk.Title as bookTitle,
      DATE_FORMAT(b.Borrow_Date, '%Y-%m-%d') as borrowDate,
      DATE_FORMAT(b.Due_Date, '%Y-%m-%d') as dueDate,
      DATE_FORMAT(b.Return_Date, '%Y-%m-%d') as returnDate,
      CASE 
        WHEN b.Return_Date IS NULL THEN 'Borrowed'
        ELSE 'Returned'
      END as status,
      b.Fee_Incurred as feeIncurred
    FROM borrow b
    JOIN user u ON b.Borrower_ID = u.User_ID
    JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
    JOIN book bk ON r.Asset_ID = bk.Asset_ID
    ORDER BY b.Borrow_Date DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching borrow records:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

// Return book
exports.returnBook = (req, res) => {
  const { id } = req.params;
  
  // Update borrow record with return date
  db.query(
    'UPDATE borrow SET Return_Date = CURDATE() WHERE Borrow_ID = ? AND Return_Date IS NULL',
    [id],
    (err, result) => {
      if (err) {
        console.error('Error returning book:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to return book', error: err.message }));
      }
      
      if (result.affectedRows === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Borrow record not found or already returned' }));
      }
      
      // Update book available copies
      db.query(
        `UPDATE book b
         JOIN rentable r ON b.Asset_ID = r.Asset_ID
         JOIN borrow br ON r.Rentable_ID = br.Rentable_ID
         SET b.Available_Copies = b.Available_Copies + 1
         WHERE br.Borrow_ID = ?`,
        [id],
        (err) => {
          if (err) {
            console.error('Error updating book availability:', err);
          }
        }
      );
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Book returned successfully' }));
    }
  );
};

// Get dashboard stats
exports.getDashboardStats = (req, res) => {
  const queries = {
    totalBooks: 'SELECT COALESCE(SUM(Copies), 0) as count FROM book',
    availableBooks: 'SELECT COALESCE(SUM(Available_Copies), 0) as count FROM book',
    totalStudents: 'SELECT COUNT(*) as count FROM user WHERE Role = 3',
    borrowedBooks: 'SELECT COUNT(*) as count FROM borrow WHERE Return_Date IS NULL'
  };
  
  const results = {};
  let completed = 0;
  
  Object.keys(queries).forEach(key => {
    db.query(queries[key], (err, result) => {
      if (err) {
        console.error(`Error fetching ${key}:`, err);
        results[key] = 0;
      } else {
        results[key] = result[0].count || 0;
      }
      
      completed++;
      if (completed === Object.keys(queries).length) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      }
    });
  });
};
