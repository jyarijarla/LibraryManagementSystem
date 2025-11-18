import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, BookOpen, RefreshCw, Users, DollarSign, 
  FileText, LogOut, Search, Calendar, User,
  TrendingUp, TrendingDown, BookMarked, AlertCircle,
  Library, UserPlus, Clock, Menu, X, BarChart3,
  Package, CheckCircle, Plus, Edit2, Trash2,
  Barcode, Music, Shield, Hash, Tag, Info, MapPin,
  Disc, Headphones, Film, Laptop, Building2, BookOpenCheck,
  Image, Upload, Save, XCircle
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import '../Admin/Admin.css'
import './Librarian.css'
import { LoadingOverlay, SuccessPopup, ErrorPopup } from '../../components/FeedbackUI/FeedbackUI'
import LibrarianReport from '../LibrarianReport/LibrarianReport'

// Use local server for development, production for deployed app
const API_URL = location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'

// Helper function to get image path for an asset
const getAssetImagePath = (assetType, assetId, extension = 'png') => {
  return `/assets/${assetType}/${assetId}.${extension}`
}

const LOW_STOCK_THRESHOLDS = {
  books: 2,
  cds: 1,
  audiobooks: 1,
  movies: 1,
  technology: 1,
  'study-rooms': 0
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
              localStorage.removeItem('user')
              localStorage.removeItem('userId')
              localStorage.removeItem('role')
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
  const [roomStatusUpdating, setRoomStatusUpdating] = useState(null)
  
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
  const [assetAvailabilityFilter, setAssetAvailabilityFilter] = useState('all') // all, available, low, out

  // Issue/Reserve helper state
  const [selectedAssetType, setSelectedAssetType] = useState('books') // Asset type for issue/reserve
  const [assetSearch, setAssetSearch] = useState('') // Search term for any asset
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const initialIssueForm = {
    memberId: '',
    assetId: '',
    assetTitle: '',
    assetType: 'books',
    issueDate: '',
    dueDate: ''
  }
  const [issueForm, setIssueForm] = useState(initialIssueForm)
  
  // Fine Management States
  const [showFineModal, setShowFineModal] = useState(false)
  const [fineModalMode, setFineModalMode] = useState('details')
  const [fineDetailsLoading, setFineDetailsLoading] = useState(false)
  const [fines, setFines] = useState([])
  const [selectedMemberFines, setSelectedMemberFines] = useState(null)
  const [fineSearch, setFineSearch] = useState('')
  const [finePriorityFilter, setFinePriorityFilter] = useState('all')
  const [fineStats, setFineStats] = useState(null)
  const [fineFilter, setFineFilter] = useState('all')
  const [fineSeverityFilter, setFineSeverityFilter] = useState('all')
  const [selectedFine, setSelectedFine] = useState(null)
  const [paymentModal, setPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [fineLoading, setFineLoading] = useState(false)
  
  // Calendar States
 const [calendarDate, setCalendarDate] = useState(new Date())
 const [selectedDate, setSelectedDate] = useState(new Date())
 const [calendarOpenDayEvents, setCalendarOpenDayEvents] = useState([])
 const [events, setEvents] = useState([]) // events from server (Calendar table)
 
 // Event entry states
 const [showEventModal, setShowEventModal] = useState(false)
 const [flaggedForDeletion, setFlaggedForDeletion] = useState(new Set())
 const [newEventForm, setNewEventForm] = useState({
    Title: '',
    Event_Date: new Date().toISOString().slice(0, 10),
    Start_Time: '09:00', // default start time
    End_Time: '10:00', // default end time
    Details: '',
    Image_URL: '',
    recurring: 0
 })


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
  const [memberProfileLoading, setMemberProfileLoading] = useState(false)
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
  const memberProfileCache = useRef(new Map())

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

  // Fetch fines when on fines tab or when filters change
  useEffect(() => {
    if (activeTab === 'fines') {
      fetchFinesData()
      fetchFineStatsData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fineFilter, fineSeverityFilter])

  useEffect(() => {
    setAssetAvailabilityFilter('all')
  }, [activeAssetTab])

  useEffect(() => {
    if (activeTab === 'members') {
      ensureIssueAssets().catch(err => console.error('Preloading issue assets failed:', err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (!showMemberProfileModal) {
      setAssetSearch('')
      setIssueForm(initialIssueForm)
    }
  }, [showMemberProfileModal])

  // Refetch members when search, filter, or page changes
  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberSearch, memberStatusFilter, memberPage])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userId')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const closeMemberProfileModal = () => {
    setShowMemberProfileModal(false)
    setMemberProfile(null)
    setMemberProfileLoading(false)
  }

  const closeFineModal = () => {
    setShowFineModal(false)
    setSelectedMemberFines(null)
    setFineModalMode('details')
  }

  const openFineModal = async (member, mode = 'details') => {
    if (!member?.id) return
    setFineModalMode(mode)
    setFineDetailsLoading(true)
    setShowFineModal(true)
    setSelectedMemberFines(null)

    try {
      const response = await fetch(`${API_URL}/fines/${member.id}`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to fetch fine details')
      }
      const data = await response.json()
      setSelectedMemberFines(data)
    } catch (error) {
      console.error('Error fetching fine details:', error)
      setError(error.message || 'Failed to fetch fine details')
      setTimeout(() => setError(''), 4000)
      setShowFineModal(false)
    } finally {
      setFineDetailsLoading(false)
    }
  }

  const settleFineItems = async (fineItems, memberName) => {
    if (!fineItems?.length) {
      alert('No overdue items to settle for this member.')
      return false
    }

    const confirmation = window.confirm(`Settle ${fineItems.length} overdue item(s) for ${memberName}?`)
    if (!confirmation) return false

    try {
      setLoading(true)
      for (const fine of fineItems) {
        await handleReturnBook(fine.borrowId, Number.parseFloat(fine.fineAmount) || 0, { silent: true })
      }
      await Promise.all([
        fetchFines(),
        fetchOverdueItems(),
        fetchBorrowRecords(),
        fetchMembers()
      ])
      return true
    } catch (error) {
      console.error('Error settling fines:', error)
      setError(error.message || 'Failed to settle fines')
      setTimeout(() => setError(''), 4000)
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleSettleFines = async () => {
    if (!selectedMemberFines?.fines?.length) {
      alert('No overdue items to settle for this member.')
      return
    }

    const fineItems = selectedMemberFines.fines.map(fine => ({
      borrowId: fine.borrowId,
      fineAmount: Number.parseFloat(fine.fineAmount) || 0
    }))

    const settled = await settleFineItems(fineItems, selectedMemberFines.summary.name)
    if (settled) {
      setSuccessMessage('Fine settlement completed successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      if (memberProfile?.member?.User_ID === selectedMemberFines.summary.id) {
        await fetchMemberProfile(memberProfile.member.User_ID, memberProfile.member)
      }
      closeFineModal()
    }
  }

  // Fetch fines data for fines management tab
  const fetchFinesData = async () => {
    setFineLoading(true)
    try {
      let url = `${API_URL}/fines?`
      if (fineFilter !== 'all') url += `status=${fineFilter}&`
      if (fineSeverityFilter !== 'all') url += `severity=${fineSeverityFilter}&`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setFines(data)
      }
    } catch (error) {
      console.error('Error fetching fines:', error)
      setError('Failed to load fines')
    } finally {
      setFineLoading(false)
    }
  }

  const fetchFineStatsData = async () => {
    try {
      const response = await fetch(`${API_URL}/fines/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setFineStats(data)
      }
    } catch (error) {
      console.error('Error fetching fine stats:', error)
    }
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
      const response = await fetch(`${API_URL}/fines`)
      if (!response.ok) throw new Error('Failed to fetch fines')
      const data = await response.json()
      setFines(data)
    } catch (error) {
      console.error('Error fetching fines:', error)
      setFines([])
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

  const ensureIssueAssets = async () => {
    const tasks = []
    if (!books.length) tasks.push(fetchAssets('books'))
    if (!cds.length) tasks.push(fetchAssets('cds'))
    if (!audiobooks.length) tasks.push(fetchAssets('audiobooks'))
    if (!movies.length) tasks.push(fetchAssets('movies'))
    if (!technology.length) tasks.push(fetchAssets('technology'))
    if (!studyRooms.length) tasks.push(fetchAssets('study-rooms'))
    if (tasks.length) {
      await Promise.all(tasks)
    }
  }

  const handleStudyRoomStatusChange = async (roomId, nextStatus) => {
    if (!roomId || !nextStatus) return
    setRoomStatusUpdating(roomId)
    try {
      const response = await fetch(`${API_URL}/study-rooms/${roomId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update room status')
      }

      await fetchAssets('study-rooms')
      setSuccessMessage(nextStatus === 'maintenance'
        ? 'Room marked as Maintenance.'
        : 'Room marked as Available.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error updating study room status:', err)
      setError(err.message || 'Failed to update study room status')
      setTimeout(() => setError(''), 5000)
    } finally {
      setRoomStatusUpdating(null)
    }
  }

  const handleMemberIssue = async () => {
    if (!memberProfile) return
    await handleIssueBook({
      ...issueForm,
      memberId: memberProfile.member.User_ID,
      assetType: selectedAssetType
    }, { resetForm: false, refreshMemberId: memberProfile.member.User_ID })
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

  const fetchMemberProfile = async (memberId, fallbackMember = null) => {
    setShowMemberProfileModal(true)
    setMemberProfileLoading(true)

    if (memberProfileCache.current.has(memberId)) {
      setMemberProfile(memberProfileCache.current.get(memberId))
    } else if (fallbackMember) {
      setMemberProfile({
        member: fallbackMember,
        currentBorrows: [],
        borrowingHistory: [],
        finesSummary: { totalFines: 0, unpaidFines: 0 }
      })
    }

    try {
      const profilePromise = fetch(`${API_URL}/members/${memberId}`).then(async (response) => {
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}))
          throw new Error(errorPayload.message || 'Failed to fetch member profile')
        }
        return response.json()
      })

      const [data] = await Promise.all([profilePromise, ensureIssueAssets()])

      setSelectedAssetType('books')
      setAssetSearch('')
      setIssueForm({
        ...initialIssueForm,
        memberId: data.member.User_ID,
        assetType: 'books'
      })
      memberProfileCache.current.set(memberId, data)
      setMemberProfile(data)
    } catch (error) {
      console.error('Error fetching member profile:', error)
      setError(error.message || 'Failed to fetch member profile')
      setTimeout(() => setError(''), 4000)
    } finally {
      setMemberProfileLoading(false)
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
      
      setSuccessMessage('Update completed successfully!')
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
      setSuccessMessage('Deletion completed successfully!')
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

  // Helper function to get asset theme (used in both renderAssets and modals)
  const getAssetTheme = (assetType = activeAssetTab) => {
    const themes = {
      'books': { 
        Icon: BookOpen, 
        color: 'blue', 
        gradient: 'from-blue-500 to-cyan-600', 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-500' 
      },
      'cds': { 
        Icon: Disc, 
        color: 'purple', 
        gradient: 'from-purple-500 to-pink-600', 
        bg: 'bg-purple-50', 
        text: 'text-purple-700', 
        border: 'border-purple-500' 
      },
      'audiobooks': { 
        Icon: Headphones, 
        color: 'green', 
        gradient: 'from-green-500 to-emerald-600', 
        bg: 'bg-green-50', 
        text: 'text-green-700', 
        border: 'border-green-500' 
      },
      'movies': { 
        Icon: Film, 
        color: 'red', 
        gradient: 'from-red-500 to-rose-600', 
        bg: 'bg-red-50', 
        text: 'text-red-700', 
        border: 'border-red-500' 
      },
      'technology': { 
        Icon: Laptop, 
        color: 'indigo', 
        gradient: 'from-indigo-500 to-violet-600', 
        bg: 'bg-indigo-50', 
        text: 'text-indigo-700', 
        border: 'border-indigo-500' 
      },
      'study-rooms': { 
        Icon: Building2, 
        color: 'amber', 
        gradient: 'from-amber-500 to-orange-600', 
        bg: 'bg-amber-50', 
        text: 'text-amber-700', 
        border: 'border-amber-500' 
      }
    }
    return themes[assetType] || themes.books
  }

  const parseNumberValue = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const formatNumber = (value) => {
    const num = Number(value || 0)
    return Number.isFinite(num) ? num.toLocaleString() : '0'
  }

  const getAvailableCountForAsset = (asset, assetType) => {
    if (assetType === 'study-rooms') {
      const raw = asset?.Availability
      if (typeof raw === 'number') {
        return raw === 1 ? 1 : 0
      }
      const status = `${raw || ''}`.toLowerCase()
      return status === 'available' ? 1 : 0
    }
    if (asset?.Available_Copies !== undefined && asset?.Available_Copies !== null) {
      return Math.max(parseNumberValue(asset.Available_Copies), 0)
    }
    return 0
  }

  const getTotalCountForAsset = (asset, assetType) => {
    if (assetType === 'study-rooms') {
      return 1
    }
    if (asset?.Copies !== undefined && asset?.Copies !== null) {
      return Math.max(parseNumberValue(asset.Copies), 0)
    }
    return 0
  }

  const getAssetDisplayTitle = (asset, assetType) => {
    if (assetType === 'study-rooms') {
      if (asset?.Room_Number) return `Study Room ${asset.Room_Number}`
      return `Study Room ${asset?.Asset_ID || ''}`.trim()
    }
    if (asset?.Title) return asset.Title
    if (asset?.Description) return asset.Description
    if (asset?.Model_Num) return `Model ${asset.Model_Num}`
    if (asset?.ISBN) return `ISBN ${asset.ISBN}`
    return `Asset ${asset?.Asset_ID || ''}`.trim()
  }

  const getAvailabilityStatus = (asset, assetType) => {
    if (assetType === 'study-rooms') {
      const raw = asset?.Availability
      if (typeof raw === 'number') {
        if (raw === 1) return 'available'
        if (raw === 2) return 'maintenance'
        return 'reserved'
      }
      const state = `${raw || ''}`.toLowerCase()
      if (state === 'maintenance' || state === 'maintainance' || state === 'maintained') return 'maintenance'
      if (state === 'reserved') return 'reserved'
      if (state === 'available') return 'available'
      return 'reserved'
    }
    const total = getTotalCountForAsset(asset, assetType)
    const available = getAvailableCountForAsset(asset, assetType)
    if (total <= 0) {
      return available > 0 ? 'available' : 'out'
    }
    if (available <= 0) return 'out'

    const threshold = LOW_STOCK_THRESHOLDS[assetType] ?? 1
    if (available <= threshold) return 'low'
    return 'available'
  }

  const adjustMovieCopies = (delta) => {
    if (activeAssetTab !== 'movies') return
    setAssetForm(prev => {
      const current = Number.isFinite(parseInt(prev?.Copies, 10)) ? parseInt(prev.Copies, 10) : 0
      const next = Math.max(0, current + delta)
      return { ...prev, Copies: next }
    })
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
          { name: 'Copies', type: 'number', label: 'Quantity', required: true }
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
          { key: 'Copies', label: 'Total Quantity' },
          { key: 'Available_Copies', label: 'Available' }
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
  const handleIssueBook = async (formOverride = null, options = {}) => {
    const form = formOverride || issueForm
    if (!form.memberId || !form.assetId) {
      alert('Please select both student and asset')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/borrow/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: form.memberId,
          assetId: form.assetId,
          assetType: form.assetType,
          issueDate: form.issueDate || new Date().toISOString().split('T')[0],
          dueDate: form.dueDate || (() => {
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
      
      setSuccessMessage('Issuance completed successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)

      await fetchAssets(form.assetType)

      if (options.refreshMemberId) {
        const fallbackMember = memberProfile?.member?.User_ID === options.refreshMemberId 
          ? memberProfile.member 
          : null
        await fetchMemberProfile(options.refreshMemberId, fallbackMember)
      } else {
        await fetchData()
      }

      if (options.resetForm === false) {
        setIssueForm(prev => ({
          ...prev,
          assetId: '',
          assetTitle: '',
          issueDate: '',
          dueDate: ''
        }))
      } else {
        setIssueForm(initialIssueForm)
      }
      setAssetSearch('')
    } catch (error) {
      setError(error.message)
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleReturnBook = async (borrowId, fineAmount, options = {}) => {
    const { silent = false } = options
    const confirmReturn = silent
      ? true
      : (fineAmount > 0 
          ? window.confirm(`This asset has a fine of $${fineAmount.toFixed(2)}.\n\nProceed with return?`)
          : window.confirm('Confirm asset return?'))
    
    if (!confirmReturn) return false
    
    if (!silent) {
      setLoading(true)
    }
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
      
      if (!silent) {
        setSuccessMessage(`Return completed successfully! ${fineAmount > 0 ? `Fine recorded: $${fineAmount.toFixed(2)}` : ''}`)
        setTimeout(() => setSuccessMessage(''), 3000)
        await fetchData()
      }

      return true
    } catch (error) {
      if (!silent) {
        setError(error.message)
        setTimeout(() => setError(''), 5000)
      }
      throw error
    } finally {
      console.log("Returned ")
      if (!silent) {
        setLoading(false)
      }
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
      
      setSuccessMessage('Renewal completed successfully!')
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
              {(() => {
                if (loading) {
                  return <div className="text-center text-gray-500 py-4">Loading...</div>
                }
                
                if (popularBooks.length === 0) {
                  return <div className="text-center text-gray-500 py-4">No data available</div>
                }
                
                return popularBooks.map((book, index) => (
                  <div key={`popular-book-${book.Asset_ID || index}`} className="flex items-center justify-between">
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
              })()}
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
                  {(() => {
                    if (loading) {
                      return (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                        </tr>
                      )
                    }
                    
                    if (recentTransactions.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No recent transactions</td>
                        </tr>
                      )
                    }
                    
                    return recentTransactions.slice(0, 10).map((transaction, index) => (
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
                  })()}
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

    // Get theme from centralized helper function
    const theme = getAssetTheme()

    const isStudyRoomTab = activeAssetTab === 'study-rooms'

    const totalAssets = data.length
    const totalCopies = data.reduce((sum, item) => sum + getTotalCountForAsset(item, activeAssetTab), 0)
    const availableCopies = data.reduce((sum, item) => sum + getAvailableCountForAsset(item, activeAssetTab), 0)
    const borrowedCopies = Math.max(totalCopies - availableCopies, 0)

    const availabilityBuckets = data.reduce((acc, item) => {
      const status = getAvailabilityStatus(item, activeAssetTab)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    let summaryCards
    if (isStudyRoomTab) {
      summaryCards = [
        {
          id: 'total-rooms',
          label: 'Total Rooms',
          value: formatNumber(totalAssets),
          icon: theme.Icon,
          iconWrapper: `bg-gradient-to-br ${theme.gradient} text-white`,
          valueClass: 'text-slate-900'
        },
        {
          id: 'available-rooms',
          label: 'Available Rooms',
          value: formatNumber(availabilityBuckets.available || 0),
          icon: CheckCircle,
          iconWrapper: 'bg-emerald-100 text-emerald-600',
          valueClass: 'text-emerald-600'
        },
        {
          id: 'reserved-rooms',
          label: 'Reserved Rooms',
          value: formatNumber(availabilityBuckets.reserved || 0),
          icon: RefreshCw,
          iconWrapper: 'bg-orange-100 text-orange-600',
          valueClass: 'text-orange-600'
        },
        {
          id: 'maintenance-rooms',
          label: 'Maintenance',
          value: formatNumber(availabilityBuckets.maintenance || 0),
          icon: AlertCircle,
          iconWrapper: 'bg-red-100 text-red-600',
          valueClass: 'text-red-600'
        }
      ]
    } else {
      const lowStockCount = availabilityBuckets.low || 0
      const outOfStockCount = availabilityBuckets.out || 0
      summaryCards = [
        {
          id: 'total-assets',
          label: `Total ${activeAssetTab.charAt(0).toUpperCase() + activeAssetTab.slice(1)}`,
          value: formatNumber(totalAssets),
          icon: theme.Icon,
          iconWrapper: `bg-gradient-to-br ${theme.gradient} text-white`,
          valueClass: 'text-slate-900'
        },
        {
          id: 'total-copies',
          label: 'Total Copies',
          value: formatNumber(totalCopies),
          icon: Package,
          iconWrapper: 'bg-slate-100 text-slate-700',
          valueClass: 'text-slate-900'
        },
        {
          id: 'available-copies',
          label: 'Available',
          value: formatNumber(availableCopies),
          icon: CheckCircle,
          iconWrapper: 'bg-emerald-100 text-emerald-600',
          valueClass: 'text-emerald-600'
        },
        {
          id: 'borrowed-copies',
          label: 'Borrowed',
          value: formatNumber(borrowedCopies),
          icon: BookOpenCheck,
          iconWrapper: 'bg-orange-100 text-orange-600',
          valueClass: 'text-orange-600'
        },
        {
          id: 'low-stock',
          label: 'Low Stock',
          value: formatNumber(lowStockCount),
          icon: AlertCircle,
          iconWrapper: 'bg-amber-100 text-amber-600',
          valueClass: 'text-amber-600'
        },
        {
          id: 'out-stock',
          label: 'Out of Stock',
          value: formatNumber(outOfStockCount),
          icon: AlertCircle,
          iconWrapper: 'bg-red-100 text-red-600',
          valueClass: 'text-red-600'
        }
      ]
    }

    // Filter data based on search
    const filteredData = data.filter(item => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        item.Title?.toLowerCase().includes(searchLower) ||
        item.Author?.toLowerCase().includes(searchLower) ||
        item.Artist?.toLowerCase().includes(searchLower) ||
        item.ISBN?.toLowerCase().includes(searchLower) ||
        item.Model_Num?.toString().includes(searchLower) ||
        item.Room_Number?.toLowerCase().includes(searchLower)
      )
    }).filter(item => {
      if (assetAvailabilityFilter === 'all') return true
      return getAvailabilityStatus(item, activeAssetTab) === assetAvailabilityFilter
    })

    return (
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Library Assets Management</h2>
          <p className="text-gray-600">Browse, add, edit, and manage all library-owned items in one unified control center</p>
        </div>

        <ErrorPopup errorMessage={error} onClose={() => setError('')} />
        <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />

        {/* Summary Analytics Cards */}
        <div className={`grid gap-4 mb-6 ${
          isStudyRoomTab
            ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
        }`}>
          {summaryCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.valueClass}`}>{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.iconWrapper}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </motion.div>
          ))}
        </div>
        {/* Category Tabs & Actions Bar */}
        <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden border border-gray-200">
          {/* Tabs */}
          <div className="flex flex-wrap border-b border-gray-200">
            <button 
              className={`flex items-center gap-2 flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'books' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('books')}
            >
              <BookOpen className="w-5 h-5" />
              <span>Books</span>
            </button>
            <button 
              className={`flex items-center gap-2 flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'cds' 
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('cds')}
            >
              <Disc className="w-5 h-5" />
              <span>CDs</span>
            </button>
            <button 
              className={`flex items-center gap-2 flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'audiobooks' 
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('audiobooks')}
            >
              <Headphones className="w-5 h-5" />
              <span>Audiobooks</span>
            </button>
            <button 
              className={`flex items-center gap-2 flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'movies' 
                  ? 'bg-red-50 text-red-700 border-b-2 border-red-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('movies')}
            >
              <Film className="w-5 h-5" />
              <span>Movies</span>
            </button>
            <button 
              className={`flex items-center gap-2 flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'technology' 
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('technology')}
            >
              <Laptop className="w-5 h-5" />
              <span>Technology</span>
            </button>
            <button 
              className={`flex items-center gap-2 flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeAssetTab === 'study-rooms' 
                  ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`} 
              onClick={() => changeAssetTab('study-rooms')}
            >
              <Building2 className="w-5 h-5" />
              <span>Study Rooms</span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Search Bar */}
              <div className="flex-1 w-full lg:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${activeAssetTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Stats & Add Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <select
                  value={assetAvailabilityFilter}
                  onChange={(e) => setAssetAvailabilityFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All {isStudyRoomTab ? 'rooms' : 'availability'}</option>
                  {isStudyRoomTab ? (
                    <>
                      <option value="available">Available Rooms</option>
                      <option value="reserved">Reserved Rooms</option>
                      <option value="maintenance">Maintenance</option>
                    </>
                  ) : (
                    <>
                      <option value="available">Available</option>
                      <option value="low">Low Stock</option>
                      <option value="out">Out of Stock</option>
                    </>
                  )}
                </select>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Showing:</span>
                  <span className={`font-bold ${theme.text}`}>{filteredData.length} items</span>
                </div>
                <button
                  className={`px-4 py-2 bg-gradient-to-r ${theme.gradient} text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-sm flex items-center gap-2 whitespace-nowrap`}
                  onClick={openAddAssetModal}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add {activeAssetTab.charAt(0).toUpperCase() + activeAssetTab.slice(1, -1)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAssetTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredData.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-300">
                <div className={`p-6 rounded-full ${theme.bg} mb-4`}>
                  <theme.Icon className={`w-12 h-12 ${theme.text}`} />
                </div>
                <p className="text-gray-900 text-xl font-semibold mb-2">
                  {searchTerm ? `No ${activeAssetTab} match your search` : `No ${activeAssetTab} found`}
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  {searchTerm ? `Try a different search term` : `Get started by adding your first ${activeAssetTab.slice(0, -1)}`}
                </p>
                {!searchTerm && (
                  <button
                    onClick={openAddAssetModal}
                    className={`px-6 py-3 bg-gradient-to-r ${theme.gradient} text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-sm flex items-center gap-2`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add {activeAssetTab.charAt(0).toUpperCase() + activeAssetTab.slice(0, -1)}</span>
                  </button>
                )}
              </div>
            ) : (
              filteredData.map((item, index) => {
                const status = getAvailabilityStatus(item, activeAssetTab)
                const availabilityLabel = status === 'available'
                  ? '✓ Available'
                  : status === 'low'
                    ? '⚠ Low Stock'
                    : (activeAssetTab === 'study-rooms' ? '✗ Reserved' : '✗ Out of Stock')
                const availabilityBadgeClass = status === 'available'
                  ? 'text-green-600 bg-green-50'
                  : status === 'low'
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-red-600 bg-red-50'
                const showCopiesInfo = activeAssetTab !== 'study-rooms'
                const copiesTotal = getTotalCountForAsset(item, activeAssetTab)
                const availableCount = getAvailableCountForAsset(item, activeAssetTab)
                const progressPercent = copiesTotal > 0
                  ? Math.min(Math.max((availableCount / copiesTotal) * 100, 0), 100)
                  : 0
                return (
                  <motion.div
                    key={item.Asset_ID}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
                  className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-200 flex flex-col"
                >
                  {/* Card Header */}
                  <div className={`p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${theme.text} ${theme.bg} px-3 py-1 rounded-full`}>
                        #{index + 1}
                      </span>
                      <span className={`text-sm font-medium ${availabilityBadgeClass} px-2 py-1 rounded-full text-xs`}>
                        {availabilityLabel}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        onClick={() => openEditAssetModal(item)} 
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        onClick={() => openDeleteModal(item)} 
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Image/Thumbnail */}
                  <div className="relative w-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden" style={{ height: '420px' }}>
                    <img 
                      src={item.Image_URL ? `${item.Image_URL}?t=${imageRefreshKey}` : `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'png')}?t=${imageRefreshKey}`}
                      alt={item.Title || item.Room_Number || 'Asset'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                        <span className="text-5xl mb-2 block">{theme.icon}</span>
                        <span className="text-gray-500 text-sm font-medium">No Image</span>
                      </div>
                    </div>
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    {/* Title */}
                    <h3 className="text-base font-bold text-gray-900 line-clamp-2 min-h-[3rem]">
                      {item.Title || item.Description || item.Room_Number || 'Untitled'}
                    </h3>
                    
                    {/* Key Info */}
                    <div className="space-y-2 flex-1">
                      {activeAssetTab === 'books' && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700 font-medium">{item.Author}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Barcode className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">{item.ISBN}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">{item.Page_Count} pages</span>
                          </div>
                        </>
                      )}
                      
                      {activeAssetTab === 'cds' && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700 font-medium">{item.Artist}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Music className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">{item.Total_Tracks} tracks</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">{item.Total_Duration_In_Minutes} min</span>
                          </div>
                        </>
                      )}
                      
                      {activeAssetTab === 'audiobooks' && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700 font-medium">{item.Author}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Barcode className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">{item.ISBN}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">{item.length} min</span>
                          </div>
                        </>
                      )}
                      
                      {activeAssetTab === 'movies' && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">Released: {item.Release_Year}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">Rating: {item.Age_Rating}</span>
                          </div>
                        </>
                      )}
                      
                      {activeAssetTab === 'technology' && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <Hash className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">Model: {item.Model_Num}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Tag className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">Type: {item.Type}</span>
                          </div>
                        </>
                      )}
                      
                      {activeAssetTab === 'study-rooms' && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700 font-medium">Room {item.Room_Number}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">Capacity: {item.Capacity}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Copies Info */}
                    {showCopiesInfo && (
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">
                              {activeAssetTab === 'technology' ? 'Quantity:' : 'Copies:'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{Number.isNaN(copiesTotal) ? 0 : copiesTotal}</span>
                            <span className="text-gray-400">•</span>
                            <span className={`font-semibold ${
                              status === 'available' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {Number.isNaN(availableCount) ? 0 : Math.max(availableCount, 0)} available
                            </span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${theme.gradient} transition-all duration-300`}
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {activeAssetTab === 'study-rooms' && (
                      <div className="pt-3 border-t border-gray-100 mt-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          <span>Room Status</span>
                          {roomStatusUpdating === item.Asset_ID && (
                            <span className="text-indigo-500">Updating…</span>
                          )}
                        </div>
                        {status === 'reserved' ? (
                          <p className="text-sm text-gray-500 mt-2">
                            Status is controlled by active reservations.
                          </p>
                        ) : (
                          <select
                            value={status === 'maintenance' ? 'maintenance' : 'available'}
                            onChange={(e) => handleStudyRoomStatusChange(item.Asset_ID, e.target.value)}
                            disabled={roomStatusUpdating === item.Asset_ID}
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="available">Available</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
                )
              })
            )}
          </motion.div>
        </AnimatePresence>
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

// Event Handler
const handleAddEvent = async (e) => {

  e.preventDefault()

  // Validation
  if (!newEventForm.Title || !newEventForm.Event_Date || !newEventForm.Start_Time || !newEventForm.End_Time) {
    setError('Please fill in all required fields (Title, Date, Start Time, End Time)')
    setTimeout(() => setError(''), 4000)
    return
  } 


// Validate times
if (newEventForm.Start_Time >= newEventForm.End_Time) {
  setError('Start Time must be before End Time')
  setTimeout(() => setError(''), 4000)
  return
}

setLoading(true)
  try {
    const payload = {
      Title: newEventForm.Title,
      Event_Date: newEventForm.Event_Date,
      Start_Time: newEventForm.Start_Time,
      End_Time: newEventForm.End_Time,
      Details: newEventForm.Details || null,
      Image_URL: newEventForm.Image_URL || null,
      recurring: parseInt(newEventForm.recurring, 10) || 0
    }
  
    const res = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Failed to create event' }))
      throw new Error(errData.error || 'Failed to create event')
    }

    // Success: refresh events and close modal
    await fetchEvents()
    setSuccessMessage('Event added successfully!')
    setTimeout(() => setSuccessMessage(''), 3000)
    
    setShowEventModal(false)
    setNewEventForm({
      Title: '',
      Event_Date: new Date().toISOString().slice(0, 10),
      Start_Time: '09:00',
      End_Time: '10:00',
      Details: '',
      Image_URL: '',
      recurring: 0
    })
    setFlaggedForDeletion(new Set())
  } catch (err) {
    console.error('Add event error:', err)
    setError(err.message || 'Failed to add event')
    setTimeout(() => setError(''), 4000)
  } finally {
    setLoading(false)
  }
}


// Toggle flag for deletion
const toggleFlagEvent = (eventId) => {
  const newFlagged = new Set(flaggedForDeletion)
  if (newFlagged.has(eventId)) {
    newFlagged.delete(eventId)
  } else {
    newFlagged.add(eventId)
  }
  setFlaggedForDeletion(newFlagged)
}

// Delete flagged events
const deleteFlaggedEvents = async () => {
  if (flaggedForDeletion.size === 0) {
    setError('No events flagged for deletion')
    setTimeout(() => setError(''), 3000)
    return
  }

  const confirm = window.confirm(
    `Are you sure you want to delete ${flaggedForDeletion.size} event(s)? This action cannot be undone.`
  )
  if (!confirm) return

  setLoading(true)
  const flaggedIds = Array.from(flaggedForDeletion)
  
  try {
    const deletePromises = flaggedIds.map(id =>
      fetch(`${API_URL}/events/${id}`, { method: 'DELETE' })
    )
    
    const results = await Promise.all(deletePromises)
    const failed = results.filter(r => !r.ok)

    if (failed.length > 0) {
      setError(`Failed to delete ${failed.length} event(s)`)
      setTimeout(() => setError(''), 4000)
    } else {
      setSuccessMessage(`${flaggedIds.length} event(s) deleted successfully!`)
      setTimeout(() => setSuccessMessage(''), 3000)
    }

    setFlaggedForDeletion(new Set())
    await fetchEvents()
  } catch (err) {
    console.error('Error deleting events:', err)
    setError('Failed to delete events')
    setTimeout(() => setError(''), 4000)
  } finally {
    setLoading(false)
  }
}

const renderCalendar = () => {
  const matrix = getMonthMatrix(calendarDate)
  const monthLabel = calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Events Calendar</h2>
          <p className="text-sm text-gray-600 mt-1">View, add, and manage library events</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Previous Month Button */}
          <button 
            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} 
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Previous month"
          >
            ◀
          </button>
          
          {/* Month/Year Display */}
          <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-900 min-w-[180px] text-center">
            {monthLabel}
          </div>
          
          {/* Next Month Button */}
          <button 
            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} 
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Next month"
          >
            ▶
          </button>

          {/* Add Event Button */}
          <button 
            onClick={() => setShowEventModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 shadow-md"
            title="Add new event"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>

          {/* Delete Flagged Button */}
          <button
            onClick={deleteFlaggedEvents}
            disabled={flaggedForDeletion.size === 0}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
              flaggedForDeletion.size === 0 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-red-600 text-white hover:bg-red-700 shadow-md'
            }`}
            title={flaggedForDeletion.size === 0 ? 'No events flagged' : `Delete ${flaggedForDeletion.size} event(s)`}
          >
            <Trash2 className="w-4 h-4" />
            Delete ({flaggedForDeletion.size})
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-xs text-center font-semibold text-gray-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-4">
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
              className={`p-2 h-28 text-left rounded-lg border-2 transition-all ${
                inMonth ? 'bg-white hover:border-indigo-400' : 'bg-gray-50 text-gray-400'
              } ${isSelected ? 'ring-2 ring-indigo-300 border-indigo-500' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-bold ${inMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                  {day.getDate()}
                </span>
                {evs.length > 0 && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                    {evs.length}
                  </span>
                )}
              </div>
              <div className="text-xs space-y-1">
                {evs.slice(0, 2).map((e, i) => (
                  <div 
                    key={i} 
                    className={`truncate font-medium ${
                      e.type === 'overdue' ? 'text-red-600' : 'text-indigo-600'
                    }`}
                    title={e.label}
                  >
                    {e.label}
                  </div>
                ))}
                {evs.length > 2 && (
                  <div className="text-xs text-gray-500 italic">
                    +{evs.length - 2} more
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Event Detail Panel */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          Events on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </h3>
        {calendarOpenDayEvents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No events for this day</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {calendarOpenDayEvents.map((ev, idx) => (
              <li 
                key={idx} 
                className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start justify-between hover:bg-indigo-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900">{ev.label}</div>
                  {ev.raw?.Details && (
                    <div className="text-xs text-gray-600 mt-1">{ev.raw.Details}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {ev.raw?.Start_Time && `${ev.raw.Start_Time.slice(0, 5)}`}
                    {ev.raw?.Start_Time && ev.raw?.End_Time && ' - '}
                    {ev.raw?.End_Time && `${ev.raw.End_Time.slice(0, 5)}`}
                  </div>
                </div>
                {ev.raw?.Event_ID && (
                   <label className="ml-2 flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={flaggedForDeletion.has(ev.raw.Event_ID)}
                      onChange={() => toggleFlagEvent(ev.raw.Event_ID)}
                      className="w-5 h-5 md:w-6 md:h-6 rounded border-gray-300 text-red-600 focus:ring-2 focus:ring-red-500 transform transition-transform duration-150"
                      aria-label={flaggedForDeletion.has(ev.raw.Event_ID) ? 'Unflag for deletion' : 'Flag for deletion'}
                    />
                    <span className={`text-xs font-medium ${flaggedForDeletion.has(ev.raw.Event_ID) ? 'text-red-700' : 'text-gray-700'}`}>
                      {flaggedForDeletion.has(ev.raw.Event_ID)}
                    </span>
                  </label>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Event Modal */}
      {showEventModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowEventModal(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-white" />
                <h3 className="text-xl font-bold text-white">Add Event</h3>
              </div>
              <button 
                onClick={() => setShowEventModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleAddEvent} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Title *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g., Book Reading Session"
                  value={newEventForm.Title}
                  onChange={(e) => setNewEventForm({...newEventForm, Title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Date *
                </label>
                <input 
                  type="date"
                  required
                  value={newEventForm.Event_Date}
                  onChange={(e) => setNewEventForm({...newEventForm, Event_Date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input 
                    type="time"
                    required
                    value={newEventForm.Start_Time}
                    onChange={(e) => setNewEventForm({...newEventForm, Start_Time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time *
                  </label>
                  <input 
                    type="time"
                    required
                    value={newEventForm.End_Time}
                    onChange={(e) => setNewEventForm({...newEventForm, End_Time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Recurrence
                </label>
                <select
                  value={newEventForm.recurring}
                  onChange={(e) => setNewEventForm({...newEventForm, recurring: parseInt(e.target.value, 10)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={0}>No Recurrence</option>
                  <option value={1}>Weekly (Same day each week)</option>
                  <option value={2}>Daily</option>
                  <option value={3}>Monthly (Same date each month)</option>
                  <option value={4}>Yearly</option>
                  <option value={5}>Weekdays (Mon-Fri)</option>
                  <option value={6}>Weekends (Sat-Sun)</option>
                </select>
              </div>

              {/* Details */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Details (Optional)
                </label>
                <textarea
                  placeholder="e.g., Location, description, or notes..."
                  value={newEventForm.Details}
                  onChange={(e) => setNewEventForm({...newEventForm, Details: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Image URL (Optional)
                </label>
                <input 
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={newEventForm.Image_URL}
                  onChange={(e) => setNewEventForm({...newEventForm, Image_URL: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button 
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Event</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
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
                          onClick={() => fetchMemberProfile(member.User_ID, member)}
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
      {showMemberProfileModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={closeMemberProfileModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {!memberProfile ? (
              <div className="p-16 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-gray-600 font-medium">Loading member details...</p>
              </div>
            ) : (
              <>
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
                  onClick={closeMemberProfileModal}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {memberProfileLoading && (
              <div className="bg-amber-50 text-amber-700 px-8 py-3 flex items-center gap-2 text-sm font-medium">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Refreshing latest account data...
              </div>
            )}

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
                        await fetchMemberProfile(memberProfile.member.User_ID, memberProfile.member)
                        setSuccessMessage('Renewal completed successfully!')
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
                      closeMemberProfileModal()
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

              {/* Issue or Reserve Assets */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">
                      Issue {selectedAssetType === 'study-rooms' ? 'or Reserve Room' : 'Asset'}
                    </h4>
                  </div>
                  <span className="text-sm text-gray-500">
                    Member ID: M{String(memberProfile.member.User_ID).padStart(3, '0')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={selectedAssetType}
                      onChange={(e) => {
                        setSelectedAssetType(e.target.value)
                        setIssueForm(prev => ({
                          ...prev,
                          assetType: e.target.value,
                          assetId: '',
                          assetTitle: ''
                        }))
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={issueForm.issueDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, issueDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedAssetType === 'study-rooms' ? 'Reservation Ends' : 'Due Date'}
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={issueForm.dueDate || (() => {
                        const date = new Date()
                        date.setDate(date.getDate() + (selectedAssetType === 'study-rooms' ? 1 : 14))
                        return date.toISOString().split('T')[0]
                      })()}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search {selectedAssetType === 'study-rooms' ? 'Rooms' : 'Assets'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Type to search ${selectedAssetType}...`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={assetSearch}
                      onChange={(e) => {
                        setAssetSearch(e.target.value)
                        setShowAssetDropdown(true)
                      }}
                      onFocus={() => setShowAssetDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAssetDropdown(false), 200)}
                    />
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
                          .map(item => (
                            <div
                              key={item.Asset_ID}
                              className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onMouseDown={() => {
                                setIssueForm(prev => ({
                                  ...prev,
                                  assetId: item.Asset_ID,
                                  assetTitle: item.Title || item.Room_Number || `Tech-${item.Model_Num}`,
                                  assetType: selectedAssetType
                                }))
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
                                Available:{' '}
                                <span className="text-green-600 font-semibold">
                                  {item.Available_Copies ?? (item.Availability === 'Available' ? '1' : '0')}
                                </span>
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
                    <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                      <div className="font-semibold text-gray-800">
                        Selected: {issueForm.assetTitle}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedAssetType === 'study-rooms'
                          ? 'The reservation will mark this room as reserved until the selected end date.'
                          : 'Asset will be issued immediately to this member.'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIssueForm(prev => ({ ...prev, assetId: '', assetTitle: '', issueDate: '', dueDate: '' }))
                      setAssetSearch('')
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleMemberIssue}
                    disabled={!issueForm.assetId || roomStatusUpdating !== null || loading}
                    className={`px-6 py-2 text-sm font-semibold text-white rounded-lg transition-all ${
                      selectedAssetType === 'study-rooms'
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-green-500 hover:bg-green-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {selectedAssetType === 'study-rooms' ? 'Reserve Room' : 'Issue Asset'}
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
                                      await fetchMemberProfile(memberProfile.member.User_ID, memberProfile.member)
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
                                      await fetchMemberProfile(memberProfile.member.User_ID, memberProfile.member)
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
                        const fineItems = memberProfile.currentBorrows
                          .filter(borrow => Number.parseFloat(borrow.Fine_Amount) > 0)
                          .map(borrow => ({
                            borrowId: borrow.Borrow_ID,
                            fineAmount: Number.parseFloat(borrow.Fine_Amount) || 0
                          }))
                        const settled = await settleFineItems(
                          fineItems,
                          `${memberProfile.member.First_Name} ${memberProfile.member.Last_Name}`.trim()
                        )
                        if (settled) {
                          await fetchMemberProfile(memberProfile.member.User_ID, memberProfile.member)
                          setSuccessMessage('Fine settlement completed successfully!')
                          setTimeout(() => setSuccessMessage(''), 3000)
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
                onClick={closeMemberProfileModal}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Close
              </button>
            </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {showFineModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4"
          onClick={closeFineModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <div>
                <p className="text-sm uppercase tracking-wide opacity-80">Outstanding Balance</p>
                <h3 className="text-2xl font-bold">
                  {selectedMemberFines
                    ? `$${Number.parseFloat(selectedMemberFines.summary.balance || 0).toFixed(2)}`
                    : '$0.00'}
                </h3>
                {selectedMemberFines && (
                  <p className="text-sm opacity-80">
                    {selectedMemberFines.summary.name} • {selectedMemberFines.summary.studentId}
                  </p>
                )}
              </div>
              <button
                onClick={closeFineModal}
                className="text-white/70 hover:text-white rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {fineDetailsLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                <p className="text-gray-600 font-medium">Loading fine details...</p>
              </div>
            ) : selectedMemberFines ? (
              <>
                <div className="p-8 border-b border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{selectedMemberFines.summary.email}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{selectedMemberFines.summary.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Overdue Items</p>
                      <p className="text-sm font-medium text-gray-900">{selectedMemberFines.summary.overdueItems}</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto">
                  {selectedMemberFines.fines.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                      <DollarSign className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      All overdue items are settled.
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs uppercase text-gray-500 tracking-wide border-b">
                          <th className="py-3 text-left">Asset</th>
                          <th className="py-3 text-left">Type</th>
                          <th className="py-3 text-left">Due Date</th>
                          <th className="py-3 text-left">Days Overdue</th>
                          <th className="py-3 text-left">Fine</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedMemberFines.fines.map((fine) => (
                          <tr key={fine.borrowId} className="text-sm">
                            <td className="py-3">
                              <p className="font-semibold text-gray-900">{fine.title}</p>
                              <p className="text-gray-500 text-xs">Borrow #{String(fine.borrowId).padStart(4, '0')}</p>
                            </td>
                            <td className="py-3 text-gray-600">{fine.assetType}</td>
                            <td className="py-3 text-gray-600">
                              {new Date(fine.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-3">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                {fine.daysOverdue} days
                              </span>
                            </td>
                            <td className="py-3 font-bold text-red-600">
                              ${Number.parseFloat(fine.fineAmount || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : null}

            <div className="bg-gray-50 px-8 py-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {fineModalMode === 'pay'
                  ? 'Confirm settlement once the items have been returned and payment collected.'
                  : 'Review outstanding items for this member.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeFineModal}
                  className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Close
                </button>
                {selectedMemberFines?.fines?.length > 0 && fineModalMode === 'pay' && (
                  <button
                    onClick={handleSettleFines}
                    className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Settle Outstanding Fines
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )

  // ===== FINE MANAGEMENT SECTION =====
  const renderFineManagement = () => {
    const handlePayFine = async () => {
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
        setError('Please enter a valid payment amount')
        return
      }

      try {
        const response = await fetch(`${API_URL}/fines/${selectedFine.Borrow_ID}/pay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            amount: parseFloat(paymentAmount),
            paymentMethod: paymentMethod,
            processedBy: user.userId
          })
        })

        if (response.ok) {
          setSuccessMessage('Payment processed successfully')
          setPaymentModal(false)
          setPaymentAmount('')
          setSelectedFine(null)
          fetchFinesData()
          fetchFineStatsData()
        } else {
          const errorData = await response.json()
          setError(errorData.message || 'Failed to process payment')
        }
      } catch (error) {
        console.error('Error processing payment:', error)
        setError('Failed to process payment')
      }
    }

    const handleWaiveFine = async (borrowId) => {
      if (!window.confirm('Are you sure you want to waive this fine?')) return

      try {
        const response = await fetch(`${API_URL}/fines/${borrowId}/waive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            reason: 'Waived by librarian',
            processedBy: user.userId
          })
        })

        if (response.ok) {
          setSuccessMessage('Fine waived successfully')
          fetchFinesData()
          fetchFineStatsData()
        } else {
          setError('Failed to waive fine')
        }
      } catch (error) {
        console.error('Error waiving fine:', error)
        setError('Failed to waive fine')
      }
    }

    const filteredFines = fines.filter(fine => {
      const searchLower = fineSearch.toLowerCase()
      return (
        fine.Borrower_Name?.toLowerCase().includes(searchLower) ||
        fine.Item_Title?.toLowerCase().includes(searchLower) ||
        fine.User_Email?.toLowerCase().includes(searchLower)
      )
    })

    const getSeverityColor = (severity) => {
      switch (severity) {
        case 'Critical': return 'bg-red-100 text-red-800 border-red-300'
        case 'Urgent': return 'bg-orange-100 text-orange-800 border-orange-300'
        case 'Warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
        case 'Low': return 'bg-blue-100 text-blue-800 border-blue-300'
        default: return 'bg-gray-100 text-gray-800 border-gray-300'
      }
    }

    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              Fines & Payments
            </h2>
            <p className="text-gray-600">Manage overdue fines and process payments</p>
          </div>

          {/* Statistics Cards */}
          {fineStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-100">Unpaid Fines</p>
                    <h3 className="text-3xl font-bold mt-2">${fineStats.totalUnpaidFines}</h3>
                    <p className="text-xs text-red-100 mt-1">{fineStats.totalOverdueItems} overdue items</p>
                  </div>
                  <AlertCircle className="w-12 h-12 text-red-200 opacity-80" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-100">Collected Fines</p>
                    <h3 className="text-3xl font-bold mt-2">${fineStats.totalCollectedFines}</h3>
                    <p className="text-xs text-green-100 mt-1">All time total</p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-green-200 opacity-80" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-100">Critical Cases</p>
                    <h3 className="text-3xl font-bold mt-2">{fineStats.criticalOverdues}</h3>
                    <p className="text-xs text-orange-100 mt-1">30+ days overdue</p>
                  </div>
                  <AlertCircle className="w-12 h-12 text-orange-200 opacity-80" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-100">Avg Days Overdue</p>
                    <h3 className="text-3xl font-bold mt-2">{fineStats.avgDaysOverdue}</h3>
                    <p className="text-xs text-blue-100 mt-1">${fineStats.fineRatePerDay}/day rate</p>
                  </div>
                  <Clock className="w-12 h-12 text-blue-200 opacity-80" />
                </div>
              </motion.div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status Filter</label>
                <select
                  value={fineFilter}
                  onChange={(e) => setFineFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Fines</option>
                  <option value="unpaid">Unpaid Only</option>
                  <option value="paid">Paid Only</option>
                  <option value="overdue">Currently Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Severity Filter</label>
                <select
                  value={fineSeverityFilter}
                  onChange={(e) => setFineSeverityFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical (30+ days)</option>
                  <option value="urgent">Urgent (14-30 days)</option>
                  <option value="warning">Warning (7-14 days)</option>
                  <option value="low">Low (1-7 days)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by name, email, or title..."
                  value={fineSearch}
                  onChange={(e) => setFineSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Fines Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-800 to-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Borrower</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Item</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Days Overdue</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Fine Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Severity</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {fineLoading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                          <span>Loading fines...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredFines.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <CheckCircle className="w-16 h-16 text-green-500 opacity-50" />
                          <p className="text-lg font-semibold">No fines found</p>
                          <p className="text-sm">All borrowers are up to date with their returns!</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredFines.map((fine, index) => (
                      <motion.tr
                        key={fine.Borrow_ID}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{fine.Borrower_Name}</div>
                            <div className="text-xs text-gray-500">{fine.User_Email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{fine.Item_Title}</div>
                            <div className="text-xs text-gray-500">{fine.Asset_Type}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(fine.Due_Date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-red-600">
                            {fine.Days_Overdue} days
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-green-600">
                            ${parseFloat(fine.Fine_Amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(fine.Severity)}`}>
                            {fine.Severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            fine.Fine_Status === 'Paid' ? 'bg-green-100 text-green-800' :
                            fine.Fine_Status === 'Unpaid' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {fine.Fine_Status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            {fine.Fine_Status === 'Unpaid' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedFine(fine)
                                    setPaymentAmount(fine.Fine_Amount)
                                    setPaymentModal(true)
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                  Pay
                                </button>
                                <button
                                  onClick={() => handleWaiveFine(fine.Borrow_ID)}
                                  className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                                >
                                  Waive
                                </button>
                              </>
                            )}
                            {fine.Fine_Status === 'Paid' && (
                              <span className="text-green-600 font-semibold">✓ Settled</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Payment Modal */}
        {paymentModal && selectedFine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  Process Payment
                </h3>
                <button
                  onClick={() => {
                    setPaymentModal(false)
                    setSelectedFine(null)
                    setPaymentAmount('')
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Borrower</p>
                  <p className="font-semibold text-gray-900">{selectedFine.Borrower_Name}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Item</p>
                  <p className="font-semibold text-gray-900">{selectedFine.Item_Title}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Days Overdue</p>
                  <p className="font-semibold text-red-600">{selectedFine.Days_Overdue} days</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">Total fine: ${parseFloat(selectedFine.Fine_Amount).toFixed(2)}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Online">Online Payment</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPaymentModal(false)
                    setSelectedFine(null)
                    setPaymentAmount('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayFine}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Process Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    )
  }

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
            {activeTab === 'members' && renderMembers()}
            {activeTab === 'fines' && renderFineManagement()}
            {activeTab === 'records' && renderBorrowRecords()}
            {activeTab === 'my-reports' && <LibrarianReport />}
            {activeTab === 'calendar' && renderCalendar()}
          </div>
        </div>
      </div>

      {/* Member Modals */}
      {renderMemberModals()}

      {/* Asset Modal (same as Admin) */}
      {showAssetModal && (
        <AnimatePresence>
          {(() => {
            // Get theme for the current asset type
            const theme = getAssetTheme()
            
            return (
              <motion.div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAssetModal(false)}
              >
                <motion.div 
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  transition={{ type: "spring", duration: 0.3 }}
                  onClick={(e) => e.stopPropagation()}
                >
              {/* Modal Header */}
              <div className={`px-6 py-5 border-b border-gray-200 bg-gradient-to-r ${theme.gradient}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <theme.Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      {isEditMode ? 'Edit' : 'Add New'} {activeAssetTab.slice(0, -1).charAt(0).toUpperCase() + activeAssetTab.slice(1, -1)}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowAssetModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <form onSubmit={handleAddAsset} className="space-y-6">
                  {/* Image Upload Section */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Image className="w-4 h-4" />
                      <span>Asset Image</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="file" 
                        id="image-upload" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="hidden" 
                      />
                      {(imagePreview || assetForm.Image_URL) ? (
                        <div className="relative group">
                          <div className="relative w-full h-80 rounded-xl overflow-hidden border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
                            <img 
                              src={imagePreview || assetForm.Image_URL} 
                              alt="Preview" 
                              className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-300"
                              onClick={() => document.getElementById('image-upload').click()}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200"></div>
                          </div>
                          <button 
                            type="button"
                            onClick={removeImage}
                            className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => document.getElementById('image-upload').click()}
                            className="absolute bottom-3 right-3 px-4 py-2 bg-white/90 hover:bg-white backdrop-blur-sm text-gray-700 rounded-lg shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 text-sm font-medium"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Change Image</span>
                          </button>
                        </div>
                      ) : (
                        <label 
                          htmlFor="image-upload"
                          className={`flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-xl cursor-pointer bg-gradient-to-br ${theme.bg} hover:bg-opacity-80 transition-all duration-200 group`}
                        >
                          <div className={`p-4 rounded-full bg-white shadow-md group-hover:scale-110 transition-transform duration-200`}>
                            <Upload className={`w-8 h-8 ${theme.text}`} />
                          </div>
                          <p className={`mt-4 text-sm font-semibold ${theme.text}`}>Click to upload image</p>
                          <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 10MB</p>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getAssetFormFields().filter(field => !(activeAssetTab === 'movies' && field.name === 'Copies' && isEditMode)).map(field => (
                      <div 
                        key={field.name}
                        className={field.name === 'Description' ? 'md:col-span-2' : ''}
                      >
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <input 
                          type={field.type} 
                          value={assetForm[field.name] || ''} 
                          onChange={(e) => setAssetForm({ ...assetForm, [field.name]: e.target.value })} 
                          required={field.required}
                          className={`w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg 
                            focus:border-transparent focus:outline-none transition-all duration-200
                            hover:border-gray-300`}
                          style={{
                            boxShadow: 'none'
                          }}
                          onFocus={(e) => {
                            const colors = {
                              'blue': 'rgb(59, 130, 246)',
                              'purple': 'rgb(168, 85, 247)',
                              'green': 'rgb(34, 197, 94)',
                              'red': 'rgb(239, 68, 68)',
                              'indigo': 'rgb(99, 102, 241)',
                              'amber': 'rgb(245, 158, 11)'
                            }
                            const color = colors[theme.color] || colors.blue
                            e.target.style.boxShadow = `0 0 0 3px ${color}40`
                            e.target.style.borderColor = color
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e5e7eb'
                            e.target.style.boxShadow = 'none'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button 
                  type="submit"
                  onClick={handleAddAsset}
                  disabled={loading}
                  className={`px-6 py-2.5 bg-gradient-to-r ${theme.gradient} text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isEditMode ? 'Updating...' : 'Adding...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isEditMode ? 'Update Asset' : 'Add Asset'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
            )
          })()}
        </AnimatePresence>
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
