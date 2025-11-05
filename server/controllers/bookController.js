const db = require('../db');

// Get all books
exports.getAllBooks = (req, res) => {
  const query = `
    SELECT 
      b.Asset_ID as id,
      b.Title as title,
      b.Author as author,
      b.ISBN as isbn,
      COUNT(r.Rentable_ID) as quantity,
      SUM(r.Availability) as available,
      b.Page_Count as pageCount,
      'Book' as category
    FROM book b
    LEFT JOIN rentable r ON b.Asset_ID = r.Asset_ID
    GROUP BY b.Asset_ID, b.Title, b.Author, b.ISBN, b.Page_Count
    ORDER BY b.Title ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching books:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Database error', error: err.message }));
    }
    // Convert null available to 0 for books with no rentables
    results = results.map(book => ({
      ...book,
      available: book.available || 0
    }));
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
      
      // Then insert into book table (without Copies and Available_Copies columns)
      const bookQuery = `
        INSERT INTO book (Asset_ID, Title, Author, ISBN, Page_Count)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      db.query(bookQuery, [nextAssetId, title, author, isbn || 0, pageCount || null], (err) => {
        if (err) {
          console.error('Error inserting book:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Failed to add book', error: err.message }));
        }
        
        // Now insert rentable entries for each copy
        const copies = parseInt(quantity) || 1;
        if (copies > 0) {
          const rentableQuery = 'INSERT INTO rentable (Asset_ID, Availability, Fee) VALUES (?, 1, 0.00)';
          let insertedCopies = 0;
          
          for (let i = 0; i < copies; i++) {
            db.query(rentableQuery, [nextAssetId], (err) => {
              if (err) {
                console.error('Error inserting rentable:', err);
              }
              insertedCopies++;
              
              // When all copies are inserted, send response
              if (insertedCopies === copies) {
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  message: 'Book added successfully', 
                  id: nextAssetId 
                }));
              }
            });
          }
        } else {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            message: 'Book added successfully', 
            id: nextAssetId 
          }));
        }
      });
    });
  });
};

// Update book
exports.updateBook = (req, res) => {
  const { id } = req.params;
  const { title, author, isbn, quantity, pageCount } = req.body;
  
  // Update book info (without copies columns)
  const query = `
    UPDATE book 
    SET Title = ?, Author = ?, ISBN = ?, Page_Count = ?
    WHERE Asset_ID = ?
  `;
  
  db.query(query, [title, author, isbn || 0, pageCount || null, id], (err, result) => {
    if (err) {
      console.error('Error updating book:', err);
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Failed to update book', error: err.message }));
    }
    
    if (result.affectedRows === 0) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        && res.end(JSON.stringify({ message: 'Book not found' }));
    }
    
    // If quantity is provided, update rentable entries
    if (quantity !== undefined) {
      // Get current number of rentables
      db.query('SELECT COUNT(*) as currentCount FROM rentable WHERE Asset_ID = ?', [id], (err, countResult) => {
        if (err) {
          console.error('Error counting rentables:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            && res.end(JSON.stringify({ message: 'Failed to update copies', error: err.message }));
        }
        
        const currentCount = countResult[0].currentCount;
        const targetCount = parseInt(quantity) || 0;
        
        if (targetCount > currentCount) {
          // Add more copies
          const copiesToAdd = targetCount - currentCount;
          const rentableQuery = 'INSERT INTO rentable (Asset_ID, Availability, Fee) VALUES (?, 1, 0.00)';
          let addedCopies = 0;
          
          for (let i = 0; i < copiesToAdd; i++) {
            db.query(rentableQuery, [id], (err) => {
              if (err) {
                console.error('Error adding rentable:', err);
              }
              addedCopies++;
              
              if (addedCopies === copiesToAdd) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Book updated successfully' }));
              }
            });
          }
        } else if (targetCount < currentCount) {
          // Remove excess copies (only remove available ones)
          const copiesToRemove = currentCount - targetCount;
          db.query(
            'DELETE FROM rentable WHERE Asset_ID = ? AND Availability = 1 LIMIT ?',
            [id, copiesToRemove],
            (err, deleteResult) => {
              if (err) {
                console.error('Error removing rentables:', err);
                return res.writeHead(500, { 'Content-Type': 'application/json' })
                  && res.end(JSON.stringify({ message: 'Failed to update copies', error: err.message }));
              }
              
              if (deleteResult.affectedRows < copiesToRemove) {
                return res.writeHead(400, { 'Content-Type': 'application/json' })
                  && res.end(JSON.stringify({ 
                    message: `Can only remove ${deleteResult.affectedRows} copies. Some copies are currently borrowed.` 
                  }));
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Book updated successfully' }));
            }
          );
        } else {
          // No change in quantity
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Book updated successfully' }));
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Book updated successfully' }));
    }
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
