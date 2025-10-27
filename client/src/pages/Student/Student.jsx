import { useNavigate } from 'react-router-dom'
import './Student.css'

function Student() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/')
  }

  return (
    <div className="dashboard-container">
      {/* Student Navbar */}
      <nav className="student-navbar">
        <div className="student-navbar-content">
          <div className="student-navbar-left">
            <h2 className="student-navbar-title">📚 Library Management System</h2>
          </div>
          <div className="student-navbar-right">
            <span className="student-navbar-role">Student</span>
            <button className="student-navbar-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-title-bar">
          <h1>Student Dashboard</h1>
        </div>
        
        <div className="welcome-section">
          <h2>Welcome, Student!</h2>
          <p>This is your student dashboard.</p>
        </div>
      </div>
    </div>
  )
}

export default Student
