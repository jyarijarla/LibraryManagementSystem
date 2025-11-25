import UserDropdown from '../../components/UserDropdown';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Admin.css'
import AuditLogs from './AuditLogs/AuditLogs'
import { LoadingOverlay, SuccessPopup, ErrorPopup, DeleteBlockedModal } from '../../components/FeedbackUI/FeedbackUI'
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts'
// import NotificationPanel from '../../components/NotificationPanel/NotificationPanel'
// Use local server for development, production for deployed app
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-joseph.onrender.com/api';


// Helper function to get image path for an asset
const getAssetImagePath = (assetType, assetId, extension = 'png') => {
  // Returns image path with specified extension
  // Default to .png, but can be .jpg, .jpeg, .gif, .webp, etc.
  return `/assets/${assetType}/${assetId}.${extension}`
}

// Generate random password for admin-created users when left blank
const generateInitialPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
  let password = 'Library';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
// Helper to get username from user object
const getUsername = (user) => user.username || user.studentId || '-';

// Robust first/last name getters with fallbacks for different API shapes
const getFirstName = (user) => {
  if (!user) return '-'
  // Prefer explicit first name fields
  const first = user.firstname || user.First_Name || user.firstName || user.first_name;
  if (first) return first;

  // If a combined name field exists, split and return the first token
  const full = user.name || user.Full_Name || user.fullName || user.full_name;
  if (full) {
    const parts = String(full).trim().split(/\s+/);
    return parts[0] || '-';
  }

  // Last resort: username or studentId
  return user.username || user.studentId || '-'
}

const getLastName = (user) => {
  if (!user) return '-'
  const last = user.lastname || user.Last_Name || user.lastName || user.last_name;
  if (last) return last;

  const full = user.name || user.Full_Name || user.fullName || user.full_name;
  if (full) {
    const parts = String(full).trim().split(/\s+/);
    return parts.slice(1).join(' ') || '';
  }

  return ''
}

// Robust DOB getter - check multiple possible field names
const getUserDOB = (user) => {
  if (!user) return ''
  const candidates = ['dateOfBirth', 'Date_Of_Birth', 'dob', 'DOB', 'birthDate', 'birth_date']
  for (const k of candidates) {
    if (user[k]) return user[k]
  }
  return ''
}

// Helper to match a borrow record to a user robustly (by ID first, then by name)
const userMatchesBorrow = (borrow, user) => {
  if (!borrow || !user) return false;

  // Helper to pick first non-null field from a list
  const pick = (obj, keys) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  };

  // Try several possible ID fields on the borrow record
  const borrowId = pick(borrow, ['Borrower_ID', 'BorrowerId', 'Borrower_Id', 'User_ID', 'UserId', 'BorrowerID']);
  const userId = pick(user, ['id', 'User_ID', 'userId', 'UserId']);

  if (borrowId != null && userId != null) {
    try {
      if (String(borrowId) === String(userId)) return true;
    } catch (e) {
      // ignore
    }
  }

  // Try matching by full name using various possible name fields
  const userFullName = `${user.firstname || user.First_Name || ''} ${user.lastname || user.Last_Name || ''}`.trim();
  const borrowFullName = pick(borrow, ['Borrower_Name']) || ((borrow.First_Name || borrow.FirstName || borrow.first_name) ? `${borrow.First_Name || borrow.FirstName || borrow.first_name} ${borrow.Last_Name || borrow.LastName || borrow.last_name || ''}`.trim() : undefined);
  if (userFullName && borrowFullName) {
    return userFullName === borrowFullName;
  }

  return false;
}
function Admin() {
        // Modal state for showing all users in Reports tab
        const [showUserListModal, setShowUserListModal] = useState(false);
      // Custom report state (for Reports tab)
      const [customReportType, setCustomReportType] = useState('table');
      const [pieActive, setPieActive] = useState(null);
      const [customReportData, setCustomReportData] = useState([]);
      const [customReportFilters, setCustomReportFilters] = useState({
        startDate: '',
        endDate: '',
        // assetType and userId are arrays when multi-select is used. Empty array means "All".
        assetType: [],
        userId: [],
        status: '' // '', 'current', 'returned' — filter by borrow status
      });
      const [customReportLoading, setCustomReportLoading] = useState(false);
      const [customReportError, setCustomReportError] = useState('');
    // Modal state for dashboard overview cards
    const [overviewModal, setOverviewModal] = useState(null);
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
  // User Management modal states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showForceDeleteConfirm, setShowForceDeleteConfirm] = useState(false);
  const [forceDeleteMessage, setForceDeleteMessage] = useState('');
  // User list filters & search UI
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userLimit, setUserLimit] = useState(200);
  // Delete-blocked modal state (Admin-only friendly warning)
  const [showDeleteBlockedModal, setShowDeleteBlockedModal] = useState(false);
  const [deleteBlockedInfo, setDeleteBlockedInfo] = useState([]);
  const [deleteBlockedCurrentCount, setDeleteBlockedCurrentCount] = useState(null);
  const [deleteBlockedTotalCount, setDeleteBlockedTotalCount] = useState(null);
  
  const [showViewUserModal, setShowViewUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  // Modal to show items for a quick-action borrower
  const [showBorrowerItemsModal, setShowBorrowerItemsModal] = useState(false);
  const [modalBorrower, setModalBorrower] = useState(null);
  const [modalBorrowerItems, setModalBorrowerItems] = useState([]);
  // Modal to show items for a timeline bucket (bar click)
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [bucketModalItems, setBucketModalItems] = useState([]);
  const [bucketModalTitle, setBucketModalTitle] = useState('');
  // Modal to show users who borrowed a specific asset in a time bucket
  const [showAssetBucketModal, setShowAssetBucketModal] = useState(false);
  const [assetBucketModalItems, setAssetBucketModalItems] = useState([]);
  const [assetBucketModalTitle, setAssetBucketModalTitle] = useState('');
  // User selector modal for reports
  const [showUserSelectorModal, setShowUserSelectorModal] = useState(false);
  const [userSelectorSearch, setUserSelectorSearch] = useState('');
  // Asset type dropdown open state (for custom checkbox dropdown)
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const assetDropdownRef = useRef(null);
  // Tab state for user view modal
  const [activeUserModalTab, setActiveUserModalTab] = useState('Personal Info');
  // Fines state for selected user
  const [userFines, setUserFines] = useState([]);
  // Borrow filter for user modal: 'current' | 'all' | 'overdue'
  const [userBorrowFilter, setUserBorrowFilter] = useState('current');
  // Map of fines by borrow id for quick lookup
  const [userFinesMap, setUserFinesMap] = useState({});

  // Helpers: current admin id (for processedBy)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser.id || currentUser.User_ID || null;

  // Keep a map of fines when userFines changes
  useEffect(() => {
    const map = {};
    (userFines || []).forEach(f => {
      if (f && f.Borrow_ID) map[String(f.Borrow_ID)] = f;
    });
    setUserFinesMap(map);
  }, [userFines]);

  // Fetch fines when modal opens or selectedUser changes
  useEffect(() => {
    if (showViewUserModal && selectedUser && selectedUser.id) {
      // Ensure we have latest borrow records when viewing a user
      try {
        fetchBorrowRecords();
      } catch (e) {
        console.error('Failed to refresh borrow records:', e);
      }

      // Debug log: show selectedUser and borrowRecords overview
      console.log('ViewUserModal opened for user:', selectedUser);
      // fetch fines for this user
      fetch(`${API_URL}/fines/user/${selectedUser.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setUserFines(Array.isArray(data) ? data : []))
        .catch(() => setUserFines([]));
    } else {
      setUserFines([]);
    }
  }, [showViewUserModal, selectedUser]);

  // Close asset dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(e.target)) {
        setAssetDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Return a borrow (admin action)
  const handleReturnBorrow = async (borrowId) => {
    if (!borrowId) return;
    if (!window.confirm(`Mark borrow #${borrowId} as returned?`)) return;
    setLoading(true);
    try {
      // Optimistic UI update: mark the borrow as returned locally so it disappears from 'current' immediately
      setBorrowRecords(prev => prev.map(r => r.Borrow_ID === borrowId ? { ...r, Return_Date: new Date().toISOString() } : r));

      const response = await fetch(`${API_URL}/borrow-records/${borrowId}/return`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to return borrow');
      // Show success popup
      setSuccessMessage(`Borrow ${borrowId} marked returned`);
      // Refresh data
      await fetchBorrowRecords();
      if (selectedUser && selectedUser.id) {
        // refresh fines as well
        const finesRes = await fetch(`${API_URL}/fines/user/${selectedUser.id}`);
        if (finesRes.ok) {
          const finesData = await finesRes.json();
          setUserFines(Array.isArray(finesData) ? finesData : []);
        }
      }
    } catch (err) {
      console.error('Return error:', err);
      setError(err.message || 'Failed to return borrow');
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  // Waive fine for a borrow (admin action)
  const handleWaiveFine = async (borrowId) => {
    if (!borrowId) return;
    if (!window.confirm(`Waive fine for borrow #${borrowId}?`)) return;
    setLoading(true);
    try {
      const body = { reason: 'Waived by admin', processedBy: currentUserId };
      const response = await fetch(`${API_URL}/fines/${borrowId}/waive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to waive fine');
      setSuccessMessage(`Fine waived for borrow ${borrowId}`);
      // Refresh fines and borrow records
      await fetchBorrowRecords();
      if (selectedUser && selectedUser.id) {
        const finesRes = await fetch(`${API_URL}/fines/user/${selectedUser.id}`);
        if (finesRes.ok) {
          const finesData = await finesRes.json();
          setUserFines(Array.isArray(finesData) ? finesData : []);
        }
      }
    } catch (err) {
      console.error('Waive error:', err);
      setError(err.message || 'Failed to waive fine');
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  // Form data shared by Create + Edit modals
  const [userForm, setUserForm] = useState({
    studentId: "", // used for username
    firstname: "",
    lastname: "",
    email: "",
    role: "Student",
    password: "",
    dateOfBirth: "",
    phone: ""
  });

  // Normalize various date formats to YYYY-MM-DD for <input type="date"> value
  const formatDateForInput = (val) => {
    if (!val) return ''
    // If already in YYYY-MM-DD form
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val
    // If it's an ISO string like 2025-11-18T00:00:00.000Z, take first 10 chars
    if (typeof val === 'string' && val.length >= 10 && /\d{4}-\d{2}-\d{2}/.test(val.slice(0,10))) return val.slice(0,10)
    // If it's a Date object or other string, try to create Date and format
    const d = new Date(val)
    if (isNaN(d)) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  // Format YYYY-MM-DD or Date-like value to localized date string without timezone shift
  const formatDateForDisplay = (val) => {
    if (!val) return '-'
    // If already in YYYY-MM-DD
    const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      const yyyy = parseInt(m[1], 10)
      const mm = parseInt(m[2], 10) - 1
      const dd = parseInt(m[3], 10)
      // Construct a local Date at midnight so toLocaleDateString preserves the calendar date
      return new Date(yyyy, mm, dd).toLocaleDateString()
    }
    // Fallback to Date parsing using UTC
    const d = new Date(val)
    if (isNaN(d)) return '-'
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toLocaleDateString()
  }

  // Parse user-entered date strings into YYYY-MM-DD.
  // Accepts 'YYYY-MM-DD' or 'MM/DD/YYYY' or 'M/D/YYYY'. Returns YYYY-MM-DD or null.
  const normalizeUserDOB = (input) => {
    if (!input) return null
    const s = String(input).trim()
    // Already YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoMatch) return s

    // MM/DD/YYYY or M/D/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) {
      let mm = parseInt(m[1], 10)
      let dd = parseInt(m[2], 10)
      const yyyy = parseInt(m[3], 10)
      if (mm < 1 || mm > 12) return null
      if (dd < 1 || dd > 31) return null
      mm = String(mm).padStart(2, '0')
      dd = String(dd).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    // Try Date parsing fallback (avoid timezone issues by using date parts)
    const d = new Date(s)
    if (!isNaN(d)) {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    return null
  }

  const mapRoleValueToName = (role) => {
    if (role === null || role === undefined) return 'Student'
    if (typeof role === 'number') {
      if (role === 1) return 'Student'
      if (role === 2) return 'Admin'
      if (role === 3) return 'Librarian'
      if (role === 4) return 'Teacher'
      return 'Student'
    }
    // if string, return normalized capitalization
    const s = String(role)
    if (/admin/i.test(s)) return 'Admin'
    if (/librarian/i.test(s)) return 'Librarian'
    if (/teacher/i.test(s)) return 'Teacher'
    return 'Student'
  }

  // Handle typing in the form
  const handleInputChange = (e) => {
    setUserForm({
      ...userForm,
      [e.target.name]: e.target.value,
    });
  };

  const openEditUserModal = (user) => {
  setSelectedUser(user);
  setUserForm({
    studentId: user.studentId || user.username || '',
    firstname: user.firstname || '',
    lastname: user.lastname || '',
    // keep username if present; otherwise fall back to studentId
    username: (user.username && String(user.username)) || (user.studentId && String(user.studentId)) || '',
    email: user.email || '',
    role: mapRoleValueToName(user.role),
    password: '', // blank when editing
    dateOfBirth: formatDateForInput(user.dateOfBirth),
    phone: user.phone || ''
  });
  setShowEditUserModal(true);
};

const openDeleteUserModal = (user) => {
  setSelectedUser(user);
  setShowDeleteUserModal(true);
};





// For delete modal
const [userToDelete, setUserToDelete] = useState(null);



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
    localStorage.removeItem('user')
    localStorage.removeItem('userId')
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

  // Sidebar collapsed state for left navigation
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
        await fetchAllUsers()
      } else if (activeTab === 'records') {
        await fetchBorrowRecords()
      } else if (activeTab === 'reports') {
        // Ensure reports and students are fetched so the User dropdown is populated
        await Promise.all([
          fetchReports().catch(e => console.error('Reports error:', e)),
          fetchStudents().catch(e => console.error('Students (reports) error:', e))
        ])
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
      // Ensure each inventory item has a numeric Utilization_Percentage
      const normalizedInventory = (Array.isArray(inventorySummary) ? inventorySummary : []).map(item => {
        // Defensive numeric parsing for fields that may be strings or null
        const totalCopies = Number(item.Total_Copies || item.TotalCopies || 0) || 0;
        const currentlyBorrowed = Number(item.Currently_Borrowed || item.CurrentlyBorrowed || 0) || 0;

        // Prefer server-provided Utilization if it's a valid number between 0 and 100
        let util = null;
        const rawUtil = item.Utilization_Percentage ?? item.UtilizationPercentage ?? item.utilization_percentage;
        if (rawUtil !== undefined && rawUtil !== null && rawUtil !== '') {
          const parsed = Number(rawUtil);
          if (!Number.isNaN(parsed) && isFinite(parsed)) util = parsed;
        }

        // If server didn't provide a sensible value, compute it: borrowed / totalCopies * 100
        if (util === null) {
          util = totalCopies > 0 ? Math.round((currentlyBorrowed / totalCopies) * 100) : 0;
        }

        return {
          Asset_Type: item.Asset_Type || item.AssetType || item.Type || 'Unknown',
          Unique_Items: Number(item.Unique_Items || item.UniqueItems || 0) || 0,
          Total_Copies: totalCopies,
          Total_Available: Number(item.Total_Available || item.TotalAvailable || 0) || 0,
          Currently_Borrowed: currentlyBorrowed,
          Utilization_Percentage: Math.max(0, Math.min(100, Math.round(util)))
        };
      });

      setInventorySummaryReport(normalizedInventory)
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
      const response = await fetch(`${API_URL}/students`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!response.ok) {
        console.error('Failed to fetch students, status:', response.status)
        // Try fallback: fetch all users (may include students)
        try {
          await fetchAllUsers()
          return
        } catch (fallbackErr) {
          throw new Error(`Failed to fetch students: ${response.status}`)
        }
      }
      const data = await response.json()
      console.log(`✅ Received ${data.length} students`)
      // Sort by id in ascending order
      const sortedData = data.sort((a, b) => (a.id || 0) - (b.id || 0))
      setStudents(sortedData)
    } catch (error) {
      console.error('❌ Error fetching students:', error)
      // Don't throw
    }
  }

  // Fetch all users (students + admins + librarians) for Admin Users tab
  const fetchAllUsers = async () => {
    try {
      console.log('Fetching all users...')
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      console.log(`✅ Received ${data.length} users`)
      const sortedData = Array.isArray(data) ? data.sort((a, b) => (a.id || 0) - (b.id || 0)) : []
      setStudents(sortedData)
    } catch (error) {
      console.error('❌ Error fetching users:', error)
    }
  }

  // Helper to refresh the appropriate user list depending on active tab.
  // When on the Admin 'users' tab we want the full users list; otherwise keep fetching students.
  const refreshUserList = async () => {
    try {
      if (activeTab === 'users') {
        await fetchAllUsers()
      } else {
        await fetchStudents()
      }
    } catch (err) {
      console.error('Error refreshing user list:', err)
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

const handleCreateUser = async (e) => {
  e.preventDefault();
  console.log("Submitting new user:", userForm);

  try {
    // Normalize DOB before sending (accept user entered formats)
    const normalizedDOB = normalizeUserDOB(userForm.dateOfBirth) || normalizeUserDOB(formatDateForInput(userForm.dateOfBirth))
    if (!normalizedDOB) throw new Error('Please enter a valid Date of Birth (MM/DD/YYYY or YYYY-MM-DD)')

    // Map form fields to server's member creation API and ensure password
    // Convert role name to numeric value expected by backend
    const roleNameToValue = (r) => {
      if (r === null || r === undefined) return undefined;
      const s = String(r).toLowerCase();
      if (s === 'student' || s === '1') return 1;
      if (s === 'admin' || s === '2') return 2;
      if (s === 'librarian' || s === '3') return 3;
      if (s === 'teacher' || s === '4') return 4;
      return 1;
    };

    const payload = {
      firstName: userForm.firstname,
      lastName: userForm.lastname,
      email: userForm.email,
      phone: userForm.phone,
      username: (userForm.studentId && String(userForm.studentId).trim()) || (userForm.username && String(userForm.username).trim()) || '',
      dateOfBirth: normalizedDOB,
      password: userForm.password && String(userForm.password).trim() ? userForm.password : generateInitialPassword(),
      role: roleNameToValue(userForm.role)
    }

    const response = await fetch(`${API_URL}/members`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload),
    });
    // Diagnostic: log payload sent to server
    try { console.log('Create member payload:', payload); } catch (e) { /* ignore */ }

    const data = await response.json();

    if (!response.ok) {
      console.error('Create student server response:', data);
      throw new Error(data.error || data.message || 'Failed to create user');
    }

    setShowCreateUserModal(false);
    await refreshUserList(); // refresh the list (respect current tab)
    setUserForm({ studentId: "", firstname: "", lastname: "", email: "", role: "Student", password: "", dateOfBirth: "", phone: "" });
  } catch (err) {
    setError(err.message);
    console.error("Create error response:", err.message);
  }
};


const handleEditUser = async (e) => {
  e.preventDefault();

  try {
    // Normalize DOB before sending
    const normalizedDOB = normalizeUserDOB(userForm.dateOfBirth) || normalizeUserDOB(formatDateForInput(userForm.dateOfBirth))
    if (userForm.dateOfBirth && !normalizedDOB) throw new Error('Please enter a valid Date of Birth (MM/DD/YYYY or YYYY-MM-DD)')

    // Only use studentId for username
    const coercedUsername = (userForm.studentId && String(userForm.studentId).trim()) || '';
    if (!coercedUsername) throw new Error('Username is required and cannot be empty');
    // Convert role name to numeric value expected by backend
    const roleName = userForm.role || '';
    const roleNameToValue = (r) => {
      if (r === null || r === undefined) return undefined;
      const s = String(r).toLowerCase();
      if (s === 'student' || s === '1') return 1;
      if (s === 'admin' || s === '2') return 2;
      if (s === 'librarian' || s === '3') return 3;
      if (s === 'teacher' || s === '4') return 4;
      return 1;
    };

    const roleVal = roleNameToValue(roleName);

    // Map frontend form to admin user update endpoint and call users endpoint
    const payload = {
      firstName: userForm.firstname,
      lastName: userForm.lastname,
      email: userForm.email,
      phone: userForm.phone,
      dateOfBirth: normalizedDOB,
      role: roleVal
    };

    const response = await fetch(`${API_URL}/users/${selectedUser.id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update user');

    // Apply updated values to the selectedUser and the edit form so the View modal
    // (which may be open underneath the Edit modal) shows the changes immediately.
    const updatedFields = {
      firstname: (payload && payload.firstName) || userForm.firstname,
      lastname: (payload && payload.lastName) || userForm.lastname,
      email: (payload && payload.email) || userForm.email,
      studentId: (payload && payload.studentId) || userForm.studentId || '',
      username: (payload && payload.studentId) || userForm.username || '',
      phone: (payload && payload.phone) || userForm.phone || '',
      dateOfBirth: normalizedDOB || userForm.dateOfBirth || '',
      // keep role as numeric value so mapRoleValueToName works consistently elsewhere
      role: (payload && payload.role) || roleVal
    };

    setSelectedUser(prev => ({ ...(prev || {}), ...updatedFields }));
    setUserForm(prev => ({ ...prev, ...updatedFields }));

    setShowEditUserModal(false);
    await refreshUserList();
  } catch (err) {
    setError(err.message);
    console.error("Edit error response:", err.message);
  }
};


const handleDeleteUser = async () => {
  if (!selectedUser) return;

  try {
    const response = await fetch(`${API_URL}/members/${selectedUser.id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to delete user');

    setShowDeleteUserModal(false);
    await refreshUserList();
  } catch (err) {
    setError(err.message);
    console.error("Delete error response:", err.message);
  }
};

// Enhanced delete: if server blocks due to unpaid fines, offer a force option
const handleDeleteUserWithForce = async () => {
  if (!selectedUser) return;

  try {
    const response = await fetch(`${API_URL}/members/${selectedUser.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      setShowDeleteUserModal(false);
      await refreshUserList();
      return;
    }

    // If server provided structured blockers, show friendly Admin-only modal
    if (data && Array.isArray(data.blocks) && data.blocks.length) {
      try {
        // Compute counts from local borrowRecords (best-effort). If stale, the modal notes server-provided details.
        const current = Array.isArray(borrowRecords) ? borrowRecords.filter(r => !r.Return_Date && userMatchesBorrow(r, selectedUser)).length : null;
        const total = Array.isArray(borrowRecords) ? borrowRecords.filter(r => userMatchesBorrow(r, selectedUser)).length : null;
        setDeleteBlockedCurrentCount(current);
        setDeleteBlockedTotalCount(total);
        setDeleteBlockedInfo(Array.isArray(data.blocks) ? data.blocks : []);
        // Close the simple delete confirmation and open the nicer blocked modal
        setShowDeleteUserModal(false);
        setShowDeleteBlockedModal(true);
      } catch (e) {
        // Fallback: surface a generic error if computation fails
        setError('Cannot delete user: account has active borrows or outstanding fines.');
      }
      return;
    }

    // If blocked due to unpaid fines, ask for confirmation to force anonymize
    const msg = (data && (data.error || data.message)) || 'Failed to delete user';
    const unpaidPattern = /unpaid/i;
    if (unpaidPattern.test(msg)) {
      // Show an inline confirmation modal (nicer UI) instead of window.confirm
      setForceDeleteMessage(msg + '\n\nForce anonymize this account anyway? (This will disable the account and remove PII)');
      setShowForceDeleteConfirm(true);
      return;
    }

    // Otherwise show error
    throw new Error(msg);
  } catch (err) {
    setError(err.message);
    console.error('Delete error response:', err.message);
  }
};

  // Copy helper for modal values
  const copyToClipboard = async (text) => {
    if (!text) return;
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setSuccessMessage('Copied to clipboard')
      setTimeout(() => setSuccessMessage(''), 1800)
    } catch (err) {
      console.error('Copy failed', err)
      setError('Failed to copy to clipboard')
      setTimeout(() => setError(''), 2000)
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

    const getIconForType = (type) => {
      if (!type) return '📦';
      const t = String(type).toLowerCase();
      if (t === 'book' || t === 'books') return ICONS['Books'] || '📚';
      if (t === 'cd' || t === 'cds') return ICONS['CDs'] || '💿';
      if (t === 'audiobook' || t === 'audiobooks') return ICONS['Audiobooks'] || '🎧';
      if (t === 'movie' || t === 'movies') return ICONS['Movies'] || '🎬';
      if (t === 'technology' || t === 'tech' || t === 'technologys') return ICONS['Technology'] || '💻';
      if (t.includes('study') || t.includes('room')) return ICONS['Study Rooms'] || '🚪';
      // fallback: try direct key
      return ICONS[type] || '📦';
    }

    return (
    <div className="tab-content overview-layout">
      <div className="overview-hero">
        <div>
          <h1 className="title">Welcome back, {getFirstName(currentUser)}</h1>
          <div className="subtitle">Quick summary of library activity and recent changes</div>
        </div>
          <div className="overview-actions">
          <button className="btn primary" onClick={() => changeTab('reports')} title="Open Reports">
            <span className="btn-icon" aria-hidden>📊</span>
            <span className="btn-label">Open Reports</span>
          </button>
          <button className="btn logs" onClick={() => changeTab('audit-logs')} title="Open Audit Logs">
            <span className="btn-icon" aria-hidden>📝</span>
            <span className="btn-label">Open Logs</span>
          </button>
        </div>
      </div>

      <ErrorPopup errorMessage={error} />

      <div className="overview-cards">
        <div className="stat-card" onClick={() => setOverviewModal('assets')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon blue">📚</div>
          <div className="stat-details">
            <h3>{books.length + cds.length + audiobooks.length + movies.length + technology.length + studyRooms.length}</h3>
            <p>Total Assets</p>
          </div>
        </div>
        <div className="stat-card" onClick={() => setOverviewModal('students')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon purple">👥</div>
          <div className="stat-details">
            <h3>{students.length}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card" onClick={() => setOverviewModal('borrowed')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon orange">📖</div>
          <div className="stat-details">
            <h3>{borrowRecords.filter(r => !r.Return_Date).length}</h3>
            <p>Currently Borrowed</p>
          </div>
        </div>
      </div>

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
                {/*<strong style={{ marginRight: 8, flex: '0 0 auto' }}>Counts:</strong>
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
                })}*/}
              </div>
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="data-table overview-modal-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>ID</th>
                      <th>Title / Name</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'center' }}>Available</th>
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
                            {a.Image_URL ? (
                              <img src={`${a.Image_URL}?t=${imageRefreshKey}`} alt={title} className="overview-modal-thumb" onError={(e) => { e.target.style.display = 'none' }} />
                            ) : (
                              <div className="overview-modal-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }} aria-hidden>
                                {getIconForType(a.__type)}
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{id}</td>
                          <td>{title}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{a.__type}</td>
                          <td style={{ textAlign: 'center' }}>{available}</td>
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
                        <td>{getFirstName(s)}</td>
                        <td>{getLastName(s) || '-'}</td>
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
                    <th>Username</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Due Date</th>
                    <th>Days Overdue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowRecords.filter(r => !r.Return_Date).map(r => {
                    // Defensive field extraction for username / names
                    const username = r.Username || r.username || r.User_Username || r.UserName || r.studentId || '';
                    const firstName = r.First_Name || r.firstName || r.firstname || r.User_FirstName || '';
                    const lastName = r.Last_Name || r.lastName || r.lastname || r.User_LastName || '';

                    // If no separate name fields, try to split Borrower_Name
                    let derivedFirst = firstName;
                    let derivedLast = lastName;
                    if (!derivedFirst && !derivedLast && r.Borrower_Name) {
                      const parts = String(r.Borrower_Name).trim().split(/\s+/);
                      derivedFirst = parts[0] || '';
                      derivedLast = parts.slice(1).join(' ') || '';
                    }

                    const assetTitle = r.Title || r.Item_Title || r.Asset_Title || '-';
                    const assetType = r.Type || r.Asset_Type || r.AssetType || '-';

                    // Compute days overdue: prefer server-provided Days_Overdue, otherwise compute from Due_Date
                    let daysOverdue = r.Days_Overdue;
                    if (daysOverdue === undefined || daysOverdue === null || daysOverdue === '') {
                      if (r.Due_Date) {
                        try {
                          const due = new Date(r.Due_Date);
                          const today = new Date();
                          const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                          const diffMs = todayDateOnly - dueDateOnly;
                          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                          daysOverdue = diffDays > 0 ? diffDays : 0;
                        } catch (e) {
                          daysOverdue = '-';
                        }
                      } else {
                        daysOverdue = '-';
                      }
                    }

                    return (
                      <tr key={r.Borrow_ID || `${r.User_ID || r.Username || Math.random()}` }>
                        <td style={{ whiteSpace: 'nowrap' }}>{username || '-'}</td>
                        <td>{derivedFirst || '-'}</td>
                        <td>{derivedLast || '-'}</td>
                        <td>{assetTitle}</td>
                        <td>{assetType}</td>
                        <td>{formatDateForDisplay(r.Due_Date)}</td>
                        <td style={{ color: '#dc2626' }}>{typeof daysOverdue === 'number' ? daysOverdue : daysOverdue}</td>
                        <td><span className={`status-badge ${r.Return_Date ? 'returned' : 'borrowed'}`}>{r.Return_Date ? 'Returned' : 'Borrowed'}</span></td>
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
      )}

      <div className="overview-grid">
        <div className="overview-panel overview-charts">
          <h3 className="chart-title" style={{ marginBottom: '12px' }}>
            <span className="chart-title-icon" aria-hidden>📊</span>
            <span>Asset Type Breakdown</span>
            <small className="chart-sub">Counts & share by asset type</small>
          </h3>
          {(() => {
            // Prepare breakdown data with percentages and color mapping
            const raw = [
              { type: 'Books', count: books.length },
              { type: 'CDs', count: cds.length },
              { type: 'Audiobooks', count: audiobooks.length },
              { type: 'Movies', count: movies.length },
              { type: 'Technology', count: technology.length },
              { type: 'Study Rooms', count: studyRooms.length }
            ];
            const total = raw.reduce((s, r) => s + (Number(r.count) || 0), 0) || 1;
            const COLORS_MAP = {
              'Books': '#6366f1',
              'CDs': '#f97316',
              'Audiobooks': '#06b6d4',
              'Movies': '#ef4444',
              'Technology': '#10b981',
              'Study Rooms': '#8b5cf6'
            };

            const data = raw.map(r => {
              const cnt = Number(r.count) || 0;
              const pct = Math.round((cnt / total) * 100);
              return { ...r, percent: pct, label: `${cnt} (${pct}%)`, color: COLORS_MAP[r.type] || '#64748b' };
            }).sort((a, b) => b.count - a.count);

            return (
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 58, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eefc" />
                    <XAxis dataKey="type" angle={-30} textAnchor="end" interval={0} height={70} tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name, props) => {
                        if (name === 'count') return [value, 'Count'];
                        return [value, name];
                      }}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e6eefc' }}
                    />
                    <Legend verticalAlign="top" align="center" layout="horizontal" wrapperStyle={{ top: 8 }} height={24} />
                    <Bar dataKey="count" name="Count">
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList dataKey="label" position="top" style={{ fontSize: 12, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {data.map(d => (
                    <div key={d.type} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '6px 10px', borderRadius: 8, border: '1px solid #eef2ff' }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, display: 'inline-block', background: d.color }} aria-hidden></span>
                      <span style={{ fontWeight: 700 }}>{d.type}</span>
                      <span style={{ color: '#6b7280' }}>· {d.count} ({d.percent}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        <div className="overview-panel overview-mini">
          <h3>Quick Actions & Recent</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <strong>Recent additions</strong>
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                {[...books, ...cds, ...audiobooks, ...movies, ...technology, ...studyRooms].slice(-6).reverse().map(a => (
                  <li key={a.Asset_ID || a.Room_Number || a.Model_Num} style={{ padding: '6px 0', borderBottom: '1px dashed #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {a.Image_URL ? (
                            <img src={`${a.Image_URL}?t=${imageRefreshKey}`} alt={a.Title || 'asset'} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6 }} onError={(e) => e.target.style.display='none'} />
                          ) : (
                            <span style={{ fontSize: 18 }}>{getIconForType(a.__type || a.Type || a.Asset_Type)}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{a.Title || a.Room_Number || a.Model_Num || 'Asset'}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{a.__type || a.Type || a.Asset_Type || ''}</div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <strong>Top borrowers (live)</strong>
              <ul style={{ marginTop: 8, marginBottom: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {borrowRecords.slice(0,6).map(b => {
                  const username = b.Username || b.username || b.User_Username || b.UserName || b.Student_ID || '';
                  const first = b.First_Name || b.firstName || b.firstname || b.User_FirstName || '';
                  const last = b.Last_Name || b.lastName || b.lastname || b.User_LastName || '';
                  const nameFromParts = (first || last) ? `${first} ${last}`.trim() : '';
                  const display = username || b.Borrower_Name || nameFromParts || (b.User_ID ? `#${b.User_ID}` : '') || 'User';
                  const subtitle = username ? (nameFromParts || '') : (b.Borrower_Name ? '' : 'User');

                  const openBorrowerItemsModal = (record) => {
                    // Build identifying pieces
                    const id = record.User_ID || record.UserId || record.Borrower_ID || record.BorrowerId || null;
                    const uname = record.Username || record.username || record.User_Username || record.UserName || record.Student_ID || '';
                    const f = record.First_Name || record.firstName || record.firstname || '';
                    const l = record.Last_Name || record.lastName || record.lastname || '';
                    const full = record.Borrower_Name || `${f} ${l}`.trim();

                    const items = borrowRecords.filter(r => {
                      const rId = r.User_ID || r.UserId || r.Borrower_ID || r.BorrowerId || null;
                      const rU = r.Username || r.username || r.User_Username || r.UserName || r.Student_ID || '';
                      const rFull = r.Borrower_Name || `${r.First_Name || r.firstName || ''} ${r.Last_Name || r.lastName || ''}`.trim();
                      if (id && rId && String(id) === String(rId)) return true;
                      if (uname && rU && uname === rU) return true;
                      if (full && rFull && full === rFull) return true;
                      return false;
                    });

                    setModalBorrower({ id, username: uname, first: f, last: l, display: display });
                    setModalBorrowerItems(items);
                    setShowBorrowerItemsModal(true);
                  };

                  return (
                    <li key={b.Borrow_ID || b.User_ID || display} style={{ padding: '8px 10px', borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }} aria-hidden>👤</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{display}</div>
                          {nameFromParts && <div style={{ fontSize: 12, color: '#6b7280' }}>{nameFromParts}</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="small-btn" onClick={() => openBorrowerItemsModal(b)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>View items</button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Borrower Items Modal */}
          {showBorrowerItemsModal && modalBorrower && (
            <div className="modal-overlay" onClick={() => setShowBorrowerItemsModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px' }}>
                <h3 style={{ marginTop: 0 }}>Items for {modalBorrower.display || modalBorrower.username || 'User'}</h3>
                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {modalBorrowerItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>No borrows found for this user.</div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Borrow ID</th>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Borrow Date</th>
                          <th>Due Date</th>
                          <th>Return Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalBorrowerItems.map(it => (
                          <tr key={it.Borrow_ID}>
                            <td>{it.Borrow_ID}</td>
                            <td>{it.Title || it.Item_Title || it.Asset_Title || '-'}</td>
                            <td>{it.Type || it.Asset_Type || '-'}</td>
                            <td>{formatDateForDisplay(it.Borrow_Date)}</td>
                            <td>{formatDateForDisplay(it.Due_Date)}</td>
                            <td>{it.Return_Date ? formatDateForDisplay(it.Return_Date) : '-'}</td>
                            <td><span className={`status-badge ${it.Return_Date ? 'returned' : 'borrowed'}`}>{it.Return_Date ? 'Returned' : 'Borrowed'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="modal-actions">
                  <button className="close-btn" onClick={() => setShowBorrowerItemsModal(false)}>Close</button>
                </div>
              </div>
            </div>
          )}
          {showBucketModal && (
            <div className="modal-overlay" onClick={() => setShowBucketModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '920px' }}>
                <h3 style={{ marginTop: 0 }}>{bucketModalTitle || 'Bucket Details'}</h3>
                <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                  {(!bucketModalItems || bucketModalItems.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>No items in this bucket.</div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Borrow ID</th>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Borrower</th>
                          <th>Borrow Date</th>
                          <th>Due Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bucketModalItems.map(it => {
                          const borrowerName = it.Borrower_Name || `${it.First_Name || it.firstName || ''} ${it.Last_Name || it.lastName || ''}`.trim() || (it.Username || it.username) || '-';
                          const title = it.Title || it.Item_Title || it.Asset_Title || '-';
                          const type = it.Type || it.Asset_Type || '-';
                          return (
                            <tr key={it.Borrow_ID || Math.random()}>
                              <td>{it.Borrow_ID}</td>
                              <td>{title}</td>
                              <td>{type}</td>
                              <td>{borrowerName}</td>
                              <td>{formatDateForDisplay(it.Borrow_Date)}</td>
                              <td>{formatDateForDisplay(it.Due_Date)}</td>
                              <td><span className={`status-badge ${it.Return_Date ? 'returned' : 'borrowed'}`}>{it.Return_Date ? 'Returned' : 'Borrowed'}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="modal-actions">
                  <button className="close-btn" onClick={() => setShowBucketModal(false)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {showAssetBucketModal && (
            <div className="modal-overlay" onClick={() => setShowAssetBucketModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '920px' }}>
                <h3 style={{ marginTop: 0 }}>{assetBucketModalTitle || 'Asset Borrowers'}</h3>
                <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                  {(!assetBucketModalItems || assetBucketModalItems.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>No borrows for this asset in the selected time bucket.</div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Borrow ID</th>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Borrower</th>
                          <th>Borrow Date</th>
                          <th>Due Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetBucketModalItems.map(it => {
                          const borrowerName = it.Borrower_Name || `${it.First_Name || it.firstName || ''} ${it.Last_Name || it.lastName || ''}`.trim() || (it.Username || it.username) || '-';
                          const title = it.Title || it.Item_Title || it.Asset_Title || '-';
                          const type = it.Type || it.Asset_Type || '-';
                          return (
                            <tr key={it.Borrow_ID || Math.random()}>
                              <td>{it.Borrow_ID}</td>
                              <td>{title}</td>
                              <td>{type}</td>
                              <td>{borrowerName}</td>
                              <td>{formatDateForDisplay(it.Borrow_Date)}</td>
                              <td>{formatDateForDisplay(it.Due_Date)}</td>
                              <td><span className={`status-badge ${it.Return_Date ? 'returned' : 'borrowed'}`}>{it.Return_Date ? 'Returned' : 'Borrowed'}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="modal-actions">
                  <button className="close-btn" onClick={() => setShowAssetBucketModal(false)}>Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    )
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
                  <td>{getFirstName(student)}</td>
                  <td>{getLastName(student) || '-'}</td>
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

    // Generate custom report handler (must be outside renderReports)
    const generateCustomReport = async () => {
      // Allow generation when either "All Students" or "All Asset Types" is selected,
      // otherwise require start/end + at least one asset + at least one user.
      const isAllUsersSelected = (() => {
        const u = customReportFilters.userId;
        if (!u) return false;
        if (Array.isArray(u)) return u.length === 0 || u.includes('') || u.some(i => (i && typeof i === 'object' && (i.id === '' || i.studentId === '' || i.username === '')));
        return String(u) === '';
      })();
      const isAllAssetsSelected = (() => {
        const a = customReportFilters.assetType;
        if (!a) return false;
        if (Array.isArray(a)) return a.length === 0 || a.includes('') || a.some(i => (i && typeof i === 'object' && (i.id === '' || i.value === '' || i.name === '')));
        return String(a) === '';
      })();
      const hasEssentialFilters = customReportFilters.startDate && customReportFilters.endDate && (customReportFilters.assetType && customReportFilters.assetType.length) && (customReportFilters.userId && customReportFilters.userId.length);
      if (!(isAllUsersSelected || isAllAssetsSelected || hasEssentialFilters)) {
        setCustomReportError('Please select either All Students, All Asset Types, or provide Start Date, End Date, at least one Asset Type, and at least one User.');
        return;
      }

      setCustomReportLoading(true);
      setCustomReportError('');
      try {
        const params = new URLSearchParams();
        if (customReportFilters.startDate) params.append('startDate', customReportFilters.startDate);
        if (customReportFilters.endDate) params.append('endDate', customReportFilters.endDate);
        // assetType and userId may be arrays (multi-select). Append each value separately.
        if (customReportFilters.assetType) {
          if (Array.isArray(customReportFilters.assetType)) {
            customReportFilters.assetType.forEach(t => { if (t) params.append('assetType', t) });
          } else {
            params.append('assetType', customReportFilters.assetType);
          }
        }
        if (customReportFilters.userId) {
          if (Array.isArray(customReportFilters.userId)) {
            customReportFilters.userId.forEach(u => { if (u) params.append('userId', u) });
          } else {
            params.append('userId', customReportFilters.userId);
          }
        }
        if (customReportFilters.status) params.append('status', customReportFilters.status);

        const response = await fetch(`${API_URL}/reports/custom?${params.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          // try to parse server error
          let msg = `Failed to fetch custom report (${response.status})`;
          try {
            const errBody = await response.json();
            if (errBody && errBody.error) msg = errBody.error + (errBody.details ? `: ${errBody.details}` : '');
          } catch (e) {
            // ignore JSON parse errors
          }
          // If 404, give a helpful hint about server route or restart
          if (response.status === 404) {
            msg = `${msg} — route not found. Is the backend running with the latest code? Try restarting the server.`
          }
          throw new Error(msg);
        }

        const data = await response.json();
        setCustomReportData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Custom report error:', err);
        setCustomReportError(err.message || 'Error generating report');
      } finally {
        setCustomReportLoading(false);
      }
    };

    const isAllUsersSelected = (() => {
      const u = customReportFilters.userId;
      if (!u) return true; // no selection considered 'All'
      if (Array.isArray(u) && u.length === 0) return true;
      if (Array.isArray(u) && u.includes('')) return true;
      if (typeof u === 'string' && u === '') return true;
      return false;
    })();

    const isAllAssetsSelected = (() => {
      const a = customReportFilters.assetType;
      if (!a) return true;
      if (Array.isArray(a) && a.length === 0) return true;
      if (Array.isArray(a) && a.includes('')) return true;
      if (typeof a === 'string' && a === '') return true;
      return false;
    })();

    // Allow generation if either all users OR all assets are selected (they imply broad report),
    // otherwise require start+end+at least one user and asset type.
    const canGenerate = isAllUsersSelected || isAllAssetsSelected || (
      customReportFilters.startDate && customReportFilters.endDate && (customReportFilters.assetType && customReportFilters.assetType.length) && (customReportFilters.userId && customReportFilters.userId.length)
    );

    return (
      <div className="tab-content">
        <ErrorPopup errorMessage={error} />

        {/* Custom Report Generator - stylish layout */}
        <div className="report-section" style={{ marginBottom: '36px', borderRadius: '14px', padding: '22px', background: 'linear-gradient(180deg,#ffffff 0%,#fbfdff 100%)', boxShadow: '0 6px 20px rgba(2,6,23,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>✨ Generate Custom Report</h3>
              <p style={{ margin: '6px 0 0 0', color: '#6b7280', maxWidth: 720 }}>Create tailored reports using dates, asset types, users and status. Choose a view and preview results instantly.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { setCustomReportFilters({ startDate: '', endDate: '', assetType: [], userId: [], status: '' }); setCustomReportData([]); }} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e6eef8', background: '#fff', cursor: 'pointer' }}>Reset</button>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); generateCustomReport(); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12, alignItems: 'end' }}>
            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, fontSize: 13 }}>Start</label>
              <input type="date" value={customReportFilters.startDate} onChange={e => setCustomReportFilters(f => ({ ...f, startDate: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e6eef8', background: '#fff' }} />
            </div>
            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, fontSize: 13 }}>End</label>
              <input type="date" value={customReportFilters.endDate} onChange={e => setCustomReportFilters(f => ({ ...f, endDate: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e6eef8', background: '#fff' }} />
            </div>
            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, fontSize: 13 }}>Asset Type</label>
              <div ref={assetDropdownRef} style={{ position: 'relative', width: '100%' }}>
                <div
                  onClick={() => setAssetDropdownOpen(o => !o)}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e6eef8', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {(() => {
                    const list = Array.isArray(customReportFilters.assetType) ? customReportFilters.assetType : (customReportFilters.assetType ? [customReportFilters.assetType] : []);
                    if (!list || list.length === 0) return 'All Asset Types';
                    const names = list.map(a => a.replace(/-/g, ' '));
                    if (names.length <= 2) return names.join(', ');
                    return `${names.slice(0,2).join(', ')} +${names.length - 2}`;
                  })()}
                </div>
                {assetDropdownOpen && (
                  <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #e6eef8', borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.06)', zIndex: 30, maxHeight: 240, overflowY: 'auto', padding: 8 }}>
                    {[
                      { value: 'books', label: 'Books' },
                      { value: 'cds', label: 'CDs' },
                      { value: 'audiobooks', label: 'Audiobooks' },
                      { value: 'movies', label: 'Movies' },
                      { value: 'technology', label: 'Technology' },
                      { value: 'study-rooms', label: 'Study Rooms' }
                    ].map(opt => {
                      const checked = Array.isArray(customReportFilters.assetType) ? customReportFilters.assetType.includes(opt.value) : customReportFilters.assetType === opt.value;
                      return (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', borderRadius: 6, background: checked ? '#f8fafc' : 'transparent', cursor: 'pointer' }}>
                          <input type="checkbox" checked={checked} onChange={() => {
                            if (!Array.isArray(customReportFilters.assetType)) {
                              setCustomReportFilters(f => ({ ...f, assetType: checked ? [] : [opt.value] }));
                              return;
                            }
                            if (checked) {
                              setCustomReportFilters(f => ({ ...f, assetType: f.assetType.filter(x => x !== opt.value) }));
                            } else {
                              setCustomReportFilters(f => ({ ...f, assetType: [...(f.assetType || []), opt.value] }));
                            }
                          }} />
                          <span style={{ flex: 1 }}>{opt.label}</span>
                        </label>
                      )
                    })}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setCustomReportFilters(f => ({ ...f, assetType: [] }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6eef8', background: '#fff' }}>Clear</button>
                      <button type="button" onClick={() => setAssetDropdownOpen(false)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff' }}>Done</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, fontSize: 13 }}>User</label>
              <div>
                {(() => {
                  const normalizedStudents = Array.isArray(students) ? students.map(s => ({
                    ...s,
                    firstname: s.firstname || s.firstName || s.First_Name || '',
                    lastname: s.lastname || s.lastName || s.Last_Name || '',
                    username: s.username || s.userName || s.Username || s.studentId || '',
                    studentId: s.studentId || s.Student_ID || s.username || '',
                  })) : [];
                  const studentCandidates = normalizedStudents.filter(u => (!!u.studentId) || (!!u.username) || !!(u.firstname || u.lastname));
                  const dropdownUsers = [ { id: '', firstname: 'All', lastname: 'Students', username: '', studentId: '' }, ...studentCandidates ];
                  return <UserDropdown users={dropdownUsers} value={customReportFilters.userId} onChange={val => setCustomReportFilters(f => ({ ...f, userId: val }))} allLabel="All Students" multi={true} />
                })()}
              </div>
            </div>

            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, fontSize: 13 }}>Status</label>
              <select value={customReportFilters.status} onChange={e => setCustomReportFilters(f => ({ ...f, status: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e6eef8', background: '#fff' }}>
                <option value="">Any</option>
                <option value="current">Currently Borrowed</option>
                <option value="returned">Returned</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 700, fontSize: 13 }}>View</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setCustomReportType('table')} style={{ padding: '8px 12px', borderRadius: 8, border: customReportType === 'table' ? '1px solid #6366f1' : '1px solid #e6eef8', background: customReportType === 'table' ? '#eef2ff' : '#fff' }}>Table</button>
                <button type="button" onClick={() => setCustomReportType('bar')} style={{ padding: '8px 12px', borderRadius: 8, border: customReportType === 'bar' ? '1px solid #6366f1' : '1px solid #e6eef8', background: customReportType === 'bar' ? '#eef2ff' : '#fff' }}>Bar</button>
                <button type="button" onClick={() => setCustomReportType('pie')} style={{ padding: '8px 12px', borderRadius: 8, border: customReportType === 'pie' ? '1px solid #6366f1' : '1px solid #e6eef8', background: customReportType === 'pie' ? '#eef2ff' : '#fff' }}>Pie</button>
              </div>
            </div>

            <div style={{ gridColumn: 'span 6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="submit" disabled={customReportLoading || !canGenerate} style={{ padding: '12px 18px', borderRadius: 12, border: 'none', background: customReportLoading ? 'linear-gradient(90deg,#c7b3ff,#98f0f6)' : 'linear-gradient(90deg,#7c3aed,#06b6d4)', color: '#fff', fontWeight: 800 }}>{customReportLoading ? 'Generating...' : 'Generate Report'}</button>
            </div>
            {!canGenerate && (
              <div style={{ gridColumn: 'span 12', color: '#b91c1c', fontSize: 13 }}>
                Please select either <strong>All Students</strong> or <strong>All Asset Types</strong>, or provide <strong>Start Date</strong>, <strong>End Date</strong>, at least one <strong>Asset Type</strong> and at least one <strong>User</strong> before generating a report.
              </div>
            )}
          </form>

          {customReportError && <div style={{ marginTop: 12 }}><ErrorPopup errorMessage={customReportError} /></div>}

          <div style={{ marginTop: 18 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 4px 14px rgba(2,6,23,0.03)' }}>
              {customReportLoading && <div style={{ padding: 28, textAlign: 'center', color: '#6b7280' }}>Generating report...</div>}
              {!customReportLoading && customReportData.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af' }}>No results yet — try different filters and generate a report.</div>}

              {!customReportLoading && customReportData.length > 0 && (
                <div>
                  {customReportType === 'table' && (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {(() => {
                              const formatColumnHeader = (col) => {
                                if (!col) return '';
                                const s = String(col);
                                const key = s.toLowerCase();
                                // common mappings
                                const mappings = [
                                  { re: /(^|_|\b)(first|first_name|firstname|user_first|borrower_first)/i, label: 'First Name' },
                                  { re: /(^|_|\b)(last|last_name|lastname|user_last|borrower_last)/i, label: 'Last Name' },
                                  { re: /(^|_|\b)(user_?name|username|studentid|student_id|userusername)/i, label: 'Username' },
                                  { re: /(^|_|\b)(email|user_email|useremail)/i, label: 'Email' },
                                  { re: /(^|_|\b)(borrow_?id|borrowid|id)$/, label: 'Borrow ID' },
                                  { re: /(^|_|\b)(title|item_title|asset_title)/i, label: 'Title' },
                                  { re: /(^|_|\b)(asset_?type|type|assettype)/i, label: 'Type' },
                                  { re: /(^|_|\b)(due_?date|duedate)/i, label: 'Due Date' },
                                  { re: /(^|_|\b)(days_?overdue|daysoverdue|days_overdue)/i, label: 'Days Overdue' },
                                  { re: /(^|_|\b)(currently_?borrowed|currentlyborrowed)/i, label: 'Currently Borrowed' },
                                  { re: /(^|_|\b)(total_?borrows|totalborrows)/i, label: 'Total Borrows' },
                                  { re: /(_|\b)(balance|account_balance)/i, label: 'Balance' }
                                ];
                                for (const m of mappings) {
                                  if (m.re.test(s)) return m.label;
                                }
                                // fallback: replace underscores and camelCase
                                const withSpaces = s.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
                                return withSpaces.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                              };
                              return Object.keys(customReportData[0] || {}).map((col) => <th key={col}>{formatColumnHeader(col)}</th>);
                            })()}
                          </tr>
                        </thead>
                        <tbody>
                          {customReportData.map((row, idx) => (
                            <tr key={idx}>{Object.keys(row).map((k, i) => <td key={i}>{row[k]}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {(() => {
                    // derive chart-friendly dataset from server response
                    const deriveChartConfig = (rows = []) => {
                      if (!rows || rows.length === 0) return { chartData: [], nameKey: '', valueKey: '', yLabel: '' };
                      const keys = Object.keys(rows[0]);

                      // numeric keys: all rows have parseable numbers for that key
                      const numericKeys = keys.filter(k => rows.every(r => {
                        const v = r[k];
                        return v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)) && isFinite(parseFloat(v));
                      }));

                      // detect date-like fields to ignore as categorical
                      const isDateLike = (val) => typeof val === 'string' && /\d{4}-\d{2}-\d{2}/.test(val);

                      const categoricalKeys = keys.filter(k => rows.some(r => {
                        const v = r[k];
                        return v !== null && v !== undefined && v !== '' && typeof v !== 'number' && !(!isNaN(parseFloat(v)) && isFinite(parseFloat(v))) && !isDateLike(v);
                      }));

                      const nameKey = categoricalKeys[0] || keys.find(k => /name|title|type|asset/i.test(k)) || keys[0];
                      const valueKey = numericKeys[0] || null;

                      const map = {};
                      rows.forEach(r => {
                        const name = (r[nameKey] !== undefined && r[nameKey] !== null && String(r[nameKey]).trim() !== '') ? String(r[nameKey]) : '(Unknown)';
                        const val = valueKey ? parseFloat(r[valueKey]) || 0 : 1;
                        map[name] = (map[name] || 0) + val;
                      });

                      const chartData = Object.keys(map).map((k) => ({ name: k, value: map[k] }));
                      chartData.sort((a, b) => b.value - a.value);

                      const yLabel = valueKey ? valueKey.replace(/_/g, ' ') : 'Count';
                      return { chartData, nameKey, valueKey, yLabel };
                    };

                    const buildTitleFromFilters = () => {
                      const parts = [];
                      if (customReportFilters.status) parts.push(customReportFilters.status === 'current' ? 'Currently Borrowed' : 'Returned');
                      if (customReportFilters.assetType && customReportFilters.assetType.length) parts.push(customReportFilters.assetType.map(a => a.replace(/-/g, ' ')).join(', '));
                      if (customReportFilters.userId && customReportFilters.userId.length && Array.isArray(students)) {
                        const names = students.filter(s => customReportFilters.userId.includes(s.studentId || s.username || s.id)).map(s => `${getFirstName(s)} ${getLastName(s)}`.trim()).filter(Boolean);
                        if (names.length) parts.push(names.slice(0,2).join(', ') + (names.length > 2 ? ` +${names.length-2}` : ''));
                      }
                      return parts.length ? parts.join(' — ') : 'Distribution';
                    };

                    const { chartData, nameKey, valueKey, yLabel } = deriveChartConfig(customReportData || []);
                    const title = buildTitleFromFilters();

                    if (customReportType === 'bar') {
                      // Build timeline buckets when rows contain a date field (e.g., Borrow_Date)
                      const deriveTimelineBuckets = (rows = [], startDateStr, endDateStr) => {
                        if (!rows || rows.length === 0) return [];
                        // find a date-like key
                        const cols = Object.keys(rows[0] || {});
                        const dateKey = cols.find(k => /borrow.*date|borrow_date|borrowdate|due_date|borrowDate|date$/i.test(k)) || cols.find(k => {
                          // fallback: detect by value pattern
                          return rows.some(r => typeof r[k] === 'string' && /\d{4}-\d{2}-\d{2}/.test(r[k]));
                        });
                        if (!dateKey) return [];

                        // determine range
                        const parseDate = (v) => {
                          if (!v) return null;
                          const d = new Date(v);
                          if (isNaN(d)) return null;
                          return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        };

                        const sd = parseDate(startDateStr) || rows.map(r => parseDate(r[dateKey])).filter(Boolean).reduce((a,b)=>a<b?a:b,new Date(8640000000000000));
                        const ed = parseDate(endDateStr) || rows.map(r => parseDate(r[dateKey])).filter(Boolean).reduce((a,b)=>a>b?a:b,new Date(-8640000000000000));
                        const diffDays = Math.max(1, Math.round((ed - sd) / (1000*60*60*24)));

                        let gran = 'month';
                        if (diffDays <= 31) gran = 'day';
                        else if (diffDays <= 92) gran = 'week';
                        else if (diffDays <= 365) gran = 'month';
                        else gran = 'year';

                        const bucketKey = (d) => {
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          if (gran === 'day') return `${year}-${month}-${day}`;
                          if (gran === 'week') {
                            const dayOfWeek = (d.getDay() + 6) % 7; // 0 = Monday
                            const monday = new Date(d);
                            monday.setDate(d.getDate() - dayOfWeek);
                            return `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
                          }
                          if (gran === 'month') return `${year}-${month}`;
                          return `${year}`;
                        };

                        const map = {};
                        rows.forEach(r => {
                          const pd = parseDate(r[dateKey]);
                          if (!pd) return;
                          const key = bucketKey(pd);
                          map[key] = map[key] || { name: key, value: 0, items: [] };
                          map[key].value += 1;
                          map[key].items.push(r);
                        });

                        // sort keys chronologically
                        const keys = Object.keys(map).sort((a,b) => new Date(a) - new Date(b));
                        return keys.map(k => map[k]);
                      };

                      // Build timeline buckets grouped by asset title/identifier so we can render bars per-asset
                      const deriveTimelineBucketsByAsset = (rows = [], startDateStr, endDateStr) => {
                        if (!rows || rows.length === 0) return { buckets: [], assets: [] };
                        // detect date key
                        const cols = Object.keys(rows[0] || {});
                        const dateKey = cols.find(k => /borrow.*date|borrow_date|borrowdate|due_date|borrowDate|date$/i.test(k)) || cols.find(k => rows.some(r => typeof r[k] === 'string' && /\d{4}-\d{2}-\d{2}/.test(r[k])));
                        if (!dateKey) return { buckets: [], assets: [] };

                        // detect asset title/key
                        const assetKey = cols.find(k => /title$|item_title|asset_title|asset_id|id|name$/i.test(k)) || cols.find(k => rows.some(r => r[k]));

                        const parseDate = (v) => {
                          if (!v) return null;
                          const d = new Date(v);
                          if (isNaN(d)) return null;
                          return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        };

                        // determine granularity using same logic
                        const sd = parseDate(startDateStr) || rows.map(r => parseDate(r[dateKey])).filter(Boolean).reduce((a,b)=>a<b?a:b,new Date(8640000000000000));
                        const ed = parseDate(endDateStr) || rows.map(r => parseDate(r[dateKey])).filter(Boolean).reduce((a,b)=>a>b?a:b,new Date(-8640000000000000));
                        const diffDays = Math.max(1, Math.round((ed - sd) / (1000*60*60*24)));
                        let gran = 'month';
                        if (diffDays <= 31) gran = 'day';
                        else if (diffDays <= 92) gran = 'week';
                        else if (diffDays <= 365) gran = 'month';
                        else gran = 'year';

                        const bucketKey = (d) => {
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          if (gran === 'day') return `${year}-${month}-${day}`;
                          if (gran === 'week') {
                            const dayOfWeek = (d.getDay() + 6) % 7;
                            const monday = new Date(d);
                            monday.setDate(d.getDate() - dayOfWeek);
                            return `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
                          }
                          if (gran === 'month') return `${year}-${month}`;
                          return `${year}`;
                        };

                        const map = {}; // map[bucketName] = { name, __itemsByAsset: { assetName: [items] }, assetCounts: { assetName: count } }
                        const assetSet = new Set();

                        rows.forEach(r => {
                          const pd = parseDate(r[dateKey]);
                          if (!pd) return;
                          const key = bucketKey(pd);
                          map[key] = map[key] || { name: key, __itemsByAsset: {}, assetCounts: {} };
                          const assetName = (assetKey && (r[assetKey] || r.Title || r.Item_Title || r.Asset_Title || r.Asset_ID || r.id || r.Name)) || (r.Title || r.Item_Title || r.Asset_Title || r.Asset_ID || 'Unknown');
                          const an = String(assetName || 'Unknown');
                          assetSet.add(an);
                          map[key].__itemsByAsset[an] = map[key].__itemsByAsset[an] || [];
                          map[key].__itemsByAsset[an].push(r);
                          map[key].assetCounts[an] = (map[key].assetCounts[an] || 0) + 1;
                        });

                        const keys = Object.keys(map).sort((a,b) => new Date(a) - new Date(b));
                        const assets = Array.from(assetSet);
                        const buckets = keys.map(k => {
                          const entry = { name: k };
                          entry.__itemsByAsset = map[k].__itemsByAsset || {};
                          // add numeric keys for each asset for charting
                          assets.forEach(a => {
                            entry[a] = map[k].assetCounts && map[k].assetCounts[a] ? map[k].assetCounts[a] : 0;
                          });
                          return entry;
                        });

                        return { buckets, assets };
                      };

                      const TimelineTooltip = ({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload || {};
                        // build a small preview of top items across assets
                        const itemsByAsset = d.__itemsByAsset || {};
                        const sample = [];
                        Object.keys(itemsByAsset).forEach(k => {
                          (itemsByAsset[k] || []).slice(0,3).forEach(it => sample.push({ asset: k, title: it.Title || it.Item_Title || it.Asset_Title || '-', borrower: it.Borrower_Name || it.Username || it.username || (it.First_Name ? `${it.First_Name} ${it.Last_Name || ''}` : '') }));
                        });
                        return (
                          <div style={{ background: '#fff', padding: 8, borderRadius: 8, boxShadow: '0 6px 20px rgba(2,6,23,0.08)', minWidth: 240 }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>{d.name}</div>
                            <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                              <ul style={{ margin: 0, paddingLeft: 14 }}>
                                {sample.slice(0,6).map((it, i) => (
                                  <li key={i} style={{ fontSize: 13 }}>
                                    <strong style={{ color: '#111' }}>{it.title}</strong> <span style={{ color: '#6b7280' }}>— {it.asset}</span>
                                  </li>
                                ))}
                                {Object.keys(d.__itemsByAsset || {}).reduce((sum, k) => sum + ((d.__itemsByAsset[k] || []).length || 0), 0) > 6 && <li style={{ fontSize: 13 }}>+ more</li>}
                              </ul>
                            </div>
                          </div>
                        );
                      };

                      const handleBucketClick = (payload) => {
                        if (!payload) return;
                        const items = payload.items || [];
                        setBucketModalItems(items);
                        setBucketModalTitle(`${payload.name} — ${payload.value} item${payload.value !== 1 ? 's' : ''}`);
                        setShowBucketModal(true);
                      };

                      const handleAssetBarClick = (bucketPayload, assetName) => {
                        if (!bucketPayload || !assetName) return;
                        const items = (bucketPayload.__itemsByAsset && bucketPayload.__itemsByAsset[assetName]) || [];
                        setAssetBucketModalItems(items);
                        setAssetBucketModalTitle(`${assetName} — ${items.length} item${items.length !== 1 ? 's' : ''} in ${bucketPayload.name}`);
                        setShowAssetBucketModal(true);
                      };

                      const byAsset = deriveTimelineBucketsByAsset(customReportData || [], customReportFilters.startDate, customReportFilters.endDate);
                      const timelineBuckets = byAsset.buckets && byAsset.buckets.length ? byAsset.buckets : deriveTimelineBuckets(customReportData || [], customReportFilters.startDate, customReportFilters.endDate);
                      // If byAsset produced assets list, we render grouped bars per asset across time buckets
                      const assetsList = byAsset.assets || [];

                      if (assetsList && assetsList.length) {
                        const dataToUse = timelineBuckets;
                        // compute totals per asset and pick top 10
                        const totals = {};
                        assetsList.forEach(a => {
                          totals[a] = dataToUse.reduce((s, row) => s + (row[a] || 0), 0);
                        });
                        const sortedAssets = [...assetsList].sort((a,b) => (totals[b] || 0) - (totals[a] || 0));
                        const topAssets = sortedAssets.slice(0, 10);

                        return (
                          <div style={{ height: 360, display: 'flex', gap: 16, alignItems: 'stretch' }}>
                            <div style={{ flex: 1, minWidth: 360 }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title || `${yLabel} by ${nameKey}`}</h4>
                              </div>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dataToUse} margin={{ top: 6, right: 12, left: 0, bottom: 6 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip content={<TimelineTooltip />} />
                                  {topAssets.map((assetName, idx) => (
                                    <Bar
                                      key={`bar-${idx}`}
                                      dataKey={assetName}
                                      stackId="assetStack"
                                      fill={COLORS[idx % COLORS.length]}
                                      name={assetName}
                                      onClick={(d) => handleAssetBarClick(d && d.payload, assetName)}
                                    />
                                  ))}
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div style={{ width: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: '100%' }}>
                                <CompactLegend items={topAssets.map((a, i) => ({ name: a, value: totals[a] || 0 }))} />
                                {sortedAssets.length > topAssets.length && (
                                  <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>+{sortedAssets.length - topAssets.length} more</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // fallback to original timeline buckets view (single series)
                      const dataToUse = timelineBuckets && timelineBuckets.length ? timelineBuckets : chartData.map(d => ({ ...d, items: [] }));

                      return (
                        <div style={{ height: 360, display: 'flex', gap: 16, alignItems: 'stretch' }}>
                          <div style={{ flex: 1, minWidth: 320 }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title || `${yLabel} by ${nameKey}`}</h4>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={dataToUse} margin={{ top: 6, right: 12, left: 0, bottom: 6 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip content={<TimelineTooltip />} />
                                <Bar dataKey="value" fill={COLORS[0]} name={yLabel} onClick={(d) => handleBucketClick(d && d.payload)} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div style={{ width: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '100%' }}>
                              <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="left"
                                iconType="square"
                                wrapperStyle={{ paddingLeft: 8 }}
                                payload={dataToUse.map((d, idx) => ({ value: `${d.name} (${d.value})`, type: 'square', color: COLORS[idx % COLORS.length] }))}
                                formatter={(value) => <span style={{ fontSize: 13, color: '#374151' }}>{value}</span>}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (customReportType === 'pie') {
                      // Compact legend renderer
                      const CompactLegend = ({ items }) => {
                        const count = (items || []).length;
                        const fontSize = count > 12 ? 11 : count > 8 ? 12 : 13;
                        return (
                          <div style={{ maxHeight: 300, overflowY: 'auto', paddingLeft: 8 }}>
                            {(items || []).map((it, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }}>
                                <span style={{ width: 12, height: 12, background: COLORS[idx % COLORS.length], display: 'inline-block', borderRadius: 3 }} />
                                <span style={{ fontSize, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name} <small style={{ color: '#6b7280' }}>({it.value})</small></span>
                              </div>
                            ))}
                          </div>
                        )
                      }

                      const pieData = chartData || [];
                      return (
                        <div style={{ height: 360, display: 'flex', gap: 16, alignItems: 'stretch' }}>
                          <div style={{ flex: 1, minWidth: 320 }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                              {pieActive ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111' }}>{pieActive.name}</div>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>Distribution</div>
                                  </div>
                                  <div style={{ marginLeft: 8 }}>
                                    <span style={{ display: 'inline-block', background: '#eef2ff', color: '#1e40af', fontWeight: 700, padding: '6px 10px', borderRadius: 9999, fontSize: 13 }}>{pieActive.value}</span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={110}
                                  label={({ name, value }) => `${name}: ${value}`}
                                  onMouseEnter={(data) => setPieActive(data)}
                                  onMouseLeave={() => setPieActive(null)}
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(val) => [val, yLabel]} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div style={{ width: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '100%' }}>
                              <CompactLegend items={pieData.map(d => ({ name: d.name, value: d.value }))} />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  {/* Pie chart already rendered above inside deriveChartConfig block; do not render twice. */}
                </div>
              )}
            </div>
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

      {/* Report 3: Overdue Items 
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
      </div> */}

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

      {/* Filters placed under stat cards and above the table */}
      <div className="user-filter-bar">
        <div className="filter-left">
          <input
            className="filter-input"
            type="search"
            placeholder="Search by name, username, or email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            aria-label="Search users"
          />
          <CustomSelect
            value={userRoleFilter}
            onChange={(v) => setUserRoleFilter(v)}
            ariaLabel="Filter by role"
            options={[
              { value: 'all', label: 'All roles' },
              { value: 'student', label: 'Student' },
              { value: 'librarian', label: 'Librarian' },
              { value: 'admin', label: 'Admin' }
            ]}
          />
          <CustomSelect
            value={userStatusFilter}
            onChange={(v) => setUserStatusFilter(v)}
            ariaLabel="Filter by status"
            options={[
              { value: 'all', label: 'All status' },
              { value: 'active', label: 'Active' },
              { value: 'anonymized', label: 'Anonymized' }
            ]}
          />
        </div>
        <div className="filter-right">
          <label className="limit-label">Show</label>
          <CustomSelect
            value={userLimit}
            onChange={(v) => setUserLimit(v)}
            ariaLabel="Results limit"
            options={[
              { value: 50, label: '50' },
              { value: 100, label: '100' },
              { value: 200, label: '200' },
              { value: 500, label: '500' }
            ]}
          />
          <button className="btn ghost" onClick={() => { setUserSearch(''); setUserRoleFilter('all'); setUserStatusFilter('all'); setUserLimit(200); }}>Reset</button>
        </div>
      </div>

      <div className="table-container" style={{ marginTop: '20px' }}>
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
            {(() => {
              // Apply client-side filters: role, status (anonymized detection), and search
              const isAnonymized = (u) => (u && u.username && String(u.username).startsWith('removed_'));
              const q = String(userSearch || '').trim().toLowerCase();
              let filtered = Array.isArray(students) ? students.slice() : [];

              if (userRoleFilter && userRoleFilter !== 'all') {
                filtered = filtered.filter(u => {
                  const r = (u.role === undefined || u.role === null) ? (u.roleName || '') : u.role;
                  // Normalize numeric roles if needed
                  const roleName = typeof r === 'number' ? (r === 1 ? 'student' : r === 2 ? 'admin' : r === 3 ? 'librarian' : r === 4 ? 'teacher' : '') : String(r).toLowerCase();
                  return roleName === userRoleFilter;
                });
              }

              if (userStatusFilter && userStatusFilter !== 'all') {
                if (userStatusFilter === 'anonymized') filtered = filtered.filter(u => isAnonymized(u));
                else if (userStatusFilter === 'active') filtered = filtered.filter(u => !isAnonymized(u));
              }

              if (q) {
                filtered = filtered.filter(u => {
                  const fullname = `${u.firstname || ''} ${u.lastname || ''}`.toLowerCase();
                  return (
                    (u.username && String(u.username).toLowerCase().includes(q)) ||
                    (u.email && String(u.email).toLowerCase().includes(q)) ||
                    fullname.includes(q) ||
                    (u.studentId && String(u.studentId).toLowerCase().includes(q))
                  );
                });
              }

              // limit
              filtered = filtered.slice(0, userLimit);

              if (!filtered || filtered.length === 0) {
                return (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No users found</td>
                  </tr>
                )
              }

              return filtered.map((student) => (
                <tr key={student.id}>
                  <td><strong>{student.studentId || student.username}</strong></td>
                  <td>{getFirstName(student)}</td>
                  <td>{getLastName(student)}</td>
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
            })()}
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
      <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />
      <ErrorPopup errorMessage={error} onClose={() => setError('')} />
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

            <button
              className={`sidebar-item ${activeTab === 'audit-logs' ? 'active' : ''}`}
              onClick={() => changeTab('audit-logs')}
              title="Audit Logs"
            >
              <span className="icon">📝</span>
              {!sidebarCollapsed && <span className="label">Audit Logs</span>}
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
            {activeTab === 'audit-logs' && (
              <div className="tab-content">
                <AuditLogs />
              </div>
            )}
          </div>
        </main>
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

      {/* CREATE / EDIT USER MODAL */}
      {(showCreateUserModal || showEditUserModal) && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ zIndex: 1201 }}>
            <h2>{showCreateUserModal ? "Create User" : "Edit User"}</h2>
            <form onSubmit={showCreateUserModal ? handleCreateUser : handleEditUser} className="modal-form">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={userForm.firstname}
                  placeholder="First Name"
                  onChange={(e) => setUserForm({ ...userForm, firstname: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={userForm.lastname}
                  placeholder="Last Name"
                  onChange={(e) => setUserForm({ ...userForm, lastname: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="text"
                  value={userForm.dateOfBirth}
                  placeholder="MM/DD/YYYY or YYYY-MM-DD"
                  onChange={(e) => setUserForm({ ...userForm, dateOfBirth: e.target.value })}
                  required={showCreateUserModal}
                />
                <small style={{ color: '#666' }}>Enter date as <strong>MM/DD/YYYY</strong> or <strong>YYYY-MM-DD</strong></small>
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={userForm.studentId || ''}
                  placeholder="Username"
                  onChange={(e) => setUserForm({ ...userForm, studentId: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  placeholder="Email"
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={userForm.phone || ''}
                  placeholder="Phone number"
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                />
              </div>

              {showCreateUserModal && (
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    placeholder="Password"
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required
                  />
                </div>
              )}

              {showCreateUserModal && (
                <div className="form-group">
                  <label>Role</label>
                  <CustomSelect
                    value={userForm.role}
                    onChange={(v) => setUserForm({ ...userForm, role: v })}
                    ariaLabel="Select role"
                    options={[
                      { value: 'Student', label: 'Student' },
                      { value: 'Librarian', label: 'Librarian' },
                      { value: 'Admin', label: 'Admin' }
                    ]}
                  />
                </div>
              )}

              {/* Status field removed */}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setShowEditUserModal(false);
                    setUserForm({ studentId: "", firstname: "", lastname: "", email: "", role: "Student", password: "", dateOfBirth: "", phone: "" });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className={`submit-button ${showCreateUserModal ? 'create-submit' : ''}`}>
                  {showCreateUserModal ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}





    {showDeleteUserModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-4">
          <h2 className="text-xl font-semibold text-red-600">Delete User</h2>
          <p>
            Are you sure you want to delete{' '}
            <strong>{selectedUser ? `${getFirstName(selectedUser)} ${getLastName(selectedUser) || ''}`.trim() : ''}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowDeleteUserModal(false)}
              className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteUserWithForce}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}

    {showForceDeleteConfirm && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md space-y-4">
          <h2 className="text-lg font-semibold text-yellow-700">Warning</h2>
          <div style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{forceDeleteMessage}</div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => { setShowForceDeleteConfirm(false); setForceDeleteMessage(''); }}
              className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setShowForceDeleteConfirm(false);
                try {
                  const res = await fetch(`${API_URL}/members/${selectedUser.id}?force=true`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  });
                  const d = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(d.error || d.message || 'Failed to force delete user');
                  setShowDeleteUserModal(false);
                  setSuccessMessage(d.message || 'Member disabled and anonymized');
                  await refreshUserList();
                } catch (err) {
                  setError(err.message || 'Failed to force delete');
                }
              }}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Force Delete
            </button>
          </div>
        </div>
      </div>
    )}

    {showDeleteBlockedModal && (
      <DeleteBlockedModal
        open={showDeleteBlockedModal}
        blockers={deleteBlockedInfo}
        currentBorrowCount={deleteBlockedCurrentCount}
        totalBorrowCount={deleteBlockedTotalCount}
        onClose={() => {
          setShowDeleteBlockedModal(false);
          setDeleteBlockedInfo([]);
          setDeleteBlockedCurrentCount(null);
          setDeleteBlockedTotalCount(null);
        }}
        onViewUser={() => {
          setShowDeleteBlockedModal(false);
          // open the View User modal for the selected user
          if (selectedUser) setShowViewUserModal(true);
        }}
        onForce={async () => {
          // perform force anonymize via API
          try {
            const res = await fetch(`${API_URL}/members/${selectedUser.id}?force=true`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || d.message || 'Failed to force delete user');
            setShowDeleteBlockedModal(false);
            setSuccessMessage(d.message || 'Member disabled and anonymized');
            await refreshUserList();
          } catch (err) {
            setError(err.message || 'Failed to force delete');
          }
        }}
      />
    )}

    {/* VIEW USER MODAL */}
    {showViewUserModal && selectedUser && (
      <div className="modal-overlay" onClick={() => setShowViewUserModal(false)}>
        <div className={`modal-content user-modal user-modal-${mapRoleValueToName(selectedUser.role).toLowerCase()}`}
          style={{ maxWidth: '880px', minWidth: '520px', padding: '36px 36px 28px 36px' }}
          onClick={e => e.stopPropagation()}>
          <div className="user-modal-header" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
            <div className="user-avatar" style={{
              background:
                mapRoleValueToName(selectedUser.role) === 'Admin' ? 'linear-gradient(135deg, #6366f1 60%, #a5b4fc 100%)' :
                mapRoleValueToName(selectedUser.role) === 'Librarian' ? 'linear-gradient(135deg, #10b981 60%, #6ee7b7 100%)' :
                'linear-gradient(135deg, #3b82f6 60%, #93c5fd 100%)',
              color: '#fff',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.8rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
            }}>
              {mapRoleValueToName(selectedUser.role) === 'Admin' ? '🛡️' :
                mapRoleValueToName(selectedUser.role) === 'Librarian' ? '📚' : '🧑‍🎓'}
            </div>
              <div style={{ flex: 1 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.7rem', margin: 0 }}>
                {getFirstName(selectedUser)} {getLastName(selectedUser) || '-'}
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
                      <span className="info-label">First Name:</span>
                      <div className="info-value-copy">
                        <span className="info-value" title={getFirstName(selectedUser)}>{getFirstName(selectedUser)}</span>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Last Name:</span>
                      <div className="info-value-copy">
                        <span className="info-value" title={getLastName(selectedUser)}>{getLastName(selectedUser) || '-'}</span>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Date of Birth:</span>
                      <div className="info-value-copy">
                        <span className="info-value" title={formatDateForDisplay(getUserDOB(selectedUser))}>{formatDateForDisplay(getUserDOB(selectedUser))}</span>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Balance:</span>
                      <div className="info-value-copy">
                        <span className="info-value" title={selectedUser.balance || selectedUser.Balance || '0.00'}>${parseFloat(selectedUser.balance || selectedUser.Balance || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Borrowed:</span>
                      <div className="info-value-copy">
                        <span className="info-value" title={selectedUser.borrowedBooks || selectedUser.Borrowed_Count || selectedUser.borrowed || 0}>{selectedUser.borrowedBooks ?? selectedUser.Borrowed_Count ?? selectedUser.borrowed ?? 0}</span>
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
          </div>
        </div>
      </div>
    )}





      {/* Notification Panel */}
      {/* {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )} */}
    </div>
  )

  
}

export default Admin
