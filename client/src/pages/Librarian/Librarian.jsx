import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '../Admin/Admin.css'
import './Librarian.css'
import { LoadingOverlay, SuccessPopup, ErrorPopup } from '../../components/FeedbackUI/FeedbackUI'

// Use local server for development, production for deployed app
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'

// Helper function to get image path for an asset
const getAssetImagePath = (assetType, assetId, extension = 'png') => {
  return `/assets/${assetType}/${assetId}.${extension}`
}

function Librarian() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Get initial tab from URL or default to 'assets'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'assets')
  const [activeAssetTab, setActiveAssetTab] = useState(searchParams.get('assetTab') || 'books')
  
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
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now())
  
  // Form States
  const [assetForm, setAssetForm] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  // Function to change tab and update URL
  const changeTab = (tab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    if (tab === 'assets') {
      params.set('assetTab', activeAssetTab)
    }
    setSearchParams(params)
  }

  // Function to change asset tab and update URL
  const changeAssetTab = (assetTab) => {
    setActiveAssetTab(assetTab)
    const params = new URLSearchParams(searchParams)
    params.set('tab', 'assets')
    params.set('assetTab', assetTab)
    setSearchParams(params)
  }

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
      if (activeTab === 'assets') {
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
      console.log(`Fetching assets: ${assetType}`)
      const response = await fetch(`${API_URL}/assets/${assetType}`)
      if (!response.ok) throw new Error(`Failed to fetch ${assetType}`)
      const data = await response.json()
      
      const sortedData = data.sort((a, b) => a.Asset_ID - b.Asset_ID)
      
      switch(assetType) {
        case 'books': setBooks(sortedData); break;
        case 'cds': setCds(sortedData); break;
        case 'audiobooks': setAudiobooks(sortedData); break;
        case 'movies': setMovies(sortedData); break;
        case 'technology': setTechnology(sortedData); break;
        case 'study-rooms': setStudyRooms(sortedData); break;
        default: break;
      }
    } catch (error) {
      console.error(`Error fetching ${assetType}:`, error)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/students`)
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      const sortedData = data.sort((a, b) => a.User_ID - b.User_ID)
      setStudents(sortedData)
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchBorrowRecords = async () => {
    try {
      const response = await fetch(`${API_URL}/borrow-records`)
      if (!response.ok) throw new Error('Failed to fetch records')
      const data = await response.json()
      const sortedData = data.sort((a, b) => a.Borrow_ID - b.Borrow_ID)
      setBorrowRecords(sortedData)
    } catch (error) {
      console.error('Error fetching records:', error)
    }
  }

  // Asset management functions (same as Admin)
  const handleAddAsset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')
    
    try {
      let imageUrl = assetForm.Image_URL || ''
      
      if (isEditMode && !imageFile && assetForm.Image_URL) {
        imageUrl = assetForm.Image_URL
      }
      
      if (imageFile) {
        const assetId = isEditMode ? assetForm.Asset_ID : null
        const formData = new FormData()
        formData.append('image', imageFile)
        formData.append('assetType', activeAssetTab)
        
        if (assetId) {
          formData.append('assetId', assetId)
          setSuccessMessage('Uploading image...')
          
          const uploadResponse = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
          })
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            imageUrl = uploadData.imageUrl
          }
        }
      }
      
      const url = isEditMode 
        ? `${API_URL}/assets/${activeAssetTab}/${assetForm.Asset_ID}`
        : `${API_URL}/assets/${activeAssetTab}`
      
      const method = isEditMode ? 'PUT' : 'POST'
      
      let assetData = { ...assetForm, Image_URL: imageUrl }
      
      if (activeAssetTab === 'movies' && isEditMode) {
        delete assetData.Copies
        delete assetData.Available_Copies
      }
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || `Failed to ${isEditMode ? 'update' : 'add'} asset`)
      }
      
      const result = await response.json()
      const newAssetId = result.assetId
      
      if (!isEditMode && imageFile && newAssetId) {
        const formData = new FormData()
        formData.append('image', imageFile)
        formData.append('assetType', activeAssetTab)
        formData.append('assetId', newAssetId)
        
        await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: formData
        })
      }
      
      await fetchAssets(activeAssetTab)
      setImageRefreshKey(Date.now())
      setShowAssetModal(false)
      setAssetForm({})
      setImageFile(null)
      setImagePreview(null)
      
      setSuccessMessage(`Asset ${isEditMode ? 'updated' : 'added'} successfully!`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete asset')
      }
      
      await fetchAssets(activeAssetTab)
      setShowDeleteModal(false)
      setItemToDelete(null)
      setSuccessMessage('Asset deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const maxSize = 100 * 1024 * 1024
      if (file.size > maxSize) {
        setError('Image file is too large. Please select an image smaller than 100MB.')
        return
      }

      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.')
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.onerror = () => setError('Failed to read image file.')
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setAssetForm({ ...assetForm, Image_URL: '' })
  }

  const openAddAssetModal = () => {
    setAssetForm({})
    setImageFile(null)
    setImagePreview(null)
    setIsEditMode(false)
    setShowAssetModal(true)
  }

  const openEditAssetModal = (item) => {
    setAssetForm(item)
    setImageFile(null)
    setImagePreview(item.Image_URL || null)
    setIsEditMode(true)
    setShowAssetModal(true)
  }

  const openDeleteModal = (item) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const getAssetFormFields = () => {
    switch(activeAssetTab) {
      case 'books':
        return [
          { name: 'ISBN', type: 'text', label: 'ISBN', required: true },
          { name: 'Title', type: 'text', label: 'Title', required: true },
          { name: 'Author', type: 'text', label: 'Author', required: true },
          { name: 'Page_Count', type: 'number', label: 'Page Count', required: true },
          { name: 'Copies', type: 'number', label: 'Copies', required: true }
        ]
      case 'cds':
        return [
          { name: 'Total_Tracks', type: 'number', label: 'Total Tracks', required: true },
          { name: 'Total_Duration_In_Minutes', type: 'number', label: 'Duration (Minutes)', required: true },
          { name: 'Title', type: 'text', label: 'Title', required: true },
          { name: 'Artist', type: 'text', label: 'Artist', required: true },
          { name: 'Copies', type: 'number', label: 'Copies', required: true }
        ]
      case 'audiobooks':
        return [
          { name: 'ISBN', type: 'text', label: 'ISBN', required: true },
          { name: 'Title', type: 'text', label: 'Title', required: true },
          { name: 'Author', type: 'text', label: 'Author', required: true },
          { name: 'length', type: 'number', label: 'Length (Minutes)', required: true },
          { name: 'Copies', type: 'number', label: 'Copies', required: true }
        ]
      case 'movies':
        return [
          { name: 'Title', type: 'text', label: 'Title', required: true },
          { name: 'Release_Year', type: 'number', label: 'Release Year', required: true },
          { name: 'Age_Rating', type: 'text', label: 'Age Rating', required: true },
          { name: 'Copies', type: 'number', label: 'Copies', required: true }
        ]
      case 'technology':
        return [
          { name: 'Model_Num', type: 'number', label: 'Model Number', required: true },
          { name: 'Type', type: 'number', label: 'Type', required: true },
          { name: 'Description', type: 'text', label: 'Description', required: true },
          { name: 'Copies', type: 'number', label: 'Copies', required: true }
        ]
      case 'study-rooms':
        return [
          { name: 'Room_Number', type: 'text', label: 'Room Number', required: true },
          { name: 'Capacity', type: 'number', label: 'Capacity', required: true }
        ]
      default:
        return []
    }
  }

  const getAssetTableColumns = () => {
    switch(activeAssetTab) {
      case 'books':
        return [
          { key: 'rowNum', label: '#' },
          { key: 'ISBN', label: 'ISBN' },
          { key: 'Title', label: 'Title' },
          { key: 'Author', label: 'Author' },
          { key: 'Page_Count', label: 'Pages' },
          { key: 'Copies', label: 'Total Copies' },
          { key: 'Available_Copies', label: 'Available' }
        ]
      case 'cds':
        return [
          { key: 'rowNum', label: '#' },
          { key: 'Title', label: 'Title' },
          { key: 'Artist', label: 'Artist' },
          { key: 'Total_Tracks', label: 'Tracks' },
          { key: 'Total_Duration_In_Minutes', label: 'Duration (min)' },
          { key: 'Copies', label: 'Total Copies' },
          { key: 'Available_Copies', label: 'Available' }
        ]
      case 'audiobooks':
        return [
          { key: 'rowNum', label: '#' },
          { key: 'ISBN', label: 'ISBN' },
          { key: 'Title', label: 'Title' },
          { key: 'Author', label: 'Author' },
          { key: 'length', label: 'Length (min)' },
          { key: 'Copies', label: 'Total Copies' },
          { key: 'Available_Copies', label: 'Available' }
        ]
      case 'movies':
        return [
          { key: 'rowNum', label: '#' },
          { key: 'Title', label: 'Title' },
          { key: 'Release_Year', label: 'Year' },
          { key: 'Age_Rating', label: 'Rating' },
          { key: 'Available_Copies', label: 'Available' }
        ]
      case 'technology':
        return [
          { key: 'rowNum', label: '#' },
          { key: 'Model_Num', label: 'Model #' },
          { key: 'Type', label: 'Type' },
          { key: 'Description', label: 'Description' },
          { key: 'Copies', label: 'Quantity' }
        ]
      case 'study-rooms':
        return [
          { key: 'rowNum', label: '#' },
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

  const renderCellContent = (item, col, rowIndex) => {
    if (col.key === 'rowNum') {
      return rowIndex + 1
    }
    
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

        <ErrorPopup errorMessage={error} />

        <div className="asset-tabs">
          <button className={`asset-tab ${activeAssetTab === 'books' ? 'active' : ''}`} onClick={() => changeAssetTab('books')}>📚 Books</button>
          <button className={`asset-tab ${activeAssetTab === 'cds' ? 'active' : ''}`} onClick={() => changeAssetTab('cds')}>💿 CDs</button>
          <button className={`asset-tab ${activeAssetTab === 'audiobooks' ? 'active' : ''}`} onClick={() => changeAssetTab('audiobooks')}>🎧 Audiobooks</button>
          <button className={`asset-tab ${activeAssetTab === 'movies' ? 'active' : ''}`} onClick={() => changeAssetTab('movies')}>🎬 Movies</button>
          <button className={`asset-tab ${activeAssetTab === 'technology' ? 'active' : ''}`} onClick={() => changeAssetTab('technology')}>💻 Technology</button>
          <button className={`asset-tab ${activeAssetTab === 'study-rooms' ? 'active' : ''}`} onClick={() => changeAssetTab('study-rooms')}>🚪 Study Rooms</button>
        </div>

        <div className="cards-container">
          {data.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>No {activeAssetTab} found</p>
            </div>
          ) : (
            data.map((item, index) => (
              <div key={item.Asset_ID} className="asset-card">
                <div className="card-header">
                  <span className="card-number">#{index + 1}</span>
                  <div className="card-actions">
                    <button className="icon-btn edit-icon" onClick={() => openEditAssetModal(item)} title="Edit">✏️</button>
                    <button className="icon-btn delete-icon" onClick={() => openDeleteModal(item)} title="Delete">✕</button>
                  </div>
                </div>
                
                <div className="card-image">
                  <img 
                    src={item.Image_URL ? `${item.Image_URL}?t=${imageRefreshKey}` : `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'png')}?t=${imageRefreshKey}`}
                    alt={item.Title || item.Room_Number || 'Asset'}
                    onLoad={(e) => {
                      e.target.style.display = 'block'
                      const placeholder = e.target.nextElementSibling
                      if (placeholder) placeholder.style.display = 'none'
                    }}
                    onError={(e) => {
                      const currentSrc = e.target.src
                      if (currentSrc.includes('.png')) {
                        e.target.src = `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'jpg')}?t=${imageRefreshKey}`
                      } else {
                        e.target.style.display = 'none'
                        const placeholder = e.target.nextElementSibling
                        if (placeholder) placeholder.style.display = 'flex'
                      }
                    }}
                  />
                  <div className="image-placeholder-card">
                    <span>N/A</span>
                  </div>
                </div>
                
                <div className="card-body">
                  {columns.slice(1).map(col => (
                    <div key={col.key} className="card-field">
                      <span className="field-label">{col.label}:</span>
                      <span className="field-value">{renderCellContent(item, col, index)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const renderStudents = () => (
    <div className="tab-content">
      <div className="section-header">
        <h2>💳 Member Assistance</h2>
      </div>

      <ErrorPopup errorMessage={error} />

      <div className="table-container"  style={{ marginTop: '20px' }}>
        <h3>All Members</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Active Borrows</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>No students found</td>
              </tr>
            ) : (
              students.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td><strong>{student.studentId}</strong></td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.phone || '-'}</td>
                  <td>
                    <span className={`status-badge ${student.borrowedBooks > 0 ? 'borrowed' : 'available'}`}>
                      {student.borrowedBooks}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge active">
                      {student.status}
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

  const renderBorrowRecords = () => (
    <div className="tab-content">
      <h2>Borrow Records</h2>
      <ErrorPopup errorMessage={error} />

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
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
                <td colSpan="8" style={{ textAlign: 'center' }}>No records found</td>
              </tr>
            ) : (
              borrowRecords.map((record, index) => (
                <tr key={record.Borrow_ID}>
                  <td>{index + 1}</td>
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
    <div className="dashboard-container librarian-dashboard">
      {/* Librarian Navbar */}
      <nav className="admin-navbar librarian-navbar">
        <div className="admin-navbar-content">
          <div className="admin-navbar-left">
            <h2 className="admin-navbar-title">📚 Library Management System</h2>
          </div>
          <div className="admin-navbar-right">
            <span className="admin-navbar-role librarian-role">Librarian</span>
            <button className="admin-navbar-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>

      <LoadingOverlay loading={loading} loadMessage={successMessage} />
      <SuccessPopup successMessage={successMessage} />
      
      <div className="dashboard-content">
        <div className="dashboard-title-bar">
          <h1>Librarian Dashboard</h1>
          <p className="dashboard-subtitle">Manage library assets and operations</p>
        </div>

        <div className="tabs-container">
          <button className={`tab ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => changeTab('assets')}>� Book Management</button>
          <button className={`tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => changeTab('students')}>� Member Assistance</button>
          <button className={`tab ${activeTab === 'records' ? 'active' : ''}`} onClick={() => changeTab('records')}>📋 Issue/Return Books</button>
        </div>

        {activeTab === 'assets' && renderAssets()}
        {activeTab === 'students' && renderStudents()}
        {activeTab === 'records' && renderBorrowRecords()}
      </div>

      {/* Asset Modal (same as Admin) */}
      {showAssetModal && (
        <div className="modal-overlay" onClick={() => setShowAssetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{isEditMode ? 'Edit' : 'Add'} {activeAssetTab.slice(0, -1).charAt(0).toUpperCase() + activeAssetTab.slice(1, -1)}</h3>
            <form onSubmit={handleAddAsset}>
              <div className="form-group">
                <label>Image</label>
                <div className="image-upload-section">
                  <input type="file" id="image-upload" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  {(imagePreview || assetForm.Image_URL) ? (
                    <div className="image-preview-container">
                      <img src={imagePreview || assetForm.Image_URL} alt="Preview" className="image-preview" onClick={() => document.getElementById('image-upload').click()} style={{ cursor: 'pointer' }} />
                      <button type="button" className="remove-image-btn" onClick={removeImage}>✕</button>
                    </div>
                  ) : (
                    <label htmlFor="image-upload" className="no-image-placeholder" style={{ cursor: 'pointer' }}>
                      <span>📷</span>
                      <p>Click to upload image</p>
                    </label>
                  )}
                </div>
              </div>

              {getAssetFormFields().filter(field => !(activeAssetTab === 'movies' && field.name === 'Copies' && isEditMode)).map(field => (
                <div className="form-group" key={field.name}>
                  <label>{field.label} {field.required && '*'}</label>
                  <input type={field.type} value={assetForm[field.name] || ''} onChange={(e) => setAssetForm({ ...assetForm, [field.name]: e.target.value })} required={field.required} />
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowAssetModal(false)}>Cancel</button>
                <button type="submit" className="submit-button" disabled={loading}>{loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update' : 'Add')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p className="delete-warning">Are you sure you want to delete this asset? This action cannot be undone.</p>
            {itemToDelete && (
              <div className="delete-item-info">
                <strong>Asset ID:</strong> {itemToDelete.Asset_ID}<br />
                <strong>Title/Name:</strong> {itemToDelete.Title || itemToDelete.Room_Number || itemToDelete.Model_Num}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button type="button" className="delete-button-confirm" onClick={handleDeleteAsset} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Librarian
