import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  BookCheck,
  RefreshCw,
  DollarSign,
  AlertCircle,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Calendar,
  Book,
  TrendingUp,
  X,
  Disc,
  Headphones,
  Film,
  Laptop,
  Building2,
  Clock
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './LibrarianReport.css'

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'lastMonth', label: 'Last Month' }
]

const ASSET_TYPE_OPTIONS = [
  { value: 'Book', label: 'Books', icon: Book },
  { value: 'CD', label: 'CDs', icon: Disc },
  { value: 'Audiobook', label: 'Audiobooks', icon: Headphones },
  { value: 'Movie', label: 'Movies', icon: Film },
  { value: 'Technology', label: 'Technology', icon: Laptop }
]

const TRANSACTION_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Returned' },
  { value: 'overdue', label: 'Overdue' }
]

const ACTION_OPTIONS = [
  { value: 'issued', label: 'Issued / Borrowed' },
  { value: 'returned', label: 'Returned' },
  { value: 'renewed', label: 'Renewed' }
]

const OVERDUE_BUCKETS = [
  { value: '', label: 'Any' },
  { value: '1-7', label: '1-7 days' },
  { value: '8-30', label: '8-30 days' },
  { value: '30+', label: '30+ days' }
]

const FINE_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'hasFine', label: 'Has Fine' },
  { value: 'noFine', label: 'No Fine' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' }
]

const ROOM_STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' }
]

const ROOM_DURATION_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'short', label: '< 1 day' },
  { value: 'standard', label: '1-7 days' },
  { value: 'extended', label: '7+ days' }
]

const TIME_OF_DAY_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' }
]

const initialSummaryState = {
  assets_issued_total: 0,
  assets_returned_total: 0,
  active_loans: 0,
  overdue_books: 0,
  fines_unpaid: 0,
  fines_collected: 0,
  renewals: 0,
  books_issued: 0,
  cds_issued: 0,
  audiobooks_issued: 0,
  movies_issued: 0,
  technology_issued: 0,
  study_rooms_issued: 0
}

const getDateRangeForPreset = (preset) => {
  const today = new Date()
  const from = new Date(today)
  const to = new Date(today)

  switch (preset) {
    case 'today':
      break
    case 'thisWeek': {
      const dayOfWeek = today.getDay()
      from.setDate(today.getDate() - dayOfWeek)
      break
    }
    case 'thisMonth':
      from.setDate(1)
      break
    case 'lastMonth':
      from.setMonth(today.getMonth() - 1)
      from.setDate(1)
      to.setDate(0)
      break
    case 'last30':
      from.setDate(today.getDate() - 30)
      break
    default:
      break
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0]
  }
}

const buildDefaultAssetFilters = () => {
  const range = getDateRangeForPreset('last30')
  return {
    from: range.from,
    to: range.to,
    preset: 'last30',
    actions: [],
    memberNames: [],
    assetTitles: [],
    assetTypes: [],
    fineStatus: 'all',
    status: [],
    fineMin: '',
    fineMax: '',
    overdueBucket: ''
  }
}

const buildDefaultRoomFilters = () => {
  const range = getDateRangeForPreset('last30')
  return {
    from: range.from,
    to: range.to,
    preset: 'last30',
    status: [],
    rooms: [],
    memberTypes: [],
    memberName: '',
    capacityMin: '',
    capacityMax: '',
    durationBucket: '',
    timeOfDay: '',
    staffId: ''
  }
}

function LibrarianReport() {
  const [assetFilters, setAssetFilters] = useState(buildDefaultAssetFilters)
  const [appliedAssetFilters, setAppliedAssetFilters] = useState(assetFilters)
  const [roomFilters, setRoomFilters] = useState(buildDefaultRoomFilters)
  const [appliedRoomFilters, setAppliedRoomFilters] = useState(roomFilters)
  const [assetSummary, setAssetSummary] = useState(initialSummaryState)
  const [assetTransactions, setAssetTransactions] = useState([])
  const [dailyActivity, setDailyActivity] = useState([])
  const [roomBookings, setRoomBookings] = useState([])
  const [assetLoading, setAssetLoading] = useState(true)
  const [roomLoading, setRoomLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('assets')
  const [filterVisibility, setFilterVisibility] = useState({ assets: false, rooms: false })
  const [viewMode, setViewMode] = useState('table')
  const [membersList, setMembersList] = useState([])
  const [assetsList, setAssetsList] = useState([])
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [memberSearchText, setMemberSearchText] = useState('')
  const [assetSearchText, setAssetSearchText] = useState('')
  const [roomMetadata, setRoomMetadata] = useState({ rooms: [], capacityRange: { min: 0, max: 0 }, memberRoles: [] })

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const librarianId = user.id || user.User_ID

  useEffect(() => {
    if (!librarianId) {
      setAssetLoading(false)
      setRoomLoading(false)
      return
    }
    fetchAssetData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [librarianId, appliedAssetFilters])

  useEffect(() => {
    if (!librarianId) {
      return
    }
    fetchRoomBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [librarianId, appliedRoomFilters])

  useEffect(() => {
    if (!librarianId) return
    fetchAutocompleteData()
    fetchRoomMetadata()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [librarianId])

  const fetchAutocompleteData = async () => {
    try {
      const [membersRes, assetsRes] = await Promise.all([
        fetch(`${API_URL}/reports/librarian/${librarianId}/members`),
        fetch(`${API_URL}/reports/librarian/${librarianId}/books`)
      ])

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembersList(membersData)
      }

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json()
        setAssetsList(assetsData)
      }
    } catch (error) {
      console.error('Error fetching autocomplete data:', error)
    }
  }

  const fetchAssetData = async () => {
    setAssetLoading(true)
    try {
      const params = new URLSearchParams({
        from: appliedAssetFilters.from,
        to: appliedAssetFilters.to,
        actions: appliedAssetFilters.actions.join(','),
        memberNames: appliedAssetFilters.memberNames.join(','),
        assetTitles: appliedAssetFilters.assetTitles.join(','),
        assetTypes: appliedAssetFilters.assetTypes.join(','),
        status: appliedAssetFilters.status.join(','),
        overdueBucket: appliedAssetFilters.overdueBucket
      })

      if (appliedAssetFilters.fineStatus && appliedAssetFilters.fineStatus !== 'all') {
        params.set('fineStatus', appliedAssetFilters.fineStatus)
      }

      if (appliedAssetFilters.fineMin !== '') {
        params.set('fineMin', appliedAssetFilters.fineMin)
      }

      if (appliedAssetFilters.fineMax !== '') {
        params.set('fineMax', appliedAssetFilters.fineMax)
      }

      const [summaryRes, transactionsRes, activityRes] = await Promise.all([
        fetch(`${API_URL}/reports/librarian/${librarianId}/summary?${params.toString()}`),
        fetch(`${API_URL}/reports/librarian/${librarianId}/transactions?${params.toString()}`),
        fetch(`${API_URL}/reports/librarian/${librarianId}/daily-activity?${params.toString()}`)
      ])

      const summaryData = await summaryRes.json()
      const transactionsData = await transactionsRes.json()
      const activityData = await activityRes.json()

      if (summaryRes.ok && !summaryData.error) {
        setAssetSummary(summaryData)
      } else {
        setAssetSummary(initialSummaryState)
      }

      if (transactionsRes.ok && !transactionsData.error) {
        setAssetTransactions(Array.isArray(transactionsData) ? transactionsData : [])
      } else {
        setAssetTransactions([])
      }

      if (activityRes.ok && !activityData.error) {
        setDailyActivity(Array.isArray(activityData) ? activityData : [])
      } else {
        setDailyActivity([])
      }
    } catch (error) {
      console.error('Error fetching librarian report data:', error)
      setAssetSummary(initialSummaryState)
      setAssetTransactions([])
      setDailyActivity([])
    } finally {
      setAssetLoading(false)
    }
  }

  const fetchRoomBookings = async () => {
    setRoomLoading(true)
    try {
      const params = new URLSearchParams({
        from: appliedRoomFilters.from,
        to: appliedRoomFilters.to
      })

      if (appliedRoomFilters.status.length > 0) {
        params.set('status', appliedRoomFilters.status.join(','))
      }
      if (appliedRoomFilters.rooms.length > 0) {
        params.set('rooms', appliedRoomFilters.rooms.join(','))
      }
      if (appliedRoomFilters.memberTypes.length > 0) {
        params.set('memberTypes', appliedRoomFilters.memberTypes.join(','))
      }
      if (appliedRoomFilters.memberName.trim()) {
        params.set('memberSearch', appliedRoomFilters.memberName.trim())
      }
      if (appliedRoomFilters.capacityMin !== '') {
        params.set('capacityMin', appliedRoomFilters.capacityMin)
      }
      if (appliedRoomFilters.capacityMax !== '') {
        params.set('capacityMax', appliedRoomFilters.capacityMax)
      }
      if (appliedRoomFilters.durationBucket) {
        params.set('durationBucket', appliedRoomFilters.durationBucket)
      }
      if (appliedRoomFilters.timeOfDay) {
        params.set('timeOfDay', appliedRoomFilters.timeOfDay)
      }
      if (appliedRoomFilters.staffId) {
        params.set('staffId', appliedRoomFilters.staffId)
      }

      const res = await fetch(`${API_URL}/reports/librarian/${librarianId}/room-bookings?${params.toString()}`)
      const data = await res.json()
      if (res.ok && !data.error) {
        setRoomBookings(Array.isArray(data) ? data : [])
      } else {
        setRoomBookings([])
      }
    } catch (error) {
      console.error('Error fetching room bookings:', error)
      setRoomBookings([])
    } finally {
      setRoomLoading(false)
    }
  }

  const fetchRoomMetadata = async () => {
    try {
      const res = await fetch(`${API_URL}/reports/librarian/${librarianId}/room-bookings/meta`)
      const data = await res.json()
      if (res.ok && !data.error) {
        setRoomMetadata({
          rooms: data.rooms || [],
          memberRoles: data.memberRoles || [],
          capacityRange: data.capacityRange || { min: 0, max: 0 }
        })
      }
    } catch (error) {
      console.error('Error fetching room metadata:', error)
    }
  }

  const handleAssetPresetChange = (preset) => {
    const range = getDateRangeForPreset(preset)
    setAssetFilters(prev => ({
      ...prev,
      from: range.from,
      to: range.to,
      preset
    }))
  }

  const handleRoomPresetChange = (preset) => {
    const range = getDateRangeForPreset(preset)
    setRoomFilters(prev => ({
      ...prev,
      from: range.from,
      to: range.to,
      preset
    }))
  }

  const handleApplyAssetFilters = () => {
    setAppliedAssetFilters(assetFilters)
  }

  const handleApplyRoomFilters = () => {
    setAppliedRoomFilters(roomFilters)
  }

  const handleClearAssetFilters = () => {
    const defaults = buildDefaultAssetFilters()
    setAssetFilters(defaults)
    setAppliedAssetFilters(defaults)
  }

  const handleClearRoomFilters = () => {
    const defaults = buildDefaultRoomFilters()
    setRoomFilters(defaults)
    setAppliedRoomFilters(defaults)
  }

  const toggleAssetArrayValue = (field, value) => {
    setAssetFilters(prev => {
      const current = prev[field]
      const exists = current.includes(value)
      const next = exists ? current.filter(item => item !== value) : [...current, value]
      return { ...prev, [field]: next }
    })
  }

  const toggleRoomArrayValue = (field, value) => {
    setRoomFilters(prev => {
      const current = prev[field]
      const exists = current.includes(value)
      const next = exists ? current.filter(item => item !== value) : [...current, value]
      return { ...prev, [field]: next }
    })
  }

  const assetActiveLoans = Math.max(0, (assetSummary.assets_issued_total || 0) - (assetSummary.assets_returned_total || 0))

  const assetSummaryCards = [
    {
      title: 'Total Checkouts',
      subtitle: 'Assets Issued',
      value: assetSummary.assets_issued_total || 0,
      icon: BookOpen,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      description: '#1 Activity Metric'
    },
    {
      title: 'Total Returns',
      subtitle: 'Assets Returned',
      value: assetSummary.assets_returned_total || 0,
      icon: BookCheck,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      description: 'Shows how busy the library is'
    },
    {
      title: 'Active Loans',
      subtitle: 'Currently Out',
      value: assetSummary.active_loans || assetActiveLoans,
      icon: Book,
      color: 'from-indigo-500 to-purple-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      description: 'Total Issued − Returned'
    },
    {
      title: 'Overdue Items',
      subtitle: 'Needs Attention',
      value: assetSummary.overdue_books || 0,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      description: 'Critical metric for operations'
    },
    {
      title: 'Unpaid Fines',
      subtitle: 'Outstanding Balance',
      value: `$${(parseFloat(assetSummary.fines_unpaid) || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      description: 'Key for financial tracking'
    },
    {
      title: 'Fines Collected',
      subtitle: 'Revenue',
      value: `$${(parseFloat(assetSummary.fines_collected) || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      description: 'Money collected this period'
    }
  ]

  const roomMetrics = useMemo(() => {
    if (!roomBookings.length) {
      return {
        total: 0,
        upcoming: 0,
        active: 0,
        completed: 0,
        overdue: 0,
        avgDuration: 0,
        uniqueRooms: 0
      }
    }

    const counts = roomBookings.reduce((acc, booking) => {
      const status = (booking.Booking_Status || '').toLowerCase()
      if (status === 'upcoming') acc.upcoming += 1
      else if (status === 'active') acc.active += 1
      else if (status === 'completed') acc.completed += 1
      else if (status === 'overdue') acc.overdue += 1
      return acc
    }, { upcoming: 0, active: 0, completed: 0, overdue: 0 })

    const totalDuration = roomBookings.reduce((sum, booking) => sum + (booking.Duration_Days || 0), 0)
    const uniqueRooms = new Set(roomBookings.map(booking => booking.Room_Number)).size

    return {
      total: roomBookings.length,
      avgDuration: roomBookings.length ? totalDuration / roomBookings.length : 0,
      uniqueRooms,
      ...counts
    }
  }, [roomBookings])

  const roomSummaryCards = [
    {
      title: 'Total Bookings',
      subtitle: 'Study room reservations',
      value: roomMetrics.total,
      icon: Building2,
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      description: 'Rooms reserved in range'
    },
    {
      title: 'Upcoming',
      subtitle: 'Future bookings',
      value: roomMetrics.upcoming,
      icon: Calendar,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      description: 'Start date after today'
    },
    {
      title: 'Active Today',
      subtitle: 'Currently in progress',
      value: roomMetrics.active,
      icon: Clock,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      description: 'Borrow window is open now'
    },
    {
      title: 'Completed',
      subtitle: 'Finished visits',
      value: roomMetrics.completed,
      icon: BookCheck,
      color: 'from-slate-500 to-gray-600',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      description: 'Returned / closed slots'
    },
    {
      title: 'Overdue Rooms',
      subtitle: 'Attention needed',
      value: roomMetrics.overdue,
      icon: AlertCircle,
      color: 'from-rose-500 to-red-600',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      description: 'Bookings past due'
    },
    {
      title: 'Avg Duration',
      subtitle: 'Days per booking',
      value: `${roomMetrics.avgDuration.toFixed(1)} days`,
      icon: RefreshCw,
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      description: 'Based on Borrow vs Due'
    }
  ]

  const isFilterOpen = activeTab === 'assets' ? filterVisibility.assets : filterVisibility.rooms
  const toggleFilters = () => {
    setFilterVisibility(prev => ({
      assets: activeTab === 'assets' ? !prev.assets : prev.assets,
      rooms: activeTab === 'rooms' ? !prev.rooms : prev.rooms
    }))
  }

  const activeLoading = activeTab === 'assets' ? assetLoading : roomLoading

  if (!librarianId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You must be logged in as a librarian to view this page.</p>
          <details className="mt-4 text-left max-w-md mx-auto bg-gray-100 p-4 rounded">
            <summary className="cursor-pointer font-semibold text-gray-700">Debug Info</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify({ user, librarianId }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    )
  }

  if (activeLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  const exportToCSV = () => {
    if (activeTab === 'assets') {
      const headers = ['Date', 'Time', 'Member', 'Member ID', 'Item Title', 'Category', 'Action', 'Due Date', 'Return Date', 'Fine', 'Status']
      const rows = assetTransactions.map(transaction => {
        const transactionDate = new Date(transaction.Return_Date || transaction.Renew_Date || transaction.Borrow_Date)
        let fineAmount = '$0.00'
        if (transaction.Return_Date && transaction.Fee_Incurred && parseFloat(transaction.Fee_Incurred) > 0) {
          fineAmount = `$${parseFloat(transaction.Fee_Incurred).toFixed(2)}`
        } else if (transaction.status === 'Overdue' && transaction.Fine_Amount && parseFloat(transaction.Fine_Amount) > 0) {
          fineAmount = `$${parseFloat(transaction.Fine_Amount).toFixed(2)} (calc)`
        }
        return [
          transactionDate.toLocaleDateString(),
          transactionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          transaction.member_name,
          transaction.member_identifier || transaction.member_id,
          transaction.book_title,
          transaction.asset_type,
          transaction.action,
          transaction.Due_Date ? new Date(transaction.Due_Date).toLocaleDateString() : '',
          transaction.Return_Date ? new Date(transaction.Return_Date).toLocaleDateString() : '',
          fineAmount,
          transaction.status
        ]
      })

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asset-transactions-${appliedAssetFilters.from}-to-${appliedAssetFilters.to}.csv`
      a.click()
      return
    }

    const headers = ['Booking ID', 'Member Name', 'Role', 'Room', 'Capacity', 'Date', 'Start Time', 'End Date', 'Status', 'Duration (days)', 'Approved By']
    const rows = roomBookings.map(booking => [
      booking.Booking_ID,
      booking.Member_Name,
      booking.Member_Role || '—',
      booking.Room_Number,
      booking.Capacity,
      booking.Booking_Date ? new Date(booking.Booking_Date).toLocaleDateString() : '',
      booking.Start_Time || '',
      booking.Due_Date ? new Date(booking.Due_Date).toLocaleDateString() : '',
      booking.Booking_Status,
      booking.Duration_Days,
      booking.Approved_By || '—'
    ])
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `room-bookings-${appliedRoomFilters.from}-to-${appliedRoomFilters.to}.csv`
    a.click()
  }

  const exportToPDF = () => {
    window.print()
  }

  return (
    <div className="librarian-report-page p-6 bg-gray-50 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Library Reports</h1>
            <p className="text-gray-600">Dive into asset transactions and dedicated study room bookings.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Export as CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Export as PDF"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          {['assets', 'rooms'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${activeTab === tab
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-transparent shadow'
                : 'bg-white text-gray-600 border-gray-200 hover:text-gray-800'
                }`}
            >
              {tab === 'assets' ? 'Asset Transactions' : 'Room Bookings'}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {(activeTab === 'assets' ? assetSummaryCards : roomSummaryCards).map((card, index) => (
          <motion.div
            key={`${activeTab}-${card.title}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <card.icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{card.subtitle || card.title}</p>
              <p className="text-3xl font-bold text-gray-800 mb-1">{card.value}</p>
              <p className="text-sm font-medium text-gray-700">{card.title}</p>
              {card.description && (
                <p className="text-xs text-gray-500 mt-2 italic">{card.description}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100 relative z-20"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={toggleFilters}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
          >
            {isFilterOpen ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
          </button>

          <button
            onClick={activeTab === 'assets' ? handleClearAssetFilters : handleClearRoomFilters}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All Filters
          </button>
        </div>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
              exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
              style={{ overflow: 'hidden' }}
            >
              {activeTab === 'assets' ? (
                <div className="space-y-6">
                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Section 1</p>
                        <h3 className="text-lg font-semibold text-gray-800">Date Range</h3>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {DATE_PRESETS.map(preset => (
                          <button
                            key={preset.value}
                            onClick={() => handleAssetPresetChange(preset.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${assetFilters.preset === preset.value
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                              : 'border-gray-200 text-gray-600 hover:border-emerald-400'
                              }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                        <input
                          type="date"
                          value={assetFilters.from}
                          onChange={(e) => setAssetFilters(prev => ({ ...prev, from: e.target.value, preset: 'custom' }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                        <input
                          type="date"
                          value={assetFilters.to}
                          onChange={(e) => setAssetFilters(prev => ({ ...prev, to: e.target.value, preset: 'custom' }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Section 2</p>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Transaction Details</h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Status</p>
                        <div className="flex flex-wrap gap-2">
                          {TRANSACTION_STATUS_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              onClick={() => toggleAssetArrayValue('status', option.value)}
                              className={`px-3 py-1 rounded-full text-xs border ${assetFilters.status.includes(option.value)
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Action Type</p>
                        <div className="flex flex-wrap gap-2">
                          {ACTION_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              onClick={() => toggleAssetArrayValue('actions', option.value)}
                              className={`px-3 py-1 rounded-full text-xs border ${assetFilters.actions.includes(option.value)
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Overdue Duration</label>
                        <select
                          value={assetFilters.overdueBucket}
                          onChange={(e) => setAssetFilters(prev => ({ ...prev, overdueBucket: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          {OVERDUE_BUCKETS.map(bucket => (
                            <option key={bucket.value} value={bucket.value}>{bucket.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Fine Status</label>
                        <select
                          value={assetFilters.fineStatus}
                          onChange={(e) => setAssetFilters(prev => ({ ...prev, fineStatus: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          {FINE_STATUS_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Section 3</p>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Asset Filters</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Asset Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          {ASSET_TYPE_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              onClick={() => toggleAssetArrayValue('assetTypes', option.value)}
                              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${assetFilters.assetTypes.includes(option.value)
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                }`}
                            >
                              <option.icon className="w-4 h-4" />
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="relative">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Asset Title</label>
                          <input
                            type="text"
                            placeholder="Search titles..."
                            value={assetSearchText}
                            onChange={(e) => setAssetSearchText(e.target.value)}
                            onFocus={() => setShowAssetDropdown(true)}
                            onBlur={() => setTimeout(() => setShowAssetDropdown(false), 200)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          {assetFilters.assetTitles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {assetFilters.assetTitles.map(title => (
                                <span key={title} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                                  {title}
                                  <button
                                    onClick={() => setAssetFilters(prev => ({
                                      ...prev,
                                      assetTitles: prev.assetTitles.filter(t => t !== title)
                                    }))}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          {showAssetDropdown && assetsList.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {assetsList
                                .filter(asset => {
                                  const matchesSearch = asset.book_title.toLowerCase().includes(assetSearchText.toLowerCase())
                                  const matchesType = assetFilters.assetTypes.length === 0 || assetFilters.assetTypes.includes(asset.asset_type)
                                  return matchesSearch && matchesType
                                })
                                .map(asset => (
                                  <button
                                    key={asset.Asset_ID}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setAssetFilters(prev => ({
                                        ...prev,
                                        assetTitles: prev.assetTitles.includes(asset.book_title)
                                          ? prev.assetTitles
                                          : [...prev.assetTitles, asset.book_title]
                                      }))
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-emerald-50"
                                  >
                                    <span className="text-sm text-gray-700">{asset.book_title}</span>
                                    <span className="text-xs text-gray-400">{asset.asset_type}</span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Section 4</p>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Member Filters</h3>
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Member Name</label>
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={memberSearchText}
                        onChange={(e) => setMemberSearchText(e.target.value)}
                        onFocus={() => setShowMemberDropdown(true)}
                        onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      {assetFilters.memberNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {assetFilters.memberNames.map(name => (
                            <span key={name} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              {name}
                              <button
                                onClick={() => setAssetFilters(prev => ({
                                  ...prev,
                                  memberNames: prev.memberNames.filter(n => n !== name)
                                }))}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {showMemberDropdown && membersList.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {membersList
                            .filter(member => member.member_name && member.member_name.toLowerCase().includes(memberSearchText.toLowerCase()))
                            .map(member => (
                              <button
                                key={member.User_ID}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setAssetFilters(prev => ({
                                  ...prev,
                                  memberNames: prev.memberNames.includes(member.member_name)
                                    ? prev.memberNames
                                    : [...prev.memberNames, member.member_name]
                                }))}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-emerald-50"
                              >
                                <span className="text-sm">{member.member_name}</span>
                                <span className="text-xs text-gray-400">{member.role}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 mt-2">
                    <button
                      onClick={activeTab === 'assets' ? handleClearAssetFilters : handleClearRoomFilters}
                      className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleApplyAssetFilters}
                      className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Section 1</p>
                        <h3 className="text-lg font-semibold text-gray-800">Date Range</h3>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {DATE_PRESETS.map(preset => (
                          <button
                            key={preset.value}
                            onClick={() => handleRoomPresetChange(preset.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${roomFilters.preset === preset.value
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                              : 'border-gray-200 text-gray-600 hover:border-emerald-400'
                              }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                        <input
                          type="date"
                          value={roomFilters.from}
                          onChange={(e) => setRoomFilters(prev => ({ ...prev, from: e.target.value, preset: 'custom' }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                        <input
                          type="date"
                          value={roomFilters.to}
                          onChange={(e) => setRoomFilters(prev => ({ ...prev, to: e.target.value, preset: 'custom' }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Section 2</p>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Booking Status</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ROOM_STATUS_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          onClick={() => toggleRoomArrayValue('status', option.value)}
                          className={`px-3 py-1 rounded-full text-xs border ${roomFilters.status.includes(option.value)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Section 3</p>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Room Filters</h3>
                        <div className="flex flex-wrap gap-2">
                          {roomMetadata.rooms.map(room => (
                            <button
                              key={room.Room_Number}
                              onClick={() => toggleRoomArrayValue('rooms', room.Room_Number)}
                              className={`px-3 py-1 rounded-full text-xs border ${roomFilters.rooms.includes(room.Room_Number)
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                }`}
                            >
                              Room {room.Room_Number}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity Min</label>
                            <input
                              type="number"
                              value={roomFilters.capacityMin}
                              placeholder={roomMetadata.capacityRange.min?.toString() || '0'}
                              onChange={(e) => setRoomFilters(prev => ({ ...prev, capacityMin: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity Max</label>
                            <input
                              type="number"
                              value={roomFilters.capacityMax}
                              placeholder={roomMetadata.capacityRange.max?.toString() || '0'}
                              onChange={(e) => setRoomFilters(prev => ({ ...prev, capacityMax: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Section 4</p>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Member Filters</h3>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Member Name</label>
                          <input
                            type="text"
                            value={roomFilters.memberName}
                            onChange={(e) => setRoomFilters(prev => ({ ...prev, memberName: e.target.value }))}
                            placeholder="Search borrower"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Member Type</label>
                          <div className="flex flex-wrap gap-2">
                            {(roomMetadata.memberRoles || []).map(role => (
                              <button
                                key={role.role_id}
                                onClick={() => toggleRoomArrayValue('memberTypes', role.role_name)}
                                className={`px-3 py-1 rounded-full text-xs border ${roomFilters.memberTypes.includes(role.role_name)
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                  }`}
                              >
                                {role.role_name.charAt(0).toUpperCase() + role.role_name.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 mt-2">
                    <button
                      onClick={handleClearRoomFilters}
                      className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleApplyRoomFilters}
                      className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div >

      {activeTab === 'assets' ? (
        <>
          <div className="flex justify-end mb-4">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'table'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Table View
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'chart'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Chart View
              </button>
            </div>
          </div>

          {viewMode === 'chart' && dailyActivity.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">Daily Activity</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    stroke="#6b7280"
                  />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Legend />
                  {(appliedAssetFilters.actions.length === 0 || appliedAssetFilters.actions.includes('issued')) && (
                    <Bar dataKey="issued" fill="#10b981" name="Issued/Reserved" radius={[8, 8, 0, 0]} />
                  )}
                  {(appliedAssetFilters.actions.length === 0 || appliedAssetFilters.actions.includes('returned')) && (
                    <Bar dataKey="returned" fill="#3b82f6" name="Returned/Checked Out" radius={[8, 8, 0, 0]} />
                  )}
                  {(appliedAssetFilters.actions.length === 0 || appliedAssetFilters.actions.includes('renewed')) && (
                    <Bar dataKey="renewed" fill="#8b5cf6" name="Renewed/Extended" radius={[8, 8, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {viewMode === 'table' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Asset Transaction Details</h2>
                <p className="text-green-50 text-sm mt-1">
                  Showing {assetTransactions.length} transaction{assetTransactions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Member</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Asset</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Return Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fine Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assetTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                          <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p>No transactions found for the selected period</p>
                        </td>
                      </tr>
                    ) : (
                      assetTransactions.map((transaction, index) => (
                        <motion.tr
                          key={transaction.Borrow_ID}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-800">
                            <div>
                              <p className="font-medium">
                                {new Date(transaction.Return_Date || transaction.Renew_Date || transaction.Borrow_Date).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.Return_Date || transaction.Renew_Date || transaction.Borrow_Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-800">
                            <div>
                              <p className="font-medium truncate" title={transaction.member_name}>{transaction.member_name}</p>
                              <p className="text-xs text-gray-500 truncate">{transaction.member_identifier || `ID: ${transaction.member_id}`}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-800">
                            <p
                              className="font-semibold truncate cursor-pointer hover:text-emerald-600 transition-colors"
                              title={`Filter by ${transaction.book_title}`}
                              onClick={() => handleAssetClick(transaction.book_title)}
                            >
                              {transaction.book_title}
                            </p>
                            <p className="text-xs text-gray-500">{transaction.asset_type}</p>
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-700">{transaction.action}</td>
                          <td className="px-3 py-3 text-sm text-gray-800">
                            {transaction.Due_Date ? new Date(transaction.Due_Date).toLocaleDateString() : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-800">
                            {transaction.Return_Date ? (
                              <div>
                                <p className="font-medium">{new Date(transaction.Return_Date).toLocaleDateString()}</p>
                                <p className="text-xs text-gray-500">{new Date(transaction.Return_Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            ) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            {(() => {
                              if (transaction.Return_Date && transaction.Fee_Incurred && parseFloat(transaction.Fee_Incurred) > 0) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                    <DollarSign className="w-3 h-3" />
                                    ${parseFloat(transaction.Fee_Incurred).toFixed(2)}
                                  </span>
                                )
                              }
                              if (transaction.status === 'Overdue' && transaction.Fine_Amount && parseFloat(transaction.Fine_Amount) > 0) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                                    <DollarSign className="w-3 h-3" />
                                    ${parseFloat(transaction.Fine_Amount).toFixed(2)}
                                  </span>
                                )
                              }
                              return <span className="text-gray-400">-</span>
                            })()}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${transaction.status === 'Active Loan' ? 'bg-green-100 text-green-700'
                              : transaction.status === 'Overdue' ? 'bg-red-100 text-red-700'
                                : transaction.status === 'Completed' ? 'bg-gray-100 text-gray-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                              {transaction.status}
                            </span>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Room Booking Details</h2>
            <p className="text-emerald-50 text-sm mt-1">Showing {roomBookings.length} booking{roomBookings.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Booking ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Member</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Room</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Check In</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Check Out</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {roomBookings.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-lg font-medium text-gray-900">No bookings found</p>
                        <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  roomBookings.map((booking) => (
                    <motion.tr
                      key={booking.Booking_ID}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">#{booking.Booking_ID}</td>
                      <td className="px-3 py-3 text-sm text-gray-800">
                        <div>
                          <p className="font-medium">{booking.Member_Name}</p>
                          <p className="text-xs text-gray-500">{booking.Member_Role}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Room {booking.Room_Number}</span>
                          <span className="text-xs text-gray-500">({booking.Capacity} ppl)</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-800">
                        {new Date(booking.Booking_Date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-800 font-mono">{booking.Check_In}</td>
                      <td className="px-3 py-3 text-sm text-gray-800 font-mono">{booking.Check_Out}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${booking.Booking_Status === 'Active' ? 'bg-green-100 text-green-700'
                          : booking.Booking_Status === 'Overdue' ? 'bg-red-100 text-red-700'
                            : booking.Booking_Status === 'Completed' ? 'bg-gray-100 text-gray-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                          {booking.Booking_Status}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )
      }
    </div >
  )
}

export default LibrarianReport
