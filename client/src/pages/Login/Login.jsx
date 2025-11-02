import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'


function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    dob: '',
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
    if (!formData.username || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: formData.username, 
          password: formData.password, 
          role: formData.role 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Login successful:', data)
        
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('userId', data.user.id)
        localStorage.setItem('role', data.user.role)
        
        // Redirect based on role
        if (data.user.role === 'admin') {
          navigate('/admin')
        } else {
          navigate('/student')
        }
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Unable to connect to server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validation
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword || 
        !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields')
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          phone: formData.phone,
          firstName: formData.firstName,
          lastName: formData.lastName,
          dob: formData.dob,
          role: formData.role
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Sign up successful:', data)
        alert('Account created successfully! Please login.')
        setIsSignUp(false)
        setFormData({
          username: formData.username,
          password: '',
          confirmPassword: '',
          email: '',
          phone: '',
          firstName: '',
          lastName: '',
          dob: '',
          role: 'student'
        })
      } else {
        setError(data.message || 'Sign up failed')
      }
    } catch (error) {
      console.error('Sign up error:', error)
      setError('Unable to connect to server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError('')
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      email: '',
      phone: '',
      firstName: '',
      lastName: '',
      dob: '',
      role: 'student'
    })
  }

  return (
    <div className="login-container">
      <div className={`login-card ${isSignUp ? 'signup-card' : ''} ${isSignUp && formData.role === 'admin' ? 'admin-signup' : ''}`}>
        <div className="login-header">
          <h1>Welcome</h1>
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
            <>
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
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
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dob">Date of Birth</label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {!isSignUp && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                disabled={isLoading}
                required
              />
            </div>
          )}

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password (min 6 characters)"
                disabled={isLoading}
                required
              />
            </div>
          )}

          {!isSignUp && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={isLoading}
                required
              />
            </div>
          )}

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
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
