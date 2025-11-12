import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Home, BookOpen, RefreshCw, Users, DollarSign, 
  FileText, LogOut, Search, Calendar, User,
  TrendingUp, TrendingDown, BookMarked, AlertCircle,
  Library, UserPlus, Clock
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// API Configuration
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'

// Modern Stat Card Component
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

// Sidebar Navigation Component
const Sidebar = ({ activePage, onPageChange, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'assets', label: 'Manage Assets', icon: BookOpen },
    { id: 'issue-return', label: 'Issue / Return', icon: RefreshCw },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'fines', label: 'Fine and Payment', icon: DollarSign },
    { id: 'records', label: 'All Records', icon: FileText },
  ]

  return (
    <div className="w-64 bg-slate-800 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Library className="w-6 h-6 mr-2" />
          LMS
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`
              w-full flex items-center px-6 py-3 text-sm font-medium transition-all duration-200
              ${activePage === item.id 
                ? 'bg-indigo-600 text-white border-l-4 border-sky-400' 
                : 'text-gray-300 hover:bg-slate-700 hover:text-white'
              }
            `}
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

// Top Navbar Component
const TopNavbar = ({ searchQuery, setSearchQuery, dateRange, setDateRange }) => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Ex. ISBN, Title, Author, Member, etc."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Date Range & Profile */}
        <div className="flex items-center gap-4 ml-6">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
            </select>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-300">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Dashboard View Component
const DashboardView = ({ stats, chartData, overdueBooks, recentCheckouts, topBooks }) => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Borrowed Books"
          value={stats.borrowedBooks}
          change="+12.5%"
          isIncrease={true}
          icon={BookMarked}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          delay={0}
        />
        <StatCard
          title="Returned Books"
          value={stats.returnedBooks}
          change="+8.2%"
          isIncrease={true}
          icon={RefreshCw}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
          delay={0.1}
        />
        <StatCard
          title="Overdue Books"
          value={stats.overdueBooks}
          change="-3.1%"
          isIncrease={false}
          icon={AlertCircle}
          gradient="bg-gradient-to-br from-red-500 to-red-600"
          delay={0.2}
        />
        <StatCard
          title="Total Books"
          value={stats.totalBooks}
          change="+5.4%"
          isIncrease={true}
          icon={Library}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          delay={0.3}
        />
        <StatCard
          title="Active Members"
          value={stats.activeMembers}
          change="+15.3%"
          isIncrease={true}
          icon={Users}
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
          delay={0.4}
        />
        <StatCard
          title="New Members"
          value={stats.newMembers}
          change="+23.1%"
          isIncrease={true}
          icon={UserPlus}
          gradient="bg-gradient-to-br from-teal-500 to-teal-600"
          delay={0.5}
        />
        <StatCard
          title="Pending Fees"
          value={`$${stats.pendingFees}`}
          change="-7.8%"
          isIncrease={false}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
          delay={0.6}
        />
        <StatCard
          title="Visitors Today"
          value={stats.visitorsToday}
          change="+18.7%"
          isIncrease={true}
          icon={Clock}
          gradient="bg-gradient-to-br from-pink-500 to-pink-600"
          delay={0.7}
        />
      </div>

      {/* Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="bg-white rounded-xl shadow-md p-6 mb-8"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">Borrowed vs Returned (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }} 
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="borrowed" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="returned" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Overdue History Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Overdue History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fine</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {overdueBooks.map((book, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.memberId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{book.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.isbn}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.dueDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">${book.fine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Top Books */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="bg-white rounded-xl shadow-md overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Top Books</h2>
          </div>
          <div className="p-6">
            {topBooks.map((book, index) => (
              <div key={index} className="mb-4 pb-4 border-b border-gray-200 last:border-0">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{book.title}</h4>
                <p className="text-xs text-gray-500 mb-2">by {book.author}</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  book.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {book.available ? 'Available' : 'Borrowed'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Checkouts Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.1 }}
        className="bg-white rounded-xl shadow-md overflow-hidden mt-8"
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Checkouts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issued Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentCheckouts.map((checkout, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{checkout.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{checkout.isbn}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{checkout.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{checkout.author}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{checkout.member}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{checkout.issuedDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{checkout.returnDate || 'Pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

// Main Modern Dashboard Component
export const ModernDashboard = () => {
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState('180')
  
  // Sample data - replace with actual API calls
  const [stats, setStats] = useState({
    borrowedBooks: 156,
    returnedBooks: 142,
    overdueBooks: 12,
    totalBooks: 2847,
    activeMembers: 342,
    newMembers: 28,
    pendingFees: 450,
    visitorsToday: 87
  })

  const [chartData] = useState([
    { day: 'Mon', borrowed: 12, returned: 8 },
    { day: 'Tue', borrowed: 15, returned: 12 },
    { day: 'Wed', borrowed: 10, returned: 14 },
    { day: 'Thu', borrowed: 18, returned: 11 },
    { day: 'Fri', borrowed: 20, returned: 16 },
    { day: 'Sat', borrowed: 25, returned: 19 },
    { day: 'Sun', borrowed: 14, returned: 22 }
  ])

  const [overdueBooks] = useState([
    { memberId: 'M001', title: 'The Great Gatsby', isbn: '978-0-7432-7356-5', dueDate: '2025-10-15', fine: 5.00 },
    { memberId: 'M023', title: 'To Kill a Mockingbird', isbn: '978-0-06-112008-4', dueDate: '2025-10-20', fine: 3.00 },
    { memberId: 'M045', title: '1984', isbn: '978-0-452-28423-4', dueDate: '2025-10-25', fine: 2.00 },
    { memberId: 'M067', title: 'Pride and Prejudice', isbn: '978-0-14-143951-8', dueDate: '2025-11-01', fine: 1.00 },
  ])

  const [recentCheckouts] = useState([
    { id: 1, isbn: '978-1-5011-2701-3', title: 'The Midnight Library', author: 'Matt Haig', member: 'John Doe', issuedDate: '2025-11-08', returnDate: null },
    { id: 2, isbn: '978-0-525-55947-0', title: 'The Vanishing Half', author: 'Brit Bennett', member: 'Jane Smith', issuedDate: '2025-11-07', returnDate: null },
    { id: 3, isbn: '978-0-593-31514-8', title: 'Klara and the Sun', author: 'Kazuo Ishiguro', member: 'Bob Johnson', issuedDate: '2025-11-06', returnDate: '2025-11-09' },
    { id: 4, isbn: '978-0-385-54738-9', title: 'The Testaments', author: 'Margaret Atwood', member: 'Alice Williams', issuedDate: '2025-11-05', returnDate: null },
  ])

  const [topBooks] = useState([
    { title: 'Atomic Habits', author: 'James Clear', available: true },
    { title: 'The Silent Patient', author: 'Alex Michaelides', available: false },
    { title: 'Educated', author: 'Tara Westover', available: true },
    { title: 'Where the Crawdads Sing', author: 'Delia Owens', available: false },
    { title: 'Becoming', author: 'Michelle Obama', available: true },
  ])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userRole')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          {activePage === 'dashboard' && (
            <DashboardView 
              stats={stats}
              chartData={chartData}
              overdueBooks={overdueBooks}
              recentCheckouts={recentCheckouts}
              topBooks={topBooks}
            />
          )}
          {activePage !== 'dashboard' && (
            <div className="p-8">
              <h1 className="text-2xl font-bold text-gray-900">
                {activePage.charAt(0).toUpperCase() + activePage.slice(1)} - Coming Soon
              </h1>
              <p className="text-gray-600 mt-2">This section is under development.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModernDashboard
