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

//Create asset and rentables
const assetRentableCreate = async (connection, Asset_Type, Copies) => {
  //inserting into asset
  let newAssetId;
  try{
    const assetQuery = 'INSERT INTO asset (Asset_TypeID) VALUES (?)';
    const [assetResult] = await connection.query(assetQuery, [Asset_Type])
    newAssetId = assetResult.insertId;
    console.log("Asset ID Assigned:", newAssetId);
  } catch (error) {
    console.log(error)
    throw new Error('Asset creation failed')
  }
  //inserting rentables based on copies
  console.log("Did this run")
  console.log(newAssetId, "Test")
  try {
    const rentableQuery = 'INSERT INTO rentable (Asset_ID, Availability, Fee) VALUES (?, ?, ?)';
    for(let r = 0; r < Copies; r++){
      await connection.query(rentableQuery, [newAssetId, 1, 0.00])
    }
    console.log(Copies, " insert(s) into rentable successful");
  } catch (error) {
    console.log(error)
    throw new Error('Rentable creation failed')
  }
  return newAssetId;
}
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

    //creating assets and rentables
    const newAssetId = await assetRentableCreate(connection, 1, Copies);

    //inserting into book
    try {
      const bookQuery = 'INSERT INTO book (Asset_ID, ISBN, Title, Author, Page_Count, Image_URL) VALUES (?, ?, ?, ?, ?, ?)';
      await connection.query(bookQuery, [newAssetId, ISBN, Title, Author, Page_Count, Image_URL || null]);
      console.log("Insert into book successful");
    } catch (error) {
      console.log(error)
      throw new Error('Book Creation failed')
    }
    
    //end transaction
    await connection.commit();

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Book added successfully',
      assetId: newAssetId,
      imageUrl: imagePath // Still return image path for frontend use
    }));
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error in addBook:', error);
    console.log("Rollback inserts");
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error', details: error.message }));
  } finally {
    connection.release();
  }
};

// Add a new CD
const addCD = async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const { Total_Tracks, Total_Duration_In_Minutes, Title, Artist, Copies, Image_URL } = req.body;
    
    if (!Total_Tracks || !Total_Duration_In_Minutes || !Title || !Artist || !Copies) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    // Image can be uploaded via req.file but we won't store it in database
    const imagePath = req.file ? `/assets/uploads/${req.file.filename}` : null;
    console.log('🖼️  Image path:', imagePath);
    
    //start transaction
    await connection.beginTransaction();

    //creating assets and rentables
    const newAssetId = await assetRentableCreate(connection, 2, Copies);
    console.log("NewAssetIDCD: ", newAssetId);
    //inserting into cd
    try {
      const cdQuery = 'INSERT INTO cd (Asset_ID, Total_Tracks, Total_Duration_In_Minutes, Title, Artist, Image_URL) VALUES (?, ?, ?, ?, ?, ?)';            
      const [cdResult] = await connection.query(cdQuery, [newAssetId, Total_Tracks, Total_Duration_In_Minutes, Title, Artist, Image_URL || null]);
      const newCDID = cdResult.insertId;
      console.log("CD ID Assigned:", newCDID);
    } catch (error){
      console.log(error)
      throw new Error('CD Creation Failed')
    }
    
    //end transaction
    await connection.commit();

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'CD added successfully',
      assetId: newAssetId,
      imageUrl: imagePath
    }));
  } catch (error) {
    await connection.rollback();
    console.error('Error in addCD:', error);
    console.log("Rollback inserts");
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' , details: error.message}));
  } finally {
    connection.release();
  }
};

// Add a new Audiobook
const addAudiobook = async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const { ISBN, Title, Author, length, Copies, Image_URL } = req.body;
    
    if (!ISBN || !Title || !Author || !length || !Copies) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    // Image can be uploaded via req.file but we won't store it in database
    const imagePath = req.file ? `/assets/uploads/${req.file.filename}` : null;
    console.log('🖼️  Image path:', imagePath);

    //start transaction
    await connection.beginTransaction();

    //creating asset and rentables
    const newAssetId = await assetRentableCreate(connection, 5, Copies);

    //inserting into audiobook
    try{
      const audiobookQuery = 'INSERT INTO audiobook (Asset_ID, ISBN, Title, Author, length, Image_URL) VALUES (?, ?, ?, ?, ?, ?)';
      await connection.query(audiobookQuery, [newAssetId, ISBN, Title, Author, length, Image_URL || null]);
      console.log("Audiobook inserted")
    } catch (error) {
      console.log(error)
      throw new Error('Audiobook Creation failed')
    }
    //end transaction
    await connection.commit();

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Audiobook added successfully',
      assetId: newAssetId,
      imageUrl: imagePath
    }));

  } catch (error) {
    await connection.rollback();
    console.error('Error in addAudiobook:', error);
    console.log("Rollback inserts");
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' , details: error.message}));
  } finally {
    connection.release();
  }
};

const addMovie = async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const { Title, Release_Year, Age_Rating, Copies, Image_URL } = req.body;
    
    if (!Title || !Release_Year || !Age_Rating || !Copies) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    // Image can be uploaded via req.file but we won't store it in database
    const imagePath = req.file ? `/assets/uploads/${req.file.filename}` : null;
    console.log('🖼️  Image path:', imagePath);

    //begin transaction
    await connection.beginTransaction();

    //create asset and rentables
    const newAssetId = await assetRentableCreate(connection, 3, Copies);

    //insert into movie
    try{
      const movieQuery = 'INSERT INTO movie (Asset_ID, Title, Release_Year, Age_Rating, Image_URL) VALUES (?, ?, ?, ?, ?)';
      const [movieResults] = await connection.query(movieQuery, [newAssetId, Title, Release_Year, Age_Rating, Image_URL || null]);
      const newMovieID = movieResults.insertId;
      console.log("Movie ID Assigned: ", newMovieID);
    } catch (error) {
      console.log(error)
      throw new Error('Movie Creation Failed')
    }

    //end transaction
    await connection.commit();
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Movie added successfully',
      assetId: newAssetId,
      imageUrl: imagePath
    }));
  } catch (error) {
    await connection.rollback();
    console.error('Error in addMovie:', error);
    console.log("Rollback inserts");
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' , details: error.message}));
  } finally {
    connection.release();
  }
};

const addTechnology = async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const { Model_Num, Type, Description, Copies, Image_URL } = req.body;
    
    if (!Model_Num || !Type || !Description || !Copies) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    // Image can be uploaded via req.file but we won't store it in database
    const imagePath = req.file ? `/assets/uploads/${req.file.filename}` : null;
    console.log('🖼️  Image path:', imagePath);

    //begin transaction
    await connection.beginTransaction();

    //create asset and rentables
    const newAssetId = await assetRentableCreate(connection, 6, Copies);

    //insert into technology
    try{
      const technologyQuery = 'INSERT INTO technology (Asset_ID, Model_Num, Type, Description, Image_URL) VALUES (?, ?, ?, ?, ?)';
      await connection.query(technologyQuery, [newAssetId, Model_Num, Type, Description, Copies, Image_URL || null]);
      console.log("technology inserted");
    } catch (error) {
      console.log(error)
      throw new Error('Technology Creation Failed')
    }

    //end transaction
    await connection.commit();

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Technology added successfully',
      assetId: newAssetId
    }));
  } catch (error) {
    await connection.rollback();
    console.error('Error in addTechnology:', error);
    console.log("Rollback insert");
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' , details: error.message}));
  } finally {
    connection.release();
  }
};

const addStudyRoom = async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const { Room_Number, Capacity, Image_URL } = req.body;
    
    if (!Room_Number || !Capacity) {
      return res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Missing required fields' }));
    }

    // Image can be uploaded via req.file but we won't store it in database
    const imagePath = req.file ? `/assets/uploads/${req.file.filename}` : null;
    console.log('🖼️  Image path:', imagePath);

    //begin transaction
    await connection.beginTransaction();

    //create asset and rentables
    const newAssetId = await assetRentableCreate(connection, 4, 1);

    //insert into study room
    try{
      const roomQuery = 'INSERT INTO study_room (Asset_ID, Room_Number, Capacity, Availability, Image_URL) VALUES (?, ?, ?, 1, ?)';
      await connection.query(roomQuery, [newAssetId, Room_Number, Capacity, Image_URL || null]);
      console.log('study room inserted')
    } catch (error){
      console.log(error)
      throw new Error('Study Room Creation Failed')
    }
    //end transaction
    await connection.commit();
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Study room added successfully',
      assetId: newAssetId
    }));
  } catch (error) {
    await connection.rollback();
    console.error('Error in addStudyRoom:', error);
    console.log("rollback insert");
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server error' , details: error.message}));
  } finally {
    connection.release();
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
      fields = ['ISBN', 'Title', 'Author', 'Page_Count'];
    } else if (updates.Total_Tracks !== undefined && updates.Artist) {
      // CD
      table = 'cd';
      fields = ['Total_Tracks', 'Total_Duration_In_Minutes', 'Title', 'Artist'];
    } else if (updates.ISBN && updates.length !== undefined) {
      // Audiobook
      table = 'audiobook';
      fields = ['ISBN', 'Title', 'Author', 'length'];
    } else if (updates.Release_Year !== undefined && updates.Age_Rating) {
      // Movie - table only has Title, Release_Year, Age_Rating, Image_URL
      // Copies are managed through rentables table
      table = 'movie';
      fields = ['Title', 'Release_Year', 'Age_Rating'];
      if (updates.Image_URL !== undefined) {
        fields.push('Image_URL');
      }
    } else if (updates.Model_Num && updates.Type && updates.Description) {
      // Technology
      table = 'technology';
      fields = ['Model_Num', 'Type', 'Description'];
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
