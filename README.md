# Library Management System

A full-stack library management system built with **React** on the frontend and **Node.js** with **MySQL** on the backend. The site is hosted on vercel, and the database is hosted on Microsoft Azure.

---

## Tech Stack
- **Front-End:** React (Vite), CSS, Vercel
- **Back-End:** Node.js
- **Database:** MySQL, Azure

## Installation Instructions:

1. git clone https://github.com/jyarijarla/LibraryManagementSystem

2. node -v\
   npm -v

3. npm install

4. cp .env.example .env\
   (Then fill out .env template with database credentials)

### Run front-end
npm run dev

### Run back-end
cd server\
node server.js

## Project Structure (simplified)
LibraryManagementSystem\
├── README.md\
├── client\
│   ├── README.md\
│   ├── public\
│   └── src\
└── server\
    ├── controllers\
    ├── middleware\
    ├── server.js\
    └── utils