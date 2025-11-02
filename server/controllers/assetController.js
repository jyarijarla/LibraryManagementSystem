const db = require('../db');

// Get all books with their details
const getAllBooks = async (req, res) => {
  try {
    const query = `
      SELECT b.Asset_ID, b.ISBN, b.Title, b.Author, b.Page_Count, b.Copies, b.Available_Copies, b.Image_URL
      FROM book_inventory b
      ORDER BY b.Title
    `;
    
    console.log('📚 getAllBooks - Executing query:', query);
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Error fetching books:');
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        console.error('SQL State:', err.sqlState);
        console.error('Full error:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error', details: err.message }));
      }
      console.log('✅ Books fetched successfully, count:', results.length);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('❌ Error in getAllBooks:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error', details: error.message }));
  }
};

// Get all CDs
const getAllCDs = async (req, res) => {
  try {
    const query = `
      SELECT c.Asset_ID, c.Total_Tracks, c.Total_Duration_In_Minutes, c.Title, c.Artist, c.Copies, c.Available_Copies, c.Image_URL
      FROM cd_inventory c
      ORDER BY c.Title
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching CDs:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('Error in getAllCDs:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

// Get all Audiobooks
const getAllAudiobooks = async (req, res) => {
  try {
    const query = `
      SELECT ab.Asset_ID, ab.ISBN, ab.Title, ab.Author, ab.length, ab.Copies, ab.Available_Copies, ab.Image_URL
      FROM audiobook_inventory ab
      ORDER BY ab.Title
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching audiobooks:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('Error in getAllAudiobooks:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

// Get all Movies
const getAllMovies = async (req, res) => {
  try {
    const query = `
      SELECT m.Asset_ID, m.Title, m.Release_Year, m.Age_Rating, m.Available_Copies, m.Image_URL
      FROM movie_inventory m
      ORDER BY m.Title
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching movies:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('Error in getAllMovies:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

// Get all Technology items
const getAllTechnology = async (req, res) => {
  try {
    const query = `
      SELECT t.Asset_ID, t.Model_Num, t.Type, t.Description, t.Copies, t.Image_URL
      FROM technology_inventory t
      ORDER BY t.Type, t.Model_Num
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching technology:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('Error in getAllTechnology:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

// Get all Study Rooms
const getAllStudyRooms = async (req, res) => {
  try {
    const query = `
      SELECT sr.Asset_ID, sr.Room_Number, sr.Capacity, sr.Availability, sr.Image_URL
      FROM study_room sr
      ORDER BY sr.Room_Number
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching study rooms:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
  } catch (error) {
    console.error('Error in getAllStudyRooms:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

// Add a new book
const addBook = async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const { ISBN, Title, Author, Page_Count, Copies, Image_URL } = req.body;
    
    console.log('📚 addBook - Received data:', { ISBN, Title, Author, Page_Count, Copies, Image_URL });
    
    if (!ISBN || !Title || !Author || !Page_Count || !Copies) {
      console.log('❌ Missing required fields');
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    // Image can be uploaded via req.file but we won't store it in database
    const imagePath = req.file ? `/assets/uploads/${req.file.filename}` : null;
    console.log('🖼️  Image path:', imagePath);
    
    //start transaction
    await connection.beginTransaction();

    //inserting into asset
    const assetQuery = 'INSERT INTO asset (Asset_TypeID) VALUES (?)';
    const [assetResult] = await connection.query(assetQuery, [1]);//[1] being the asset_type for book
    const newAssetId = assetResult.insertId;
    console.log("Asset ID Assigned:", newAssetId);
    
    //inserting into book
    const bookQuery = 'INSERT INTO book (Asset_ID, ISBN, Title, Author, Page_Count, Image_URL) VALUES (?, ?, ?, ?, ?, ?)';
    await connection.query(bookQuery, [newAssetId, ISBN, Title, Author, Page_Count, Image_URL || null]);
    console.log("Insert into book successful");

    //inserting rentables based on copies
    const rentableQuery = 'INSERT INTO rentable (Asset_ID, Availability, Fee) VALUES (?, ?, ?)';
    for(let r = 0; r < Copies; r++){
      await connection.query(rentableQuery, [newAssetId, 1, 0.00])
    }
    
    //end transaction
    await connection.commit();

    console.log(Copies, " inserts into rentable successful");
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Book added successfully',
      assetId: newAssetId,
      imageUrl: imagePath // Still return image path for frontend use
    }));
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error in addBook:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error', details: error.message }));
  }
};

// Add a new CD
const addCD = async (req, res) => {
  try {
    const { Total_Tracks, Total_Duration_In_Minutes, Title, Artist, Copies, Image_URL } = req.body;
    
    if (!Total_Tracks || !Total_Duration_In_Minutes || !Title || !Artist || !Copies) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    db.query('SELECT MAX(Asset_ID) as maxId FROM asset', (err, result) => {
      if (err) {
        console.error('Error getting max Asset_ID:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error' }));
      }

      const newAssetId = (result[0].maxId || 0) + 1;

      // Check if this Asset_ID already exists with the same type
      db.query('SELECT Asset_ID, Asset_TypeID FROM asset WHERE Asset_ID = ?', [newAssetId], (err, existing) => {
        if (err) {
          console.error('Error checking existing asset:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'Database error' }));
        }

        const insertOrUseAsset = (callback) => {
          if (existing.length > 0) {
            // Asset exists, check if it's the same type (6 = technology)
            if (existing[0].Asset_TypeID === 6) {
              // Same type, reuse it
              callback(null);
            } else {
              // Different type, this is an error - shouldn't happen
              return callback(new Error('Asset ID exists with different type'));
            }
          } else {
            // Create new asset
            const assetQuery = 'INSERT INTO asset (Asset_ID, Asset_TypeID) VALUES (?, ?)';
            db.query(assetQuery, [newAssetId, 6], callback);
          }
        };

        insertOrUseAsset((err) => {
          if (err) {
            console.error('Error inserting into asset:', err);
            return res.writeHead(500, { 'Content-Type': 'application/json' })
              .end(JSON.stringify({ error: 'Failed to create asset', details: err.message }));
          }

          // Get max CD_ID to generate new one
          db.query('SELECT MAX(CD_ID) as maxCDID FROM cd', (err, result) => {
            if (err) {
              console.error('Error getting max CD_ID:', err);
              return res.writeHead(500, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'Database error' }));
            }

            const newCDID = (result[0].maxCDID || 0) + 1;

            const cdQuery = `
              INSERT INTO cd (Asset_ID, CD_ID, Total_Tracks, Total_Duration_In_Minutes, Title, Artist, Copies, Available_Copies, Image_URL)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            db.query(cdQuery, [newAssetId, newCDID, Total_Tracks, Total_Duration_In_Minutes, Title, Artist, Copies, Copies, Image_URL || null], (err) => {
              if (err) {
                console.error('Error adding CD:', err);
                return res.writeHead(500, { 'Content-Type': 'application/json' })
                  .end(JSON.stringify({ error: 'Failed to add CD', details: err.message }));
              }
              
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                message: 'CD added successfully',
                assetId: newAssetId
              }));
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in addCD:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

// Add other asset types similarly...
const addAudiobook = async (req, res) => {
  try {
    const { ISBN, Title, Author, length, Copies, Image_URL } = req.body;
    
    if (!ISBN || !Title || !Author || !length || !Copies) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    db.query('SELECT MAX(Asset_ID) as maxId FROM asset', (err, result) => {
      if (err) {
        console.error('Error getting max Asset_ID:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error' }));
      }

      const newAssetId = (result[0].maxId || 0) + 1;

      db.query('SELECT Asset_ID FROM asset WHERE Asset_ID = ?', [newAssetId], (err, existing) => {
        if (err) {
          console.error('Error checking existing asset:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'Database error' }));
        }

        const insertOrUseAsset = (callback) => {
          if (existing.length > 0) {
            callback(null);
          } else {
            const assetQuery = 'INSERT INTO asset (Asset_ID, Asset_TypeID) VALUES (?, ?)';
            db.query(assetQuery, [newAssetId, 5], callback);
          }
        };

        insertOrUseAsset((err) => {
          if (err) {
            console.error('Error inserting into asset:', err);
            return res.writeHead(500, { 'Content-Type': 'application/json' })
              .end(JSON.stringify({ error: 'Failed to create asset', details: err.message }));
          }

          const audiobookQuery = `
            INSERT INTO audiobook (Asset_ID, ISBN, Title, Author, length, Copies, Available_Copies, Image_URL)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          db.query(audiobookQuery, [newAssetId, ISBN, Title, Author, length, Copies, Copies, Image_URL || null], (err) => {
            if (err) {
              console.error('Error adding audiobook:', err);
              return res.writeHead(500, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'Failed to add audiobook', details: err.message }));
            }
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              message: 'Audiobook added successfully',
              assetId: newAssetId
            }));
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in addAudiobook:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

const addMovie = async (req, res) => {
  try {
    const { Title, Release_Year, Age_Rating, Copies, Image_URL } = req.body;
    
    if (!Title || !Release_Year || !Age_Rating || !Copies) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    db.query('SELECT MAX(Asset_ID) as maxId FROM asset', (err, result) => {
      if (err) {
        console.error('Error getting max Asset_ID:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error' }));
      }

      const newAssetId = (result[0].maxId || 0) + 1;

      db.query('SELECT Asset_ID FROM asset WHERE Asset_ID = ?', [newAssetId], (err, existing) => {
        if (err) {
          console.error('Error checking existing asset:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'Database error' }));
        }

        const insertOrUseAsset = (callback) => {
          if (existing.length > 0) {
            callback(null);
          } else {
            const assetQuery = 'INSERT INTO asset (Asset_ID, Asset_TypeID) VALUES (?, ?)';
            db.query(assetQuery, [newAssetId, 3], callback);
          }
        };

        insertOrUseAsset((err) => {
          if (err) {
            console.error('Error inserting into asset:', err);
            return res.writeHead(500, { 'Content-Type': 'application/json' })
              .end(JSON.stringify({ error: 'Failed to create asset', details: err.message }));
          }

          // Get max Movie_ID to generate new one
          db.query('SELECT MAX(Movie_ID) as maxMovieID FROM movie', (err, result) => {
            if (err) {
              console.error('Error getting max Movie_ID:', err);
              return res.writeHead(500, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'Database error' }));
            }

            const newMovieID = (result[0].maxMovieID || 0) + 1;

            const movieQuery = `
              INSERT INTO movie (Asset_ID, Movie_ID, Title, Release_Year, Age_Rating, Available_Copies, Image_URL)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            db.query(movieQuery, [newAssetId, newMovieID, Title, Release_Year, Age_Rating, Copies, Image_URL || null], (err) => {
              if (err) {
                console.error('Error adding movie:', err);
                return res.writeHead(500, { 'Content-Type': 'application/json' })
                  .end(JSON.stringify({ error: 'Failed to add movie', details: err.message }));
              }
              
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                message: 'Movie added successfully',
                assetId: newAssetId
              }));
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in addMovie:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

const addTechnology = async (req, res) => {
  try {
    const { Model_Num, Type, Description, Copies, Image_URL } = req.body;
    
    if (!Model_Num || !Type || !Description || !Copies) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    db.query('SELECT MAX(Asset_ID) as maxId FROM asset', (err, result) => {
      if (err) {
        console.error('Error getting max Asset_ID:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error' }));
      }

      const newAssetId = (result[0].maxId || 0) + 1;

      // Check if this Asset_ID already exists
      db.query('SELECT Asset_ID FROM asset WHERE Asset_ID = ?', [newAssetId], (err, existing) => {
        if (err) {
          console.error('Error checking existing asset:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'Database error' }));
        }

        // If asset exists, use it; otherwise create new one
        const insertOrUseAsset = (callback) => {
          if (existing.length > 0) {
            // Asset already exists, just use it
            callback(null);
          } else {
            // Create new asset
            const assetQuery = 'INSERT INTO asset (Asset_ID, Asset_TypeID) VALUES (?, ?)';
            db.query(assetQuery, [newAssetId, 6], callback);
          }
        };

        insertOrUseAsset((err) => {
          if (err) {
            console.error('Error inserting into asset:', err);
            return res.writeHead(500, { 'Content-Type': 'application/json' })
              .end(JSON.stringify({ error: 'Failed to create asset', details: err.message }));
          }

          const technologyQuery = `
            INSERT INTO technology (Asset_ID, Model_Num, Type, Description, Copies, Image_URL)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          
          db.query(technologyQuery, [newAssetId, Model_Num, Type, Description, Copies, Image_URL || null], (err) => {
            if (err) {
              console.error('Error adding technology:', err);
              return res.writeHead(500, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'Failed to add technology', details: err.message }));
            }
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              message: 'Technology added successfully',
              assetId: newAssetId
            }));
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in addTechnology:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

const addStudyRoom = async (req, res) => {
  try {
    const { Room_Number, Capacity, Image_URL } = req.body;
    
    if (!Room_Number || !Capacity) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    db.query('SELECT MAX(Asset_ID) as maxId FROM asset', (err, result) => {
      if (err) {
        console.error('Error getting max Asset_ID:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Database error' }));
      }

      const newAssetId = (result[0].maxId || 0) + 1;

      db.query('SELECT Asset_ID FROM asset WHERE Asset_ID = ?', [newAssetId], (err, existing) => {
        if (err) {
          console.error('Error checking existing asset:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'Database error' }));
        }

        const insertOrUseAsset = (callback) => {
          if (existing.length > 0) {
            callback(null);
          } else {
            const assetQuery = 'INSERT INTO asset (Asset_ID, Asset_TypeID) VALUES (?, ?)';
            db.query(assetQuery, [newAssetId, 4], callback);
          }
        };

        insertOrUseAsset((err) => {
          if (err) {
            console.error('Error inserting into asset:', err);
            return res.writeHead(500, { 'Content-Type': 'application/json' })
              .end(JSON.stringify({ error: 'Failed to create asset', details: err.message }));
          }

          const roomQuery = `
            INSERT INTO study_room (Asset_ID, Room_Number, Capacity, Availability, Image_URL)
            VALUES (?, ?, ?, 1, ?)
          `;
          
          db.query(roomQuery, [newAssetId, Room_Number, Capacity, Image_URL || null], (err) => {
            if (err) {
              console.error('Error adding study room:', err);
              return res.writeHead(500, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'Failed to add study room', details: err.message }));
            }
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              message: 'Study room added successfully',
              assetId: newAssetId
            }));
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in addStudyRoom:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

// Delete any asset by ID
const deleteAsset = async (req, res) => {
  try {
    const assetId = req.params.id;
    
    if (!assetId) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Asset ID is required' }));
    }

    // First, delete any borrow records that reference this asset through rentable table
    const deleteBorrowQuery = `
      DELETE b FROM borrow b
      JOIN rentable r ON b.Rentable_ID = r.Rentable_ID
      WHERE r.Asset_ID = ?
    `;
    
    db.query(deleteBorrowQuery, [assetId], (err) => {
      if (err) {
        console.error('Error deleting borrow records:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Failed to delete borrow records', details: err.message }));
      }

      // Then delete from rentable table
      const deleteRentableQuery = 'DELETE FROM rentable WHERE Asset_ID = ?';
      
      db.query(deleteRentableQuery, [assetId], (err) => {
        if (err) {
          console.error('Error deleting rentable records:', err);
          return res.writeHead(500, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'Failed to delete rentable records', details: err.message }));
        }

        // Now delete from child tables and then asset table
        // Use a single query that deletes from all child tables
        // We'll delete from whichever table has this Asset_ID
        const deleteChildrenQuery = `
          DELETE book, cd, audiobook, movie, technology, study_room
          FROM asset
          LEFT JOIN book ON asset.Asset_ID = book.Asset_ID
          LEFT JOIN cd ON asset.Asset_ID = cd.Asset_ID
          LEFT JOIN audiobook ON asset.Asset_ID = audiobook.Asset_ID
          LEFT JOIN movie ON asset.Asset_ID = movie.Asset_ID
          LEFT JOIN technology ON asset.Asset_ID = technology.Asset_ID
          LEFT JOIN study_room ON asset.Asset_ID = study_room.Asset_ID
          WHERE asset.Asset_ID = ?
        `;

        db.query(deleteChildrenQuery, [assetId], (err) => {
          if (err) {
            console.error('Error deleting from child tables:', err);
            return res.writeHead(500, { 'Content-Type': 'application/json' })
              .end(JSON.stringify({ error: 'Failed to delete from child tables', details: err.message }));
          }

          // Finally delete from asset table
          const deleteAssetQuery = 'DELETE FROM asset WHERE Asset_ID = ?';

          db.query(deleteAssetQuery, [assetId], (err, result) => {
            if (err) {
              console.error('Error deleting asset:', err);
              return res.writeHead(500, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'Failed to delete asset', details: err.message }));
            }
            
            if (result.affectedRows === 0) {
              return res.writeHead(404, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'Asset not found' }));
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              message: 'Asset deleted successfully',
              assetId: assetId
            }));
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in deleteAsset:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

// Update/Edit asset
const updateAsset = async (req, res) => {
  try {
    const assetId = req.params.id;
    const updates = req.body;
    
    if (!assetId) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Asset ID is required' }));
    }

    // Determine which table to update based on the fields present
    let table = '';
    let fields = [];

    if (updates.ISBN && updates.Title && updates.Author && updates.Page_Count !== undefined) {
      // Book
      table = 'book';
      fields = ['ISBN', 'Title', 'Author', 'Page_Count', 'Copies', 'Available_Copies'];
    } else if (updates.Total_Tracks !== undefined && updates.Artist) {
      // CD
      table = 'cd';
      fields = ['Total_Tracks', 'Total_Duration_In_Minutes', 'Title', 'Artist', 'Copies', 'Available_Copies'];
    } else if (updates.ISBN && updates.length !== undefined) {
      // Audiobook
      table = 'audiobook';
      fields = ['ISBN', 'Title', 'Author', 'length', 'Copies', 'Available_Copies'];
    } else if (updates.Release_Year !== undefined && updates.Age_Rating) {
      // Movie - only has Available_Copies, not Copies
      table = 'movie';
      fields = ['Title', 'Release_Year', 'Age_Rating', 'Available_Copies'];
    } else if (updates.Model_Num && updates.Type && updates.Description) {
      // Technology
      table = 'technology';
      fields = ['Model_Num', 'Type', 'Description', 'Copies'];
    } else if (updates.Room_Number && updates.Capacity !== undefined) {
      // Study Room
      table = 'study_room';
      fields = ['Room_Number', 'Capacity'];
    } else {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Invalid update data' }));
    }

    // Build update query
    const updateFields = fields.filter(f => updates[f] !== undefined);
    const updateValues = updateFields.map(f => updates[f]);
    
    if (updateFields.length === 0) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'No fields to update' }));
    }

    const setClause = updateFields.map(f => `${f} = ?`).join(', ');
    const query = `UPDATE ${table} SET ${setClause} WHERE Asset_ID = ?`;
    
    db.query(query, [...updateValues, assetId], (err, result) => {
      if (err) {
        console.error('Error updating asset:', err);
        return res.writeHead(500, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Failed to update asset' }));
      }
      
      if (result.affectedRows === 0) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Asset not found' }));
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Asset updated successfully',
        assetId: assetId
      }));
    });
  } catch (error) {
    console.error('Error in updateAsset:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' }));
  }
};

module.exports = {
  getAllBooks,
  getAllCDs,
  getAllAudiobooks,
  getAllMovies,
  getAllTechnology,
  getAllStudyRooms,
  addBook,
  addCD,
  addAudiobook,
  addMovie,
  addTechnology,
  addStudyRoom,
  deleteAsset,
  updateAsset
};
