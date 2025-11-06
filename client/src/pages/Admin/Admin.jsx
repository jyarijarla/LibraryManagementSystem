import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Admin.css'
import { LoadingOverlay, SuccessPopup, ErrorPopup } from '../../components/FeedbackUI/FeedbackUI'
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import NotificationPanel from '../../components/NotificationPanel/NotificationPanel'

// Use local server for development, production for deployed app
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'

// Helper function to get image path for an asset
const getAssetImagePath = (assetType, assetId, extension = 'png') => {
  // Returns image path with specified extension
  // Default to .png, but can be .jpg, .jpeg, .gif, .webp, etc.
  return `/assets/${assetType}/${assetId}.${extension}`
}

function Admin() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Get initial tab from URL or default to 'overview'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
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
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now()) // Cache buster for images
  
  // Report states
  const [mostBorrowedReport, setMostBorrowedReport] = useState([])
  const [activeBorrowersReport, setActiveBorrowersReport] = useState([])
  const [overdueItemsReport, setOverdueItemsReport] = useState([])
  const [inventorySummaryReport, setInventorySummaryReport] = useState([])

  // Form States
  const [assetForm, setAssetForm] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

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
    fetchNotificationCount()
    // Refresh notification count every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeAssetTab])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const fetchNotificationCount = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications/counts`)
      if (response.ok) {
        const data = await response.json()
        const total = data.overdue_count + data.due_soon_count + data.low_stock_count
        setNotificationCount(total)
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
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
      } else if (activeTab === 'users') {
        await fetchStudents()
      } else if (activeTab === 'records') {
        await fetchBorrowRecords()
      } else if (activeTab === 'reports') {
        await fetchReports()
      }
    } catch (err) {
      console.error('Error in fetchData:', err)
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchReports = async () => {
    try {
      const [mostBorrowed, activeBorrowers, overdueItems, inventorySummary] = await Promise.all([
        fetch(`${API_URL}/reports/most-borrowed`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_URL}/reports/active-borrowers`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_URL}/reports/overdue-items`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_URL}/reports/inventory-summary`).then(r => r.ok ? r.json() : []).catch(() => [])
      ])
      setMostBorrowedReport(Array.isArray(mostBorrowed) ? mostBorrowed : [])
      setActiveBorrowersReport(Array.isArray(activeBorrowers) ? activeBorrowers : [])
      setOverdueItemsReport(Array.isArray(overdueItems) ? overdueItems : [])
      setInventorySummaryReport(Array.isArray(inventorySummary) ? inventorySummary : [])
    } catch (error) {
      console.error('Error fetching reports:', error)
      // Set empty arrays as fallback
      setMostBorrowedReport([])
      setActiveBorrowersReport([])
      setOverdueItemsReport([])
      setInventorySummaryReport([])
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
      console.log(`Received ${data.length} ${assetType}`, data)
      
      // Log images
      data.forEach(item => {
        if (item.Image_URL) {
          console.log(`Asset ${item.Asset_ID} has image:`, item.Image_URL)
        }
      })
      
      // Sort by Asset_ID in ascending order
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
      // Sort by User_ID in ascending order
      const sortedData = data.sort((a, b) => a.User_ID - b.User_ID)
      setStudents(sortedData)
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
      // Sort by Borrow_ID in ascending order
      const sortedData = data.sort((a, b) => a.Borrow_ID - b.Borrow_ID)
      setBorrowRecords(sortedData)
    } catch (error) {
      console.error('❌ Error fetching records:', error)
      // Don't throw
    }
  }

  const handleAddAsset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('') // Clear previous messages
    try {
      let imageUrl = assetForm.Image_URL || ''
      
      // If editing and no new image, keep existing
      if (isEditMode && !imageFile && assetForm.Image_URL) {
        imageUrl = assetForm.Image_URL
      }
      
      // Upload image if a new file is selected
      if (imageFile) {
        // First get the Asset_ID (either from edit mode or will be generated)
        const assetId = isEditMode ? assetForm.Asset_ID : null
        
        console.log('Uploading image:', imageFile.name, 'for asset type:', activeAssetTab)
        const formData = new FormData()
        formData.append('image', imageFile)
        formData.append('assetType', activeAssetTab)
        
        // If we don't have assetId yet (adding new), we'll upload after creation
        if (assetId) {
          formData.append('assetId', assetId)
          
          // Show uploading message
          setSuccessMessage('Uploading image...')
          
                  // Add timeout to upload request (5 minutes for large files)
        const uploadController = new AbortController()
        const uploadTimeout = setTimeout(() => uploadController.abort(), 300000)
          
          try {
            const uploadResponse = await fetch(`${API_URL}/upload`, {
              method: 'POST',
              body: formData,
              signal: uploadController.signal
            })
            
            clearTimeout(uploadTimeout)
            
            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json()
              imageUrl = uploadData.imageUrl
              console.log('Image uploaded successfully, URL:', imageUrl)
            } else {
              const errorText = await uploadResponse.text()
              console.error('Upload failed:', errorText)
              throw new Error('Failed to upload image')
            }
          } catch (uploadError) {
            clearTimeout(uploadTimeout)
            if (uploadError.name === 'AbortError') {
              throw new Error('Upload timed out. Please try with a smaller image.')
            }
            throw uploadError
          }
        }
      }
      
      // Create/update the asset in database
      const url = isEditMode 
        ? `${API_URL}/assets/${activeAssetTab}/${assetForm.Asset_ID}`
        : `${API_URL}/assets/${activeAssetTab}`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Prepare asset data - handle movie-specific field mapping
      let assetData = { ...assetForm, Image_URL: imageUrl }
      
      // For movies, remove Copies/Available_Copies fields when editing
      // (they are managed through the rentables table, not the movie table)
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
        const errorData = await response.json();
        console.log(errorData)
        throw new Error(errorData.details || `Failed to ${isEditMode ? 'update' : 'add'} asset`)
      }
      
      const result = await response.json()
      const newAssetId = result.assetId
      
      console.log(`Asset ${isEditMode ? 'updated' : 'created'} with ID:`, newAssetId)
      
      // Now upload image for new assets
      if (!isEditMode && imageFile && newAssetId) {
        console.log('Uploading image for new Asset ID:', newAssetId)
        setSuccessMessage('Uploading image...')
        
        const formData = new FormData()
        formData.append('image', imageFile)
        formData.append('assetType', activeAssetTab)
        formData.append('assetId', newAssetId)
        
        // Add timeout to upload request (60 seconds)
        const uploadController = new AbortController()
        const uploadTimeout = setTimeout(() => uploadController.abort(), 60000)
        
        try {
          const uploadResponse = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
            signal: uploadController.signal
          })
          
          clearTimeout(uploadTimeout)
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            console.log('Image uploaded successfully:', uploadData.imageUrl)
            
            // Update the asset with the image URL
            await fetch(`${API_URL}/assets/${activeAssetTab}/${newAssetId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...assetForm, Asset_ID: newAssetId, Image_URL: uploadData.imageUrl })
            })
          } else {
            console.warn('Image upload failed, but asset was saved')
          }
        } catch (uploadError) {
          clearTimeout(uploadTimeout)
          if (uploadError.name === 'AbortError') {
            console.warn('Upload timed out, but asset was saved')
          } else {
            console.warn('Image upload failed, but asset was saved:', uploadError)
          }
        }
      }
      
      // Refresh the data first
      await fetchAssets(activeAssetTab)
      
      // Force image refresh by updating cache key
      setImageRefreshKey(Date.now())
      
      // Then close modal and clear form
      setShowAssetModal(false)
      setAssetForm({})
      setImageFile(null)
      setImagePreview(null)
      
      // Show success message
      const assetTypeName = activeAssetTab.slice(0, -1).charAt(0).toUpperCase() + activeAssetTab.slice(1, -1)
      setSuccessMessage(`${assetTypeName} ${isEditMode ? 'updated' : 'added'} successfully!`)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      setError(error.message)
      console.error('Error saving asset:', error)

    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Increased max size to 100MB
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        setError('Image file is too large. Please select an image smaller than 100MB.');
        return;
      }

      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.onerror = () => {
        setError('Failed to read image file.');
      }
      reader.readAsDataURL(file)
      
      // Clear any previous errors
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
      
      // Refresh the data first
      await fetchAssets(activeAssetTab)
      
      // Then close modal and clear state
      setShowDeleteModal(false)
      setItemToDelete(null)
      
      // Show success message
      setSuccessMessage('Asset deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
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

  const renderOverview = () => (
    <div className="tab-content">
      <h2>Dashboard Overview</h2>
      <ErrorPopup errorMessage={error} />
      
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
    
    // Get appropriate button text
    const getAddButtonText = () => {
      if (activeAssetTab === 'study-rooms') {
        return '+ Reserve Study Room'
      }
      return `+ Add ${activeAssetTab.slice(0, -1)}`
    }

    return (
      <div className="tab-content">
        <div className="section-header">
          <h2>{activeAssetTab.charAt(0).toUpperCase() + activeAssetTab.slice(1)}</h2>
          <button className="add-button" onClick={openAddAssetModal}>
            {getAddButtonText()}
          </button>
        </div>

        <ErrorPopup errorMessage={error} />

        {/* Sub-tabs for different asset types */}
        <div className="asset-tabs">
          <button 
            className={`asset-tab ${activeAssetTab === 'books' ? 'active' : ''}`}
            onClick={() => changeAssetTab('books')}
          >
            📚 Books
          </button>
          <button 
            className={`asset-tab ${activeAssetTab === 'cds' ? 'active' : ''}`}
            onClick={() => changeAssetTab('cds')}
          >
            💿 CDs
          </button>
          <button 
            className={`asset-tab ${activeAssetTab === 'audiobooks' ? 'active' : ''}`}
            onClick={() => changeAssetTab('audiobooks')}
          >
            🎧 Audiobooks
          </button>
          <button 
            className={`asset-tab ${activeAssetTab === 'movies' ? 'active' : ''}`}
            onClick={() => changeAssetTab('movies')}
          >
            🎬 Movies
          </button>
          <button 
            className={`asset-tab ${activeAssetTab === 'technology' ? 'active' : ''}`}
            onClick={() => changeAssetTab('technology')}
          >
            💻 Technology
          </button>
          <button 
            className={`asset-tab ${activeAssetTab === 'study-rooms' ? 'active' : ''}`}
            onClick={() => changeAssetTab('study-rooms')}
          >
            🚪 Study Rooms
          </button>
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
                    <button 
                      className="icon-btn edit-icon" 
                      onClick={() => openEditAssetModal(item)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      className="icon-btn delete-icon" 
                      onClick={() => openDeleteModal(item)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                {/* Image Section */}
                <div className="card-image">
                  <img 
                    src={
                      item.Image_URL 
                        ? `${item.Image_URL}?t=${imageRefreshKey}` 
                        : `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'png')}?t=${imageRefreshKey}`
                    }
                    alt={item.Title || item.Room_Number || 'Asset'}
                    onLoad={(e) => {
                      e.target.style.display = 'block';
                      const placeholder = e.target.nextElementSibling;
                      if (placeholder) placeholder.style.display = 'none';
                    }}
                    onError={(e) => {
                      // Try other common extensions if PNG fails
                      const currentSrc = e.target.src;
                      if (currentSrc.includes('.png')) {
                        e.target.src = `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'jpg')}?t=${imageRefreshKey}`;
                      } else if (currentSrc.includes('.jpg')) {
                        e.target.src = `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'jpeg')}?t=${imageRefreshKey}`;
                      } else if (currentSrc.includes('.jpeg')) {
                        e.target.src = `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'gif')}?t=${imageRefreshKey}`;
                      } else if (currentSrc.includes('.gif')) {
                        e.target.src = `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'webp')}?t=${imageRefreshKey}`;
                      } else {
                        // All extensions failed, show placeholder
                        e.target.style.display = 'none';
                        const placeholder = e.target.nextElementSibling;
                        if (placeholder) placeholder.style.display = 'flex';
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
                      <span className="field-value">
                        {renderCellContent(item, col, index)}
                      </span>
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
        <h2>Students</h2>
      </div>

      <ErrorPopup errorMessage={error} />

      <div className="table-container">
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

  const renderReports = () => {
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
    
    return (
      <div className="tab-content">
        <h2>Library Reports</h2>
        <ErrorPopup errorMessage={error} />
        
        {/* Report 1: Most Borrowed Assets */}
        <div className="report-section">
          <h3>📊 Most Borrowed Assets (Top 10)</h3>
          
          {mostBorrowedReport.length > 0 && (
            <div style={{ marginBottom: '30px', backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={mostBorrowedReport.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="Title" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Total_Borrows" fill="#3b82f6" name="Total Borrows" />
                  <Bar dataKey="Available_Copies" fill="#10b981" name="Available" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Total Borrows</th>
                  <th>Total Copies</th>
                  <th>Available</th>
                  <th>Borrow Rate</th>
                </tr>
              </thead>
              <tbody>
                {mostBorrowedReport.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>No data available</td>
                  </tr>
                ) : (
                  mostBorrowedReport.map((item) => (
                    <tr key={item.Asset_ID}>
                      <td>{item.Asset_ID}</td>
                      <td>{item.Title}</td>
                      <td><span className="category-badge">{item.Type}</span></td>
                      <td><strong>{item.Total_Borrows}</strong></td>
                      <td>{item.Total_Copies}</td>
                      <td>{item.Available_Copies}</td>
                      <td>{item.Borrow_Rate_Per_Copy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Report 2: Active Borrowers */}
      <div className="report-section">
        <h3>👥 Active Borrowers (Top 20)</h3>
        
        {activeBorrowersReport.length > 0 && (
          <div style={{ marginBottom: '30px', backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={activeBorrowersReport.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="Full_Name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={120}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Currently_Borrowed" fill="#f59e0b" name="Currently Borrowed" />
                <Bar dataKey="Total_Borrows_All_Time" fill="#3b82f6" name="Total Borrows" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Currently Borrowed</th>
                <th>Total Borrows</th>
                <th>Days Overdue</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {activeBorrowersReport.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>No data available</td>
                </tr>
              ) : (
                activeBorrowersReport.map((user) => (
                  <tr key={user.User_ID}>
                    <td>{user.User_ID}</td>
                    <td>{user.Full_Name}</td>
                    <td>{user.User_Email}</td>
                    <td><strong>{user.Currently_Borrowed}</strong></td>
                    <td>{user.Total_Borrows_All_Time}</td>
                    <td>
                      <span className={user.Total_Days_Overdue > 0 ? 'text-danger' : ''}>
                        {user.Total_Days_Overdue}
                      </span>
                    </td>
                    <td>${user.Account_Balance}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report 3: Overdue Items */}
      <div className="report-section">
        <h3>⚠️ Overdue Items</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Borrow ID</th>
                <th>Borrower</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Asset</th>
                <th>Type</th>
                <th>Due Date</th>
                <th>Days Overdue</th>
                <th>Severity</th>
                <th>Late Fee</th>
              </tr>
            </thead>
            <tbody>
              {overdueItemsReport.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center' }}>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>✓ No overdue items!</span>
                  </td>
                </tr>
              ) : (
                overdueItemsReport.map((item) => (
                  <tr key={item.Borrow_ID}>
                    <td>{item.Borrow_ID}</td>
                    <td>{item.Borrower_Name}</td>
                    <td>{item.User_Email}</td>
                    <td>{item.User_Phone || '-'}</td>
                    <td>{item.Title}</td>
                    <td><span className="category-badge">{item.Type}</span></td>
                    <td>{new Date(item.Due_Date).toLocaleDateString()}</td>
                    <td><strong style={{ color: '#dc2626' }}>{item.Days_Overdue}</strong></td>
                    <td>
                      <span className={`status-badge ${
                        item.Severity === 'Critical' ? 'critical' : 
                        item.Severity === 'Urgent' ? 'urgent' : 'warning'
                      }`}>
                        {item.Severity}
                      </span>
                    </td>
                    <td>${item.Estimated_Late_Fee}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report 4: Inventory Summary */}
      <div className="report-section">
        <h3>📦 Inventory Summary by Asset Type</h3>
        
        {inventorySummaryReport.length > 0 && (
          <div style={{ marginBottom: '30px', backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <h4 style={{ textAlign: 'center', marginBottom: '20px' }}>Total Copies Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={inventorySummaryReport}
                    dataKey="Total_Copies"
                    nameKey="Asset_Type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.Asset_Type}: ${entry.Total_Copies}`}
                  >
                    {inventorySummaryReport.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ flex: '1', minWidth: '300px' }}>
              <h4 style={{ textAlign: 'center', marginBottom: '20px' }}>Utilization Rate by Type</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventorySummaryReport}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Asset_Type" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Utilization_Percentage" fill="#8b5cf6" name="Utilization %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset Type</th>
                <th>Unique Items</th>
                <th>Total Copies</th>
                <th>Available</th>
                <th>Currently Borrowed</th>
                <th>Utilization %</th>
              </tr>
            </thead>
            <tbody>
              {inventorySummaryReport.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>No data available</td>
                </tr>
              ) : (
                inventorySummaryReport.map((type) => (
                  <tr key={type.Asset_Type}>
                    <td><strong>{type.Asset_Type}</strong></td>
                    <td>{type.Unique_Items}</td>
                    <td>{type.Total_Copies}</td>
                    <td>{type.Total_Available}</td>
                    <td>{type.Currently_Borrowed}</td>
                    <td>
                      <span style={{ 
                        color: type.Utilization_Percentage > 70 ? '#dc2626' : '#10b981',
                        fontWeight: '600'
                      }}>
                        {type.Utilization_Percentage}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

  // User Management - Admin only
  const renderUserManagement = () => (
    <div className="tab-content">
      <div className="section-header">
        <h2>👤 User & Role Management</h2>
        <button className="add-button" onClick={() => alert('Create user functionality - Coming soon')}>
          + Create User
        </button>
      </div>

      <ErrorPopup errorMessage={error} />

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div className="stat-details">
            <h3>{students.length}</h3>
            <p>Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📚</div>
          <div className="stat-details">
            <h3>1</h3>
            <p>Librarians</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">🔐</div>
          <div className="stat-details">
            <h3>2</h3>
            <p>Admins</p>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ marginTop: '20px' }}>
        <h3>All Users</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>No users found</td>
              </tr>
            ) : (
              students.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td><strong>{student.studentId}</strong></td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>
                    <span className="status-badge available">Student</span>
                  </td>
                  <td>
                    <span className="status-badge active">{student.status}</span>
                  </td>
                  <td>
                    <button className="action-btn" onClick={() => alert('Edit user - Coming soon')}>✏️</button>
                    <button className="action-btn danger" onClick={() => alert('Delete user - Coming soon')}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  // System Settings - Admin only
  const renderSystemSettings = () => (
    <div className="tab-content">
      <div className="section-header">
        <h2>⚙️ System Configuration</h2>
      </div>

      <ErrorPopup errorMessage={error} />

      <div className="settings-grid">
        <div className="setting-card">
          <h3>📚 Library Settings</h3>
          <div className="setting-item">
            <label>Maximum Borrow Days:</label>
            <input type="number" defaultValue="14" disabled />
          </div>
          <div className="setting-item">
            <label>Maximum Books Per User:</label>
            <input type="number" defaultValue="5" disabled />
          </div>
          <div className="setting-item">
            <label>Fine Per Day ($):</label>
            <input type="number" step="0.01" defaultValue="0.50" disabled />
          </div>
          <button className="add-button" onClick={() => alert('Save settings - Coming soon')}>Save Changes</button>
        </div>

        <div className="setting-card">
          <h3>📖 Book Categories</h3>
          <div className="category-list">
            <span className="category-badge">Fiction</span>
            <span className="category-badge">Non-Fiction</span>
            <span className="category-badge">Science</span>
            <span className="category-badge">History</span>
            <span className="category-badge">Technology</span>
          </div>
          <button className="add-button" onClick={() => alert('Manage categories - Coming soon')}>+ Add Category</button>
        </div>

        <div className="setting-card">
          <h3>💾 Database & Backup</h3>
          <div className="backup-info">
            <p><strong>Last Backup:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Database Size:</strong> 45.2 MB</p>
            <p><strong>Status:</strong> <span style={{ color: '#10b981' }}>✓ Healthy</span></p>
          </div>
          <button className="add-button" onClick={() => alert('Backup database - Coming soon')}>Backup Now</button>
        </div>

        <div className="setting-card">
          <h3>🔐 Security & Access</h3>
          <div className="setting-item">
            <label>Enable Two-Factor Auth:</label>
            <input type="checkbox" disabled />
          </div>
          <div className="setting-item">
            <label>Session Timeout (minutes):</label>
            <input type="number" defaultValue="30" disabled />
          </div>
          <div className="setting-item">
            <label>Audit Logging:</label>
            <input type="checkbox" defaultChecked disabled />
          </div>
          <button className="add-button" onClick={() => alert('Update security - Coming soon')}>Update Security</button>
        </div>
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
            <button 
              className="notification-bell" 
              onClick={() => setShowNotifications(true)}
              title="View notifications"
            >
              🔔
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
              )}
            </button>
            <span className="admin-navbar-role">Administrator</span>
            <button className="admin-navbar-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>

      <LoadingOverlay loading={loading} loadMessage={successMessage} />

      <SuccessPopup successMessage={successMessage} />
      
      <div className="dashboard-content">
        <div className="dashboard-title-bar">
          <h1>Admin Dashboard</h1>
        </div>

        <div className="tabs-container">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => changeTab('overview')}
          >
            🏠 Overview
          </button>
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => changeTab('users')}
          >
            👤 User Management
          </button>
          <button 
            className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => changeTab('reports')}
          >
            📊 Reports & Analytics
          </button>
          <button 
            className={`tab ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => changeTab('students')}
          >
            👥 All Users
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => changeTab('settings')}
          >
            ⚙️ System Settings
          </button>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'students' && renderStudents()}
        {activeTab === 'settings' && renderSystemSettings()}
      </div>

      {/* Asset Modal */}
      {showAssetModal && (
        <div className="modal-overlay" onClick={() => setShowAssetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {isEditMode ? 'Edit' : (activeAssetTab === 'study-rooms' ? 'Reserve' : 'Add')}{' '}
              {activeAssetTab === 'study-rooms' ? 'Study Room' : activeAssetTab.slice(0, -1).charAt(0).toUpperCase() + activeAssetTab.slice(1, -1)}
            </h3>
            <form onSubmit={handleAddAsset}>
              {/* Image Upload Section */}
              <div className="form-group">
                <label>Image</label>
                <div className="image-upload-section">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  {(imagePreview || assetForm.Image_URL) ? (
                    <div className="image-preview-container">
                      <img 
                        src={imagePreview || assetForm.Image_URL} 
                        alt="Preview" 
                        className="image-preview"
                        onClick={() => document.getElementById('image-upload').click()}
                        style={{ cursor: 'pointer' }}
                        title="Click to change image"
                      />
                      <button 
                        type="button" 
                        className="remove-image-btn" 
                        onClick={removeImage}
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label 
                      htmlFor="image-upload" 
                      className="no-image-placeholder"
                      style={{ cursor: 'pointer' }}
                    >
                      <span>📷</span>
                      <p>Click to upload image</p>
                    </label>
                  )}
                </div>
              </div>

              {getAssetFormFields()
                .filter(field => field.name !== 'Image_URL')
                .filter(field => {
                  // Hide Copies field for movies when editing (managed through rentables table)
                  return !(activeAssetTab === 'movies' && field.name === 'Copies' && isEditMode);
                })
                .map(field => (
                <div className="form-group" key={field.name}>
                  <label>{field.label} {field.required && '*'}</label>
                  <input
                    type={field.type}
                    value={assetForm[field.name] || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, [field.name]: e.target.value })}
                    required={field.required}
                    placeholder={field.placeholder || ''}
                  />
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowAssetModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-button" disabled={loading}>
                  {(() => {
                    if (loading) {
                      return isEditMode ? 'Updating...' : 'Adding...'
                    }
                    return isEditMode ? 'Update' : 'Add'
                  })()}
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
            <h3>Confirm Delete</h3>
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

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </div>
  )
}

export default Admin
