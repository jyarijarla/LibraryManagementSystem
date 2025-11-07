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

// Card Component for Dashboard Stats
const Card = ({ title, value, icon, details, gradient }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start">
        <h3 className="text-base font-medium text-gray-600">{title}</h3>
        <div className={`p-3 rounded-lg ${gradient}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-800">{value}</p>
        {details && <p className="text-xs text-gray-400 mt-1">{details}</p>}
      </div>
    </div>
  )
}

// Icon Components for Sidebar & Dashboard
const HomeIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const BookIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const MembersIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const FinesIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const IssueReturnIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)

const ReportsIcon = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

// NavItem Component for Sidebar
const NavItem = ({ icon, label, isActive, onClick }) => {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={`
        relative flex items-center px-6 py-3 text-sm font-medium transition-all duration-200
        ${isActive 
          ? 'bg-indigo-600 text-white' 
          : 'text-gray-300 hover:bg-slate-700 hover:text-white'
        }
      `}
    >
      {isActive && (
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-400"></span>
      )}
      <span className="mr-3">
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </span>
      <span>{label}</span>
    </a>
  )
}

// LibrarianSidebar Component
const LibrarianSidebar = ({ activePage, setActivePage, sidebarOpen, setSidebarOpen }) => {
  const navItems = [
    { label: 'Dashboard', icon: <HomeIcon />, page: 'overview' },
    { label: 'Manage Books', icon: <BookIcon />, page: 'books' },
    { label: 'Issue / Return', icon: <IssueReturnIcon />, page: 'issue-return' },
    { label: 'Members', icon: <MembersIcon />, page: 'members' },
    { label: 'Fines & Payments', icon: <FinesIcon />, page: 'fines' },
    { label: 'All Records', icon: <ReportsIcon />, page: 'records' }
  ]

  return (
    <>
      <div
        className={`
          fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 md:hidden
          ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-slate-800 z-50 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        <div className="px-6 py-5 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white">📚 LMS</h1>
        </div>

        <nav className="mt-6">
          {navItems.map((item) => (
            <NavItem
              key={item.page}
              icon={item.icon}
              label={item.label}
              isActive={activePage === item.page}
              onClick={() => {
                setActivePage(item.page)
                setSidebarOpen(false)
              }}
            />
          ))}
        </nav>
      </aside>
    </>
  )
}

function Librarian() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
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
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now())
  
  // Dashboard Overview States
  const [dashboardStats, setDashboardStats] = useState({
    totalBooks: 0,
    availableBooks: 0,
    borrowedBooks: 0,
    reservedBooks: 0,
    activeMembers: 0,
    overdueCount: 0,
    unpaidFines: 0
  })
  const [recentTransactions, setRecentTransactions] = useState([])
  const [overdueItems, setOverdueItems] = useState([])
  
  // Search States
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFilter, setSearchFilter] = useState('all') // all, title, author, isbn, member
  
  // Issue/Return States
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState('issue') // For Issue/Return sub-tabs
  const [selectedAssetType, setSelectedAssetType] = useState('books') // Asset type for issue
  const [studentSearch, setStudentSearch] = useState('') // Search term for students
  const [assetSearch, setAssetSearch] = useState('') // Search term for any asset
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [issueForm, setIssueForm] = useState({
    memberId: '',
    memberName: '',
    assetId: '',
    assetTitle: '',
    assetType: 'books',
    issueDate: '',
    dueDate: ''
  })
  const [returnForm, setReturnForm] = useState({
    borrowId: '',
    assetId: ''
  })
  
  // Fine Management States
  const [showFineModal, setShowFineModal] = useState(false)
  const [fines, setFines] = useState([])
  const [selectedMemberFines, setSelectedMemberFines] = useState(null)
  
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
      if (activeTab === 'overview') {
        await Promise.all([
          fetchDashboardStats(),
          fetchRecentTransactions(),
          fetchOverdueItems()
        ])
      } else if (activeTab === 'books') {
        await fetchAssets(activeAssetTab)
      } else if (activeTab === 'issue-return') {
        await Promise.all([
          fetchBorrowRecords(),
          fetchStudents(),
          fetchAssets('books'),
          fetchAssets('cds'),
          fetchAssets('audiobooks'),
          fetchAssets('movies'),
          fetchAssets('technology'),
          fetchAssets('study-rooms')
        ])
      } else if (activeTab === 'members') {
        await fetchStudents()
      } else if (activeTab === 'fines') {
        await fetchFines()
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

  const fetchDashboardStats = async () => {
    try {
      const [booksRes, studentsRes, borrowRes, overdueRes] = await Promise.all([
        fetch(`${API_URL}/assets/books`),
        fetch(`${API_URL}/students`),
        fetch(`${API_URL}/borrow-records`),
        fetch(`${API_URL}/reports/overdue-items`)
      ])

      const booksData = await booksRes.json()
      const studentsData = await studentsRes.json()
      const borrowData = await borrowRes.json()
      const overdueData = await overdueRes.json()

      const totalBooks = booksData.reduce((sum, book) => sum + (parseInt(book.Copies) || 0), 0)
      const availableBooks = booksData.reduce((sum, book) => sum + (parseInt(book.Available_Copies) || 0), 0)
      const borrowedBooks = totalBooks - availableBooks
      const activeMembers = studentsData.filter(s => s.status === 'Active').length
      const overdueCount = Array.isArray(overdueData) ? overdueData.length : 0
      const unpaidFines = studentsData.reduce((sum, s) => sum + (parseFloat(s.balance) || 0), 0)

      setDashboardStats({
        totalBooks,
        availableBooks,
        borrowedBooks,
        reservedBooks: 0, // Placeholder
        activeMembers,
        overdueCount,
        unpaidFines
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }

  const fetchRecentTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/borrow-records`)
      if (response.ok) {
        const data = await response.json()
        // Get last 5 transactions
        const recent = data.slice(0, 5)
        setRecentTransactions(recent)
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error)
    }
  }

  const fetchOverdueItems = async () => {
    try {
      const response = await fetch(`${API_URL}/reports/overdue-items`)
      if (response.ok) {
        const data = await response.json()
        setOverdueItems(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching overdue items:', error)
      setOverdueItems([])
    }
  }

  const fetchFines = async () => {
    try {
      const response = await fetch(`${API_URL}/students`)
      if (response.ok) {
        const data = await response.json()
        const finesData = data.filter(student => parseFloat(student.balance || 0) > 0)
        setFines(finesData)
      }
    } catch (error) {
      console.error('Error fetching fines:', error)
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

  const getIssueAssetData = () => {
    switch(selectedAssetType) {
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

  // API Functions for Issue/Return/Renew
  const handleIssueBook = async () => {
    if (!issueForm.memberId || !issueForm.assetId) {
      alert('Please select both student and asset')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/borrow/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: issueForm.memberId,
          assetId: issueForm.assetId,
          assetType: issueForm.assetType,
          issueDate: issueForm.issueDate || new Date().toISOString().split('T')[0],
          dueDate: issueForm.dueDate || (() => {
            const date = new Date()
            date.setDate(date.getDate() + 14)
            return date.toISOString().split('T')[0]
          })()
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to issue asset')
      }
      
      setSuccessMessage('Asset issued successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
      // Clear form and refresh data
      setIssueForm({ memberId: '', memberName: '', assetId: '', assetTitle: '', assetType: 'books', issueDate: '', dueDate: '' })
      setStudentSearch('')
      setAssetSearch('')
      await fetchData()
    } catch (error) {
      setError(error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleReturnBook = async (borrowId, fineAmount) => {
    const confirmReturn = fineAmount > 0 
      ? window.confirm(`This book has a fine of $${fineAmount.toFixed(2)}.\n\nProceed with return?`)
      : window.confirm('Confirm book return?')
    
    if (!confirmReturn) return
    
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/borrow-records/${borrowId}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fineAmount: fineAmount || 0 })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to return book')
      }
      
      setSuccessMessage(`✅ Book returned successfully! ${fineAmount > 0 ? `Fine recorded: $${fineAmount.toFixed(2)}` : ''}`)
      setTimeout(() => setSuccessMessage(''), 3000)
      
      await fetchData()
    } catch (error) {
      setError(error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleRenewBook = async (borrowId, newDueDate) => {
    const confirmRenew = window.confirm(`Renew this book?\n\nNew due date: ${newDueDate}`)
    
    if (!confirmRenew) return
    
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/borrow-records/${borrowId}/renew`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDueDate })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to renew book')
      }
      
      setSuccessMessage('Book renewed successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
      await fetchData()
    } catch (error) {
      setError(error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Dashboard Overview
  const renderDashboardOverview = () => {
    // Calculate unpaid fines from overdue books
    const unpaidFines = overdueItems.reduce((sum, item) => sum + (parseFloat(item.fine_amount) || 0), 0)
    
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
        
        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card
            title="Total Books"
            value={loading ? '...' : dashboardStats.totalBooks}
            icon={<BookIcon className="h-6 w-6 text-white" />}
            details={`${dashboardStats.availableBooks} Available / ${dashboardStats.borrowedBooks} Borrowed / ${dashboardStats.reservedBooks} Reserved`}
            gradient="from-cyan-500 to-blue-500 bg-gradient-to-br"
          />
          
          <Card
            title="Active Members"
            value={loading ? '...' : dashboardStats.activeMembers}
            icon={<MembersIcon className="h-6 w-6 text-white" />}
            gradient="from-green-400 to-emerald-500 bg-gradient-to-br"
          />
          
          <Card
            title="Overdue Books"
            value={loading ? '...' : overdueItems.length}
            icon={<BookIcon className="h-6 w-6 text-white" />}
            gradient="from-amber-400 to-orange-500 bg-gradient-to-br"
          />
          
          <Card
            title="Unpaid Fines"
            value={loading ? '...' : `$${unpaidFines.toFixed(2)}`}
            icon={<FinesIcon className="h-6 w-6 text-white" />}
            gradient="from-red-500 to-pink-500 bg-gradient-to-br"
          />
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No recent transactions</td>
                    </tr>
                  ) : (
                    recentTransactions.slice(0, 5).map((transaction, index) => (
                      <tr key={transaction.Borrow_ID || index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.First_Name} {transaction.Last_Name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.Title}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.Return_Date === null 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {transaction.Return_Date === null ? 'Issue' : 'Return'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.Borrow_Date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overdue Books Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Overdue Books</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Late</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : overdueItems.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-center text-gray-500">No overdue books</td>
                    </tr>
                  ) : (
                    overdueItems.map((item, index) => (
                      <tr key={item.Borrow_ID || index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.First_Name} {item.Last_Name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.Title}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-red-600 font-bold text-sm">{item.days_overdue}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
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

  // Issue & Return Management
  const renderIssueReturn = () => {
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">📤📥 Issue & Return Management</h2>
        
        {/* Sub-tabs for Issue/Return/Renew */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeSubTab === 'issue'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveSubTab('issue')}
            >
              <span className="text-xl mr-2">📤</span>
              Issue Asset
            </button>
            <button
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeSubTab === 'return'
                  ? 'border-b-2 border-green-500 text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveSubTab('return')}
            >
              <span className="text-xl mr-2">📥</span>
              Return Asset
            </button>
            <button
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeSubTab === 'renew'
                  ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveSubTab('renew')}
            >
              <span className="text-xl mr-2">🔄</span>
              Renew Asset
            </button>
          </div>

          <div className="p-6">
            {/* ISSUE BOOK TAB */}
            {activeSubTab === 'issue' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Issue New Asset</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Student Search with Dropdown */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      1. Select Student
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 Click or type to search students..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value)
                          setShowStudentDropdown(true)
                        }}
                        onFocus={() => setShowStudentDropdown(true)}
                        onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                      />
                      
                      {/* Dropdown Results - Shows ALL when empty, filters when typing */}
                      {showStudentDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {students
                            .filter(student => {
                              if (!studentSearch) return true // Show all when no search text
                              const searchLower = studentSearch.toLowerCase()
                              return (
                                student.name?.toLowerCase().includes(searchLower) ||
                                student.email?.toLowerCase().includes(searchLower) ||
                                student.studentId?.toString().includes(searchLower) ||
                                student.id?.toString().includes(searchLower)
                              )
                            })
                            .map((student) => (
                              <div
                                key={student.id}
                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onMouseDown={() => {
                                  setIssueForm({ 
                                    ...issueForm, 
                                    memberId: student.id,
                                    memberName: student.name
                                  })
                                  setStudentSearch(`${student.name} (ID: ${student.studentId})`)
                                  setShowStudentDropdown(false)
                                }}
                              >
                                <div className="font-medium text-gray-900">
                                  {student.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {student.email}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {student.studentId} | Active Loans: <span className="text-blue-600 font-semibold">{student.borrowedBooks || 0}</span>
                                </div>
                              </div>
                            ))}
                          {students.filter(student => {
                            if (!studentSearch) return true
                            const searchLower = studentSearch.toLowerCase()
                            return (
                              student.name?.toLowerCase().includes(searchLower) ||
                              student.email?.toLowerCase().includes(searchLower) ||
                              student.studentId?.toString().includes(searchLower) ||
                              student.id?.toString().includes(searchLower)
                            )
                          }).length === 0 && (
                            <div className="px-4 py-3 text-gray-500 text-center">
                              No students found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {issueForm.memberId && (
                      <div className="mt-3 text-sm text-gray-600">
                        {(() => {
                          const member = students.find(s => s.id === parseInt(issueForm.memberId))
                          return member ? (
                            <div className="bg-white p-3 rounded border border-gray-200">
                              <div className="font-semibold text-gray-800 mb-2">
                                ✅ Selected: {member.name}
                              </div>
                              <div><strong>Email:</strong> {member.email}</div>
                              <div><strong>Phone:</strong> {member.phone || 'N/A'}</div>
                              <div><strong>Active Loans:</strong> <span className="text-blue-600 font-semibold">
                                {member.borrowedBooks || 0}
                              </span></div>
                            </div>
                          ) : null
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Asset Type and Search */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      2. Select Asset Type & Item
                    </label>
                    
                    {/* Asset Type Selector */}
                    <select
                      className="w-full px-4 py-2 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={selectedAssetType}
                      onChange={(e) => {
                        setSelectedAssetType(e.target.value)
                        setIssueForm({ ...issueForm, assetType: e.target.value, assetId: '', assetTitle: '' })
                        setAssetSearch('')
                      }}
                    >
                      <option value="books">📚 Books</option>
                      <option value="cds">💿 CDs</option>
                      <option value="audiobooks">🎧 Audiobooks</option>
                      <option value="movies">🎬 Movies</option>
                      <option value="technology">💻 Technology</option>
                      <option value="study-rooms">🚪 Study Rooms</option>
                    </select>

                    {/* Asset Search */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={`🔍 Click or type to search ${selectedAssetType}...`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={assetSearch}
                        onChange={(e) => {
                          setAssetSearch(e.target.value)
                          setShowAssetDropdown(true)
                        }}
                        onFocus={() => setShowAssetDropdown(true)}
                        onBlur={() => setTimeout(() => setShowAssetDropdown(false), 200)}
                      />
                      
                      {/* Dropdown Results */}
                      {showAssetDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {getIssueAssetData()
                            .filter(item => item.Available_Copies > 0 || selectedAssetType === 'study-rooms')
                            .filter(item => {
                              if (!assetSearch) return true
                              const searchLower = assetSearch.toLowerCase()
                              const title = item.Title || item.Room_Number || item.Model_Num || ''
                              const author = item.Author || item.Artist || ''
                              return (
                                title.toString().toLowerCase().includes(searchLower) ||
                                author.toString().toLowerCase().includes(searchLower)
                              )
                            })
                            .map((item) => (
                              <div
                                key={item.Asset_ID}
                                className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onMouseDown={() => {
                                  setIssueForm({ 
                                    ...issueForm, 
                                    assetId: item.Asset_ID,
                                    assetTitle: item.Title || item.Room_Number || `Tech-${item.Model_Num}`,
                                    assetType: selectedAssetType
                                  })
                                  setAssetSearch(item.Title || item.Room_Number || `Tech-${item.Model_Num}`)
                                  setShowAssetDropdown(false)
                                }}
                              >
                                <div className="font-medium text-gray-900">
                                  {item.Title || item.Room_Number || `Tech-${item.Model_Num}`}
                                </div>
                                {item.Author && <div className="text-sm text-gray-600">by {item.Author}</div>}
                                {item.Artist && <div className="text-sm text-gray-600">by {item.Artist}</div>}
                                <div className="text-xs text-gray-500">
                                  Available: <span className="text-green-600 font-semibold">{item.Available_Copies || (item.Availability === 'Available' ? '1' : '0')}</span>
                                </div>
                              </div>
                            ))}
                          {getIssueAssetData()
                            .filter(item => item.Available_Copies > 0 || selectedAssetType === 'study-rooms')
                            .filter(item => {
                              if (!assetSearch) return true
                              const searchLower = assetSearch.toLowerCase()
                              const title = item.Title || item.Room_Number || item.Model_Num || ''
                              const author = item.Author || item.Artist || ''
                              return (
                                title.toString().toLowerCase().includes(searchLower) ||
                                author.toString().toLowerCase().includes(searchLower)
                              )
                            }).length === 0 && (
                            <div className="px-4 py-3 text-gray-500 text-center">
                              No available items found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {issueForm.assetId && (
                      <div className="mt-3 p-3 bg-white rounded border border-gray-200 text-sm">
                        <div className="font-semibold text-gray-800">
                          ✅ Selected: {issueForm.assetTitle}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      3. Issue Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={issueForm.issueDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setIssueForm({ ...issueForm, issueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      4. Due Date (14 days default)
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={issueForm.dueDate || (() => {
                        const date = new Date()
                        date.setDate(date.getDate() + 14)
                        return date.toISOString().split('T')[0]
                      })()}
                      onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    onClick={() => {
                      setIssueForm({ memberId: '', memberName: '', assetId: '', assetTitle: '', assetType: 'books', issueDate: '', dueDate: '' })
                      setStudentSearch('')
                      setAssetSearch('')
                    }}
                  >
                    Clear Form
                  </button>
                  <button
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!issueForm.memberId || !issueForm.assetId || loading}
                    onClick={handleIssueBook}
                  >
                    {loading ? '⌛ Processing...' : '✓ Confirm Issue'}
                  </button>
                </div>
              </div>
            )}

            {/* RETURN ASSET TAB */}
            {activeSubTab === 'return' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Return Asset</h3>
                
                {/* Search Bar */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by Member Name or Book Title
                  </label>
                  <input
                    type="text"
                    placeholder="Type to search active borrows..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Active Borrows Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrow ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fine</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {borrowRecords.filter(r => !r.Return_Date).length === 0 ? (
                          <tr>
                            <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                              No active borrows at the moment
                            </td>
                          </tr>
                        ) : (
                          borrowRecords.filter(r => !r.Return_Date).map((record, index) => {
                            const dueDate = new Date(record.Due_Date)
                            const today = new Date()
                            const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
                            const isOverdue = daysLeft < 0
                            const fineAmount = isOverdue ? Math.abs(daysLeft) * 1.0 : 0

                            return (
                              <tr key={record.Borrow_ID} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  #{record.Borrow_ID}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {record.First_Name} {record.Last_Name}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">{record.Title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs">
                                  <span className="px-2 py-1 inline-flex leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                    {record.Asset_Type || 'Book'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(record.Borrow_Date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {dueDate.toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {isOverdue ? (
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                      {Math.abs(daysLeft)} days overdue
                                    </span>
                                  ) : daysLeft <= 3 ? (
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      Due in {daysLeft} days
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                      Active
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {isOverdue ? (
                                    <span className="text-red-600 font-bold">${fineAmount.toFixed(2)}</span>
                                  ) : (
                                    <span className="text-gray-400">$0.00</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <button
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium disabled:opacity-50"
                                    disabled={loading}
                                    onClick={() => handleReturnBook(record.Borrow_ID, fineAmount)}
                                  >
                                    ✓ Mark Returned
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* RENEW ASSET TAB */}
            {activeSubTab === 'renew' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Renew Asset (Extend Due Date)</h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Renewal Policy:</strong> Assets can be renewed once if no other member has reserved them. 
                    The new due date will be 14 days from today.
                  </p>
                </div>

                {/* Renewable Assets Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrow ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {borrowRecords.filter(r => !r.Return_Date && new Date(r.Due_Date) >= new Date()).length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                              No assets available for renewal
                            </td>
                          </tr>
                        ) : (
                          borrowRecords.filter(r => !r.Return_Date && new Date(r.Due_Date) >= new Date()).map((record, index) => {
                            const newDueDate = new Date()
                            newDueDate.setDate(newDueDate.getDate() + 14)

                            return (
                              <tr key={record.Borrow_ID} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  #{record.Borrow_ID}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {record.First_Name} {record.Last_Name}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">{record.Title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs">
                                  <span className="px-2 py-1 inline-flex leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                    {record.Asset_Type || 'Book'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(record.Due_Date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                  {newDueDate.toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <button
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium disabled:opacity-50"
                                    disabled={loading}
                                    onClick={() => handleRenewBook(record.Borrow_ID, newDueDate.toISOString().split('T')[0])}
                                  >
                                    🔄 Renew
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Active Borrows</p>
                <p className="text-3xl font-bold text-blue-800 mt-1">
                  {borrowRecords.filter(r => !r.Return_Date).length}
                </p>
              </div>
              <span className="text-4xl">📚</span>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Overdue Books</p>
                <p className="text-3xl font-bold text-red-800 mt-1">
                  {overdueItems.length}
                </p>
              </div>
              <span className="text-4xl">⚠️</span>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Returned Today</p>
                <p className="text-3xl font-bold text-green-800 mt-1">
                  {borrowRecords.filter(r => r.Return_Date && new Date(r.Return_Date).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
              <span className="text-4xl">✅</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  const renderFineManagement = () => (
    <div className="tab-content">
      <div className="section-header">
        <h2>💰 Fine & Payment Management</h2>
        <button className="add-button" onClick={() => alert('Generate Fine Report - Coming soon!')}>
          📊 Generate Report
        </button>
      </div>

      <ErrorPopup errorMessage={error} />

      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card">
          <div className="stat-icon orange">💰</div>
          <div className="stat-details">
            <h3>${fines.reduce((sum, f) => sum + parseFloat(f.balance || 0), 0).toFixed(2)}</h3>
            <p>Total Unpaid Fines</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">👥</div>
          <div className="stat-details">
            <h3>{fines.length}</h3>
            <p>Members with Fines</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📋</div>
          <div className="stat-details">
            <h3>{overdueItems.length}</h3>
            <p>Active Overdue Items</p>
          </div>
        </div>
      </div>

      {/* Fines Table */}
      <div className="table-container">
        <h3>Member Fines & Balances</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student ID</th>
              <th>Member Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Outstanding Balance</th>
              <th>Active Borrows</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fines.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: '#27ae60' }}>
                  ✓ No outstanding fines - All members are current!
                </td>
              </tr>
            ) : (
              fines.map((member, index) => (
                <tr key={member.id}>
                  <td>{index + 1}</td>
                  <td><strong>{member.studentId}</strong></td>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.phone || '-'}</td>
                  <td>
                    <span style={{ 
                      color: '#e67e22', 
                      fontWeight: 'bold', 
                      fontSize: '16px' 
                    }}>
                      ${parseFloat(member.balance || 0).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${member.borrowedBooks > 0 ? 'borrowed' : 'available'}`}>
                      {member.borrowedBooks}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge" style={{ 
                      backgroundColor: parseFloat(member.balance) > 50 ? '#e74c3c' : '#f39c12' 
                    }}>
                      {parseFloat(member.balance) > 50 ? 'High' : 'Moderate'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="action-btn success" 
                      onClick={() => alert(`Record payment for ${member.name}`)}
                      title="Record Payment"
                    >
                      💳 Pay
                    </button>
                    <button 
                      className="action-btn" 
                      onClick={() => alert(`View fine details for ${member.name}`)}
                      title="View Details"
                    >
                      👁️ Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Fine Calculation Info */}
      <div style={{ 
        backgroundColor: '#e8f4fd', 
        border: '1px solid #3498db', 
        borderRadius: '8px', 
        padding: '15px',
        marginTop: '20px'
      }}>
        <h4 style={{ color: '#2980b9', marginBottom: '10px' }}>ℹ️ Fine Calculation Policy</h4>
        <ul style={{ marginLeft: '20px', color: '#34495e' }}>
          <li>Standard fine rate: <strong>$0.50 per day</strong> per overdue item</li>
          <li>Grace period: <strong>No fines</strong> for first 2 days after due date</li>
          <li>Maximum fine per item: <strong>$50.00</strong></li>
          <li>Payment methods: Cash, Card, Online Transfer</li>
          <li>Members with fines over $20 may have borrowing privileges suspended</li>
        </ul>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <LibrarianSidebar 
        activePage={activeTab} 
        setActivePage={(page) => changeTab(page)} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <nav className="bg-slate-800 text-white shadow-lg z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                className="md:hidden mr-4 text-gray-300 hover:text-white focus:outline-none"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-xl font-bold">📚 Library Management System</h2>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm bg-indigo-600 px-3 py-1 rounded-full">Librarian</span>
              <button 
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium transition-colors"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <LoadingOverlay loading={loading} loadMessage={successMessage} />
          <SuccessPopup successMessage={successMessage} />
          
          <div className="dashboard-content">
            {activeTab === 'overview' && renderDashboardOverview()}
            {activeTab === 'books' && renderAssets()}
            {activeTab === 'issue-return' && renderIssueReturn()}
            {activeTab === 'members' && renderStudents()}
            {activeTab === 'fines' && renderFineManagement()}
            {activeTab === 'records' && renderBorrowRecords()}
          </div>
        </div>
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
