const db = require('../db');

// Get all books
exports.getAllBooks = (req, res) => {
  const query = `
    SELECT 
      b.Asset_ID as id,
      b.Title as title,
      b.Author as author,
      b.ISBN as isbn,
      b.Copies as quantity,
      b.Available_Copies as available,
      b.Page_Count as pageCount,
      'Book' as category
    FROM book b
    ORDER BY b.Title ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching books:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
};

// Add new book
exports.addBook = (req, res) => {
  const { title, author, isbn, quantity, pageCount } = req.body;
  
  // First, get the next Asset_ID
  db.query('SELECT MAX(Asset_ID) as maxId FROM asset', (err, result) => {
    if (err) {
      console.error('Error getting max Asset_ID:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
    }
    
    const nextAssetId = (result[0].maxId || 0) + 1;
    
    // Insert into asset table first (Asset_TypeID = 1 for book)
    db.query('INSERT INTO asset (Asset_ID, Asset_TypeID) VALUES (?, 1)', [nextAssetId], (err) => {
      if (err) {
        console.error('Error inserting into asset:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Failed to create asset', error: err.message }));
      }
      
      // Then insert into book table
      const bookQuery = `
        INSERT INTO book (Asset_ID, Title, Author, ISBN, Copies, Available_Copies, Page_Count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.query(bookQuery, [nextAssetId, title, author, isbn || 0, quantity, quantity, pageCount || null], (err) => {
        if (err) {
          console.error('Error inserting book:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Failed to add book', error: err.message }));
        }
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          message: 'Book added successfully', 
          id: nextAssetId 
        }));
      });
    });
  });
};

// Update book
exports.updateBook = (req, res) => {
  const { id } = req.params;
  const { title, author, isbn, quantity, pageCount } = req.body;
  
  const query = `
    UPDATE book 
    SET Title = ?, Author = ?, ISBN = ?, Copies = ?, Page_Count = ?
    WHERE Asset_ID = ?
  `;
  
  db.query(query, [title, author, isbn || 0, quantity, pageCount || null, id], (err, result) => {
    if (err) {
      console.error('Error updating book:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to update book', error: err.message }));
    }
    
    if (result.affectedRows === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Book not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Book updated successfully' }));
  });
};

// Delete book
exports.deleteBook = (req, res) => {
  const { id } = req.params;
  
  // Check if book is currently borrowed
  db.query(
    'SELECT COUNT(*) as count FROM borrow b JOIN rentable r ON b.Rentable_ID = r.Rentable_ID WHERE r.Asset_ID = ? AND b.Return_Date IS NULL',
    [id],
    (err, result) => {
      if (err) {
        console.error('Error checking borrows:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
      }
      
      if (result[0].count > 0) {
        return res.writeHead(400, { 'Content-Type': 'application/json' })
          && res.end(JSON.stringify({ message: 'Cannot delete book that is currently borrowed' }));
      }
      
      // Delete from book table (asset will remain for referential integrity)
      db.query('DELETE FROM book WHERE Asset_ID = ?', [id], (err, result) => {
        if (err) {
          console.error('Error deleting book:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Failed to delete book', error: err.message }));
        }
        
        if (result.affectedRows === 0) {
          return res.writeHead(404, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Book not found' }));
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Book deleted successfully' }));
      });
    }
  );
};
