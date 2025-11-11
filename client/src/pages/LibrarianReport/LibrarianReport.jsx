import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  BookCheck,
  RefreshCw,
  DollarSign,
  AlertCircle,
  Search,
  Filter,
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  User,
  Book,
  TrendingUp,
  X
} from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './LibrarianReport.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function LibrarianReport() {
  const [summary, setSummary] = useState({
    books_issued: 0,
    books_returned: 0,
    renewals: 0,
    fines_collected: 0,
    overdue_books: 0
  })
  const [transactions, setTransactions] = useState([])
  const [dailyActivity, setDailyActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'table' or 'chart'
  
  // Autocomplete data
  const [membersList, setMembersList] = useState([])
  const [assetsList, setAssetsList] = useState([])
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [memberSearchText, setMemberSearchText] = useState('')
  const [assetSearchText, setAssetSearchText] = useState('')
  
  // Get librarian ID from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const librarianId = user.id || user.User_ID // Support both formats
  
  console.log('LibrarianReport - User data:', user)
  console.log('LibrarianReport - Librarian ID:', librarianId)

  // Filter states
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
    to: new Date().toISOString().split('T')[0],
    actions: [], // Changed to array for multiple selections
    fineStatuses: [], // Changed to array for multiple selections
    memberNames: [], // Changed to array for multiple selections
    assetTitles: [], // Changed to array for multiple selections
    assetTypes: [] // Changed to array for multiple selections
  })

  const [appliedFilters, setAppliedFilters] = useState(filters)

  useEffect(() => {
    if (librarianId) {
      fetchData()
      fetchAutocompleteData()
    } else {
      setLoading(false)
    }
  }, [librarianId, appliedFilters])

  // Remove auto-apply - filters only apply when user clicks "Apply Filters" button

  const fetchAutocompleteData = async () => {
    try {
      const [membersRes, assetsRes] = await Promise.all([
        fetch(`${API_URL}/reports/librarian/${librarianId}/members`),
        fetch(`${API_URL}/reports/librarian/${librarianId}/books`)
      ])

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        console.log('Members data:', membersData)
        setMembersList(membersData)
      } else {
        console.error('Failed to fetch members:', membersRes.status)
      }

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json()
        console.log('Assets data:', assetsData)
        setAssetsList(assetsData)
      } else {
        console.error('Failed to fetch assets:', assetsRes.status)
      }
    } catch (error) {
      console.error('Error fetching autocomplete data:', error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        from: appliedFilters.from,
        to: appliedFilters.to,
        actions: appliedFilters.actions.join(','),
        fineStatuses: appliedFilters.fineStatuses.join(','),
        memberNames: appliedFilters.memberNames.join(','),
        assetTitles: appliedFilters.assetTitles.join(','),
        assetTypes: appliedFilters.assetTypes.join(',')
      }).toString()

      const [summaryRes, transactionsRes, activityRes] = await Promise.all([
        fetch(`${API_URL}/reports/librarian/${librarianId}/summary?${queryParams}`),
        fetch(`${API_URL}/reports/librarian/${librarianId}/transactions?${queryParams}`),
        fetch(`${API_URL}/reports/librarian/${librarianId}/daily-activity?${queryParams}`)
      ])

      const summaryData = await summaryRes.json()
      const transactionsData = await transactionsRes.json()
      const activityData = await activityRes.json()

      console.log('API Responses:', { summaryData, transactionsData, activityData })

      // Handle error responses
      if (!summaryRes.ok || summaryData.error) {
        console.error('Summary API error:', summaryData)
        setSummary({
          books_issued: 0,
          books_returned: 0,
          renewals: 0,
          fines_collected: 0,
          overdue_books: 0
        })
      } else {
        setSummary(summaryData)
      }

      if (!transactionsRes.ok || transactionsData.error) {
        console.error('Transactions API error:', transactionsData)
        setTransactions([])
      } else {
        setTransactions(Array.isArray(transactionsData) ? transactionsData : [])
      }

      if (!activityRes.ok || activityData.error) {
        console.error('Activity API error:', activityData)
        setDailyActivity([])
      } else {
        setDailyActivity(Array.isArray(activityData) ? activityData : [])
      }
    } catch (error) {
      console.error('Error fetching librarian report data:', error)
      setSummary({
        books_issued: 0,
        books_returned: 0,
        renewals: 0,
        fines_collected: 0,
        overdue_books: 0
      })
      setTransactions([])
      setDailyActivity([])
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = () => {
    setAppliedFilters(filters)
    // Keep filter panel open - don't close it
  }

  const handleClearFilters = () => {
    const defaultFilters = {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
      actions: [],
      fineStatuses: [],
      memberNames: [],
      assetTitles: [],
      assetTypes: []
    }
    setFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Member', 'Book', 'Action', 'Fine', 'Status']
    const rows = transactions.map(t => [
      t.Borrow_Date?.split('T')[0] || '',
      t.member_name,
      t.book_title,
      t.action,
      `$${parseFloat(t.fine || 0).toFixed(2)}`,
      t.status
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `librarian-report-${appliedFilters.from}-to-${appliedFilters.to}.csv`
    a.click()
  }

  const exportToPDF = () => {
    window.print()
  }

  const getSummaryText = () => {
    const days = Math.ceil((new Date(appliedFilters.to) - new Date(appliedFilters.from)) / (1000 * 60 * 60 * 24))
    return `Between ${new Date(appliedFilters.from).toLocaleDateString()} and ${new Date(appliedFilters.to).toLocaleDateString()} (${days} days), you issued ${summary.books_issued || 0} books, processed ${summary.renewals || 0} renewals, and collected $${parseFloat(summary.fines_collected || 0).toFixed(2)} in fines.`
  }

  const summaryCards = [
    {
      title: 'Assets Issued',
      value: summary.books_issued || 0,
      icon: BookOpen,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Assets Returned',
      value: summary.books_returned || 0,
      icon: BookCheck,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Renewals & Extensions',
      value: summary.renewals || 0,
      icon: RefreshCw,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Fines Collected',
      value: `$${parseFloat(summary.fines_collected || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'from-yellow-500 to-amber-600',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Overdue Items',
      value: summary.overdue_books || 0,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

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

  return (
    <div className="librarian-report-page p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">My Activity Report</h1>
            <p className="text-gray-600">Track your daily library operations and performance</p>
          </div>
          
          {/* Export Buttons */}
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Export as CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden md:inline">CSV</span>
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Export as PDF"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">PDF</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {summaryCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <card.icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
          >
            {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          
          {(appliedFilters.actions.length > 0 || appliedFilters.fineStatuses.length > 0 || appliedFilters.memberNames.length > 0 || appliedFilters.assetTitles.length > 0 || appliedFilters.assetTypes.length > 0) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-visible"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-visible"
          >
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                From Date
              </label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                To Date
              </label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Action Type - Multi-select */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type ({filters.actions.length} selected)
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white min-h-[42px]">
                <div className="space-y-2">
                  {[
                    { value: 'issued', label: 'Issued/Reserved' },
                    { value: 'returned', label: 'Returned/Checked Out' },
                    { value: 'renewed', label: 'Renewed/Extended' }
                  ].map(action => (
                    <label key={action.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.actions.includes(action.value)}
                        onChange={(e) => {
                          const newActions = e.target.checked
                            ? [...filters.actions, action.value]
                            : filters.actions.filter(a => a !== action.value)
                          setFilters({ ...filters, actions: newActions })
                        }}
                        className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm">{action.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Fine Status - Multi-select */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Fine Status ({filters.fineStatuses.length} selected)
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white min-h-[42px]">
                <div className="space-y-2">
                  {[
                    { value: 'paid', label: 'Paid' },
                    { value: 'unpaid', label: 'Unpaid' }
                  ].map(status => (
                    <label key={status.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.fineStatuses.includes(status.value)}
                        onChange={(e) => {
                          const newStatuses = e.target.checked
                            ? [...filters.fineStatuses, status.value]
                            : filters.fineStatuses.filter(s => s !== status.value)
                          setFilters({ ...filters, fineStatuses: newStatuses })
                        }}
                        className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Member Name - Multi-select */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Member Name ({filters.memberNames.length} selected)
              </label>
              <input
                type="text"
                placeholder="Search members..."
                value={memberSearchText}
                onChange={(e) => setMemberSearchText(e.target.value)}
                onFocus={() => {
                  console.log('Member dropdown opened. Members list:', membersList)
                  setShowMemberDropdown(true)
                }}
                onBlur={() => setTimeout(() => setShowMemberDropdown(false), 300)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {/* Selected members badges */}
              {filters.memberNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.memberNames.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      {name}
                      <button
                        onClick={() => {
                          setFilters({
                            ...filters,
                            memberNames: filters.memberNames.filter(n => n !== name)
                          })
                        }}
                        className="hover:text-green-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {showMemberDropdown && membersList.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  {membersList
                    .filter(member => 
                      member.member_name.toLowerCase().includes(memberSearchText.toLowerCase())
                    )
                    .map((member) => (
                      <label
                        key={member.User_ID}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 cursor-pointer"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const isSelected = filters.memberNames.includes(member.member_name)
                          const newNames = isSelected
                            ? filters.memberNames.filter(n => n !== member.member_name)
                            : [...filters.memberNames, member.member_name]
                          setFilters({ ...filters, memberNames: newNames })
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={filters.memberNames.includes(member.member_name)}
                          onChange={() => {}}
                          className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm">{member.member_name}</span>
                      </label>
                    ))}
                  {membersList.filter(member => 
                    member.member_name.toLowerCase().includes(memberSearchText.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No members found</div>
                  )}
                </div>
              )}
            </div>

            {/* Asset Title - Multi-select */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Book className="w-4 h-4 inline mr-1" />
                Asset Title ({filters.assetTitles.length} selected)
              </label>
              <input
                type="text"
                placeholder="Search assets..."
                value={assetSearchText}
                onChange={(e) => setAssetSearchText(e.target.value)}
                onFocus={() => {
                  console.log('Asset dropdown opened. Assets list:', assetsList)
                  setShowAssetDropdown(true)
                }}
                onBlur={() => setTimeout(() => setShowAssetDropdown(false), 300)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {/* Selected assets badges */}
              {filters.assetTitles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.assetTitles.map(title => (
                    <span key={title} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      {title.substring(0, 20)}{title.length > 20 ? '...' : ''}
                      <button
                        onClick={() => {
                          setFilters({
                            ...filters,
                            assetTitles: filters.assetTitles.filter(t => t !== title)
                          })
                        }}
                        className="hover:text-green-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {showAssetDropdown && assetsList.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  {assetsList
                    .filter(asset => {
                      // Filter by asset type if any selected
                      const typeMatch = filters.assetTypes.length === 0 || filters.assetTypes.includes(asset.asset_type);
                      // Filter by search text
                      const textMatch = asset.book_title.toLowerCase().includes(assetSearchText.toLowerCase());
                      return typeMatch && textMatch;
                    })
                    .map((asset) => (
                      <label
                        key={asset.Asset_ID}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 cursor-pointer"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const isSelected = filters.assetTitles.includes(asset.book_title)
                          const newTitles = isSelected
                            ? filters.assetTitles.filter(t => t !== asset.book_title)
                            : [...filters.assetTitles, asset.book_title]
                          setFilters({ ...filters, assetTitles: newTitles })
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={filters.assetTitles.includes(asset.book_title)}
                          onChange={() => {}}
                          className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{asset.book_title}</div>
                          <div className="text-xs text-gray-500">{asset.asset_type}</div>
                        </div>
                      </label>
                    ))}
                  {assetsList.filter(asset => {
                    const typeMatch = filters.assetTypes.length === 0 || filters.assetTypes.includes(asset.asset_type);
                    const textMatch = asset.book_title.toLowerCase().includes(assetSearchText.toLowerCase());
                    return typeMatch && textMatch;
                  }).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No assets found</div>
                  )}
                </div>
              )}
            </div>

            {/* Asset Type - Multi-select */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Type ({filters.assetTypes.length} selected)
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white min-h-[42px]">
                <div className="space-y-2">
                  {[
                    { value: 'Book', label: 'Books' },
                    { value: 'CD', label: 'CDs' },
                    { value: 'Audiobook', label: 'Audiobooks' },
                    { value: 'Movie', label: 'Movies' },
                    { value: 'Technology', label: 'Technology' },
                    { value: 'Study Room', label: 'Study Rooms' }
                  ].map(type => (
                    <label key={type.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.assetTypes.includes(type.value)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...filters.assetTypes, type.value]
                            : filters.assetTypes.filter(t => t !== type.value)
                          setFilters({ ...filters, assetTypes: newTypes })
                        }}
                        className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Apply Filters Button */}
            <div className="col-span-full flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowFilters(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'table'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Table View
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'chart'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Chart View
          </button>
        </div>
      </div>

      {/* Daily Activity Chart */}
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
              {/* Dynamically show bars based on selected actions or show all if none selected */}
              {(appliedFilters.actions.length === 0 || appliedFilters.actions.includes('issued')) && (
                <Bar dataKey="issued" fill="#10b981" name="Issued/Reserved" radius={[8, 8, 0, 0]} />
              )}
              {(appliedFilters.actions.length === 0 || appliedFilters.actions.includes('returned')) && (
                <Bar dataKey="returned" fill="#3b82f6" name="Returned/Checked Out" radius={[8, 8, 0, 0]} />
              )}
              {(appliedFilters.actions.length === 0 || appliedFilters.actions.includes('renewed')) && (
                <Bar dataKey="renewed" fill="#8b5cf6" name="Renewed/Extended" radius={[8, 8, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Transactions Table */}
      {viewMode === 'table' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Transaction Details</h2>
          <p className="text-green-50 text-sm mt-1">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fine</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No transactions found for the selected period</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, index) => (
                  <motion.tr
                    key={transaction.Borrow_ID}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {new Date(transaction.Borrow_Date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      <div>
                        <p className="font-medium">{transaction.member_name}</p>
                        <p className="text-xs text-gray-500">ID: M{String(transaction.member_id).padStart(3, '0')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      <div>
                        <p className="font-medium">{transaction.book_title}</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                          transaction.asset_type === 'Book' ? 'bg-blue-100 text-blue-700' :
                          transaction.asset_type === 'CD' ? 'bg-purple-100 text-purple-700' :
                          transaction.asset_type === 'Movie' ? 'bg-red-100 text-red-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {transaction.asset_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.action === 'Issued' ? 'bg-green-100 text-green-700' :
                        transaction.action === 'Returned' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {transaction.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${parseFloat(transaction.fine) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        ${parseFloat(transaction.fine || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'Active' ? 'bg-green-100 text-green-700' :
                        transaction.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
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
    </div>
  )
}

export default LibrarianReport