import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      })

      const data = await response.json()

      if (response.ok) {
        // Handle successful login
        console.log('Login successful:', data)
        console.log('User role:', role)
        
        // Store token in localStorage
        localStorage.setItem('token', data.token)
        localStorage.setItem('role', role)
        
        // Redirect to dashboard based on role
        if (role === 'admin') {
          navigate('/admin-dashboard')
        } else {
          navigate('/student-dashboard')
        }
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      // For demo purposes, allow login without backend
      console.log('Demo mode: Logging in without API')
      localStorage.setItem('role', role)
      
      // Redirect to dashboard based on role
      if (role === 'admin') {
        navigate('/admin-dashboard')
      } else {
        navigate('/student-dashboard')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Login</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Login As</label>
            <div className={`role-selector ${role === 'admin' ? 'admin-selected' : ''}`}>
              <button
                type="button"
                className={`role-button ${role === 'student' ? 'active' : ''}`}
                onClick={() => setRole('student')}
                disabled={isLoading}
              >
                Student
              </button>
              <button
                type="button"
                className={`role-button ${role === 'admin' ? 'active' : ''}`}
                onClick={() => setRole('admin')}
                disabled={isLoading}
              >
                Admin
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-actions">
            <a href="#" className="forgot-password">Forgot Password?</a>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <a href="#">Sign up</a></p>
        </div>
      </div>
    </div>
  )
}

export default Login
