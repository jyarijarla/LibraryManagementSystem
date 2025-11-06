import React, { useState, useEffect } from 'react'
import './NotificationPanel.css'

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'

function NotificationPanel({ onClose }) {
  const [notifications, setNotifications] = useState([])
  const [counts, setCounts] = useState({ overdue_count: 0, due_soon_count: 0, low_stock_count: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, overdue, due_soon, low_stock

  useEffect(() => {
    fetchNotifications()
    fetchCounts()
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications()
      fetchCounts()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCounts = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications/counts`)
      if (response.ok) {
        const data = await response.json()
        setCounts(data)
      }
    } catch (error) {
      console.error('Error fetching notification counts:', error)
    }
  }

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'overdue': return '⚠️'
      case 'due_soon': return '⏰'
      case 'low_stock': return '📦'
      default: return '🔔'
    }
  }

  const getNotificationTitle = (notification) => {
    switch(notification.notification_type) {
      case 'overdue':
        return `Overdue: ${notification.item_title}`
      case 'due_soon':
        return `Due Soon: ${notification.item_title}`
      case 'low_stock':
        return `Out of Stock: ${notification.item_title}`
      default:
        return 'Notification'
    }
  }

  const getNotificationMessage = (notification) => {
    switch(notification.notification_type) {
      case 'overdue':
        return `${notification.borrower_name} has had this ${notification.item_type.toLowerCase()} for ${notification.days_overdue} days past the due date.`
      case 'due_soon':
        return `${notification.borrower_name} needs to return this ${notification.item_type.toLowerCase()} in ${notification.days_until_due} day(s).`
      case 'low_stock':
        return `All copies of this ${notification.item_type.toLowerCase()} are currently checked out.`
      default:
        return ''
    }
  }

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.notification_type === filter)

  const totalCount = counts.overdue_count + counts.due_soon_count + counts.low_stock_count

  return (
    <div className="notification-panel-overlay" onClick={onClose}>
      <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <h2>🔔 Notifications</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="notification-stats">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{totalCount}</span>
          </div>
          <div className="stat-item danger">
            <span className="stat-label">Overdue</span>
            <span className="stat-value">{counts.overdue_count}</span>
          </div>
          <div className="stat-item warning">
            <span className="stat-label">Due Soon</span>
            <span className="stat-value">{counts.due_soon_count}</span>
          </div>
          <div className="stat-item info">
            <span className="stat-label">Low Stock</span>
            <span className="stat-value">{counts.low_stock_count}</span>
          </div>
        </div>

        <div className="notification-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({totalCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`}
            onClick={() => setFilter('overdue')}
          >
            Overdue ({counts.overdue_count})
          </button>
          <button 
            className={`filter-btn ${filter === 'due_soon' ? 'active' : ''}`}
            onClick={() => setFilter('due_soon')}
          >
            Due Soon ({counts.due_soon_count})
          </button>
          <button 
            className={`filter-btn ${filter === 'low_stock' ? 'active' : ''}`}
            onClick={() => setFilter('low_stock')}
          >
            Low Stock ({counts.low_stock_count})
          </button>
        </div>

        <div className="notification-list">
          {loading ? (
            <div className="notification-loading">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notification-empty">
              <span className="empty-icon">✓</span>
              <p>No {filter !== 'all' ? filter.replace('_', ' ') : ''} notifications</p>
            </div>
          ) : (
            filteredNotifications.map((notification, index) => (
              <div 
                key={index} 
                className={`notification-item ${notification.notification_type} ${notification.severity?.toLowerCase()}`}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.notification_type)}
                </div>
                <div className="notification-content">
                  <h4>{getNotificationTitle(notification)}</h4>
                  <p>{getNotificationMessage(notification)}</p>
                  {notification.notification_type === 'overdue' && (
                    <div className="notification-details">
                      <span className="detail-item">
                        📧 {notification.borrower_email}
                      </span>
                      {notification.borrower_phone && (
                        <span className="detail-item">
                          📱 {notification.borrower_phone}
                        </span>
                      )}
                      <span className="detail-item">
                        📅 Due: {new Date(notification.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {notification.notification_type === 'due_soon' && (
                    <div className="notification-details">
                      <span className="detail-item">
                        📅 Due: {new Date(notification.due_date).toLocaleDateString()}
                      </span>
                      <span className="detail-item">
                        👤 {notification.borrower_name}
                      </span>
                    </div>
                  )}
                  {notification.severity && (
                    <span className={`severity-badge ${notification.severity.toLowerCase()}`}>
                      {notification.severity}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationPanel
