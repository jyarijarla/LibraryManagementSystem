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
  Image, Upload, Save, XCircle, ChevronDown, Bell, Settings, Lock, Activity, Layers, Eye, Ban, MoreVertical, Key, Power
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { LoadingOverlay, SuccessPopup, ErrorPopup } from '../../components/FeedbackUI/FeedbackUI'
import UserDropdown from '../../components/UserDropdown';
import UserProfileDrawer from './UserProfileDrawer';
import AdminReport from './AdminReport';
import DateFilter from './Reports/components/DateFilter';
import './Admin.css'

// Use local server for development, production for deployed app
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'

// Helper function to get image path for an asset
// Helper function to get image path for an asset
const getAssetImagePath = (assetType, assetId, extension = 'jpg') => {
  return `/assets/${assetType}/${assetId}.${extension}`
}

// Helper to match a borrow record to a user robustly
const userMatchesBorrow = (borrow, user) => {
  if (!borrow || !user) return false;
  const pick = (obj, keys) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  };
  const borrowId = pick(borrow, ['Borrower_ID', 'BorrowerId', 'Borrower_Id', 'User_ID', 'UserId', 'BorrowerID']);
  const userId = pick(user, ['id', 'User_ID', 'userId', 'UserId']);

  if (borrowId != null && userId != null) {
    try {
      if (String(borrowId) === String(userId)) return true;
    } catch (e) { }
  }
  const userFullName = `${user.firstname || user.First_Name || ''} ${user.lastname || user.Last_Name || ''}`.trim();
  const borrowFullName = pick(borrow, ['Borrower_Name']) || ((borrow.First_Name || borrow.FirstName || borrow.first_name) ? `${borrow.First_Name || borrow.FirstName || borrow.first_name} ${borrow.Last_Name || borrow.LastName || borrow.last_name || ''}`.trim() : undefined);

  if (userFullName && borrowFullName) {
    return userFullName === borrowFullName;
  }
  return false;
}

// Modern Stat Card Component
const StatCard = ({ title, value, change, isIncrease, icon: Icon, gradient, delay = 0, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 cursor-pointer"
      onClick={onClick}
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

// NavItem Component
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

// AdminSidebar Component
const AdminSidebar = ({ activePage, setActivePage, sidebarOpen, setSidebarOpen }) => {
  const navItems = [
    { label: 'Dashboard', icon: Home, id: 'overview' },
    { label: 'User Management', icon: Users, id: 'users' },

    { label: 'Asset Management', icon: BookOpen, id: 'assets' },
    { label: 'Reports & Analytics', icon: BarChart3, id: 'reports' },
    { label: 'Audit Logs', icon: FileText, id: 'logs' }
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
          fixed top-0 left-0 h-full w-64 bg-slate-900 z-50 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        {/* Logo/Brand */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
          <Library className="w-8 h-8 text-indigo-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Admin</h1>
            <p className="text-xs text-gray-400">System Control</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4 space-y-2 overflow-y-auto h-[calc(100vh-8rem)]">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id)
                  if (window.innerWidth < 768) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activePage === item.id ? 'bg-slate-800 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icon className={`w-5 h-5 ${activePage === item.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Logout button at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              localStorage.removeItem('userId')
              localStorage.removeItem('role')
              window.location.href = '/login'
            }}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-slate-800 hover:text-white rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// AdminTopNavbar Component
const AdminTopNavbar = ({ sidebarOpen, setSidebarOpen, notifications = [] }) => {
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.length

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm z-30">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center flex-1 gap-4">
          <button
            className="md:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h2 className="text-xl font-semibold text-gray-800 hidden md:block">System Administration</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative transition-colors"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-900">Administrator</p>
              <p className="text-xs text-gray-500">Super User</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

function Admin() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [activeAssetTab, setActiveAssetTab] = useState(searchParams.get('assetTab') || 'books')

  // Data States
  const [books, setBooks] = useState([])
  const [cds, setCds] = useState([])
  const [audiobooks, setAudiobooks] = useState([])
  const [movies, setMovies] = useState([])
  const [technology, setTechnology] = useState([])
  const [studyRooms, setStudyRooms] = useState([])
  const [students, setStudents] = useState([])
  const [borrowRecords, setBorrowRecords] = useState([])

  // Loading & Error States
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Modal States
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  const [isEditMode, setIsEditMode] = useState(false)
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now())

  // User Management Modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false)
  const [showViewUserModal, setShowViewUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [activeUserModalTab, setActiveUserModalTab] = useState('Personal Info')
  const [userFines, setUserFines] = useState([])

  // Forms
  const [assetForm, setAssetForm] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [userForm, setUserForm] = useState({
    studentId: "", firstname: "", lastname: "", email: "", role: "Student", password: "", dateOfBirth: "", phone: ""
  })

  // Reports State
  const [mostBorrowedReport, setMostBorrowedReport] = useState([])
  const [activeBorrowersReport, setActiveBorrowersReport] = useState([])
  const [overdueItemsReport, setOverdueItemsReport] = useState([])
  const [inventorySummaryReport, setInventorySummaryReport] = useState([])
  const [customReportType, setCustomReportType] = useState('table')
  const [customReportData, setCustomReportData] = useState([])
  const [customReportFilters, setCustomReportFilters] = useState({ startDate: '', endDate: '', assetType: '', userId: '' })
  const [customReportLoading, setCustomReportLoading] = useState(false)
  const [customReportError, setCustomReportError] = useState('')

  // Helpers
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const currentUserId = currentUser.id || currentUser.User_ID || null

  const [librarians, setLibrarians] = useState([])
  const [roles, setRoles] = useState([])
  const [logs, setLogs] = useState([])
  const [configs, setConfigs] = useState([])

  const [borrowingTrends, setBorrowingTrends] = useState([])
  const [users, setUsers] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState([])

  // Log Filters
  const [logSearch, setLogSearch] = useState('')
  const [logActionFilter, setLogActionFilter] = useState('All')
  const [logStartDate, setLogStartDate] = useState('')
  const [logEndDate, setLogEndDate] = useState('')

  // Fetch Data
  // Sidebar collapsed state for left navigation
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      // Always fetch basic stats for sidebar/overview
      await Promise.allSettled([
        fetchAssets('books'),
        fetchAssets('cds'),
        fetchAssets('audiobooks'),
        fetchAssets('movies'),
        fetchAssets('technology'),
        fetchAssets('study-rooms'),
        fetchStudents(),
        fetchLibrarians(),
        fetchBorrowRecords(),
        fetchLogs(),
        fetchBorrowingTrends(),
        fetchUsers()
      ])

      if (activeTab === 'reports') {
        await fetchReports()
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load some data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab])

  // Asset Fetcher
  const fetchAssets = async (assetType) => {
    try {
      const response = await fetch(`${API_URL}/assets/${assetType}`)
      if (response.ok) {
        const data = await response.json()
        const sortedData = data.sort((a, b) => a.Asset_ID - b.Asset_ID)
        switch (assetType) {
          case 'books': setBooks(sortedData); break;
          case 'cds': setCds(sortedData); break;
          case 'audiobooks': setAudiobooks(sortedData); break;
          case 'movies': setMovies(sortedData); break;
          case 'technology': setTechnology(sortedData); break;
          case 'study-rooms': setStudyRooms(sortedData); break;
          default: break;
        }
      }
    } catch (error) {
      console.error(`Error fetching ${assetType}:`, error)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/students`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setStudents(data.sort((a, b) => (a.id || 0) - (b.id || 0)))
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchBorrowRecords = async () => {
    try {
      const response = await fetch(`${API_URL}/borrow-records`)
      if (response.ok) {
        const data = await response.json()
        setBorrowRecords(data.sort((a, b) => a.Borrow_ID - b.Borrow_ID))
      }
    } catch (error) {
      console.error('Error fetching records:', error)
    }
  }

  const fetchLibrarians = async () => {
    try {
      // Role 3 is Librarian
      const response = await fetch(`${API_URL}/members?role=3`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setLibrarians(data.members || data)
      }
    } catch (error) {
      console.error('Error fetching librarians:', error)
    }
  }

  const fetchBorrowingTrends = async () => {
    try {
      const response = await fetch(`${API_URL}/reports/borrowing-trends`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setBorrowingTrends(data)
      }
    } catch (error) {
      console.error('Error fetching borrowing trends:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/members?status=${statusFilter}&role=all&limit=1000`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.members || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const updateUserStatus = async (userId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/members/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchUsers() // Refresh list
        // Show success notification (optional)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [statusFilter])

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/audit-logs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (res.ok) setLogs(await res.json())
    } catch (e) { console.error(e) }
  }

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/roles`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (res.ok) setRoles(await res.json())
    } catch (e) { console.error(e) }
  }

  const fetchConfigs = async () => {
    try {
      const res = await fetch(`${API_URL}/config`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (res.ok) setConfigs(await res.json())
    } catch (e) { console.error(e) }
  }



  const fetchReports = async () => {
    try {
      const [mostBorrowed, activeBorrowers, overdueItems, inventorySummary] = await Promise.all([
        fetch(`${API_URL}/reports/most-borrowed`).then(r => r.ok ? r.json() : []),
        fetch(`${API_URL}/reports/active-borrowers`).then(r => r.ok ? r.json() : []),
        fetch(`${API_URL}/reports/overdue-items`).then(r => r.ok ? r.json() : []),
        fetch(`${API_URL}/reports/inventory-summary`).then(r => r.ok ? r.json() : [])
      ])
      setMostBorrowedReport(Array.isArray(mostBorrowed) ? mostBorrowed : [])
      setActiveBorrowersReport(Array.isArray(activeBorrowers) ? activeBorrowers : [])
      setOverdueItemsReport(Array.isArray(overdueItems) ? overdueItems : [])
      setInventorySummaryReport(Array.isArray(inventorySummary) ? inventorySummary : [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  // Handlers
  const handleAddAsset = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let imageUrl = assetForm.Image_URL || ''
      if (imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)
        formData.append('assetType', activeAssetTab)
        if (isEditMode) formData.append('assetId', assetForm.Asset_ID)

        const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData })
        if (uploadRes.ok) {
          const data = await uploadRes.json()
          imageUrl = data.imageUrl
        }
      }

      const url = isEditMode
        ? `${API_URL}/assets/${activeAssetTab}/${assetForm.Asset_ID}`
        : `${API_URL}/assets/${activeAssetTab}`

      const assetData = { ...assetForm, Image_URL: imageUrl }
      if (activeAssetTab === 'movies' && isEditMode) {
        delete assetData.Copies
        delete assetData.Available_Copies
      }

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to save asset')
      }

      await fetchAssets(activeAssetTab)
      setImageRefreshKey(Date.now())
      setShowAssetModal(false)
      setAssetForm({})
      setImageFile(null)
      setSuccessMessage(`Asset ${isEditMode ? 'updated' : 'added'} successfully`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAsset = async () => {
    if (!itemToDelete) return
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/assets/${activeAssetTab}/${itemToDelete.Asset_ID}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to delete asset')
      }
      await fetchAssets(activeAssetTab)
      setShowDeleteModal(false)
      setSuccessMessage('Asset deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        username: userForm.studentId, // Map studentId input to username
        firstName: userForm.firstname,
        lastName: userForm.lastname,
        email: userForm.email,
        phone: userForm.phone,
        dateOfBirth: userForm.dateOfBirth,
        role: userForm.role,
        password: userForm.password,
        status: userForm.status
      }
      const response = await fetch(`${API_URL}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error('Failed to create user')
      setShowCreateUserModal(false)
      fetchData()
      setSuccessMessage('User created successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'An error occurred')
    }
  }



  const [activeActionMenuId, setActiveActionMenuId] = useState(null)
  const [userToDelete, setUserToDelete] = useState(null)

  const [showProfileDrawer, setShowProfileDrawer] = useState(false)
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null)

  // Handlers
  const handleToggleBlock = async (user) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/members/${user.User_ID}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isBlocked: !user.Is_Blocked,
          reason: user.Is_Blocked ? null : 'Manual block by admin'
        })
      })

      if (response.ok) {
        fetchData()
        setActiveActionMenuId(null)
      } else {
        console.error('Failed to toggle block status')
      }
    } catch (error) {
      console.error('Error toggling block status:', error)
    }
  }

  const handleToggleActive = async (user) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/members/${user.User_ID}/activate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isActive: !user.Is_Active
        })
      })

      if (response.ok) {
        fetchData()
        setActiveActionMenuId(null)
      } else {
        console.error('Failed to toggle activation status')
      }
    } catch (error) {
      console.error('Error toggling activation status:', error)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      const response = await fetch(`${API_URL}/members/${userToDelete.User_ID}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      })
      if (!response.ok) throw new Error('Failed to delete user')
      setShowDeleteUserModal(false)
      setUserToDelete(null)
      fetchData()
      setSuccessMessage('User deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'An error occurred')
    }
  }


  const handleBulkAction = async (action) => {
    if (selectedUserIds.length === 0) return
    if (!window.confirm(`Are you sure you want to ${action} ${selectedUserIds.length} users?`)) return

    try {
      const response = await fetch(`${API_URL}/members/bulk-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userIds: selectedUserIds, action })
      })

      if (response.ok) {
        const result = await response.json()
        setSuccessMessage(result.message)
        setTimeout(() => setSuccessMessage(''), 3000)
        setSelectedUserIds([])
        fetchData()
      } else {
        throw new Error('Failed to perform bulk action')
      }
    } catch (error) {
      setError(error.message || 'An error occurred')
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const mapRoleValueToName = (role) => {
    if (role === 1) return 'Student'
    if (role === 2) return 'Admin'
    if (role === 3) return 'Librarian'
    return 'Student'
  }

  const formatLogDetails = (details) => {
    if (!details) return '-'
    if (typeof details === 'object') {
      try {
        return Object.entries(details).map(([key, value]) => {
          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()
          return `${label}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
        }).join(', ')
      } catch (e) {
        return JSON.stringify(details)
      }
    }

    try {
      const parsed = JSON.parse(details)
      return Object.entries(parsed).map(([key, value]) => {
        // Capitalize key
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()
        return `${label}: ${value}`
      }).join(', ')
    } catch (e) {
      return String(details)
    }
  }

  const getActionColor = (action) => {
    const colors = {
      'LOGIN': 'bg-green-100 text-green-700',
      'LOGIN_FAILED': 'bg-red-100 text-red-700',
      'LOGOUT': 'bg-gray-100 text-gray-700',
      'CREATE_USER': 'bg-blue-100 text-blue-700',
      'UPDATE_USER': 'bg-indigo-100 text-indigo-700',
      'DELETE_USER': 'bg-red-100 text-red-700',
      'ADD_ASSET': 'bg-purple-100 text-purple-700',
      'UPDATE_ASSET': 'bg-indigo-100 text-indigo-700',
      'DELETE_ASSET': 'bg-red-100 text-red-700',
      'CHECKOUT': 'bg-orange-100 text-orange-700',
      'RETURN': 'bg-teal-100 text-teal-700',
    }
    return colors[action] || 'bg-gray-100 text-gray-700'
  }

<<<<<<< HEAD
  const renderOverview = () => (
    <div className="space-y-8">
      {/* 1. Summary Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Total Assets" value={books.length + cds.length + audiobooks.length + movies.length + technology.length + studyRooms.length} icon={Library} gradient="bg-gradient-to-r from-blue-500 to-blue-600" delay={0.1} />
          <StatCard title="Active Members" value={students.length} icon={Users} gradient="bg-gradient-to-r from-green-500 to-green-600" delay={0.2} />
          <StatCard title="Librarians" value={librarians.length} icon={Shield} gradient="bg-gradient-to-r from-purple-500 to-purple-600" delay={0.3} />
          <StatCard title="Borrowed" value={borrowRecords.filter(r => !r.Return_Date).length} icon={BookOpen} gradient="bg-gradient-to-r from-orange-500 to-orange-600" delay={0.4} />
          <StatCard title="Overdue" value={borrowRecords.filter(r => !r.Return_Date && new Date(r.Due_Date) < new Date()).length} icon={AlertCircle} gradient="bg-gradient-to-r from-red-500 to-red-600" delay={0.5} />
          <StatCard title="Active Bookings" value={borrowRecords.filter(r => !r.Return_Date && r.Asset_Type === 'Study Room').length} icon={Clock} gradient="bg-gradient-to-r from-indigo-500 to-indigo-600" delay={0.6} />
        </div>
      </div>

      {/* 2. Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button onClick={() => { setActiveAssetTab('books'); setShowAssetModal(true) }} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:bg-indigo-50 transition-all">
            <div className="p-3 bg-blue-100 rounded-full mb-2 text-blue-600"><Plus className="w-6 h-6" /></div>
            <span className="text-sm font-medium text-gray-700">Add Asset</span>
          </button>
          <button onClick={() => { setShowCreateUserModal(true); setUserForm({ ...userForm, role: 'Student' }) }} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:bg-green-50 transition-all">
            <div className="p-3 bg-green-100 rounded-full mb-2 text-green-600"><UserPlus className="w-6 h-6" /></div>
            <span className="text-sm font-medium text-gray-700">Add User</span>
          </button>
          <button onClick={() => { setShowCreateUserModal(true); setUserForm({ ...userForm, role: 'Librarian' }) }} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:bg-purple-50 transition-all">
            <div className="p-3 bg-purple-100 rounded-full mb-2 text-purple-600"><Shield className="w-6 h-6" /></div>
            <span className="text-sm font-medium text-gray-700">Add Librarian</span>
          </button>
          <button onClick={() => setActiveTab('assets')} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:bg-orange-50 transition-all">
            <div className="p-3 bg-orange-100 rounded-full mb-2 text-orange-600"><Tag className="w-6 h-6" /></div>
            <span className="text-sm font-medium text-gray-700">Manage Types</span>
          </button>
          <button onClick={() => setActiveTab('rooms')} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:bg-indigo-50 transition-all">
            <div className="p-3 bg-indigo-100 rounded-full mb-2 text-indigo-600"><Building2 className="w-6 h-6" /></div>
            <span className="text-sm font-medium text-gray-700">Manage Rooms</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. System Alerts */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-bold text-gray-800">System Alerts</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-gray-700">Critical Attention Needed</div>
            <div className="divide-y divide-gray-100">
              {borrowRecords.filter(r => !r.Return_Date && new Date(r.Due_Date) < new Date()).slice(0, 3).map(r => (
                <div key={r.Borrow_ID} className="p-4 flex items-start gap-3 hover:bg-red-50 transition-colors">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Overdue Item</p>
                    <p className="text-xs text-gray-500 mt-1">{r.Item_Title} (Due: {new Date(r.Due_Date).toLocaleDateString()})</p>
                  </div>
                </div>
              ))}
              {/* Mock Alerts for demo */}
              <div className="p-4 flex items-start gap-3 hover:bg-yellow-50 transition-colors">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Low Stock Warning</p>
                  <p className="text-xs text-gray-500 mt-1">"The Great Gatsby" is running low on copies.</p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-3 hover:bg-blue-50 transition-colors">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">System Update</p>
                  <p className="text-xs text-gray-500 mt-1">New version available (v2.1.0)</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-gray-50 text-center">
              <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800">View All Alerts</button>
            </div>
=======
  const renderOverview = () => {
    const totalAssets = books.length + cds.length + audiobooks.length + movies.length + technology.length + studyRooms.length
    const totalStudents = students.length
    const borrowedCount = borrowRecords.filter(r => !r.Return_Date).length

    const assetsMax = Math.max(50, totalAssets)
    const studentsMax = Math.max(200, totalStudents)
    const borrowedMax = Math.max(50, borrowedCount)

    const assetsPct = Math.round((totalAssets / assetsMax) * 100)
    const studentsPct = Math.round((totalStudents / studentsMax) * 100)
    const borrowedPct = Math.round((borrowedCount / borrowedMax) * 100)
    const ICONS = {
      Books: '📚',
      CDs: '💿',
      Audiobooks: '🎧',
      Movies: '🎬',
      Technology: '💻',
      'Study Rooms': '🚪'
    }

    return (
    <div className="tab-content overview-layout">
      <div className="overview-hero">
        <div>
          <h1 className="title">Welcome back, Administrator</h1>
          <div className="subtitle">Quick summary of library activity and recent changes</div>
        </div>
        <div className="overview-actions">
          <button className="btn ghost" onClick={() => setOverviewModal('assets')}>View Assets</button>
          <button className="btn primary" onClick={() => changeTab('reports')}>Open Reports</button>
        </div>
      </div>

      <ErrorPopup errorMessage={error} />

      <div className="overview-cards">
        <div className="stat-card" onClick={() => setOverviewModal('assets')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon blue">📚</div>
          <div className="stat-details">
            <h3>{books.length + cds.length + audiobooks.length + movies.length + technology.length + studyRooms.length}</h3>
            <p>Total Assets</p>
>>>>>>> origin/main
          </div>
        </div>

        {/* 4. Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.slice(0, 5).map(log => (
                  <tr key={log.Log_ID} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(log.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">User #{log.User_ID}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getActionColor(log.Action)}`}>
                        {log.Action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs font-mono">
                      {formatLogDetails(log.Details)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No recent activity found</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="p-3 bg-gray-50 text-center border-t border-gray-200">
              <button onClick={() => setActiveTab('logs')} className="text-sm text-indigo-600 font-medium hover:text-indigo-800">View All Logs</button>
            </div>
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* 5. High-Level Analytics */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">System Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Asset Category Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Books', count: books.length },
                { name: 'CDs', count: cds.length },
                { name: 'Audio', count: audiobooks.length },
                { name: 'Movies', count: movies.length },
                { name: 'Tech', count: technology.length },
                { name: 'Rooms', count: studyRooms.length }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Borrowing Trends (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={borrowingTrends.length > 0 ? borrowingTrends : [
                { name: 'No Data', borrows: 0 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="borrows" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
=======
      {/* Overview Modals */}
      {overviewModal === 'assets' && (() => {
        const combinedAssets = [
          ...books.map(a => ({ ...a, __type: 'Book' })),
          ...cds.map(a => ({ ...a, __type: 'CD' })),
          ...audiobooks.map(a => ({ ...a, __type: 'Audiobook' })),
          ...movies.map(a => ({ ...a, __type: 'Movie' })),
          ...technology.map(a => ({ ...a, __type: 'Technology' })),
          ...studyRooms.map(a => ({ ...a, __type: 'Study Room' })),
        ]

        const assetTypeToPath = (t) => {
          switch (t) {
            case 'Book': return 'books'
            case 'CD': return 'cds'
            case 'Audiobook': return 'audiobooks'
            case 'Movie': return 'movies'
            case 'Technology': return 'technology'
            case 'Study Room': return 'study-rooms'
            default: return 'general'
          }
        }

        return (
          <div className="modal-overlay" onClick={() => setOverviewModal(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
              <h3 style={{ marginTop: 0 }}>All Assets</h3>
              <div className="counts-row" style={{ marginBottom: 8, color: '#444' }}>
                <strong style={{ marginRight: 8, flex: '0 0 auto' }}>Counts:</strong>
                {[
                  { label: 'Books', count: books.length },
                  { label: 'CDs', count: cds.length },
                  { label: 'Audiobooks', count: audiobooks.length },
                  { label: 'Movies', count: movies.length },
                  { label: 'Technology', count: technology.length },
                  { label: 'Study Rooms', count: studyRooms.length }
                ].map(item => {
                  const icon = ICONS[item.label] || '📦'
                  return (
                    <span key={item.label} className="count-pill" title={`${item.label}: ${item.count}`}>
                      <span className="pill-icon" aria-hidden>{icon}</span>
                      <span className="pill-number">{item.count}</span>
                      <span className="pill-label">{item.label}</span>
                    </span>
                  )
                })}
              </div>
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="data-table overview-modal-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>ID</th>
                      <th>Title / Name</th>
                      <th>Type</th>
                      <th>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedAssets.slice().reverse().slice(0, 200).map((a, i) => {
                      const id = a.Asset_ID || a.Room_Number || a.Model_Num || `#${i}`
                      const title = a.Title || a.Room_Number || a.Model_Num || a.Description || '-'
                      const available = a.Available_Copies ?? a.Available ?? a.Copies ?? '-'
                      const assetPath = assetTypeToPath(a.__type)
                      const imgSrc = a.Image_URL ? `${a.Image_URL}?t=${imageRefreshKey}` : getAssetImagePath(assetPath, a.Asset_ID || a.Room_Number || a.Model_Num, 'png')
                      return (
                        <tr key={String(id) + i}>
                          <td style={{ width: 56 }}>
                            <img src={imgSrc} alt={title} className="overview-modal-thumb" onError={(e) => { e.target.style.display = 'none' }} />
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{id}</td>
                          <td>{title}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{a.__type}</td>
                          <td style={{ textAlign: 'right' }}>{available}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="modal-actions">
                <button className="close-btn" onClick={() => setOverviewModal(null)}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}
      {overviewModal === 'students' && (
        <div className="modal-overlay" onClick={() => setOverviewModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '860px' }}>
            <h3 style={{ marginTop: 0 }}>All Students</h3>
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="data-table overview-modal-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td style={{ whiteSpace: 'nowrap' }}><strong>{s.studentId || s.username || '-'}</strong></td>
                      <td>{s.firstname || '-'}</td>
                      <td>{s.lastname || '-'}</td>
                          <td style={{ color: '#374151' }}>{s.email || '-'}</td>
                          <td>
                            <span className={`role-badge role-${mapRoleValueToName(s.role).toLowerCase()}`}>{mapRoleValueToName(s.role)}</span>
                          </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="close-btn" onClick={() => setOverviewModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {overviewModal === 'borrowed' && (
        <div className="modal-overlay" onClick={() => setOverviewModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <h3 style={{ marginTop: 0 }}>Currently Borrowed Items</h3>
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="data-table overview-modal-table">
                <thead>
                  <tr>
                    <th>Borrow ID</th>
                    <th>Borrower</th>
                    <th>Phone</th>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Due Date</th>
                    <th>Days Overdue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowRecords.filter(r => !r.Return_Date).map(r => (
                    <tr key={r.Borrow_ID}>
                      <td>{r.Borrow_ID}</td>
                      <td>{r.Borrower_Name}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.User_Phone || r.UserPhone || '-'}</td>
                      <td>{r.Title || r.Item_Title || '-'}</td>
                      <td>{r.Type || r.Asset_Type || '-'}</td>
                      <td>{formatDateForDisplay(r.Due_Date)}</td>
                      <td style={{ color: '#dc2626' }}>{r.Days_Overdue || '-'}</td>
                      <td><span className={`status-badge ${r.Return_Date ? 'returned' : 'borrowed'}`}>{r.Return_Date ? 'Returned' : 'Borrowed'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="close-btn" onClick={() => setOverviewModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="overview-grid">
        <div className="overview-panel overview-charts">
          <h3 style={{ marginBottom: '18px' }}>Asset Type Breakdown</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { type: 'Books', count: books.length },
                { type: 'CDs', count: cds.length },
                { type: 'Audiobooks', count: audiobooks.length },
                { type: 'Movies', count: movies.length },
                { type: 'Technology', count: technology.length },
                { type: 'Study Rooms', count: studyRooms.length }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overview-panel overview-mini">
          <h3>Quick Actions & Recent</h3>
          <div>
            <strong>Recent additions</strong>
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              {[...books, ...cds, ...audiobooks, ...movies, ...technology, ...studyRooms].slice(-6).reverse().map(a => (
                <li key={a.Asset_ID || a.Room_Number || a.Model_Num} style={{ padding: '6px 0', borderBottom: '1px dashed #f1f5f9' }}>{a.Title || a.Room_Number || a.Model_Num || 'Asset'}</li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Top borrowers (live)</strong>
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              {borrowRecords.slice(0,6).map(b => (
                <li key={b.Borrow_ID} style={{ padding: '6px 0', borderBottom: '1px dashed #f1f5f9' }}>{b.Borrower_Name || b.User_Name || 'User'}</li>
              ))}
            </ul>
          </div>
>>>>>>> origin/main
        </div>
      </div>
    </div>
    )
  }


  const [activeUserRoleTab, setActiveUserRoleTab] = useState('Students')

  const renderUsers = () => {
    const getRoleId = (tab) => {
      if (tab === 'Students') return 1
      if (tab === 'Librarians') return 3
      if (tab === 'Admins') return 2
      return 1
    }

    const currentRoleId = getRoleId(activeUserRoleTab)
    const roleUsers = users.filter(u => u.Role === currentRoleId && (
      (u.First_Name && u.First_Name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.Last_Name && u.Last_Name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.User_Email && u.User_Email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(u.User_ID).includes(searchQuery)
    ))

    const handleSelectAll = (e) => {
      if (e.target.checked) {
        setSelectedUserIds(roleUsers.map(u => u.User_ID))
      } else {
        setSelectedUserIds([])
      }
    }

    const handleSelectUser = (id) => {
      if (selectedUserIds.includes(id)) {
        setSelectedUserIds(selectedUserIds.filter(userId => userId !== id))
      } else {
        setSelectedUserIds([...selectedUserIds, id])
      }
    }

    return (
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            User Management
          </h2>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
              <option value="Pending">Pending</option>
            </select>
            <button
              onClick={() => {
                setShowCreateUserModal(true)
                setUserForm({ studentId: "", firstname: "", lastname: "", email: "", role: "Student", password: "", dateOfBirth: "", phone: "" })
              }}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </button>
          </div>
        </div>

        {/* Role Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          {['Students', 'Librarians', 'Admins'].map(tab => {
            const count = users.filter(u => u.Role === getRoleId(tab)).length
            const isActive = activeUserRoleTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveUserRoleTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab === 'Students' && <Users className="w-4 h-4" />}
                {tab === 'Librarians' && <BookOpen className="w-4 h-4" />}
                {tab === 'Admins' && <Shield className="w-4 h-4" />}
                {tab}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedUserIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-xl border border-gray-200 flex items-center gap-4 z-50"
            >
              <span className="text-sm font-medium text-gray-600">{selectedUserIds.length} users selected</span>
              <div className="h-4 w-px bg-gray-300"></div>
              <button onClick={() => handleBulkAction('activate')} className="text-sm font-medium text-green-600 hover:text-green-700">Activate</button>
              <button onClick={() => handleBulkAction('deactivate')} className="text-sm font-medium text-gray-600 hover:text-gray-700">Deactivate</button>
              <button onClick={() => handleBulkAction('block')} className="text-sm font-medium text-red-600 hover:text-red-700">Block</button>
              <button onClick={() => handleBulkAction('unblock')} className="text-sm font-medium text-blue-600 hover:text-blue-700">Unblock</button>
              <div className="h-4 w-px bg-gray-300"></div>
              <button onClick={() => handleBulkAction('delete')} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
              <button onClick={() => setSelectedUserIds([])} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Width Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-y-auto flex-1 relative">
            <table className="w-full text-left table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 w-16">
                    <input
                      type="checkbox"
                      checked={roleUsers.length > 0 && selectedUserIds.length === roleUsers.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">User</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/5">Contact</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Status</th>
                  {activeUserRoleTab === 'Students' ? (
                    <>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-24">Loans</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-24">Fines</th>
                    </>
                  ) : (
                    <th className="w-48"></th>
                  )}
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Last Login</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {roleUsers.map((user) => (
                  <tr key={user.User_ID} className={`hover:bg-gray-50 transition-colors ${selectedUserIds.includes(user.User_ID) ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.User_ID)}
                        onChange={() => handleSelectUser(user.User_ID)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 truncate">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold mr-3 text-lg">
                          {user.First_Name?.[0] || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{user.First_Name} {user.Last_Name}</div>
                          <div className="text-xs text-gray-500">ID: {user.User_ID}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 truncate">
                      <div className="text-sm text-gray-900 truncate">{user.User_Email}</div>
                      <div className="text-xs text-gray-500">{user.Phone_Number || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.Is_Blocked
                        ? 'bg-red-100 text-red-800'
                        : !user.Is_Active
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-green-100 text-green-800'
                        }`}>
                        {user.Is_Blocked ? 'Blocked' : !user.Is_Active ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    {activeUserRoleTab === 'Students' ? (
                      <>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.Active_Loans > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                            {user.Active_Loans || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-medium ${parseFloat(user.Fines_Balance) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            ${parseFloat(user.Fines_Balance || 0).toFixed(2)}
                          </span>
                        </td>
                      </>
                    ) : (
                      <td></td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.Last_Login && new Date(user.Last_Login) > new Date(Date.now() - 15 * 60 * 1000) ? (
                        <span className="inline-flex items-center text-green-600 font-medium">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                          Online
                        </span>
                      ) : (
                        user.Last_Login ? new Date(user.Last_Login).toLocaleDateString() + ' ' + new Date(user.Last_Login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex gap-2 justify-end">

                        {/* Actions Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveActionMenuId(activeActionMenuId === user.User_ID ? null : user.User_ID)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeActionMenuId === user.User_ID && (
                            <div className={`absolute right-0 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 ${roleUsers.indexOf(user) >= roleUsers.length - 3 ? 'bottom-full mb-2' : 'mt-2'
                              }`}>
                              <button
                                onClick={() => {
                                  setActiveActionMenuId(null)
                                  setSelectedProfileUserId(user.User_ID)
                                  setShowProfileDrawer(true)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Profile
                              </button>
                              <button
                                onClick={() => {
                                  setActiveActionMenuId(null)
                                  setSelectedUser(user)
                                  setUserForm({
                                    firstname: user.First_Name,
                                    lastname: user.Last_Name,
                                    email: user.User_Email,
                                    phone: user.Phone_Number || '',
                                    role: mapRoleValueToName(user.Role),
                                    status: user.Is_Blocked ? 'Blocked' : (user.Is_Active ? 'Active' : 'Pending'),
                                    password: '',
                                    studentId: user.User_ID
                                  })
                                  setShowEditUserModal(true)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit Details
                              </button>
                              <button
                                onClick={() => {
                                  setActiveActionMenuId(null)
                                  // TODO: Reset Password
                                  console.log('Reset password', user.User_ID)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Key className="w-4 h-4" />
                                Reset Password
                              </button>
                              <div className="h-px bg-gray-100 my-1" />
                              <button
                                onClick={() => handleToggleBlock(user)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${user.Is_Blocked ? 'text-green-600' : 'text-amber-600'}`}
                              >
                                <Ban className="w-4 h-4" />
                                {user.Is_Blocked ? 'Unblock Borrowing' : 'Block Borrowing'}
                              </button>
                              <button
                                onClick={() => handleToggleActive(user)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${!user.Is_Active ? 'text-green-600' : 'text-gray-600'}`}
                              >
                                <Power className="w-4 h-4" />
                                {user.Is_Active ? 'Deactivate Account' : 'Activate Account'}
                              </button>
                              <div className="h-px bg-gray-100 my-1" />
                              <button
                                onClick={() => {
                                  setActiveActionMenuId(null)
                                  setUserToDelete(user)
                                  setShowDeleteUserModal(true)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete User
                              </button>
                            </div>
                          )}

                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {roleUsers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-lg font-medium text-gray-900">No users found</p>
                        <p className="text-sm text-gray-500">Try adjusting your filters or add a new user.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div >
      </div >
    )
  }

  const renderAssets = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Asset Management</h2>
        <button
          onClick={() => {
            setAssetForm({})
            setImageFile(null)
            setImagePreview(null)
            setIsEditMode(false)
            setShowAssetModal(true)
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {activeAssetTab.slice(0, -1)}
        </button>
      </div>

      {/* Asset Tabs */}
      <div className="bg-white p-1 rounded-xl border border-gray-200 inline-flex mb-6 shadow-sm">
        {['books', 'cds', 'audiobooks', 'movies', 'technology', 'study-rooms'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveAssetTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeAssetTab === tab
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            {tab === 'study-rooms' ? 'Study Rooms' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {(() => {
          let data = []
          switch (activeAssetTab) {
            case 'books': data = books; break;
            case 'cds': data = cds; break;
            case 'audiobooks': data = audiobooks; break;
            case 'movies': data = movies; break;
            case 'technology': data = technology; break;
            case 'study-rooms': data = studyRooms; break;
            default: data = [];
          }

          if (data.length === 0) {
            return (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No assets found in this category</p>
              </div>
            )
          }

          return data.map((item) => (
            <div key={item.Asset_ID} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="relative aspect-[2/3] bg-gray-100 overflow-hidden">
                <img
                  src={item.Image_URL ? `${item.Image_URL}?t=${imageRefreshKey}` : getAssetImagePath(activeAssetTab, item.Asset_ID, 'jpg')}
                  alt={item.Title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target;
                    const src = target.src;
                    if (src.includes('.jpg')) {
                      target.src = src.replace('.jpg', '.png');
                    } else if (src.includes('.png')) {
                      target.src = src.replace('.png', '.jpeg');
                    } else {
                      target.onerror = null;
                      target.style.display = 'none';
                      target.nextElementSibling.classList.remove('hidden');
                    }
                  }}
                />
                <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                  <Image className="w-12 h-12" />
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setAssetForm(item)
                      setImagePreview(item.Image_URL)
                      setIsEditMode(true)
                      setShowAssetModal(true)
                    }}
                    className="p-2 bg-white/90 rounded-full text-blue-600 hover:text-blue-700 shadow-sm hover:bg-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setItemToDelete(item)
                      setShowDeleteModal(true)
                    }}
                    className="p-2 bg-white/90 rounded-full text-red-600 hover:text-red-700 shadow-sm hover:bg-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate" title={item.Title}>{item.Title || item.Room_Number || item.Model_Num}</h3>
                <p className="text-sm text-gray-500 truncate">{item.Author || item.Artist || item.Description || 'No details'}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className={`px-2 py-1 rounded-full ${(item.Available_Copies > 0 || item.Availability === 'Available')
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                    }`}>
                    {activeAssetTab === 'study-rooms' ? item.Availability : `${item.Available_Copies} Available`}
                  </span>
                  <span className="text-gray-400">#{item.Asset_ID}</span>
                </div>
              </div>
            </div>
          ))
        })()}
      </div>
    </div >
  )

  // Helper to get form fields based on asset type
  const getAssetFormFields = () => {
    const commonFields = [
      { name: 'Title', label: 'Title', type: 'text', required: true },
      { name: 'Description', label: 'Description', type: 'text' },
      { name: 'Copies', label: 'Total Copies', type: 'number', required: true },
      { name: 'Available_Copies', label: 'Available Copies', type: 'number', required: true }
    ]

    switch (activeAssetTab) {
      case 'books':
        return [
          ...commonFields,
          { name: 'Author', label: 'Author', type: 'text', required: true },
          { name: 'ISBN', label: 'ISBN', type: 'text', required: true },
          { name: 'Page_Count', label: 'Page Count', type: 'number', required: true }
        ]
      case 'cds':
        return [
          ...commonFields,
          { name: 'Artist', label: 'Artist', type: 'text', required: true },
          { name: 'Release_Year', label: 'Year', type: 'number' },
          { name: 'Genre', label: 'Genre', type: 'text' },
          { name: 'Tracks', label: 'Tracks', type: 'number' }
        ]
      case 'audiobooks':
        return [
          ...commonFields,
          { name: 'Author', label: 'Author', type: 'text', required: true },
          { name: 'Narrator', label: 'Narrator', type: 'text' },
          { name: 'Length', label: 'Length (min)', type: 'number' },
          { name: 'Genre', label: 'Genre', type: 'text' }
        ]
      case 'movies':
        return [
          ...commonFields,
          { name: 'Director', label: 'Director', type: 'text', required: true },
          { name: 'Release_Year', label: 'Year', type: 'number' },
          { name: 'Genre', label: 'Genre', type: 'text' },
          { name: 'Rating', label: 'Rating', type: 'text' }
        ]
      case 'technology':
        return [
          { name: 'Model_Num', label: 'Model Number', type: 'text', required: true },
          { name: 'Brand', label: 'Brand', type: 'text', required: true },
          { name: 'Description', label: 'Description', type: 'text' },
          { name: 'Serial_Num', label: 'Serial Number', type: 'text' },
          { name: 'Condition_Status', label: 'Condition', type: 'text' },
          { name: 'Purchase_Date', label: 'Purchase Date', type: 'date' }
        ]
      case 'study-rooms':
        return [
          { name: 'Room_Number', label: 'Room Number', type: 'text', required: true },
          { name: 'Capacity', label: 'Capacity', type: 'number', required: true },
          { name: 'Availability', label: 'Status', type: 'text', required: true }
        ]
      default:
        return commonFields
    }
  }

  // Roles & Permissions


  const renderRoles = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Roles & Permissions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map(role => (
          <div key={role.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{role.name}</h3>
            <p className="text-gray-500 text-sm mb-4">{role.description}</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span>View Dashboard</span>
              </div>
              {role.name !== 'Student' && (
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>Manage Assets</span>
                </div>
              )}
              {role.name === 'Admin' && (
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>System Configuration</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )



  const renderLogs = () => {
    const uniqueActions = ['All', ...new Set(logs.map(l => l.Action))]

    const filteredLogs = logs.filter(log => {
      const matchesSearch = (
        (log.Action && log.Action.toLowerCase().includes(logSearch.toLowerCase())) ||
        (log.Details && String(log.Details).toLowerCase().includes(logSearch.toLowerCase())) ||
        (log.User_ID && String(log.User_ID).includes(logSearch)) ||
        (log.IP_Address && log.IP_Address.includes(logSearch))
      )
      const matchesAction = logActionFilter === 'All' || log.Action === logActionFilter
      const matchesDate = (!logStartDate || new Date(log.Timestamp) >= new Date(logStartDate)) &&
        (!logEndDate || new Date(log.Timestamp) <= new Date(logEndDate))

      return matchesSearch && matchesAction && matchesDate
    })

    // Calculate Metrics
    const metrics = {
      totalEvents: logs.length,
      failedLogins: logs.filter(l => l.Action === 'LOGIN_FAILED').length,
      uniqueUsers: new Set(logs.map(l => l.User_ID)).size,
      todayEvents: logs.filter(l => new Date(l.Timestamp).toDateString() === new Date().toDateString()).length
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Audit Logs</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Events" value={metrics.totalEvents} icon={Activity} gradient="bg-gradient-to-r from-blue-500 to-blue-600" />
          <StatCard title="Failed Logins" value={metrics.failedLogins} icon={Shield} gradient="bg-gradient-to-r from-red-500 to-red-600" />
          <StatCard title="Unique Users" value={metrics.uniqueUsers} icon={Users} gradient="bg-gradient-to-r from-purple-500 to-purple-600" />
          <StatCard title="Events Today" value={metrics.todayEvents} icon={Clock} gradient="bg-gradient-to-r from-green-500 to-green-600" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <h3 className="text-lg font-semibold text-gray-700">Log Entries</h3>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={logActionFilter}
              onChange={(e) => setLogActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>

            <DateFilter
              startDate={logStartDate}
              endDate={logEndDate}
              onDateChange={(start, end) => {
                setLogStartDate(start)
                setLogEndDate(end)
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.Log_ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(log.Timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {log.First_Name ? `${log.First_Name} ${log.Last_Name}` : (log.Username || `User ${log.User_ID}`)}
                      <span className="block text-xs text-gray-500">ID: {log.User_ID}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.Action)}`}>
                        {log.Action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono text-xs">{formatLogDetails(log.Details)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.IP_Address}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No logs found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }



<<<<<<< HEAD
  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {configs.map(config => (
            <div key={config.Config_ID} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <h4 className="font-medium text-gray-900">{config.Config_Key.replace(/_/g, ' ')}</h4>
                <p className="text-sm text-gray-500">{config.Description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono bg-white px-3 py-1 rounded border border-gray-200">
                  {config.Config_Value}
                </span>
                <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">Edit</button>
              </div>
            </div>
          ))}
          {configs.length === 0 && (
            <p className="text-center text-gray-500">No configurations found.</p>
          )}
        </div>
=======
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Role</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No students found</td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td><strong>{student.studentId || student.username}</strong></td>
                  <td>{student.firstname || '-'}</td>
                  <td>{student.lastname || '-'}</td>
                  <td>
                    <span className={`role-badge role-${mapRoleValueToName(student.role).toLowerCase()}`}>{mapRoleValueToName(student.role)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="row-action-group">
                      <button
                        className="icon-btn view-icon"
                        title="View"
                        aria-label={`View ${student.firstname || student.username || student.studentId || 'user'}`}
                        onClick={() => {
                          setSelectedUser(student)
                          setShowViewUserModal(true)
                        }}
                      >
                        🔍
                      </button>
                      <button
                        className="icon-btn delete-icon"
                        title="Delete"
                        aria-label={`Delete ${student.firstname || student.username || student.studentId || 'user'}`}
                        onClick={() => openDeleteUserModal(student)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
>>>>>>> origin/main
      </div>
    </div>
  )

  // Placeholder for new sections
  const renderPlaceholder = (title, Icon) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="p-6 bg-indigo-50 rounded-full mb-4">
        <Icon className="w-12 h-12 text-indigo-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 max-w-md">
        This module is currently under development. Full functionality will be available in the next update.
      </p>
    </div>
  )

  const [activeUserTab, setActiveUserTab] = useState('profile')

  const handleEditUser = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/members/${selectedUser.User_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          firstName: userForm.firstname,
          lastName: userForm.lastname,
          email: userForm.email,
          phone: userForm.phone,
          dateOfBirth: userForm.dateOfBirth,
          role: userForm.role,
          status: userForm.status,
          password: userForm.password || undefined // Only send if set
        })
      })

      if (response.ok) {
        setSuccessMessage('User updated successfully')
        setShowEditUserModal(false)
        fetchUsers()
      } else {
        const error = await response.json()
        setError(error.message || 'Failed to update user')
      }
<<<<<<< HEAD
    } catch (err) {
      console.error('Error updating user:', err)
      setError(err.message || 'Failed to update user')
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <AdminSidebar
        activePage={activeTab}
        setActivePage={(page) => {
          setActiveTab(page)
          const params = new URLSearchParams(searchParams)
          params.set('tab', page)
          setSearchParams(params)
        }}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopNavbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          notifications={[]}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <LoadingOverlay isLoading={loading} />
          <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />
          {error && <ErrorPopup errorMessage={error} onClose={() => setError('')} />}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'users' && renderUsers()}
              {activeTab === 'assets' && renderAssets()}
              {activeTab === 'rooms' && renderAssets()} {/* Reuse assets view for rooms for now */}
              {activeTab === 'roles' && renderRoles()}
              {activeTab === 'settings' && renderSettings()}
              {activeTab === 'reports' && <AdminReport />}
              {activeTab === 'logs' && renderLogs()}
            </motion.div>
          </AnimatePresence>
=======
    };

    return (
      <div className="tab-content">
        <h2>Library Reports</h2>
        <ErrorPopup errorMessage={error} />

        {/* Custom Report Generator */}
        <div className="report-section" style={{ marginBottom: '32px', background: '#f3f4f6', borderRadius: '14px', padding: '32px 28px' }}>
          <h3 style={{ marginBottom: '18px', fontWeight: 700, fontSize: '1.3rem' }}>🛠️ Generate Custom Report</h3>
          <form style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginBottom: '18px', alignItems: 'flex-end' }} onSubmit={e => { e.preventDefault(); generateCustomReport(); }}>
            <div style={{ minWidth: '320px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600 }}>Date Range</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="date" value={customReportFilters.startDate} onChange={e => setCustomReportFilters(f => ({ ...f, startDate: e.target.value }))} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', flex: 1 }} />
                <span style={{ alignSelf: 'center' }}>to</span>
                <input type="date" value={customReportFilters.endDate} onChange={e => setCustomReportFilters(f => ({ ...f, endDate: e.target.value }))} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', flex: 1 }} />
              </div>
            </div>
            <div style={{ minWidth: '200px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600 }}>Asset Type</label>
              <select value={customReportFilters.assetType} onChange={e => setCustomReportFilters(f => ({ ...f, assetType: e.target.value }))} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="">All</option>
                <option value="books">Books</option>
                <option value="cds">CDs</option>
                <option value="audiobooks">Audiobooks</option>
                <option value="movies">Movies</option>
                <option value="technology">Technology</option>
                <option value="study-rooms">Study Rooms</option>
              </select>
            </div>
            <div style={{ minWidth: '220px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
              <label style={{ fontWeight: 600 }}>User</label>
              <UserDropdown
                users={[{ id: '', firstname: 'All', lastname: 'Students', username: '', studentId: '', role: 1 }, ...students.filter(u => u.role === 1)]}
                value={customReportFilters.userId}
                onChange={val => setCustomReportFilters(f => ({ ...f, userId: val }))}
                allLabel="All Students"
              />
            </div>
            <div style={{ minWidth: '220px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600 }}>Report Type</label>
              <select value={customReportType} onChange={e => setCustomReportType(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="table">Table</option>
                <option value="bar">Bar Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            </div>
            <div style={{ minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="add-button" type="submit" disabled={customReportLoading} style={{ padding: '10px 0', fontWeight: 600, fontSize: '1.05rem', borderRadius: '8px' }}>
                {customReportLoading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </form>
          {customReportError && <ErrorPopup errorMessage={customReportError} />}
          {/* Custom Report Output */}
          <div style={{ marginTop: '18px' }}>
            {customReportType === 'table' && customReportData.length > 0 && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      {Object.keys(customReportData[0]).map(key => <th key={key}>{key}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {customReportData.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, i) => <td key={i}>{val}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {customReportType === 'bar' && customReportData.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={customReportData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={Object.keys(customReportData[0])[0]} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={Object.keys(customReportData[0])[1]} fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {customReportType === 'pie' && customReportData.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={customReportData}
                      dataKey={Object.keys(customReportData[0])[1]}
                      nameKey={Object.keys(customReportData[0])[0]}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={(entry) => `${entry[Object.keys(customReportData[0])[0]]}: ${entry[Object.keys(customReportData[0])[1]]}`}
                    >
                      {customReportData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {customReportData.length === 0 && customReportLoading === false && (
              <div style={{ color: '#666', textAlign: 'center', padding: '18px' }}>No custom report data yet.</div>
            )}
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
        <button
          className="add-button create-user-button"
          onClick={() => {
            setShowCreateUserModal(true);
            setUserForm({ studentId: "", firstname: "", lastname: "", email: "", role: "Student", password: "", dateOfBirth: "", phone: "" });
          }}
        >
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
              <th>Student ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Role</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No users found</td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td><strong>{student.studentId || student.username}</strong></td>
                  <td>{student.firstname}</td>
                  <td>{student.lastname}</td>
                  <td>
                    <span className={`role-badge role-${mapRoleValueToName(student.role).toLowerCase()}`}>{mapRoleValueToName(student.role)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="row-action-group">
                      <button
                        className="icon-btn view-icon"
                        title="View"
                        aria-label={`View ${student.firstname || student.username || student.studentId || 'user'}`}
                        onClick={() => {
                          setSelectedUser(student)
                          setShowViewUserModal(true)
                        }}
                      >
                        🔍
                      </button>
                      <button
                        className="icon-btn delete-icon"
                        title="Delete"
                        aria-label={`Delete ${student.firstname || student.username || student.studentId || 'user'}`}
                        onClick={() => openDeleteUserModal(student)}
                      >
                        ✕
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
      <div className={`dashboard-layout ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <aside className="admin-sidebar">
          <div className="sidebar-top">
            <button
              className="sidebar-toggle brand-icon"
              onClick={() => setSidebarCollapsed(s => !s)}
              aria-label="Toggle sidebar"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="toggle-icon">☰</span>
            </button>
          </div>

          <nav className="sidebar-menu">
            <button className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => changeTab('overview')} title="Overview">
              <span className="icon">🏠</span>
              {!sidebarCollapsed && <span className="label">Overview</span>}
            </button>

            <button className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => changeTab('users')} title="User Management">
              <span className="icon">👤</span>
              {!sidebarCollapsed && <span className="label">User Management</span>}
            </button>

            <button className={`sidebar-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => changeTab('reports')} title="Reports & Analytics">
              <span className="icon">📊</span>
              {!sidebarCollapsed && <span className="label">Reports & Analytics</span>}
            </button>

            {/* Note: 'All Users' and 'System Settings' intentionally hidden from sidebar */}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-role">{!sidebarCollapsed && <span className="admin-navbar-role">Administrator</span>}</div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <span className="icon">🔒</span>
              {!sidebarCollapsed && <span className="label">Logout</span>}
            </button>
          </div>
        </aside>

        <main className="admin-main">
          <LoadingOverlay isLoading={loading} message={loading ? 'Processing...' : ''} />
          <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />

          <div className="page-banner">
            <div className="banner-content">
              <h1 className="banner-title">
                {activeTab === 'overview' ? 'Admin Dashboard' : activeTab === 'users' ? 'User Management' : activeTab === 'reports' ? 'Reports & Analytics' : ''}
              </h1>
              <p className="banner-sub">Manage library data, users, and reports</p>
            </div>
          </div>

          <div className="dashboard-content">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUserManagement()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'students' && renderStudents()}
            {activeTab === 'settings' && renderSystemSettings()}
          </div>
>>>>>>> origin/main
        </main>
      </div>

      {/* Modals would go here (Asset Modal, User Modal, etc.) - kept minimal for brevity but logic is above */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4">{isEditMode ? 'Edit' : 'Add'} {activeAssetTab}</h3>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image Upload */}
                <div className="col-span-full flex justify-center mb-4">
                  <div className="relative w-32 h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-colors cursor-pointer" onClick={() => document.getElementById('modal-image-upload').click()}>
                    {imagePreview || assetForm.Image_URL ? (
                      <img src={imagePreview || assetForm.Image_URL} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-xs">Upload Image</span>
                      </div>
                    )}
                    <input type="file" id="modal-image-upload" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </div>
                </div>

                {/* Dynamic Fields based on asset type */}
                {getAssetFormFields()
                  .filter(field => {
                    // Hide Copies field for movies when editing (managed through rentables table)
                    return !(activeAssetTab === 'movies' && field.name === 'Copies' && isEditMode);
                  })
                  .map(field => (
                    <div key={field.name} className={field.type === 'text' || field.type === 'date' ? '' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label} {field.required && '*'}
                      </label>
                      <input
                        type={field.type}
                        value={assetForm[field.name] || ''}
                        onChange={(e) => setAssetForm({ ...assetForm, [field.name]: e.target.value })}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  ))}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAssetModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  {isEditMode ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {(showCreateUserModal || showEditUserModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{showCreateUserModal ? 'Create User' : 'Edit User'}</h3>

            {/* Tabs for Edit Mode */}
            {showEditUserModal && (
              <div className="flex border-b border-gray-200 mb-4">
                {['profile', 'account', 'security'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveUserTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize ${activeUserTab === tab
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={showCreateUserModal ? handleCreateUser : handleEditUser} className="space-y-4">
              {/* Profile Tab (or Create Mode) */}
              {(showCreateUserModal || activeUserTab === 'profile') && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input type="text" value={userForm.firstname} onChange={e => setUserForm({ ...userForm, firstname: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input type="text" value={userForm.lastname} onChange={e => setUserForm({ ...userForm, lastname: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" value={userForm.dateOfBirth} onChange={e => setUserForm({ ...userForm, dateOfBirth: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                  </div>
                  {showCreateUserModal && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username / ID</label>
                      <input type="text" value={userForm.studentId} onChange={e => setUserForm({ ...userForm, studentId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                    </div>
                  )}
                </>
              )}

              {/* Account Tab */}
              {(showEditUserModal && activeUserTab === 'account') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="Student">Student</option>
                      <option value="Librarian">Librarian</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={userForm.status} onChange={e => setUserForm({ ...userForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="Active">Active</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </>
              )}

              {/* Security Tab */}
              {(showEditUserModal && activeUserTab === 'security') && (
                <div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-yellow-800">Only enter a password if you want to change it.</p>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Leave blank to keep current"
                  />
                </div>
              )}

              {/* Create Mode Role/Password */}
              {showCreateUserModal && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="Student">Student</option>
                      <option value="Librarian">Librarian</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowCreateUserModal(false); setShowEditUserModal(false) }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{showCreateUserModal ? 'Create' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Asset Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
<<<<<<< HEAD
            <h3 className="text-xl font-bold text-center mb-2">Delete Asset?</h3>
            <p className="text-gray-500 text-center mb-6">
              Are you sure you want to delete <strong>{itemToDelete?.Title}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAsset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Asset
              </button>
            </div>
=======
              <div style={{ flex: 1 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.7rem', margin: 0 }}>
                {selectedUser.firstname || '-'} {selectedUser.lastname || '-'}
              </h2>
              <span className={`role-badge role-${mapRoleValueToName(selectedUser.role).toLowerCase()}`} style={{ display: 'inline-block', marginTop: '8px', fontSize: '1rem' }}>{mapRoleValueToName(selectedUser.role)}</span>
            </div>
            <button className="close-btn" onClick={() => setShowViewUserModal(false)} title="Close" style={{ fontSize: '1.5rem', marginLeft: '8px' }}>✕</button>
          </div>
          {/* Tabs for modal sections */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '18px', borderBottom: '1px solid #e5e7eb' }}>
            {['Personal Info', 'Library Stats', 'Current Borrows'].map((tab, idx) => (
              <button
                key={tab}
                style={{
                  background: activeUserModalTab === tab ? '#f3f4f6' : 'transparent',
                  border: 'none',
                  borderBottom: activeUserModalTab === tab ? '3px solid #6366f1' : '3px solid transparent',
                  color: activeUserModalTab === tab ? '#6366f1' : '#222',
                  fontWeight: 600,
                  fontSize: '1rem',
                  padding: '10px 18px',
                  cursor: 'pointer',
                  outline: 'none',
                  borderRadius: '8px 8px 0 0',
                  transition: 'background 0.2s'
                }}
                onClick={() => setActiveUserModalTab(tab)}
              >{tab}</button>
            ))}
          </div>
          <div className="user-modal-body">
            {/* Tab content */}
            {activeUserModalTab === 'Personal Info' && (
              <div className="user-info-sections" style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                <div className="user-info-section user-info-details" style={{ flex: 1, minWidth: '220px' }}>
                  <h4 className="section-title" style={{ marginBottom: '18px', fontWeight: 600, fontSize: '1.1rem' }}>Personal Info</h4>
                  <div className="info-grid">
                    <div className="info-row">
                      <span className="info-label">Username:</span>
                      <div className="info-value-copy">
                        <span className="info-value" title={getUsername(selectedUser)}>{getUsername(selectedUser)}</span>
                        {getUsername(selectedUser) && getUsername(selectedUser) !== '-' && (
                          <button className="copy-btn" onClick={() => copyToClipboard(getUsername(selectedUser))} title="Copy Username">📋</button>
                        )}
                      </div>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Email:</span>
                      <div className="info-value-copy">
                        <span className="info-value" title={selectedUser.email || '-'}>{selectedUser.email || '-'}</span>
                        {selectedUser.email && (
                          <button className="copy-btn" onClick={() => copyToClipboard(selectedUser.email)} title="Copy Email">📋</button>
                        )}
                      </div>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Phone:</span>
                      <div className="info-value-copy">
                        <span className="info-value" title={selectedUser.phone || '-'}>{selectedUser.phone || '-'}</span>
                        {selectedUser.phone && (
                          <button className="copy-btn" onClick={() => copyToClipboard(selectedUser.phone)} title="Copy Phone">📋</button>
                        )}
                      </div>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Date of Birth:</span>
                      <div className="info-value-copy">
                        <span className="info-value" title={formatDateForDisplay(selectedUser.dateOfBirth)}>{formatDateForDisplay(selectedUser.dateOfBirth)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeUserModalTab === 'Library Stats' && (
              <div className="user-info-sections" style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                <div className="user-info-section user-info-stats" style={{ flex: 1, minWidth: '220px' }}>
                  <h4 className="section-title" style={{ marginBottom: '18px', fontWeight: 600, fontSize: '1.1rem' }}>Library Stats</h4>
                  <div className="stats-grid">
                    <div className="stats-row"><span className="stats-label">Total Borrows:</span> <span className="stats-value">{
                      borrowRecords.filter(r => userMatchesBorrow(r, selectedUser)).length
                    }</span></div>
                    <div className="stats-row"><span className="stats-label">Currently Borrowed:</span> <span className="stats-value">{
                      borrowRecords.filter(r => userMatchesBorrow(r, selectedUser) && !r.Return_Date).length
                    }</span></div>
                    <div className="stats-row"><span className="stats-label">Overdue Items:</span> <span className="stats-value">{
                      borrowRecords.filter(r => userMatchesBorrow(r, selectedUser) && r.Due_Date && !r.Return_Date && new Date(r.Due_Date) < new Date()).length
                    }</span></div>
                  </div>
                </div>
              </div>
            )}
            {activeUserModalTab === 'Current Borrows' && (
              <div style={{ marginTop: '12px' }}>
                {/* debug removed */}
                <h4 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '12px' }}>User Borrows & Fines</h4>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    onClick={() => setUserBorrowFilter('current')}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: userBorrowFilter === 'current' ? '#eef2ff' : '#fff' }}
                  >Current</button>
                  <button
                    onClick={() => setUserBorrowFilter('all')}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: userBorrowFilter === 'all' ? '#eef2ff' : '#fff' }}
                  >All</button>
                  <button
                    onClick={() => setUserBorrowFilter('overdue')}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: userBorrowFilter === 'overdue' ? '#eef2ff' : '#fff' }}
                  >Overdue</button>
                </div>

                <div style={{ maxHeight: '320px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', padding: '12px', marginBottom: '18px' }}>
                  {(() => {
                    const matched = borrowRecords.filter(r => userMatchesBorrow(r, selectedUser));
                    let display = matched;
                    if (userBorrowFilter === 'current') display = matched.filter(r => !r.Return_Date);
                    if (userBorrowFilter === 'overdue') display = matched.filter(r => r.Due_Date && !r.Return_Date && new Date(r.Due_Date) < new Date());

                    if (display.length === 0) {
                      return <div style={{ color: '#666', textAlign: 'center', padding: '24px 0' }}>{userBorrowFilter === 'all' ? 'No borrows found.' : userBorrowFilter === 'overdue' ? 'No overdue items.' : 'No current borrows.'}</div>;
                    }

                    return (
                      <table className="data-table" style={{ width: '100%', fontSize: '0.98rem' }}>
                        <thead>
                          <tr>
                                  <th>Borrow ID</th>
                                  <th>Asset Title</th>
                                  <th>Type</th>
                                  <th>Borrow Date</th>
                                  <th>Due Date</th>
                                  <th>Return Date</th>
                                  <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {display.map(borrow => (
                            <tr key={borrow.Borrow_ID}>
                              <td>{borrow.Borrow_ID}</td>
                              <td>{borrow.Title || borrow.Asset_Title || borrow.Asset_ID}</td>
                              <td>{borrow.Asset_Type}</td>
                              <td>{formatDateForDisplay(borrow.Borrow_Date)}</td>
                              <td>{formatDateForDisplay(borrow.Due_Date)}</td>
                              <td>{borrow.Return_Date ? formatDateForDisplay(borrow.Return_Date) : '-'}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                      {(!borrow.Return_Date) && (
                                        <button
                                          onClick={() => handleReturnBorrow(borrow.Borrow_ID)}
                                          style={{ marginRight: '8px', padding: '6px 8px', borderRadius: '6px', background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer' }}
                                        >Return</button>
                                      )}
                                      {(userFinesMap[String(borrow.Borrow_ID)] && (userFinesMap[String(borrow.Borrow_ID)].Fine_Amount || userFinesMap[String(borrow.Borrow_ID)].Fine_Amount === 0)) && (
                                        <button
                                          onClick={() => handleWaiveFine(borrow.Borrow_ID)}
                                          style={{ padding: '6px 8px', borderRadius: '6px', background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer' }}
                                        >Waive Fine</button>
                                      )}
                                    </td>
                                  </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <h5 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '8px' }}>Fines & Overdue Summary</h5>
                  {userFines.length === 0 ? (
                    <div style={{ color: '#666', textAlign: 'center', padding: '12px 0' }}>No fines or overdue items.</div>
                  ) : (
                    <table className="data-table" style={{ width: '100%', fontSize: '0.97rem' }}>
                      <thead>
                        <tr>
                          <th>Borrow ID</th>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Borrow Date</th>
                          <th>Due Date</th>
                          <th>Return Date</th>
                          <th>Days Overdue</th>
                          <th>Fine Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userFines.map(fine => (
                          <tr key={fine.Borrow_ID} style={fine.Status === 'Pending' ? { background: '#fee2e2' } : {}}>
                            <td>{fine.Borrow_ID}</td>
                            <td>{fine.Item_Title}</td>
                            <td>{fine.Asset_Type}</td>
                            <td>{formatDateForDisplay(fine.Borrow_Date)}</td>
                            <td>{formatDateForDisplay(fine.Due_Date)}</td>
                            <td>{fine.Return_Date ? formatDateForDisplay(fine.Return_Date) : '-'}</td>
                            <td>{fine.Days_Overdue}</td>
                            <td style={{ color: parseFloat(fine.Fine_Amount) > 0 ? '#dc2626' : '#222', fontWeight: 600 }}>${parseFloat(fine.Fine_Amount).toFixed(2)}</td>
                            <td>{fine.Status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="user-modal-actions" style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            <button
              className={`edit-btn role-btn role-${mapRoleValueToName(selectedUser.role).toLowerCase()}`}
              onClick={() => {
                openEditUserModal(selectedUser);
              }}
            >
              Edit User
            </button>
            <button className="close-btn" onClick={() => setShowViewUserModal(false)} style={{ padding: '10px 24px', fontSize: '1rem', borderRadius: '8px', background: '#e5e7eb', color: '#222', fontWeight: 600 }}>Close</button>
>>>>>>> origin/main
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">Delete User?</h3>
            <p className="text-gray-500 text-center mb-6">
              Are you sure you want to delete <strong>{userToDelete?.Full_Name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteUserModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Drawer */}
      <UserProfileDrawer
        isOpen={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        userId={selectedProfileUserId}
      />
    </div>
  )
}

export default Admin
