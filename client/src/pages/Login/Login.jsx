import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    role: 'student'
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Basic validation
    if (!formData.email || !formData.password) {
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
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password, 
          role: formData.role 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Login successful:', data)
        localStorage.setItem('token', data.token)
        localStorage.setItem('role', formData.role)
        
        // Redirect to dashboard based on role
        if (formData.role === 'admin') {
          navigate('/admin-dashboard')
        } else {
          navigate('/student-dashboard')
        }
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (error) {
      // For demo purposes, allow login without backend
      console.log('Demo mode: Logging in without API')
      localStorage.setItem('role', formData.role)
      
      // Redirect to dashboard based on role
      if (formData.role === 'admin') {
        navigate('/admin-dashboard')
      } else {
        navigate('/student-dashboard')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (formData.role === 'student' && !formData.studentId) {
      setError('Student ID is required for student registration')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      const response = await fetch('http://localhost:3000/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          studentId: formData.studentId,
          role: formData.role
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Sign up successful:', data)
        alert('Account created successfully! Please login.')
        setIsSignUp(false)
        setFormData({
          fullName: '',
          email: formData.email,
          password: '',
          confirmPassword: '',
          studentId: '',
          role: 'student'
        })
      } else {
        setError(data.message || 'Sign up failed')
      }
    } catch (error) {
      // For demo purposes, simulate successful signup
      console.log('Demo mode: Sign up without API')
      alert('Account created successfully! Please login.')
      setIsSignUp(false)
      setFormData({
        fullName: '',
        email: formData.email,
        password: '',
        confirmPassword: '',
        studentId: '',
        role: 'student'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError('')
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      studentId: '',
      role: 'student'
    })
  }

  return (
    <div className="login-container">
      <div className={`login-card ${isSignUp ? 'signup-card' : ''} ${isSignUp && formData.role === 'admin' ? 'admin-signup' : ''}`}>
        <div className="login-header">
          <h1>HAO is Here</h1>
          <h2>{isSignUp ? 'Create Account' : 'Login'}</h2>
        </div>
        
        <form onSubmit={isSignUp ? handleSignUpSubmit : handleLoginSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>{isSignUp ? 'Register As' : 'Login As'}</label>
            <div className={`role-selector ${formData.role === 'admin' ? 'admin-selected' : ''}`}>
              <button
                type="button"
                className={`role-button ${formData.role === 'student' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, role: 'student'})}
                disabled={isLoading}
              >
                Student
              </button>
              <button
                type="button"
                className={`role-button ${formData.role === 'admin' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, role: 'admin'})}
                disabled={isLoading}
              >
                Admin
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                disabled={isLoading}
                required
              />
            </div>
          )}

          {isSignUp && formData.role === 'student' && (
            <div className="form-group">
              <label htmlFor="studentId">Student ID</label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="Enter your student ID"
                disabled={isLoading}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isSignUp ? "Enter your password (min 6 characters)" : "Enter your password"}
              disabled={isLoading}
              required
            />
          </div>

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                disabled={isLoading}
                required
              />
            </div>
          )}

          {!isSignUp && (
            <div className="form-actions">
              <a href="#" className="forgot-password">Forgot Password?</a>
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (isSignUp ? 'Creating Account...' : 'Logging in...') : (isSignUp ? 'Sign Up' : 'Login')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              type="button"
              onClick={toggleMode}
              className="toggle-mode-button"
            >
              {isSignUp ? 'Login' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
