require("dotenv").config();
const express = require('express');
const cors = require('cors');
const upload = require('./upload');

// Import controllers
const authController = require('./controllers/authController');
const assetController = require('./controllers/assetController');
const studentController = require('./controllers/studentController');
const borrowController = require('./controllers/borrowController');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Wrapper to convert old-style controllers to Express middleware
function wrapController(controller) {
  return async (req, res) => {
    // Set default headers
    res.setHeader('Content-Type', 'application/json');
    
    // Convert writeHead to Express methods
    const originalWriteHead = res.writeHead;
    res.writeHead = function(statusCode, headers) {
      res.status(statusCode);
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }
      return res;
    };
    
    // Convert end to Express send
    const originalEnd = res.end;
    res.end = function(data) {
      if (data && !res.headersSent) {
        try {
          res.send(JSON.parse(data));
        } catch (e) {
          res.send(data);
        }
      } else if (!res.headersSent) {
        res.send();
      }
      return res;
    };
    
    await controller(req, res);
  };
}

// Auth routes
app.post('/api/signup', wrapController(authController));
app.post('/api/login', wrapController(authController));

// Asset routes with image upload
app.get('/api/assets/books', wrapController(assetController.getAllBooks));
app.post('/api/assets/books', upload.single('image'), wrapController(assetController.addBook));
app.put('/api/assets/books/:id', upload.single('image'), wrapController(assetController.updateAsset));
app.delete('/api/assets/books/:id', wrapController(assetController.deleteAsset));

app.get('/api/assets/cds', wrapController(assetController.getAllCDs));
app.post('/api/assets/cds', upload.single('image'), wrapController(assetController.addCD));
app.put('/api/assets/cds/:id', upload.single('image'), wrapController(assetController.updateAsset));
app.delete('/api/assets/cds/:id', wrapController(assetController.deleteAsset));

app.get('/api/assets/audiobooks', wrapController(assetController.getAllAudiobooks));
app.post('/api/assets/audiobooks', upload.single('image'), wrapController(assetController.addAudiobook));
app.put('/api/assets/audiobooks/:id', upload.single('image'), wrapController(assetController.updateAsset));
app.delete('/api/assets/audiobooks/:id', wrapController(assetController.deleteAsset));

app.get('/api/assets/movies', wrapController(assetController.getAllMovies));
app.post('/api/assets/movies', upload.single('image'), wrapController(assetController.addMovie));
app.put('/api/assets/movies/:id', upload.single('image'), wrapController(assetController.updateAsset));
app.delete('/api/assets/movies/:id', wrapController(assetController.deleteAsset));

app.get('/api/assets/technology', wrapController(assetController.getAllTechnology));
app.post('/api/assets/technology', upload.single('image'), wrapController(assetController.addTechnology));
app.put('/api/assets/technology/:id', upload.single('image'), wrapController(assetController.updateAsset));
app.delete('/api/assets/technology/:id', wrapController(assetController.deleteAsset));

app.get('/api/assets/study-rooms', wrapController(assetController.getAllStudyRooms));
app.post('/api/assets/study-rooms', upload.single('image'), wrapController(assetController.addStudyRoom));
app.put('/api/assets/study-rooms/:id', upload.single('image'), wrapController(assetController.updateAsset));
app.delete('/api/assets/study-rooms/:id', wrapController(assetController.deleteAsset));

// Student routes
app.get('/api/students', wrapController(studentController.getAllStudents));
app.put('/api/students/:id', wrapController(studentController.updateStudent));
app.delete('/api/students/:id', wrapController(studentController.deleteStudent));

// Borrow routes
app.get('/api/borrow-records', wrapController(borrowController.getAllRecords));
app.put('/api/borrow-records/:id/return', wrapController(borrowController.returnBook));
app.get('/api/dashboard/stats', wrapController(borrowController.getDashboardStats));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Express server running at http://localhost:${PORT}/`);
  console.log(`📁 Image uploads will be saved to client/public/assets/uploads/`);
});
