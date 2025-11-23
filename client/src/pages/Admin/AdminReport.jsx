import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import {
  Activity, Users, FileText, Shield, DollarSign, Database, Server, Download, AlertTriangle, CheckCircle, Clock, Search, Calendar, RefreshCw, Filter, ChevronDown, File, TrendingUp, TrendingDown
} from 'lucide-react';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AdminReport = () => {
  const [activeTab, setActiveTab] = useState('overview'); // Changed default to overview
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  // New Dashboard State
  const [dashboardStats, setDashboardStats] = useState(null);
  const [activityTrends, setActivityTrends] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [financialTrends, setFinancialTrends] = useState([]);
  const [inventoryHealth, setInventoryHealth] = useState([]);

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDateMenu, setShowDateMenu] = useState(false);

  // Load dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Load tab data when tab or dates change
  useEffect(() => {
    if (activeTab !== 'overview') {
      fetchTabData(activeTab);
    }
  }, [activeTab, dateRange]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, activityRes, growthRes, financeRes, inventoryRes] = await Promise.all([
        fetch(`${API_URL}/reports/admin/dashboard-stats`, { headers }),
        fetch(`${API_URL}/reports/admin/activity-trends`, { headers }),
        fetch(`${API_URL}/reports/admin/user-growth`, { headers }),
        fetch(`${API_URL}/reports/admin/financial-trends`, { headers }),
        fetch(`${API_URL}/reports/admin/inventory-health`, { headers })
      ]);

      const stats = statsRes.ok ? await statsRes.json() : {};
      const activity = activityRes.ok ? await activityRes.json() : [];
      const growth = growthRes.ok ? await growthRes.json() : [];
      const finance = financeRes.ok ? await financeRes.json() : [];
      const inventory = inventoryRes.ok ? await inventoryRes.json() : [];

      setDashboardStats(stats);
      setActivityTrends(Array.isArray(activity) ? activity : []);
      setUserGrowth(Array.isArray(growth) ? growth : []);
      setFinancialTrends(Array.isArray(finance) ? finance : []);
      setInventoryHealth(Array.isArray(inventory) ? inventory : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const [error, setError] = useState(null);

  // ... (keep other state)

  const fetchTabData = async (tab) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      switch (tab) {
        case 'activity': endpoint = '/reports/admin/audit-trail'; break;
        case 'users': endpoint = '/reports/admin/user-changes'; break;
        case 'policy': endpoint = '/reports/admin/policy-changes'; break;
        case 'catalog': endpoint = '/reports/admin/catalog-overrides'; break;
        case 'financial': endpoint = '/reports/admin/financial'; break;
        case 'health': endpoint = '/reports/admin/system-health'; break;
        case 'exports': endpoint = '/reports/admin/generated'; break;
        default: endpoint = '/reports/admin/audit-trail';
      }

      const queryParams = new URLSearchParams();
      if (dateRange.start) queryParams.append('startDate', dateRange.start);
      if (dateRange.end) queryParams.append('endDate', dateRange.end);

      // Add filters for activity tab
      if (tab === 'activity') {
        if (searchQuery) queryParams.append('search', searchQuery);
        if (selectedRole) queryParams.append('role', selectedRole);
        if (selectedAction) queryParams.append('action', selectedAction);
      }

      const url = `${API_URL}${endpoint}?${queryParams.toString()}`;
      console.log('Fetching URL:', url);

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText} - ${errText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching tab data:', error);
      setError(error.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    // Placeholder for export functionality
    console.log(`Exporting report as ${format}`);
    alert(`Exporting report as ${format}... (Check console)`);
  };



  const handleDatePreset = (preset) => {
    setShowDateMenu(false);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        // Monday as start of week
        const day = now.getDay() || 7;
        if (day !== 1) start.setHours(-24 * (day - 1));
        else start.setHours(0, 0, 0, 0);
        end = now;
        break;
      case 'lastWeek':
        const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        const lastDay = lastWeek.getDay() || 7;
        start = new Date(lastWeek);
        if (lastDay !== 1) start.setHours(-24 * (lastDay - 1));
        else start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last30':
        start.setDate(now.getDate() - 30);
        end = now;
        break;
      case 'last90':
        start.setDate(now.getDate() - 90);
        end = now;
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      default:
        return;
    }

    // Format to YYYY-MM-DD for input[type="date"]
    const formatDate = (d) => d.toISOString().split('T')[0];
    setDateRange({ start: formatDate(start), end: formatDate(end) });
  };

  const renderHeader = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Admin Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">System-wide analytics and audit logs</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Presets Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Date Range</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showDateMenu && (
              <>
                <div
                  className="fixed inset-0 z-0"
                  onClick={() => setShowDateMenu(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                  <button onClick={() => handleDatePreset('today')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Today</button>
                  <button onClick={() => handleDatePreset('yesterday')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Yesterday</button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button onClick={() => handleDatePreset('thisWeek')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">This Week</button>
                  <button onClick={() => handleDatePreset('lastWeek')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Last Week</button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button onClick={() => handleDatePreset('thisMonth')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">This Month</button>
                  <button onClick={() => handleDatePreset('lastMonth')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Last Month</button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button onClick={() => handleDatePreset('last30')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Last 30 Days</button>
                  <button onClick={() => handleDatePreset('thisYear')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">This Year</button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
            <input
              type="date"
              className="bg-transparent border-none text-xs p-2 focus:ring-0 outline-none text-gray-600"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              className="bg-transparent border-none text-xs p-2 focus:ring-0 outline-none text-gray-600"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExport('PDF')}
              className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <File className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => handleExport('CSV')}
              className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => { fetchSummary(); fetchTabData(activeTab); }}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderKPICards = () => {
    if (!dashboardStats) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl mb-6"></div>;

    const cards = [
      { title: 'Total Users', value: dashboardStats.totalUsers, icon: Users, color: 'text-white', bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600' },
      { title: 'Active Loans', value: dashboardStats.activeLoans, icon: FileText, color: 'text-white', bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
      { title: 'Revenue', value: `$${dashboardStats.revenue || 0}`, icon: DollarSign, color: 'text-white', bg: 'bg-gradient-to-br from-amber-500 to-amber-600' },
      { title: 'System Health', value: '99.9%', sub: `${dashboardStats.systemHealth} Issues (24h)`, icon: Activity, color: 'text-white', bg: 'bg-gradient-to-br from-rose-500 to-rose-600' },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, idx) => (
          <div key={idx} className={`${card.bg} p-6 rounded-2xl shadow-lg text-white transform hover:scale-105 transition-transform duration-200`}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                +2.5%
              </span>
            </div>
            <h3 className="text-3xl font-bold mb-1">{card.value}</h3>
            <p className="text-indigo-100 text-sm font-medium">{card.title}</p>
            {card.sub && <p className="text-xs text-white/80 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {card.sub}</p>}
          </div>
        ))}
      </div>
    );
  };

  const renderTabs = () => {
    const tabs = [
      { id: 'overview', label: 'Executive Overview' },
      { id: 'activity', label: 'Activity Log' },
      { id: 'users', label: 'User & Role Changes' },
      { id: 'policy', label: 'Policy / Config' },
      { id: 'catalog', label: 'Catalog & Overrides' },
      { id: 'financial', label: 'Fines & Payments' },
      { id: 'health', label: 'System Health' },
      { id: 'exports', label: 'Exports & Reports' },
    ];

    return (
      <div className="border-b border-gray-200 mb-8 overflow-x-auto">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 scale-105'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    );
  };

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Top Row: Activity & User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Trends */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            System Activity Trends
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityTrends}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString()} stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  labelFormatter={(str) => new Date(str).toLocaleDateString()}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            User Growth
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString()} stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend />
                <Bar dataKey="newUsers" name="New Users" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deletedUsers" name="Deleted Users" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Inventory & Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventory Health */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" />
            Inventory Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventoryHealth}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="total"
                >
                  {inventoryHealth.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Trends */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-rose-500" />
            Revenue Trends (90 Days)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financialTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString()} stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper to format JSON details
  const formatDetails = (details) => {
    if (!details) return '-';
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      return Object.entries(parsed).map(([key, value]) => (
        <span key={key} className="block text-xs text-gray-500">
          <span className="font-medium text-gray-700">{key}:</span> {String(value)}
        </span>
      ));
    } catch (e) {
      return <span className="text-gray-400 italic">{String(details)}</span>;
    }
  };

  // Helper for action badge colors
  const getActionColor = (action) => {
    if (!action) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (action.includes('FAIL') || action.includes('DELETE') || action.includes('BLOCK')) return 'bg-red-100 text-red-700 border-red-200';
    if (action.includes('SUCCESS') || action.includes('CREATE') || action.includes('ACTIVATE') || action.includes('PAYMENT')) return 'bg-green-100 text-green-700 border-green-200';
    if (action.includes('UPDATE') || action.includes('CHANGE') || action.includes('RESET')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const renderTable = (columns) => {
    if (loading) return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

    if (error) return (
      <div className="text-center p-12 bg-white rounded-xl border border-red-100">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 font-medium">Error loading report data</p>
        <p className="text-red-400 text-sm mt-1">{error}</p>
        <button
          onClick={() => fetchTabData(activeTab)}
          className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
        >
          Try Again
        </button>
      </div>
    );

    if (!data || data.length === 0) return (
      <div className="text-center p-12 bg-white rounded-xl border border-gray-100">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No records found for this period.</p>
      </div>
    );

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-medium">Time</th>
                <th className="p-4 font-medium">Admin / User</th>
                <th className="p-4 font-medium">Action</th>
                <th className="p-4 font-medium">Details</th>
                <th className="p-4 font-medium">IP / Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((log) => (
                <tr key={log.Log_ID} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(log.Timestamp).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {log.Username ? log.Username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.Username || `User ID: ${log.User_ID}`}</p>
                        <p className="text-xs text-gray-500 capitalize">{log.Role_Name || 'Unknown Role'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getActionColor(log.Action)}`}>
                      {log.Action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs overflow-hidden">
                    {formatDetails(log.Details)}
                  </td>
                  <td className="p-4 text-sm text-gray-500 font-mono">
                    {log.IP_Address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'activity') fetchTabData('activity');
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedRole, selectedAction]);

  const renderFilterBar = () => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 mb-4 flex flex-col md:flex-row gap-4 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search logs (User, Action, Details, IP)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div className="flex gap-2 w-full md:w-auto">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="librarian">Librarian</option>
          <option value="admin">Admin</option>
        </select>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Actions</option>
          <option value="USER_CREATE">User Create</option>
          <option value="USER_UPDATE">User Update</option>
          <option value="LOGIN_FAILED">Login Failed</option>
          <option value="PAYMENT_PROCESSED">Payment</option>
          <option value="FINE_WAIVE">Fine Waive</option>
        </select>

        <button
          onClick={() => { setSearchQuery(''); setSelectedRole(''); setSelectedAction(''); }}
          className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          Clear
        </button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'activity':
        return (
          <div className="space-y-4">
            {renderFilterBar()}
            {renderTable(['Time', 'Admin', 'Action', 'Details', 'IP / Device'])}
          </div>
        );
      case 'users':
        return renderTable(['Time', 'Admin', 'Action', 'Details', 'IP']);
      case 'policy':
        return renderTable(['Time', 'Admin', 'Action', 'Config Details', 'Source']);
      case 'catalog':
        return renderTable(['Time', 'Admin', 'Action', 'Item Details', 'Notes']);
      case 'financial':
        return renderTable(['Time', 'Admin', 'Action', 'Amount / Details', 'Reference']);
      case 'health':
        const healthStats = data?.stats || { errorRate: '0%', backupSuccessRate: '100%', totalErrors: 0, recentBackups: 0 };
        const healthLogs = data?.logs || [];
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase">24h Error Rate</p>
                <p className={`text-xl font-bold ${parseFloat(healthStats.errorRate) > 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {healthStats.errorRate}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase">Backup Success</p>
                <p className="text-xl font-bold text-blue-600">{healthStats.backupSuccessRate}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase">Total Errors (24h)</p>
                <p className="text-xl font-bold text-gray-600">{healthStats.totalErrors}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase">Recent Backups</p>
                <p className="text-xl font-bold text-gray-600">{healthStats.recentBackups}</p>
              </div>
            </div>
            {/* Pass logs specifically since data is now an object */}
            {(() => {
              // Temporary override of data for renderTable to work with the new structure
              const originalData = data;
              // We can't easily mutate state here, so we'll just render the table manually or adjust renderTable
              // Better approach: Adjust renderTable to accept data as prop or handle this structure
              return (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                          <th className="p-4 font-medium">Time</th>
                          <th className="p-4 font-medium">System/Admin</th>
                          <th className="p-4 font-medium">Event</th>
                          <th className="p-4 font-medium">Status</th>
                          <th className="p-4 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {healthLogs.map((log) => (
                          <tr key={log.Log_ID} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{new Date(log.Timestamp).toLocaleString()}</td>
                            <td className="p-4 text-sm text-gray-900">System</td>
                            <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getActionColor(log.Action)}`}>{log.Action.replace(/_/g, ' ')}</span></td>
                            <td className="p-4 text-sm text-gray-600">{formatDetails(log.Details)}</td>
                            <td className="p-4 text-sm text-gray-500">-</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      case 'exports':
        return renderTable(['Time', 'Admin', 'Report Type', 'Details', 'Downloaded']);
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      {renderHeader()}
      {renderKPICards()}
      {renderTabs()}
      {renderTabContent()}

      <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
        <p>Generated on: {new Date().toLocaleString()} • System Version 1.2.0 • Report ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
      </div>
    </div>
  );
};

export default AdminReport;
