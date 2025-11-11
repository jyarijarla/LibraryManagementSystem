require("dotenv").config();//imports dotenv that loads environmental variables from /server.env
const http = require("node:http");

// Import controllers
const authController = require('./controllers/authController');
const assetController = require('./controllers/assetController');
const studentController = require('./controllers/studentController');
const borrowController = require('./controllers/borrowController');
const reportController = require('./controllers/reportController');
const uploadController = require('./controllers/uploadController');
const notificationController = require('./controllers/notificationController');
const memberController = require('./controllers/memberController');
const eventController = require('./controllers/eventController');

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Helper to extract route parameters
function matchRoute(pattern, path) {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  
  if (patternParts.length !== pathParts.length) return null;
  
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

// Routing map
const routes = [
  // Auth routes
  { method: 'POST', path: '/api/signup', handler: authController },
  { method: 'POST', path: '/api/login', handler: authController },
  { method: 'POST', path: '/api/logout', handler: authController },
  
  // Asset routes - Books
  { method: 'GET', path: '/api/assets/books', handler: assetController.getAllBooks },
  { method: 'POST', path: '/api/assets/books', handler: assetController.addBook },
  { method: 'PUT', path: '/api/assets/books/:id', handler: assetController.updateAsset },
  { method: 'DELETE', path: '/api/assets/books/:id', handler: assetController.deleteAsset },
  
  // Asset routes - CDs
  { method: 'GET', path: '/api/assets/cds', handler: assetController.getAllCDs },
  { method: 'POST', path: '/api/assets/cds', handler: assetController.addCD },
  { method: 'PUT', path: '/api/assets/cds/:id', handler: assetController.updateAsset },
  { method: 'DELETE', path: '/api/assets/cds/:id', handler: assetController.deleteAsset },
  
  // Asset routes - Audiobooks
  { method: 'GET', path: '/api/assets/audiobooks', handler: assetController.getAllAudiobooks },
  { method: 'POST', path: '/api/assets/audiobooks', handler: assetController.addAudiobook },
  { method: 'PUT', path: '/api/assets/audiobooks/:id', handler: assetController.updateAsset },
  { method: 'DELETE', path: '/api/assets/audiobooks/:id', handler: assetController.deleteAsset },
  
  // Asset routes - Movies
  { method: 'GET', path: '/api/assets/movies', handler: assetController.getAllMovies },
  { method: 'POST', path: '/api/assets/movies', handler: assetController.addMovie },
  { method: 'PUT', path: '/api/assets/movies/:id', handler: assetController.updateAsset },
  { method: 'DELETE', path: '/api/assets/movies/:id', handler: assetController.deleteAsset },
  
  // Asset routes - Technology
  { method: 'GET', path: '/api/assets/technology', handler: assetController.getAllTechnology },
  { method: 'POST', path: '/api/assets/technology', handler: assetController.addTechnology },
  { method: 'PUT', path: '/api/assets/technology/:id', handler: assetController.updateAsset },
  { method: 'DELETE', path: '/api/assets/technology/:id', handler: assetController.deleteAsset },
  
  // Asset routes - Study Rooms
  { method: 'GET', path: '/api/assets/study-rooms', handler: assetController.getAllStudyRooms },
  { method: 'POST', path: '/api/assets/study-rooms', handler: assetController.addStudyRoom },
  { method: 'PUT', path: '/api/assets/study-rooms/:id', handler: assetController.updateAsset },
  { method: 'DELETE', path: '/api/assets/study-rooms/:id', handler: assetController.deleteAsset },

  // Event routes
   {method: 'GET', path: '/api/events', handler: eventController.getAllEvents},
  
  // Student routes
  { method: 'GET', path: '/api/students', handler: studentController.getAllStudents },
  { method: 'PUT', path: '/api/students/:id', handler: studentController.updateStudent },
  { method: 'DELETE', path: '/api/students/:id', handler: studentController.deleteStudent },
  
  // Member routes
  { method: 'GET', path: '/api/members', handler: memberController.getAllMembers },
  { method: 'GET', path: '/api/members/:id', handler: memberController.getMemberProfile },
  { method: 'POST', path: '/api/members', handler: memberController.addMember },
  { method: 'PUT', path: '/api/members/:id', handler: memberController.updateMember },
  { method: 'DELETE', path: '/api/members/:id', handler: memberController.deleteMember },
  { method: 'GET', path: '/api/members/:id/activity', handler: memberController.getMemberActivity },
  
  // Borrow routes
  { method: 'GET', path: '/api/borrow-records', handler: borrowController.getAllRecords },
  { method: 'POST', path: '/api/borrow/issue', handler: borrowController.issueBook },
  { method: 'PUT', path: '/api/borrow-records/:id/return', handler: borrowController.returnBook },
  { method: 'PUT', path: '/api/borrow-records/:id/renew', handler: borrowController.renewBook },
  { method: 'GET', path: '/api/dashboard/stats', handler: borrowController.getDashboardStats },
  
  // Report routes
  { method: 'GET', path: '/api/reports/most-borrowed', handler: reportController.getMostBorrowedAssets },
  { method: 'GET', path: '/api/reports/most-borrowed-assets', handler: reportController.getMostBorrowedAssets },
  { method: 'GET', path: '/api/reports/active-borrowers', handler: reportController.getActiveBorrowers },
  { method: 'GET', path: '/api/reports/overdue-items', handler: reportController.getOverdueItems },
  { method: 'GET', path: '/api/reports/inventory-summary', handler: reportController.getInventorySummary },
  
  // Librarian Report routes
  { method: 'GET', path: '/api/reports/librarian/:id/summary', handler: reportController.getLibrarianSummary },
  { method: 'GET', path: '/api/reports/librarian/:id/transactions', handler: reportController.getLibrarianTransactions },
  { method: 'GET', path: '/api/reports/librarian/:id/daily-activity', handler: reportController.getLibrarianDailyActivity },
  { method: 'GET', path: '/api/reports/librarian/:id/members', handler: reportController.getLibrarianMembers },
  { method: 'GET', path: '/api/reports/librarian/:id/books', handler: reportController.getLibrarianBooks },
  
  // Notification routes
  { method: 'GET', path: '/api/notifications', handler: notificationController.getAdminNotifications },
  { method: 'GET', path: '/api/notifications/counts', handler: notificationController.getNotificationCounts },
  { method: 'GET', path: '/api/notifications/critical', handler: notificationController.getCriticalNotifications },
  
  // Upload route
  { method: 'POST', path: '/api/upload', handler: uploadController.handleUpload },
];

// Helper to set CORS headers
function setCorsHeaders(req, res) {
  const allowedOrigins = ['http://localhost:5173', 'https://library-management-system-blush-eight.vercel.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Helper to find matching route
function findMatchingRoute(method, pathname) {
  for (const route of routes) {
    if (route.method === method) {
      const params = matchRoute(route.path, pathname);
      if (params !== null) {
        return { ...route, params };
      }
    }
  }
  return null;
}

// Helper to handle matched route
async function handleMatchedRoute(req, res, matchedRoute, pathname, urlParts) {
  // Special handling for upload route (multipart/form-data)
  if (pathname === '/api/upload') {
    matchedRoute.handler(req, res);
    return;
  }
  
  // Parse body for POST/PUT requests
  if (req.method === 'POST' || req.method === 'PUT') {
    req.body = await parseBody(req);
  }
  
  // Attach params to request
  req.params = matchedRoute.params;
  
  // Parse and attach query parameters
  req.query = {};
  urlParts.searchParams.forEach((value, key) => {
    req.query[key] = value;
  });
  
  // Call the handler
  await matchedRoute.handler(req, res);
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Parse the route
  const urlParts = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlParts.pathname;
  
  // Find matching route
  const matchedRoute = findMatchingRoute(req.method, pathname);

  if (matchedRoute) {
    try {
      await handleMatchedRoute(req, res, matchedRoute, pathname, urlParts);
    } catch (error) {
      console.error('Server error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Internal server error', error: error.message }));
    }
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Route not found' }));
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
