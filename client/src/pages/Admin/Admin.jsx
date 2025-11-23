import UserDropdown from '../../components/UserDropdown';
import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Admin.css'
import { LoadingOverlay, SuccessPopup, ErrorPopup } from '../../components/FeedbackUI/FeedbackUI'
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
// import NotificationPanel from '../../components/NotificationPanel/NotificationPanel'

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

// Helper to get username from user object
const getUsername = (user) => user.username || user.studentId || '-';

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
      const [customReportData, setCustomReportData] = useState([]);
      const [customReportFilters, setCustomReportFilters] = useState({
        startDate: '',
        endDate: '',
        assetType: '',
        userId: ''
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
  const [showViewUserModal, setShowViewUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
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
            await fetchUsers()
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
      const response = await fetch(`${API_URL}/students`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch students')
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

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...')
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      console.log(`✅ Received ${data.length} users`)
      // Map to the shape used by the students UI (firstname, lastname, studentId, id, email, role, phone)
      const mapped = data.map(u => ({
        id: u.id,
        studentId: u.studentId,
        firstname: u.firstname || '',
        lastname: u.lastname || '',
        email: u.email || '',
        role: u.role,
        phone: u.phone || ''
      }))
      const sortedData = mapped.sort((a, b) => (a.id || 0) - (b.id || 0))
      setStudents(sortedData)
    } catch (error) {
      console.error('❌ Error fetching users:', error)
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

    // Always send username as studentId
    const payload = {
      ...userForm,
      dateOfBirth: normalizedDOB,
      studentId: userForm.studentId // this is the username
    }

    const response = await fetch(`${API_URL}/students`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Create student server response:', data);
      throw new Error(data.error || data.message || 'Failed to create user');
    }

    setShowCreateUserModal(false);
    fetchStudents(); // refresh the list
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
    const payload = { ...userForm, dateOfBirth: normalizedDOB, studentId: coercedUsername };

    const response = await fetch(`${API_URL}/students/${selectedUser.id}`, {
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
      firstname: (payload && payload.firstname) || userForm.firstname,
      lastname: (payload && payload.lastname) || userForm.lastname,
      email: (payload && payload.email) || userForm.email,
      studentId: (payload && payload.studentId) || userForm.studentId || '',
      username: (payload && payload.studentId) || userForm.username || '',
      phone: (payload && payload.phone) || userForm.phone || '',
      dateOfBirth: normalizedDOB || userForm.dateOfBirth || '',
      role: (payload && payload.role) || userForm.role
    };

    setSelectedUser(prev => ({ ...(prev || {}), ...updatedFields }));
    setUserForm(prev => ({ ...prev, ...updatedFields }));

    setShowEditUserModal(false);
    fetchStudents();
  } catch (err) {
    setError(err.message);
    console.error("Edit error response:", err.message);
  }
};


const handleDeleteUser = async () => {
  if (!selectedUser) return;

  try {
    const response = await fetch(`${API_URL}/students/${selectedUser.id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to delete user');

    setShowDeleteUserModal(false);
    fetchStudents();
  } catch (err) {
    setError(err.message);
    console.error("Delete error response:", err.message);
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
      setCustomReportLoading(true);
      setCustomReportError('');
      try {
        const params = new URLSearchParams();
        if (customReportFilters.startDate) params.append('startDate', customReportFilters.startDate);
        if (customReportFilters.endDate) params.append('endDate', customReportFilters.endDate);
        if (customReportFilters.assetType) params.append('assetType', customReportFilters.assetType);
        if (customReportFilters.userId) params.append('userId', customReportFilters.userId);
        const response = await fetch(`${API_URL}/reports/custom?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch custom report');
        const data = await response.json();
        setCustomReportData(Array.isArray(data) ? data : []);
      } catch (err) {
        setCustomReportError(err.message || 'Error generating report');
      } finally {
        setCustomReportLoading(false);
      }
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

              <div className="form-group">
                <label>Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
                  <option value="Student">Student</option>
                  <option value="Librarian">Librarian</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

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
            <strong>{selectedUser ? `${selectedUser.firstname || ''} ${selectedUser.lastname || ''}`.trim() : ''}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowDeleteUserModal(false)}
              className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteUser}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
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
