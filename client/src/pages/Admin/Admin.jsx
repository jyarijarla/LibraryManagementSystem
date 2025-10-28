import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Admin.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function Admin() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [activeAssetTab, setActiveAssetTab] = useState('books')
  
  // State for all asset types
  const [books, setBooks] = useState([])
  const [cds, setCds] = useState([])
  const [audiobooks, setAudiobooks] = useState([])
  const [movies, setMovies] = useState([])
  const [technology, setTechnology] = useState([])
  const [studyRooms, setStudyRooms] = useState([])
  
  const [students, setStudents] = useState([])
  const [borrowRecords, setBorrowRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)

  // Form States
  const [assetForm, setAssetForm] = useState({})

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeAssetTab])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'overview') {
        // Fetch all data for overview - don't fail if one fails
        console.log('Fetching overview data...')
        await Promise.allSettled([
          fetchAssets('books').catch(e => console.error('Books error:', e)),
          fetchAssets('cds').catch(e => console.error('CDs error:', e)),
          fetchAssets('audiobooks').catch(e => console.error('Audiobooks error:', e)),
          fetchAssets('movies').catch(e => console.error('Movies error:', e)),
          fetchAssets('technology').catch(e => console.error('Technology error:', e)),
          fetchAssets('study-rooms').catch(e => console.error('Study rooms error:', e)),
          fetchStudents().catch(e => console.error('Students error:', e)),
          fetchBorrowRecords().catch(e => console.error('Borrow records error:', e))
        ])
        console.log('Overview data fetch completed')
      } else if (activeTab === 'assets') {
        await fetchAssets(activeAssetTab)
      } else if (activeTab === 'students') {
        await fetchStudents()
      } else if (activeTab === 'records') {
        await fetchBorrowRecords()
      }
    } catch (err) {
      console.error('Error in fetchData:', err)
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssets = async (assetType) => {
    try {
      console.log(`Fetching assets: ${assetType} from ${API_URL}/assets/${assetType}`)
      const response = await fetch(`${API_URL}/assets/${assetType}`)
      console.log(`Response status: ${response.status}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Failed to fetch ${assetType}:`, errorText)
        throw new Error(`Failed to fetch ${assetType}: ${response.status}`)
      }
      const data = await response.json()
      console.log(`✅ Received ${data.length} ${assetType}`)
      
      switch(assetType) {
        case 'books': setBooks(data); break;
        case 'cds': setCds(data); break;
        case 'audiobooks': setAudiobooks(data); break;
        case 'movies': setMovies(data); break;
        case 'technology': setTechnology(data); break;
        case 'study-rooms': setStudyRooms(data); break;
        default: break;
      }
    } catch (error) {
      console.error(`❌ Error fetching ${assetType}:`, error)
      // Don't throw - let it fail silently for individual assets
    }
  }

  const fetchStudents = async () => {
    try {
      console.log('Fetching students...')
      const response = await fetch(`${API_URL}/students`)
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      console.log(`✅ Received ${data.length} students`)
      setStudents(data)
    } catch (error) {
      console.error('❌ Error fetching students:', error)
      // Don't throw
    }
  }

  const fetchBorrowRecords = async () => {
    try {
      console.log('Fetching borrow records...')
      const response = await fetch(`${API_URL}/borrow-records`)
      if (!response.ok) throw new Error('Failed to fetch records')
      const data = await response.json()
      console.log(`✅ Received ${data.length} borrow records`)
      setBorrowRecords(data)
    } catch (error) {
      console.error('❌ Error fetching records:', error)
      // Don't throw
    }
  }

  const handleAddAsset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const url = isEditMode 
        ? `${API_URL}/assets/${activeAssetTab}/${assetForm.Asset_ID}`
        : `${API_URL}/assets/${activeAssetTab}`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm)
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'add'} asset`)
      }
      
      await response.json()
      
      setShowAssetModal(false)
      setAssetForm({})
      
      // Show success message
      const assetTypeName = activeAssetTab.slice(0, -1).charAt(0).toUpperCase() + activeAssetTab.slice(1, -1)
      setSuccessMessage(`${assetTypeName} ${isEditMode ? 'updated' : 'added'} successfully!`)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
      
      await fetchAssets(activeAssetTab)
    } catch (error) {
      setError(error.message)
      console.error('Error saving asset:', error)
    } finally {
      setLoading(false)
    }
  }

  const openAddAssetModal = () => {
    setAssetForm({})
    setIsEditMode(false)
    setShowAssetModal(true)
  }

  const openEditAssetModal = (item) => {
    setAssetForm(item)
    setIsEditMode(true)
    setShowAssetModal(true)
  }

  const openDeleteModal = (item) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const handleDeleteAsset = async () => {
    if (!itemToDelete) return
    
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/assets/${activeAssetTab}/${itemToDelete.Asset_ID}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete asset')
      }
      
      setShowDeleteModal(false)
      setItemToDelete(null)
      
      // Show success message
      setSuccessMessage('Asset deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
      await fetchAssets(activeAssetTab)
    } catch (error) {
      setError(error.message)
      console.error('Error deleting asset:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAssetFormFields = () => {
    switch(activeAssetTab) {
      case 'books':
        return [
          { name: 'ISBN', type: 'text', label: 'ISBN', required: true },
          { name: 'Title', type: 'text', label: 'Title', required: true },
          { name: 'Author', type: 'text', label: 'Author', required: true },
          { name: 'Page_Count', type: 'number', label: 'Page Count', required: true },
          { name: 'Copies', type: 'number', label: 'Copies', required: true },
          { name: 'Image_URL', type: 'text', label: 'Image Path (e.g., /assets/book.jpg)', required: false, placeholder: '/assets/placeholder.jpg' }
        ]
      case 'cds':
        return [
          { name: 'Total_Tracks', type: 'number', label: 'Total Tracks', required: true },
          { name: 'Total_Duration_In_Minutes', type: 'number', label: 'Duration (Minutes)', required: true },
          { name: 'Title', type: 'text', label: 'Title', required: true },
          { name: 'Artist', type: 'text', label: 'Artist', required: true },
          { name: 'Copies', type: 'number', label: 'Copies', required: true },
          { name: 'Image_URL', type: 'text', label: 'Image Path (e.g., /assets/cd.jpg)', required: false, placeholder: '/assets/placeholder.jpg' }
        ]
      case 'audiobooks':
        return [
          { name: 'ISBN', type: 'text', label: 'ISBN', required: true },
          { name: 'Title', type: 'text', label: 'Title', required: true },
          { name: 'Author', type: 'text', label: 'Author', required: true },
          { name: 'length', type: 'number', label: 'Length (Minutes)', required: true },
          { name: 'Copies', type: 'number', label: 'Copies', required: true },
          { name: 'Image_URL', type: 'text', label: 'Image Path (e.g., /assets/audiobook.jpg)', required: false, placeholder: '/assets/placeholder.jpg' }
        ]
      case 'movies':
        return [
          { name: 'Title', type: 'text', label: 'Title', required: true },
          { name: 'Release_Year', type: 'number', label: 'Release Year', required: true },
          { name: 'Age_Rating', type: 'text', label: 'Age Rating', required: true },
          { name: 'Copies', type: 'number', label: 'Copies', required: true },
          { name: 'Image_URL', type: 'text', label: 'Image Path (e.g., /assets/movie.jpg)', required: false, placeholder: '/assets/placeholder.jpg' }
        ]
      case 'technology':
        return [
          { name: 'Model_Num', type: 'number', label: 'Model Number', required: true },
          { name: 'Type', type: 'number', label: 'Type', required: true },
          { name: 'Description', type: 'text', label: 'Description', required: true },
          { name: 'Copies', type: 'number', label: 'Copies', required: true },
          { name: 'Image_URL', type: 'text', label: 'Image Path (e.g., /assets/tech.jpg)', required: false, placeholder: '/assets/placeholder.jpg' }
        ]
      case 'study-rooms':
        return [
          { name: 'Room_Number', type: 'text', label: 'Room Number', required: true },
          { name: 'Capacity', type: 'number', label: 'Capacity', required: true },
          { name: 'Image_URL', type: 'text', label: 'Image Path (e.g., /assets/room.jpg)', required: false, placeholder: '/assets/placeholder.jpg' }
        ]
      default:
        return []
    }
  }

  const getAssetTableColumns = () => {
    switch(activeAssetTab) {
      case 'books':
        return [
          { key: 'Asset_ID', label: 'ID' },
          { key: 'ISBN', label: 'ISBN' },
          { key: 'Title', label: 'Title' },
          { key: 'Author', label: 'Author' },
          { key: 'Page_Count', label: 'Pages' },
          { key: 'Copies', label: 'Total Copies' },
          { key: 'Available_Copies', label: 'Available' }
        ]
      case 'cds':
        return [
          { key: 'Asset_ID', label: 'ID' },
          { key: 'Title', label: 'Title' },
          { key: 'Artist', label: 'Artist' },
          { key: 'Total_Tracks', label: 'Tracks' },
          { key: 'Total_Duration_In_Minutes', label: 'Duration (min)' },
          { key: 'Copies', label: 'Total Copies' },
          { key: 'Available_Copies', label: 'Available' }
        ]
      case 'audiobooks':
        return [
          { key: 'Asset_ID', label: 'ID' },
          { key: 'ISBN', label: 'ISBN' },
          { key: 'Title', label: 'Title' },
          { key: 'Author', label: 'Author' },
          { key: 'length', label: 'Length (min)' },
          { key: 'Copies', label: 'Total Copies' },
          { key: 'Available_Copies', label: 'Available' }
        ]
      case 'movies':
        return [
          { key: 'Asset_ID', label: 'ID' },
          { key: 'Title', label: 'Title' },
          { key: 'Release_Year', label: 'Year' },
          { key: 'Age_Rating', label: 'Rating' },
          { key: 'Available_Copies', label: 'Available' }
        ]
      case 'technology':
        return [
          { key: 'Asset_ID', label: 'ID' },
          { key: 'Model_Num', label: 'Model #' },
          { key: 'Type', label: 'Type' },
          { key: 'Description', label: 'Description' },
          { key: 'Copies', label: 'Quantity' }
        ]
      case 'study-rooms':
        return [
          { key: 'Asset_ID', label: 'ID' },
          { key: 'Room_Number', label: 'Room Number' },
          { key: 'Capacity', label: 'Capacity' },
          { key: 'Availability', label: 'Status' }
        ]
      default:
        return []
    }
  }

  const getCurrentAssetData = () => {
    switch(activeAssetTab) {
      case 'books': return books
      case 'cds': return cds
      case 'audiobooks': return audiobooks
      case 'movies': return movies
      case 'technology': return technology
      case 'study-rooms': return studyRooms
      default: return []
    }
  }

  const renderOverview = () => (
    <div className="tab-content">
      <h2>Dashboard Overview</h2>
      {error && <div className="error-message">{error}</div>}
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📚</div>
          <div className="stat-details">
            <h3>{books.length + cds.length + audiobooks.length + movies.length + technology.length + studyRooms.length}</h3>
            <p>Total Assets</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">👥</div>
          <div className="stat-details">
            <h3>{students.length}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">📖</div>
          <div className="stat-details">
            <h3>{borrowRecords.filter(r => !r.Return_Date).length}</h3>
            <p>Currently Borrowed</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAssets = () => {
    const columns = getAssetTableColumns()
    const data = getCurrentAssetData()

    return (
      <div className="tab-content">
        <div className="section-header">
          <h2>{activeAssetTab.charAt(0).toUpperCase() + activeAssetTab.slice(1)}</h2>
          <button className="add-button" onClick={openAddAssetModal}>
            + Add {activeAssetTab.slice(0, -1)}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Sub-tabs for different asset types */}
        <div className="asset-tabs">
          <button 
            className={`asset-tab ${activeAssetTab === 'books' ? 'active' : ''}`}
            onClick={() => setActiveAssetTab('books')}
          >
             Books
          </button>
          <button 
            className={`asset-tab ${activeAssetTab === 'cds' ? 'active' : ''}`}
            onClick={() => setActiveAssetTab('cds')}
          >
             CDs
          </button>
          <button 
            className={`asset-tab ${activeAssetTab === 'audiobooks' ? 'active' : ''}`}
            onClick={() => setActiveAssetTab('audiobooks')}
          >
             Audiobooks
          </button>
          <button 
            className={`asset-tab ${activeAssetTab === 'movies' ? 'active' : ''}`}
            onClick={() => setActiveAssetTab('movies')}
          >
             Movies
          </button>
          <button 
            className={`asset-tab ${activeAssetTab === 'technology' ? 'active' : ''}`}
            onClick={() => setActiveAssetTab('technology')}
          >
             Technology
          </button>
          <button 
            className={`asset-tab ${activeAssetTab === 'study-rooms' ? 'active' : ''}`}
            onClick={() => setActiveAssetTab('study-rooms')}
          >
             Study Rooms
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} style={{ textAlign: 'center' }}>
                    No {activeAssetTab} found
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.Asset_ID}>
                    {columns.map(col => {
                      const renderCellContent = () => {
                        if (col.key === 'Availability') {
                          return (
                            <span className={`status-badge ${item[col.key] === 'Available' ? 'available' : 'unavailable'}`}>
                              {item[col.key] || 'Available'}
                            </span>
                          )
                        }
                        
                        if (col.key === 'Available_Copies') {
                          return (
                            <span className={`availability-indicator ${item[col.key] > 0 ? 'in-stock' : 'out-of-stock'}`}>
                              {item[col.key] === null ? '-' : item[col.key]}
                            </span>
                          )
                        }
                        
                        return item[col.key]
                      }

                      return (
                        <td key={col.key}>
                          {renderCellContent()}
                        </td>
                      )
                    })}
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="edit-btn" 
                          onClick={() => openEditAssetModal(item)}
                          title="Edit this asset"
                        >
                           Edit
                        </button>
                        <button 
                          className="delete-btn" 
                          onClick={() => openDeleteModal(item)}
                          title="Delete this asset"
                        >
                           Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderStudents = () => (
    <div className="tab-content">
      <div className="section-header">
        <h2>Students</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Active Borrows</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center' }}>No students found</td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.User_ID}>
                  <td>{student.User_ID}</td>
                  <td>{student.Full_Name}</td>
                  <td>{student.User_Email}</td>
                  <td>{student.Active_Borrows || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderBorrowRecords = () => (
    <div className="tab-content">
      <h2>Borrow Records</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Borrower</th>
              <th>Item</th>
              <th>Borrow Date</th>
              <th>Due Date</th>
              <th>Return Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {borrowRecords.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>No records found</td>
              </tr>
            ) : (
              borrowRecords.map((record) => (
                <tr key={record.Borrow_ID}>
                  <td>{record.Borrow_ID}</td>
                  <td>{record.Borrower_Name}</td>
                  <td>{record.Item_Title}</td>
                  <td>{new Date(record.Borrow_Date).toLocaleDateString()}</td>
                  <td>{new Date(record.Due_Date).toLocaleDateString()}</td>
                  <td>{record.Return_Date ? new Date(record.Return_Date).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={`status-badge ${record.Return_Date ? 'returned' : 'borrowed'}`}>
                      {record.Return_Date ? 'Returned' : 'Borrowed'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="dashboard-container">
      {/* Admin Navbar */}
      <nav className="admin-navbar">
        <div className="admin-navbar-content">
          <div className="admin-navbar-left">
            <h2 className="admin-navbar-title">📚 Library Management System</h2>
          </div>
          <div className="admin-navbar-right">
            <span className="admin-navbar-role">Administrator</span>
            <button className="admin-navbar-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {/* Success Popup */}
      {successMessage && (
        <div className="success-popup">
          <div className="success-popup-content">
            <span className="success-icon">✓</span>
            <span className="success-text">{successMessage}</span>
          </div>
        </div>
      )}
      
      <div className="dashboard-content">
        <div className="dashboard-title-bar">
          <h1>Admin Dashboard</h1>
        </div>

        <div className="tabs-container">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
             Overview
          </button>
          <button 
            className={`tab ${activeTab === 'assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
             Assets
          </button>
          <button 
            className={`tab ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
             Students
          </button>
          <button 
            className={`tab ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
             Borrow Records
          </button>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'assets' && renderAssets()}
        {activeTab === 'students' && renderStudents()}
        {activeTab === 'records' && renderBorrowRecords()}
      </div>

      {/* Asset Modal */}
      {showAssetModal && (
        <div className="modal-overlay" onClick={() => setShowAssetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{isEditMode ? 'Edit' : 'Add'} {activeAssetTab.slice(0, -1).charAt(0).toUpperCase() + activeAssetTab.slice(1, -1)}</h3>
            <form onSubmit={handleAddAsset}>
              {getAssetFormFields().map(field => (
                <div className="form-group" key={field.name}>
                  <label>{field.label} {field.required && '*'}</label>
                  <input
                    type={field.type}
                    value={assetForm[field.name] || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, [field.name]: e.target.value })}
                    required={field.required}
                    placeholder={field.placeholder || ''}
                  />
                  {field.name === 'Image_URL' && (
                    <small style={{ color: '#666', fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                      📸 Add your images to the assets folder first, then enter the path here
                    </small>
                  )}
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowAssetModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-button" disabled={loading}>
                  {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Confirm Delete</h3>
            <p className="delete-warning">
              Are you sure you want to delete this asset? This action cannot be undone.
            </p>
            {itemToDelete && (
              <div className="delete-item-info">
                <strong>Asset ID:</strong> {itemToDelete.Asset_ID}<br />
                <strong>Title/Name:</strong> {itemToDelete.Title || itemToDelete.Room_Number || itemToDelete.Model_Num}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="delete-button-confirm" onClick={handleDeleteAsset} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
