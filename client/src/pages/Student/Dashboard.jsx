import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Navigate, NavLink, Routes, Route } from 'react-router-dom';
import { LoadingOverlay, SuccessPopup, ErrorPopup } from '../../components/FeedbackUI/FeedbackUI'
import './Dashboard.css';

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://librarymanagementsystem-z2yw.onrender.com/api';

const tabClassName = ({ isActive }) => `tab ${isActive ? 'active' : ''}`; 

const temp = () => (
  <div>Test</div>
)

function StudentDashboard() {
  // -------------------- ROUTER & NAV --------------------
  const navigate = useNavigate();

  // -------------------- UI STATES --------------------
  const [{ isLoading, loadText }, setLoading] = useState({
    isLoading: false,
    loadText: 'Loading...'
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // -------------------- LOGOUT --------------------
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };
  // -------------------- ROUTES --------------------
  const routes = [
    {
      path: '/student/overview',
      label: 'Overview',
      content: <temp />
    },
    {
      path: '/student/assets',
      label: 'Assets',
      content: <temp />
    },
    {
      path: '/student/inventory',
      label: 'Inventory',
      content: <temp />
    },
    {
      path: '/student/reports',
      label: 'Reports',
      content: <temp />
    }
  ]
  // -------------------- MAIN RENDER --------------------
  return (
    <div className="dashboard-container">
      <nav className="student-navbar">
        <div className="student-navbar-content">
          <div className="student-navbar-left">
            <h2 className="student-navbar-title">📚 Library Management System</h2>
          </div>
          <div className="student-navbar-right">
            <span className="student-navbar-role">Student</span>
            <button className="student-navbar-logout"onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>
      <LoadingOverlay loading={isLoading} loadMessage={loadText} />
      <SuccessPopup successMessage={successMessage} />
      <div className="dashboard-content">
        <div className="dashboard-title-bar">
          <h1>Student Dashboard</h1>
        </div>

        <nav className="tabs-container">
          {routes.map(({ path, label }) => (
            <NavLink key={path} to={path} className={tabClassName} >{label}</NavLink>
          ))}
        </nav>

        <div className='dashboard-content'>
          <Routes>
            {/*Main redirect*/}
            <Route index element={<Navigate to="/student/overview" replace />} />

            {/*Route mapping*/}
            {routes.map(({ path, content }) => (
              <Route key={path} path={path} element={content} />
            ))}
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
