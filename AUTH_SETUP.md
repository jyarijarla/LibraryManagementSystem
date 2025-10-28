# Authentication Setup Guide

## Overview
This guide will help you set up the authentication system for the Library Management System with the new user schema.

## User Schema
The authentication system uses the following user fields:
- `username` - Unique username for login
- `password` - Hashed password
- `email` - User's email address
- `phone` - Phone number (optional)
- `firstName` - User's first name
- `lastName` - User's last name
- `dob` - Date of birth (optional)
- `role` - Either 'student' or 'admin'

## Setup Instructions

### 1. Configure Environment Variables
Create a `.env` file in the `/server` directory:

```env
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
PORT=3000
```

### 2. Install Dependencies
```bash
cd server
npm install
```

### 3. Create Database Table and Test Users
```bash
npm run setup:users
```

This will:
- Create the `users` table with the correct schema
- Create two test accounts:
  - **Student**: username: `student123`, password: `password123`
  - **Admin**: username: `admin`, password: `admin123`

### 4. Start the Server
```bash
npm start
```

Or for development with auto-reload (requires nodemon):
```bash
npm run dev
```

### 5. Start the Frontend
In a new terminal:
```bash
cd client
npm install
npm run dev
```

## API Endpoints

### Sign Up
**POST** `/api/signup`

Request body:
```json
{
  "username": "johndoe",
  "password": "password123",
  "email": "john@example.com",
  "phone": "555-0123",
  "firstName": "John",
  "lastName": "Doe",
  "dob": "2000-01-15",
  "role": "student"
}
```

Response (201 Created):
```json
{
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "555-0123",
    "dob": "2000-01-15",
    "role": "student"
  }
}
```

### Login
**POST** `/api/login`

Request body:
```json
{
  "username": "johndoe",
  "password": "password123",
  "role": "student"
}
```

Response (200 OK):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "555-0123",
    "dob": "2000-01-15",
    "role": "student"
  }
}
```

## Using Authentication in Your App

### Frontend - Storing Auth Data
After successful login, the token and user data are stored in localStorage:

```javascript
localStorage.setItem('token', data.token)
localStorage.setItem('role', data.user.role)
localStorage.setItem('user', JSON.stringify(data.user))
```

### Frontend - Making Authenticated Requests
Include the JWT token in the Authorization header:

```javascript
const response = await fetch('http://localhost:3000/api/protected-route', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
```

### Backend - Protecting Routes
Use the authentication middleware:

```javascript
const { authenticateToken, requireAdmin } = require('./middleware/authMiddleware');

// Protected route - any authenticated user
{ method: 'GET', path: '/api/profile', handler: profileController, middleware: authenticateToken }

// Admin-only route
{ method: 'DELETE', path: '/api/users/:id', handler: deleteUserController, middleware: [authenticateToken, requireAdmin] }
```

## Security Features
- ✅ Passwords hashed with bcrypt (10 salt rounds)
- ✅ JWT tokens with 7-day expiration
- ✅ Role-based access control (student/admin)
- ✅ SQL injection protection (parameterized queries)
- ✅ CORS enabled for frontend
- ✅ Unique constraints on username and email
- ✅ Password minimum length validation (6 characters)

## Testing

### Test Accounts
Use these credentials to test the application:

**Student Account:**
- Username: `student123`
- Password: `password123`
- Email: `student@test.com`

**Admin Account:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@test.com`

### Manual Testing with curl

**Sign Up:**
```bash
curl -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "student"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student123",
    "password": "password123",
    "role": "student"
  }'
```

## Troubleshooting

### Database Connection Failed
- Check your `.env` file has correct database credentials
- Ensure your MySQL server is running
- Verify the database exists

### "Username already exists" Error
- Try a different username
- Or delete the test users and re-run `npm run setup:users`

### JWT Token Errors
- Make sure you're including the token in the Authorization header
- Check that JWT_SECRET is set in your `.env` file
- Token expires after 7 days - login again

### CORS Errors
- Server is configured for `http://localhost:5173` and `http://localhost:5174`
- If using different port, update the CORS settings in `server.js`

## Next Steps
1. ✅ Set up the authentication system
2. Update protected routes to use `authenticateToken` middleware
3. Create user profile pages
4. Implement password reset functionality
5. Add email verification (optional)
6. Set up refresh tokens (optional)
