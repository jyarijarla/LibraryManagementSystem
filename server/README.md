# Backend Setup Instructions

## Test Users

After running the setup script, you'll have these test users:

### Student Account
- **Email:** student@test.com
- **Password:** password123
- **Student ID:** S12345
- **Role:** Student

### Admin Account
- **Email:** admin@test.com
- **Password:** password123
- **Role:** Admin

## Installation & Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the server directory with:
   ```
   DB_HOST=your_database_host
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_NAME=your_database_name
   JWT_SECRET=your_secret_key_here
   PORT=3000
   ```

3. **Create users table and test users:**
   ```bash
   npm run setup:users
   ```

4. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

## API Endpoints

### Authentication

#### Sign Up
- **URL:** `POST /api/signup`
- **Body:**
  ```json
  {
    "fullName": "John Doe",
    "email": "user@example.com",
    "password": "password123",
    "studentId": "S12345",  // Required for students only
    "role": "student"        // or "admin"
  }
  ```

#### Login
- **URL:** `POST /api/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "role": "student"  // or "admin"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Login successful",
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "fullName": "John Doe",
      "email": "user@example.com",
      "role": "student",
      "studentId": "S12345"
    }
  }
  ```

#### Get Profile (Protected)
- **URL:** `GET /api/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** User profile data

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  student_id VARCHAR(50),
  role ENUM('student', 'admin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Security Features
- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Role-based access control
- CORS enabled for frontend communication
- SQL injection protection through parameterized queries
