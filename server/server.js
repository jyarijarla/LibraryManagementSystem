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
const fineController = require('./controllers/fineController');
const { authenticateRequest, enforceRoles } = require('./middleware/authMiddleware');

const ROLES = {
  STUDENT: 'student',
  LIBRARIAN: 'librarian',
  ADMIN: 'admin'
};

const ROLE_GROUPS = {
  ANY_AUTH: [ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.STUDENT],
  STAFF: [ROLES.ADMIN, ROLES.LIBRARIAN],
  ADMIN_ONLY: [ROLES.ADMIN]
};

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
  { method: 'GET', path: '/api/assets/books', handler: assetController.getAllBooks, auth: true, roles: ROLE_GROUPS.ANY_AUTH },
  { method: 'POST', path: '/api/assets/books', handler: assetController.addBook, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/assets/books/:id', handler: assetController.updateAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'DELETE', path: '/api/assets/books/:id', handler: assetController.deleteAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Asset routes - CDs
  { method: 'GET', path: '/api/assets/cds', handler: assetController.getAllCDs, auth: true, roles: ROLE_GROUPS.ANY_AUTH },
  { method: 'POST', path: '/api/assets/cds', handler: assetController.addCD, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/assets/cds/:id', handler: assetController.updateAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'DELETE', path: '/api/assets/cds/:id', handler: assetController.deleteAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Asset routes - Audiobooks
  { method: 'GET', path: '/api/assets/audiobooks', handler: assetController.getAllAudiobooks, auth: true, roles: ROLE_GROUPS.ANY_AUTH },
  { method: 'POST', path: '/api/assets/audiobooks', handler: assetController.addAudiobook, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/assets/audiobooks/:id', handler: assetController.updateAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'DELETE', path: '/api/assets/audiobooks/:id', handler: assetController.deleteAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Asset routes - Movies
  { method: 'GET', path: '/api/assets/movies', handler: assetController.getAllMovies, auth: true, roles: ROLE_GROUPS.ANY_AUTH },
  { method: 'POST', path: '/api/assets/movies', handler: assetController.addMovie, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/assets/movies/:id', handler: assetController.updateAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'DELETE', path: '/api/assets/movies/:id', handler: assetController.deleteAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Asset routes - Technology
  { method: 'GET', path: '/api/assets/technology', handler: assetController.getAllTechnology, auth: true, roles: ROLE_GROUPS.ANY_AUTH },
  { method: 'POST', path: '/api/assets/technology', handler: assetController.addTechnology, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/assets/technology/:id', handler: assetController.updateAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'DELETE', path: '/api/assets/technology/:id', handler: assetController.deleteAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Asset routes - Study Rooms
  { method: 'GET', path: '/api/assets/study-rooms', handler: assetController.getAllStudyRooms, auth: true, roles: ROLE_GROUPS.ANY_AUTH },
  { method: 'POST', path: '/api/assets/study-rooms', handler: assetController.addStudyRoom, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/assets/study-rooms/:id', handler: assetController.updateAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'DELETE', path: '/api/assets/study-rooms/:id', handler: assetController.deleteAsset, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/study-rooms/:id/status', handler: assetController.updateStudyRoomStatus, auth: true, roles: ROLE_GROUPS.STAFF },

  // Event routes
  { method: 'GET', path: '/api/events', handler: eventController.getAllEvents },
  {method: 'POST', path: '/api/events', handler: eventController.createEvent},
  {method: 'DELETE', path: '/api/events/:id', handler: eventController.deleteEvent},
  
  // Student routes
  { method: 'GET', path: '/api/students', handler: studentController.getAllStudents, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/students/:id', handler: studentController.updateStudent, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'DELETE', path: '/api/students/:id', handler: studentController.deleteStudent, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Member routes
  { method: 'GET', path: '/api/members', handler: memberController.getAllMembers, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/members/:id', handler: memberController.getMemberProfile, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'POST', path: '/api/members', handler: memberController.addMember, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/members/:id', handler: memberController.updateMember, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'DELETE', path: '/api/members/:id', handler: memberController.deleteMember, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/members/:id/activity', handler: memberController.getMemberActivity, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Borrow routes
  { method: 'GET', path: '/api/borrow-records', handler: borrowController.getAllRecords, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'POST', path: '/api/borrow/issue', handler: borrowController.issueBook, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/borrow-records/:id/return', handler: borrowController.returnBook, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'PUT', path: '/api/borrow-records/:id/renew', handler: borrowController.renewBook, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/dashboard/stats', handler: borrowController.getDashboardStats, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'POST', path: '/api/borrow', handler: borrowController.borrowAsset, auth: true, roles: ROLE_GROUPS.ANY_AUTH},

  // Report routes
  { method: 'GET', path: '/api/reports/most-borrowed', handler: reportController.getMostBorrowedAssets, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/reports/most-borrowed-assets', handler: reportController.getMostBorrowedAssets, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/reports/active-borrowers', handler: reportController.getActiveBorrowers, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/reports/overdue-items', handler: reportController.getOverdueItems, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/reports/inventory-summary', handler: reportController.getInventorySummary, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Librarian Report routes
  { method: 'GET', path: '/api/reports/librarian/:id/summary', handler: reportController.getLibrarianSummary, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/reports/librarian/:id/transactions', handler: reportController.getLibrarianTransactions, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/reports/librarian/:id/daily-activity', handler: reportController.getLibrarianDailyActivity, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/reports/librarian/:id/members', handler: reportController.getLibrarianMembers, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/reports/librarian/:id/books', handler: reportController.getLibrarianBooks, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Notification routes
  { method: 'GET', path: '/api/notifications', handler: notificationController.getAdminNotifications, auth: true, roles: ROLE_GROUPS.ADMIN_ONLY },
  { method: 'GET', path: '/api/notifications/counts', handler: notificationController.getNotificationCounts, auth: true, roles: ROLE_GROUPS.ADMIN_ONLY },
  { method: 'GET', path: '/api/notifications/critical', handler: notificationController.getCriticalNotifications, auth: true, roles: ROLE_GROUPS.ADMIN_ONLY },
  { method: 'POST', path: '/api/notifications/low-stock-alerts', handler: notificationController.createLowStockAlert, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Fine Management routes
  { method: 'GET', path: '/api/fines/stats', handler: fineController.getFineStats, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/fines/user/:id', handler: fineController.getUserFines, auth: true, roles: ROLE_GROUPS.ANY_AUTH },
  { method: 'GET', path: '/api/fines/:id', handler: fineController.getFineById, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'GET', path: '/api/fines', handler: fineController.getAllFines, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'POST', path: '/api/fines/:id/pay', handler: fineController.processFinePayment, auth: true, roles: ROLE_GROUPS.STAFF },
  { method: 'POST', path: '/api/fines/:id/waive', handler: fineController.waiveFine, auth: true, roles: ROLE_GROUPS.STAFF },
  
  // Upload route
  { method: 'POST', path: '/api/upload', handler: uploadController.handleUpload, auth: true, roles: ROLE_GROUPS.STAFF },
];

// Helper to set CORS headers
function setCorsHeaders(req, res) {
  const allowedOrigins = ['http://localhost:5173', 'https://library-management-system-blush-eight.vercel.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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
  if (matchedRoute.auth) {
    const user = authenticateRequest(req, res);
    if (!user) {
      return;
    }
    const allowedRoles = matchedRoute.roles || ROLE_GROUPS.ANY_AUTH;
    if (!enforceRoles(req, res, allowedRoles)) {
      return;
    }
  }

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
