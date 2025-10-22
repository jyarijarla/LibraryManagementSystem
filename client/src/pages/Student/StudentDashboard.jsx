import { useNavigate } from 'react-router-dom'
import './StudentDashboard.css'

function StudentDashboard() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/')
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>
      
      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, Student!</h2>
          <p>This is your student dashboard.</p>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
