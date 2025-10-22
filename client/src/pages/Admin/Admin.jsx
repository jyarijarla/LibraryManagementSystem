import { useNavigate } from 'react-router-dom'
import './Admin.css'

function Admin() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/')
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>
      
      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, Administrator!</h2>
          <p>This is your admin dashboard.</p>
        </div>
      </div>
    </div>
  )
}

export default Admin
