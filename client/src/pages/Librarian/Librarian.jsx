import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Home, BookOpen, RefreshCw, Users, DollarSign, 
  FileText, LogOut, Search, Calendar, User,
  TrendingUp, TrendingDown, BookMarked, AlertCircle,
  Library, UserPlus, Clock, Menu, X, BarChart3
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import '../Admin/Admin.css'
import './Librarian.css'
import { LoadingOverlay, SuccessPopup, ErrorPopup } from '../../components/FeedbackUI/FeedbackUI'
import LibrarianReport from '../LibrarianReport/LibrarianReport'

// Use local server for development, production for deployed app
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'

// Helper function to get image path for an asset
const getAssetImagePath = (assetType, assetId, extension = 'png') => {
  return `/assets/${assetType}/${assetId}.${extension}`
}

// Modern Stat Card Component with Animation
const StatCard = ({ title, value, change, isIncrease, icon: Icon, gradient, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          {change && (
            <div className="flex items-center mt-2">
              {isIncrease ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-lg ${gradient}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

// NavItem Component for Modern Sidebar
const NavItem = ({ icon: Icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center px-6 py-3 text-sm font-medium transition-all duration-200
        ${isActive 
          ? 'bg-indigo-600 text-white border-l-4 border-sky-400' 
          : 'text-gray-300 hover:bg-slate-700 hover:text-white'
        }
      `}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span>{label}</span>
    </button>
  )
}

// LibrarianSidebar Component
const LibrarianSidebar = ({ activePage, setActivePage, sidebarOpen, setSidebarOpen }) => {
  const navItems = [
    { label: 'Dashboard', icon: Home, page: 'overview' },
    { label: 'Manage Assets', icon: BookOpen, page: 'books' },
    { label: 'Issue / Return', icon: RefreshCw, page: 'issue-return' },
    { label: 'Members', icon: Users, page: 'members' },
    { label: 'Fines & Payments', icon: DollarSign, page: 'fines' },
    { label: 'All Records', icon: FileText, page: 'records' },
    { label: 'My Reports', icon: BarChart3, page: 'my-reports' },
    { label: 'Events Calendar', icon: Calendar, page: 'calendar'}
  ]

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`
          fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 md:hidden
          ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-slate-800 z-50 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        {/* Logo/Brand */}
        <div className="px-6 py-5 border-b border-slate-700 flex items-center gap-3">
          <Library className="w-8 h-8 text-sky-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">LMS</h1>
            <p className="text-xs text-gray-400">Library Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 space-y-1">
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

        {/* Logout button at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <button
            onClick={() => {
              localStorage.removeItem('token')
              window.location.href = '/login'
            }}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// TopNavbar Component
const TopNavbar = ({ sidebarOpen, setSidebarOpen, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState('today')

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm z-30">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center flex-1 gap-4">
          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search assets, members, transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Date Range Selector */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-900">Librarian</p>
              <p className="text-xs text-gray-500">Admin Access</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
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
  const [popularBooks, setPopularBooks] = useState([])
  
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
  

 // Calendar States
 const [calendarDate, setCalendarDate] = useState(new Date())
 const [selectedDate, setSelectedDate] = useState(new Date())
 const [calendarOpenDayEvents, setCalendarOpenDayEvents] = useState([])
 const [events, setEvents] = useState([]) // events from server (Calendar table)
 
 // Fetch calendar events when calendar tab opens 
 const fetchEvents = async () => {
   try {
     const res = await fetch(`${API_URL}/events`)
     if (!res.ok) throw new Error('Failed to fetch events')
     const data = await res.json()
     setEvents(Array.isArray(data) ? data : [])
   } catch (err) {
     console.error('Error fetching events:', err)
   }
 }

 useEffect(() => {
   if (activeTab === 'calendar') {
     // get server events + ensure borrow/overdue/recent are loaded
     fetchEvents()
     // optionally refresh borrow records so calendar has borrow/due/return items
     fetchBorrowRecords().catch(() => {})
     fetchOverdueItems().catch(() => {})
     fetchRecentTransactions().catch(() => {})
   }
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [activeTab])


  // Form States
  const [assetForm, setAssetForm] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  // Member Management States
  const [members, setMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [memberStatusFilter, setMemberStatusFilter] = useState('all') // all, active, suspended
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false)
  const [memberModalMode, setMemberModalMode] = useState('add') // add or edit
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberProfile, setMemberProfile] = useState(null)
  const [generatedPassword, setGeneratedPassword] = useState('') // Store generated password
  const [memberForm, setMemberForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    status: 'active'
  })
  const [memberPage, setMemberPage] = useState(1)
  const [memberTotalPages, setMemberTotalPages] = useState(1)

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

  // Refetch members when search, filter, or page changes
  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberSearch, memberStatusFilter, memberPage])

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
          fetchOverdueItems(),
          fetchPopularBooks()
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
        await fetchMembers()
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
        // Get last 10 transactions sorted by date
        const recent = data.slice(0, 10)
        setRecentTransactions(recent)
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error)
    }
  }

  const fetchPopularBooks = async () => {
    try {
      const response = await fetch(`${API_URL}/reports/most-borrowed-assets`)
      if (response.ok) {
        const data = await response.json()
        // Get top 5 most borrowed books
        setPopularBooks(data.slice(0, 5))
      }
    } catch (error) {
      console.error('Error fetching popular books:', error)
      setPopularBooks([])
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

  // Member Management Functions
  const fetchMembers = async () => {
    try {
      const params = new URLSearchParams({
        search: memberSearch,
        status: memberStatusFilter,
        page: memberPage,
        limit: 20
      })
      
      const response = await fetch(`${API_URL}/members?${params}`)
      if (!response.ok) throw new Error('Failed to fetch members')
      const data = await response.json()
      
      setMembers(data.members)
      setMemberTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Error fetching members:', error)
      setError('Failed to fetch members')
    }
  }

  const fetchMemberProfile = async (memberId) => {
    try {
      const response = await fetch(`${API_URL}/members/${memberId}`)
      if (!response.ok) throw new Error('Failed to fetch member profile')
      const data = await response.json()
      
      setMemberProfile(data)
      setShowMemberProfileModal(true)
    } catch (error) {
      console.error('Error fetching member profile:', error)
      setError('Failed to fetch member profile')
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${API_URL}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberForm), // Includes password from form
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member')
      }

      setSuccessMessage('Member added successfully! Login credentials have been sent to their email.')
      setTimeout(() => setSuccessMessage(''), 5000)
      setShowMemberModal(false)
      setMemberForm({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        status: 'active'
      })
      setGeneratedPassword('') // Reset after successful add
      await fetchMembers()
    } catch (err) {
      console.error('Error adding member:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditMember = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${API_URL}/members/${selectedMember.User_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberForm),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update member')
      }

      setSuccessMessage('Member updated successfully!')
      setTimeout(() => setSuccessMessage(''), 5000) // Auto-hide after 5 seconds
      setShowMemberModal(false)
      setSelectedMember(null)
      await fetchMembers()
    } catch (err) {
      console.error('Error updating member:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${API_URL}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete member')
      }

      setSuccessMessage('Member deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 5000) // Auto-hide after 5 seconds
      await fetchMembers()
    } catch (err) {
      console.error('Error deleting member:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Function to generate initial password on frontend
  const generateInitialPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
    let password = 'Library';
    for (let i = 0; i < 6; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  const openAddMemberModal = () => {
    setMemberModalMode('add')
    setSelectedMember(null)
    const newPassword = generateInitialPassword() // Generate password immediately
    setGeneratedPassword(newPassword) // Display it to librarian
    setMemberForm({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      status: 'active',
      password: newPassword // Include in form data
    })
    setShowMemberModal(true)
  }

  const openEditMemberModal = (member) => {
    setMemberModalMode('edit')
    setSelectedMember(member)
    setMemberForm({
      username: member.Username,
      firstName: member.First_Name,
      lastName: member.Last_Name,
      email: member.User_Email,
      phone: member.Phone_Number || '',
      dateOfBirth: member.Date_Of_Birth ? member.Date_Of_Birth.split('T')[0] : '',
      status: member.Account_Status
    })
    setShowMemberModal(true)
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
      
      setSuccessMessage(`Book returned successfully! ${fineAmount > 0 ? `Fine recorded: $${fineAmount.toFixed(2)}` : ''}`)
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
          <p className="text-gray-600">Track library performance and manage operations at a glance</p>
        </div>
        
        {/* Stats Cards Grid with Animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Books"
            value={loading ? '...' : dashboardStats.totalBooks}
            change={`${dashboardStats.availableBooks} Available`}
            isIncrease={dashboardStats.availableBooks > 0}
            icon={BookMarked}
            gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
            delay={0}
          />
          
          <StatCard
            title="Active Members"
            value={loading ? '...' : dashboardStats.activeMembers}
            change="+12% from last month"
            isIncrease={true}
            icon={Users}
            gradient="bg-gradient-to-br from-green-500 to-emerald-600"
            delay={0.1}
          />
          
          <StatCard
            title="Overdue Items"
            value={loading ? '...' : overdueItems.length}
            change={overdueItems.length > 0 ? 'Needs attention' : 'All clear'}
            isIncrease={false}
            icon={AlertCircle}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            delay={0.2}
          />
          
          <StatCard
            title="Unpaid Fines"
            value={loading ? '...' : `$${unpaidFines.toFixed(2)}`}
            change={overdueItems.length > 0 ? `${overdueItems.length} items` : 'No fines'}
            isIncrease={false}
            icon={DollarSign}
            gradient="bg-gradient-to-br from-red-500 to-pink-600"
            delay={0.3}
          />
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Borrowed Today"
            value={loading ? '...' : dashboardStats.borrowedBooks}
            change="+8% from yesterday"
            isIncrease={true}
            icon={BookOpen}
            gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
            delay={0.4}
          />
          
          <StatCard
            title="Returned Today"
            value={loading ? '...' : recentTransactions.filter(t => t.Return_Date !== null).length}
            change="On track"
            isIncrease={true}
            icon={RefreshCw}
            gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
            delay={0.5}
          />
          
          <StatCard
            title="Reserved Items"
            value={loading ? '...' : dashboardStats.reservedBooks}
            change="Upcoming pickups"
            isIncrease={true}
            icon={Clock}
            gradient="bg-gradient-to-br from-blue-500 to-violet-600"
            delay={0.6}
          />
          
          <StatCard
            title="New Members"
            value={loading ? '...' : '5'}
            change="This week"
            isIncrease={true}
            icon={UserPlus}
            gradient="bg-gradient-to-br from-rose-500 to-pink-600"
            delay={0.7}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Borrowing Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Borrowing Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={[
                  { name: 'Mon', borrowed: 12, returned: 8 },
                  { name: 'Tue', borrowed: 19, returned: 15 },
                  { name: 'Wed', borrowed: 15, returned: 12 },
                  { name: 'Thu', borrowed: 22, returned: 18 },
                  { name: 'Fri', borrowed: 28, returned: 20 },
                  { name: 'Sat', borrowed: 25, returned: 22 },
                  { name: 'Sun', borrowed: 18, returned: 16 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="borrowed" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="returned" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Top Books */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Books</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center text-gray-500 py-4">Loading...</div>
              ) : popularBooks.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No data available</div>
              ) : (
                popularBooks.map((book, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-indigo-600">#{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 block">{book.Title}</span>
                        <span className="text-xs text-gray-500">{book.Total_Copies} {book.Total_Copies === 1 ? 'copy' : 'copies'} available</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-indigo-600">{book.Total_Borrows} borrows</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 gap-6">
          {/* Recent Transactions Table - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issued Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No recent transactions</td>
                    </tr>
                  ) : (
                    recentTransactions.slice(0, 10).map((transaction, index) => (
                      <tr key={transaction.Borrow_ID || index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{transaction.Borrow_ID}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {transaction.ISBN || 'N/A'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {transaction.Title}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {transaction.Author_Artist || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.First_Name} {transaction.Last_Name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(transaction.Borrow_Date).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {transaction.Return_Date ? (
                            <span className="text-green-600 font-medium">
                              {new Date(transaction.Return_Date).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Not Returned
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Overdue Books Table - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Overdue Books</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Late</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fine</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : overdueItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-green-600 font-medium">No overdue books - All clear!</td>
                    </tr>
                  ) : (
                    overdueItems.map((item, index) => (
                      <tr key={item.Borrow_ID || index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.Borrower_Name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.Title}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-red-600 font-bold text-sm">{item.Days_Overdue} days</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          ${parseFloat(item.Estimated_Late_Fee || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  const renderAssets = () => {
    const columns = getAssetTableColumns()
    const data = getCurrentAssetData()

    return (
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Manage Assets</h2>
          <p className="text-gray-600">Browse, add, edit, and manage all library assets across different categories</p>
        </div>

        <ErrorPopup errorMessage={error} onClose={() => setError('')} />
        <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />

        {/* Asset Category Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
          <div className="flex flex-wrap border-b border-gray-200">
            <button 
              className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'books' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('books')}
            >
              <span>Books</span>
            </button>
            <button 
              className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'cds' 
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('cds')}
            >
              <span>CDs</span>
            </button>
            <button 
              className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'audiobooks' 
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('audiobooks')}
            >
              <span>Audiobooks</span>
            </button>
            <button 
              className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'movies' 
                  ? 'bg-red-50 text-red-700 border-b-2 border-red-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('movies')}
            >
              <span>Movies</span>
            </button>
            <button 
              className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'technology' 
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('technology')}
            >
              <span>Technology</span>
            </button>
            <button 
              className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'study-rooms' 
                  ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('study-rooms')}
            >
              <span>Study Rooms</span>
            </button>
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                Total {activeAssetTab}: <span className="text-blue-600 font-bold">{data.length}</span>
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-600">
                Available: <span className="text-green-600 font-semibold">
                  {data.reduce((sum, item) => sum + (parseInt(item.Available_Copies) || 0), 0)}
                </span>
              </span>
            </div>
            <button 
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm flex items-center gap-2"
              onClick={openAddAssetModal}
            >
              <span className="text-lg">+</span>
              <span>Add {activeAssetTab.charAt(0).toUpperCase() + activeAssetTab.slice(1, -1)}</span>
            </button>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <p className="text-gray-500 text-lg font-medium">No {activeAssetTab} found</p>
              <p className="text-gray-400 text-sm mt-1">Click "Add {activeAssetTab.slice(0, -1)}" to get started</p>
            </div>
          ) : (
            data.map((item, index) => (
              <div key={item.Asset_ID} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-200">
                {/* Card Header */}
                <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600 bg-white px-3 py-1 rounded-full">#{index + 1}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                      className="px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium"
                      onClick={() => openEditAssetModal(item)} 
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button 
                      className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-medium"
                      onClick={() => openDeleteModal(item)} 
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {/* Card Image */}
                <div className="relative w-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden" style={{ height: '450px' }}>
                  <img 
                    src={item.Image_URL ? `${item.Image_URL}?t=${imageRefreshKey}` : `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'png')}?t=${imageRefreshKey}`}
                    alt={item.Title || item.Room_Number || 'Asset'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
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
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300" style={{ display: 'none' }}>
                    <div className="text-center">
                      <span className="text-gray-500 text-sm font-medium">No Image</span>
                    </div>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-4 space-y-2">
                  {columns.slice(1).map(col => {
                    const value = renderCellContent(item, col, index)
                    if (col.key === 'Available_Copies' || col.key === 'Availability') {
                      return (
                        <div key={col.key} className="flex items-center justify-between py-2 border-t border-gray-100">
                          <span className="text-xs font-medium text-gray-500 uppercase">{col.label}</span>
                          {value}
                        </div>
                      )
                    }
                    return (
                      <div key={col.key} className="flex items-start justify-between py-1">
                        <span className="text-xs font-medium text-gray-500">{col.label}:</span>
                        <span className="text-sm text-gray-800 font-medium text-right max-w-[60%] truncate" title={value}>
                          {value}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // Calendar Helpers
  const getMonthMatrix = (date) => {

    // making all these variables
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const startDay = start.getDay()
    const matrix = []
    const firstCell = new Date(start)
    firstCell.setDate(start.getDate() - startDay)
    
    // setting lengths for rows and columns
    for (let week = 0; week < 6; week++) {

      const row = []
      for (let day = 0; day < 7; day++) {

          const cell = new Date(firstCell)
          cell.setDate(firstCell.getDate() + week * 7 + day)
          row.push(cell)
      }

      matrix.push(row)
    }
    return matrix

  }

const isoDate = (d) => d.toISOString().slice(0,10)

// Merge server events and internal records for a given date

// Map numeric recurring codes to meanings (adjust to match your DB mapping)
const RECUR_MAP = {
  0: 'none',
  1: 'weekly',
  2: 'daily',
  3: 'monthly',
  4: 'yearly',
  5: 'weekdays', // Mon-Fri
  6: 'weekends'  // Sat-Sun
}

// determine if recurring event applies to the given date
const isRecurringMatch = (ev, date) => {
  if (!ev) return false
  const recRaw = ev.recurring
  const code = Number.isFinite(Number(recRaw)) ? parseInt(recRaw, 10) : null
  const kind = code !== null && code in RECUR_MAP ? RECUR_MAP[code] : String(ev.recurring || '').toLowerCase().trim()

  if (kind === 'none' || !kind) return false

  const start = ev.Event_Date ? new Date(ev.Event_Date) : null
  if (!start || isNaN(start.getTime())) return false

  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const startMid = new Date(start.getFullYear(), start.getMonth(), start.getDate())

  if (target < startMid) return false // don't occur before start

  const dow = target.getDay() // 0 Sun .. 6 Sat
  switch (kind) {
    case 'daily':
      return true
    case 'weekly':
      return startMid.getDay() === dow
    case 'monthly':
      return startMid.getDate() === target.getDate()
    case 'yearly':
      return startMid.getDate() === target.getDate() && startMid.getMonth() === target.getMonth()
    case 'weekdays':
      return dow >= 1 && dow <= 5
    case 'weekends':
      return dow === 0 || dow === 6
    default:
      // fallback: support comma-separated day names like "mon,wed,fri"
      if (typeof kind === 'string' && /[a-z]/.test(kind)) {
        const dayNameMap = { sun:0, sunday:0, mon:1, monday:1, tue:2, tues:2, tuesday:2, wed:3, wednesday:3, thu:4, thur:4, thursday:4, fri:5, friday:5, sat:6, saturday:6 }
        const tokens = kind.split(',').map(t => t.trim()).filter(Boolean)
        return tokens.some(t => dayNameMap[t] === dow)
      }
      return false
  }
}


const collectEventsForDay = (d) => {
  const dayKey = isoDate(d)
  const out = []
  const seen = new Set() // avoid duplicates when an event matches multiple rules

  // Only include server calendar rows (Calendar table). Expect Event_Date in ISO/YYYY-MM-DD format.
  if (Array.isArray(events)) {
    events.forEach((ev) => {
      const evDate = ev.Event_Date ? String(ev.Event_Date).slice(0, 10) : null
      const id = ev.Event_ID ?? ev.id ?? ev.EventId ?? null

      // If exact date matches, add once and skip recurring logic for this event
      if (evDate === dayKey) {
        if (!id || !seen.has(id)) {
          out.push({
            type: 'event',
            label: ev.Title || ev.Title?.toString?.() || 'Event',
            raw: ev,
            recurring: false
          })
          if (id) seen.add(id)
        }
        return
      }

      // Otherwise check recurring rules (only if not already added)
      if (ev.recurring && isRecurringMatch(ev, d)) {
        if (!id || !seen.has(id)) {
          out.push({
            type: 'event',
            label: ev.Title || ev.Title?.toString?.() || 'Event',
            raw: ev,
            recurring: true
          })
          if (id) seen.add(id)
        }
      }
    })
  }

  return out
}


const renderCalendar = () => {

  const matrix = getMonthMatrix(calendarDate)
  const monthLabel = calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
         <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="p-6">
       <div className="flex items-center justify-between mb-4">
         <div>
           <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
           <p className="text-sm text-gray-600 mt-1">Upcoming events</p>
         </div>
         <div className="flex items-center gap-2">
           <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="px-3 py-2 bg-white border rounded-lg">◀</button>
           <div className="px-4 py-2 bg-white border rounded-lg">{monthLabel}</div>
           <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="px-3 py-2 bg-white border rounded-lg">▶</button>
         </div>
       </div>

       <div className="grid grid-cols-7 gap-2 text-xs text-center font-semibold text-gray-500">
         {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
       </div>

       <div className="grid grid-cols-7 gap-2 mt-2">
         {matrix.flat().map((day) => {
           const inMonth = day.getMonth() === calendarDate.getMonth()
           const isToday = isoDate(day) === isoDate(new Date())
           const isSelected = isoDate(day) === isoDate(selectedDate)
           const evs = collectEventsForDay(day)
           return (
             <button
               key={day.toString()}
               onClick={() => {
                 setSelectedDate(day)
                 setCalendarOpenDayEvents(collectEventsForDay(day))
               }}
               className={`p-2 h-24 text-left rounded-lg border transition ${inMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'} ${isSelected ? 'ring-2 ring-indigo-300' : ''}`}
             >
               <div className="flex items-center justify-between">
                 <span className={`text-sm font-medium ${inMonth ? 'text-gray-900' : 'text-gray-400'}`}>{day.getDate()}</span>
                 {evs.length > 0 && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{evs.length}</span>}
               </div>
               <div className="mt-1 text-xs text-gray-600 space-y-1">
                 {evs.slice(0,2).map((e,i) => <div key={i} className={`${e.type === 'overdue' ? 'text-red-600' : 'text-gray-600'} truncate`}>{e.label}</div>)}
               </div>
             </button>
           )
         })}
       </div>

       <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
         <h3 className="text-sm font-semibold text-gray-800">Events on {selectedDate.toLocaleDateString()}</h3>
         {calendarOpenDayEvents.length === 0 ? (
           <p className="text-sm text-gray-500 mt-2">No events for this day.</p>
         ) : (
           <ul className="mt-2 space-y-2">
             {calendarOpenDayEvents.map((ev, idx) => (
               <li key={idx} className="p-3 bg-gray-50 border rounded-lg flex items-start justify-between">
                 <div>
                   <div className="text-sm font-medium text-gray-900">{ev.label}</div>
                   <div className="text-xs text-gray-500 mt-1">{ev.type.toUpperCase()}</div>
                 </div>
               </li>
             ))}
           </ul>
         )}
       </div>
     </motion.div>
   )
 }



  const renderMembers = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6"
    >
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Members</h2>
          <p className="text-sm text-gray-600 mt-1">View and manage library member accounts</p>
        </div>
        <button 
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
          onClick={openAddMemberModal}
        >
          <UserPlus className="w-5 h-5" />
          Add New Member
        </button>
      </div>

      <ErrorPopup errorMessage={error} onClose={() => setError('')} />
      <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />

      {/* Search and Filter Controls */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value)
                setMemberPage(1)
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        
        <select
          value={memberStatusFilter}
          onChange={(e) => {
            setMemberStatusFilter(e.target.value)
            setMemberPage(1)
          }}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white cursor-pointer transition-all"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Member Directory</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Member ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Borrowed Books</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fines</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      {memberSearch || memberStatusFilter !== 'all' 
                        ? 'No members found matching your criteria' 
                        : 'No members registered yet'}
                    </p>
                  </td>
                </tr>
              ) : (
                members.map((member, index) => (
                  <motion.tr
                    key={member.User_ID}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">M{String(member.User_ID).padStart(3, '0')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold mr-3">
                          {member.First_Name.charAt(0)}{member.Last_Name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{member.First_Name} {member.Last_Name}</p>
                          <p className="text-xs text-gray-500">@{member.Username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{member.User_Email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{member.Phone_Number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        member.Borrowed_Count > 0 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.Borrowed_Count} {member.Borrowed_Count === 1 ? 'book' : 'books'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        parseFloat(member.Outstanding_Fines) > 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        ${parseFloat(member.Outstanding_Fines).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        member.Account_Status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        ✓ {member.Account_Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchMemberProfile(member.User_ID)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
                          title="View Profile"
                        >
                          <Search className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => openEditMemberModal(member)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member.User_ID)}
                          className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 transition-colors"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {memberTotalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4">
          <button
            onClick={() => setMemberPage(Math.max(1, memberPage - 1))}
            disabled={memberPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              memberPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
            }`}
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600 font-medium">
            Page {memberPage} of {memberTotalPages}
          </span>
          <button
            onClick={() => setMemberPage(Math.min(memberTotalPages, memberPage + 1))}
            disabled={memberPage === memberTotalPages}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              memberPage === memberTotalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
            }`}
          >
            Next →
          </button>
        </div>
      )}
    </motion.div>
  )

  const renderMemberModals = () => (
    <>
      {/* Modern Add/Edit Member Modal */}
      {showMemberModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowMemberModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {memberModalMode === 'add' ? 'Add New Member' : 'Edit Member'}
                    </h3>
                    <p className="text-green-100 text-sm">
                      {memberModalMode === 'add' ? 'Register a new library member' : 'Update member information'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMemberModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={memberModalMode === 'add' ? handleAddMember : handleEditMember} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username *
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberForm.username}
                      onChange={(e) => setMemberForm({...memberForm, username: e.target.value})}
                      required
                      disabled={memberModalMode === 'edit'}
                      className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        memberModalMode === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="johndoe123"
                    />
                  </div>
                  {memberModalMode === 'edit' && (
                    <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                  )}
                </div>
                
                {/* First Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={memberForm.firstName}
                    onChange={(e) => setMemberForm({...memberForm, firstName: e.target.value})}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="John"
                  />
                </div>
                
                {/* Last Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={memberForm.lastName}
                    onChange={(e) => setMemberForm({...memberForm, lastName: e.target.value})}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Doe"
                  />
                </div>
                
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="email"
                      value={memberForm.email}
                      onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="john@university.edu"
                    />
                  </div>
                </div>
                
                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <input
                      type="tel"
                      value={memberForm.phone}
                      onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="date"
                      value={memberForm.dateOfBirth}
                      onChange={(e) => setMemberForm({...memberForm, dateOfBirth: e.target.value})}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {/* Initial Password Display (Only for Add Mode) */}
                {memberModalMode === 'add' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Initial Password
                    </label>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-lg font-bold text-blue-900">
                                {generatedPassword}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedPassword)
                                  setSuccessMessage('Password copied to clipboard!')
                                  setTimeout(() => setSuccessMessage(''), 2000)
                                }}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Copy password"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-blue-700 mt-1">
                              This password will be automatically sent to the member's email
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Auto-send enabled
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer Actions */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    memberModalMode === 'add' ? '✓ Add Member' : '✓ Update Member'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modern Member Detail Modal */}
      {showMemberProfileModal && memberProfile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowMemberProfileModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-green-600 font-bold text-2xl shadow-lg">
                    {memberProfile.member.First_Name.charAt(0)}{memberProfile.member.Last_Name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {memberProfile.member.First_Name} {memberProfile.member.Last_Name}
                    </h3>
                    <p className="text-green-100">Member ID: M{String(memberProfile.member.User_ID).padStart(3, '0')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMemberProfileModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Member Info Card */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-gray-600" />
                  <h4 className="text-lg font-semibold text-gray-900">Personal Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase">Username</span>
                    <span className="text-sm font-medium text-gray-900 mt-1">@{memberProfile.member.Username}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase">Email</span>
                    <span className="text-sm font-medium text-gray-900 mt-1">{memberProfile.member.User_Email}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase">Phone</span>
                    <span className="text-sm font-medium text-gray-900 mt-1">{memberProfile.member.Phone_Number || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase">Membership Type</span>
                    <span className="text-sm font-medium text-gray-900 mt-1">Student</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase">Account Status</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1 w-fit">
                      ✓ {memberProfile.member.Account_Status}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase">Registered On</span>
                    <span className="text-sm font-medium text-gray-900 mt-1">Jan 10, 2025</span>
                  </div>
                </div>
              </div>

              {/* Actions Panel */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      setShowMemberProfileModal(false)
                      changeTab('issue-return')
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    Issue New Book
                  </button>
                  <button 
                    onClick={async () => {
                      if (memberProfile.currentBorrows.length === 0) {
                        alert('No books to renew')
                        return
                      }
                      const confirm = window.confirm(`Renew all ${memberProfile.currentBorrows.length} borrowed books?`)
                      if (!confirm) return
                      
                      setLoading(true)
                      try {
                        for (const borrow of memberProfile.currentBorrows) {
                          const newDueDate = new Date()
                          newDueDate.setDate(newDueDate.getDate() + 14)
                          const formattedDate = newDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          await handleRenewBook(borrow.Borrow_ID, formattedDate)
                        }
                        await fetchMemberProfile(memberProfile.member.User_ID)
                        setSuccessMessage('All books renewed successfully!')
                        setTimeout(() => setSuccessMessage(''), 3000)
                      } catch (error) {
                        setError('Failed to renew all books')
                        setTimeout(() => setError(''), 5000)
                      } finally {
                        setLoading(false)
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Renew All
                  </button>
                  <button 
                    onClick={() => {
                      setShowMemberProfileModal(false)
                      changeTab('fines')
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all shadow-sm"
                  >
                    <DollarSign className="w-4 h-4" />
                    View Fines
                  </button>
                  <button 
                    onClick={() => {
                      const action = memberProfile.member.Account_Status === 'active' ? 'suspend' : 'activate'
                      const confirm = window.confirm(`Are you sure you want to ${action} this member?`)
                      if (!confirm) return
                      
                      alert('Member status update functionality will be implemented in the backend')
                      // TODO: Implement backend API for member status update
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all ${
                      memberProfile.member.Account_Status === 'active' 
                        ? 'bg-yellow-500 hover:bg-yellow-600' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    {memberProfile.member.Account_Status === 'active' ? 'Suspend' : 'Activate'} Member
                  </button>
                </div>
              </div>

              {/* Currently Borrowed Books */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Currently Borrowed Books</h4>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {memberProfile.currentBorrows.length} active
                  </span>
                </div>
                
                {memberProfile.currentBorrows.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No active borrows</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Book ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Issue Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Days Left</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fine</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {memberProfile.currentBorrows.map((borrow, idx) => {
                          const dueDate = new Date(borrow.Due_Date)
                          const today = new Date()
                          const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
                          const isOverdue = daysLeft < 0
                          const fineAmount = parseFloat(borrow.Fine_Amount) || 0

                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                B{String(borrow.Borrow_ID).padStart(3, '0')}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {borrow.Asset_Title}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  borrow.Asset_Type === 'Book' ? 'bg-blue-100 text-blue-800' :
                                  borrow.Asset_Type === 'CD' ? 'bg-purple-100 text-purple-800' :
                                  borrow.Asset_Type === 'Movie' ? 'bg-red-100 text-red-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {borrow.Asset_Type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {new Date(borrow.Borrow_Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3">
                                {isOverdue ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Overdue ({Math.abs(daysLeft)} days)
                                  </span>
                                ) : (
                                  <span className={`text-xs font-medium ${daysLeft <= 3 ? 'text-orange-600' : 'text-gray-600'}`}>
                                    {daysLeft} days
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm font-bold ${fineAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                  ${fineAmount.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button 
                                    onClick={async () => {
                                      const newDueDate = new Date()
                                      newDueDate.setDate(newDueDate.getDate() + 14)
                                      const formattedDate = newDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                      await handleRenewBook(borrow.Borrow_ID, formattedDate)
                                      // Refresh member profile after renewal
                                      await fetchMemberProfile(memberProfile.member.User_ID)
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition-colors"
                                  >
                                    <Clock className="w-3 h-3" />
                                    Renew
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      await handleReturnBook(borrow.Borrow_ID, fineAmount)
                                      // Refresh member profile after return
                                      await fetchMemberProfile(memberProfile.member.User_ID)
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200 transition-colors"
                                  >
                                    <BookOpen className="w-3 h-3" />
                                    Return
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Borrowing History */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h4 className="text-lg font-semibold text-gray-900">Borrowing History (Past Transactions)</h4>
                </div>
                
                {memberProfile.borrowingHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No borrowing history</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Book ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Issue Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Return Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fine Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {memberProfile.borrowingHistory.map((borrow, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              B{String(borrow.Borrow_ID).padStart(3, '0')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{borrow.Asset_Title}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(borrow.Borrow_Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {borrow.Return_Date 
                                ? new Date(borrow.Return_Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : <span className="text-orange-600 font-medium">Not returned</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {borrow.Fee_Incurred ? `$${parseFloat(borrow.Fee_Incurred).toFixed(2)}` : '$0.00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Fine Summary */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-md border border-orange-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Fine Summary</h4>
                  </div>
                  {memberProfile.finesSummary.unpaidFines > 0 && (
                    <button 
                      onClick={async () => {
                        const fineAmount = parseFloat(memberProfile.finesSummary.unpaidFines || 0)
                        const confirm = window.confirm(`Mark fine of $${fineAmount.toFixed(2)} as paid?`)
                        if (!confirm) return
                        
                        setLoading(true)
                        try {
                          // Pay all outstanding fines
                          for (const borrow of memberProfile.currentBorrows) {
                            const borrowFine = parseFloat(borrow.Fine_Amount) || 0
                            if (borrowFine > 0) {
                              await handleReturnBook(borrow.Borrow_ID, borrowFine)
                            }
                          }
                          await fetchMemberProfile(memberProfile.member.User_ID)
                          setSuccessMessage('Fine marked as paid successfully!')
                          setTimeout(() => setSuccessMessage(''), 3000)
                        } catch (error) {
                          setError('Failed to mark fine as paid')
                          setTimeout(() => setError(''), 5000)
                        } finally {
                          setLoading(false)
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm"
                    >
                      <DollarSign className="w-4 h-4" />
                      Mark as Paid
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">Total Outstanding Fine</p>
                    <p className="text-3xl font-bold text-red-600">
                      ${parseFloat(memberProfile.finesSummary.unpaidFines || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">Total Fines (All Time)</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ${parseFloat(memberProfile.finesSummary.totalFines || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 rounded-b-2xl flex justify-end gap-3">
              <button 
                onClick={() => setShowMemberProfileModal(false)}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )

  const renderBorrowRecords = () => (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">All Borrow Records</h2>
          <p className="text-gray-600">Complete history of all borrowing transactions</p>
        </div>

        <ErrorPopup errorMessage={error} onClose={() => setError('')} />
        <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Borrow ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Borrower</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Item Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Asset Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Borrow Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Return Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-3 text-gray-600">Loading records...</span>
                      </div>
                    </td>
                  </tr>
                ) : borrowRecords.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-500 font-medium">No borrow records found</p>
                    </td>
                  </tr>
                ) : (
                  borrowRecords.map((record, index) => (
                    <motion.tr 
                      key={record.Borrow_ID}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                        {record.Borrow_ID}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.First_Name} {record.Last_Name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{record.Title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.Asset_Type === 'Book' ? 'bg-blue-100 text-blue-800' :
                          record.Asset_Type === 'CD' ? 'bg-purple-100 text-purple-800' :
                          record.Asset_Type === 'Movie' ? 'bg-red-100 text-red-800' :
                          record.Asset_Type === 'Audiobook' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.Asset_Type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(record.Borrow_Date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(record.Due_Date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.Return_Date ? 
                          new Date(record.Return_Date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : 
                          <span className="text-gray-400">Not returned</span>
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.Return_Date 
                            ? 'bg-green-100 text-green-800' 
                            : new Date(record.Due_Date) < new Date() 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.Return_Date ? 'Returned' : new Date(record.Due_Date) < new Date() ? 'Overdue' : 'Active'}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  )

  // Issue & Return Management
  const renderIssueReturn = () => {
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Issue & Return Management</h2>
        
        <ErrorPopup errorMessage={error} onClose={() => setError('')} />
        <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />
        
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
                        placeholder="Click or type to search students..."
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
                                Selected: {member.name}
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
                      <option value="books">Books</option>
                      <option value="cds">CDs</option>
                      <option value="audiobooks">Audiobooks</option>
                      <option value="movies">Movies</option>
                      <option value="technology">Technology</option>
                      <option value="study-rooms">Study Rooms</option>
                    </select>

                    {/* Asset Search */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={`Click or type to search ${selectedAssetType}...`}
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
                          Selected: {issueForm.assetTitle}
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
                    {loading ? 'Processing...' : 'Confirm Issue'}
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
                        {borrowRecords
                          .filter(r => !r.Return_Date)
                          .filter(r => {
                            if (!searchTerm) return true;
                            const search = searchTerm.toLowerCase();
                            const memberName = `${r.First_Name} ${r.Last_Name}`.toLowerCase();
                            const title = (r.Title || '').toLowerCase();
                            return memberName.includes(search) || title.includes(search);
                          })
                          .length === 0 ? (
                          <tr>
                            <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                              {searchTerm ? 'No matching active borrows found' : 'No active borrows at the moment'}
                            </td>
                          </tr>
                        ) : (
                          borrowRecords
                            .filter(r => !r.Return_Date)
                            .filter(r => {
                              if (!searchTerm) return true;
                              const search = searchTerm.toLowerCase();
                              const memberName = `${r.First_Name} ${r.Last_Name}`.toLowerCase();
                              const title = (r.Title || '').toLowerCase();
                              return memberName.includes(search) || title.includes(search);
                            })
                            .map((record, index) => {
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
                                    Mark Returned
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
                    <strong>Renewal Policy:</strong> Assets can be renewed once if no other member has reserved them. 
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
              <span className="text-4xl">📦</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  const renderFineManagement = () => (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Fine & Payment Management</h2>
            <p className="text-gray-600">Track and manage member fines and outstanding balances</p>
          </div>
          <button 
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
            onClick={() => alert('Generate Fine Report - Coming soon!')}
          >
            <FileText className="w-5 h-5" />
            Generate Report
          </button>
        </div>

        <ErrorPopup errorMessage={error} onClose={() => setError('')} />
        <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Unpaid Fines"
            value={`$${fines.reduce((sum, f) => sum + parseFloat(f.balance || 0), 0).toFixed(2)}`}
            change={`${fines.length} members`}
            isIncrease={false}
            icon={DollarSign}
            gradient="bg-gradient-to-br from-orange-500 to-red-600"
            delay={0}
          />
          <StatCard
            title="Members with Fines"
            value={fines.length}
            change="Requires attention"
            isIncrease={false}
            icon={Users}
            gradient="bg-gradient-to-br from-red-500 to-pink-600"
            delay={0.1}
          />
          <StatCard
            title="Active Overdue Items"
            value={overdueItems.length}
            change="Items pending return"
            isIncrease={false}
            icon={AlertCircle}
            gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
            delay={0.2}
          />
        </div>

        {/* Fines Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Member Fines & Balances</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-orange-50 to-red-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Active Borrows</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-3 text-gray-600">Loading fines...</span>
                      </div>
                    </td>
                  </tr>
                ) : fines.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <DollarSign className="mx-auto h-12 w-12 text-green-400 mb-3" />
                      <p className="text-green-600 font-medium text-lg">No outstanding fines - All members are current!</p>
                    </td>
                  </tr>
                ) : (
                  fines.map((member, index) => {
                    const balance = parseFloat(member.balance || 0);
                    return (
                      <motion.tr
                        key={member.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                          {member.studentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {member.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {member.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {member.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="text-orange-600 font-bold text-lg">
                            ${balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.borrowedBooks > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.borrowedBooks} items
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            balance > 50 ? 'bg-red-100 text-red-800' : 
                            balance > 20 ? 'bg-orange-100 text-orange-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {balance > 50 ? 'High' : balance > 20 ? 'Moderate' : 'Low'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                            onClick={() => alert(`Record payment for ${member.name}`)}
                            title="Record Payment"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Pay
                          </button>
                          <button
                            className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium"
                            onClick={() => alert(`View fine details for ${member.name}`)}
                            title="View Details"
                          >
                            Details
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fine Calculation Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="text-blue-900 font-semibold text-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Fine Calculation Policy
          </h4>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Standard fine rate: <strong>$0.50 per day</strong> per overdue item</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Grace period: <strong>No fines</strong> for first 2 days after due date</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Maximum fine per item: <strong>$50.00</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Payment methods: Cash, Card, Online Transfer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Members with fines over $20 may have borrowing privileges suspended</span>
            </li>
          </ul>
        </div>
      </motion.div>
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
        <TopNavbar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          onLogout={handleLogout} 
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <LoadingOverlay isLoading={loading} message="Processing..." />
          <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />
          <ErrorPopup errorMessage={error} onClose={() => setError('')} />
          
          <div className="dashboard-content">
            {activeTab === 'overview' && renderDashboardOverview()}
            {activeTab === 'books' && renderAssets()}
            {activeTab === 'issue-return' && renderIssueReturn()}
            {activeTab === 'members' && renderMembers()}
            {activeTab === 'fines' && renderFineManagement()}
            {activeTab === 'calendar' && renderCalendar()}
            {activeTab === 'records' && renderBorrowRecords()}
            {activeTab === 'my-reports' && <LibrarianReport />}
          </div>
        </div>
      </div>

      {/* Member Modals */}
      {renderMemberModals()}

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
