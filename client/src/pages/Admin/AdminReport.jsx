import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Activity, Users, FileText, Shield, DollarSign, Database, Server, Download, AlertTriangle, CheckCircle, Clock, Search, Calendar, RefreshCw, Filter, ChevronDown, File
} from 'lucide-react';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AdminReport = () => {
  const [activeTab, setActiveTab] = useState('activity');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Load summary data once on mount or when dates change
  useEffect(() => {
    fetchSummary();
  }, [dateRange]);

  // Load tab data when tab or dates change
  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, dateRange]);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (dateRange.start) queryParams.append('startDate', dateRange.start);
      if (dateRange.end) queryParams.append('endDate', dateRange.end);

      const response = await fetch(`${API_URL}/reports/admin/activity?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      setSummaryData(result);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchTabData = async (tab) => {
    setLoading(true);
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

      const url = `${API_URL}${endpoint}?${queryParams.toString()}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching tab data:', error);
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
          <div className="relative group">
            <button className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Date Range</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 hidden group-hover:block z-10">
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
    if (!summaryData) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl mb-6"></div>;

    const cards = [
      { title: 'Total Actions', value: summaryData.Total_Actions, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
      { title: 'Policy Changes', value: summaryData.Policy_Changes, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
      { title: 'Role Changes', value: summaryData.User_Role_Changes, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
      { title: 'New Users', value: summaryData.New_Users, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
      { title: 'Data Exports', value: summaryData.Data_Exports, icon: Download, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { title: 'Backups', value: summaryData.Backup_Success, sub: `${summaryData.Backup_Fail} Failed`, icon: Server, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {/* Trend indicator could go here */}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">{card.title}</p>
            {card.sub && <p className="text-xs text-red-500 mt-1">{card.sub}</p>}
          </div>
        ))}
      </div>
    );
  };

  const renderTabs = () => {
    const tabs = [
      { id: 'activity', label: 'Activity Log' },
      { id: 'users', label: 'User & Role Changes' },
      { id: 'policy', label: 'Policy / Config' },
      { id: 'catalog', label: 'Catalog & Overrides' },
      { id: 'financial', label: 'Fines & Payments' },
      { id: 'health', label: 'System Health' },
      { id: 'exports', label: 'Exports & Reports' },
    ];

    return (
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
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

  const renderTable = (columns) => {
    if (loading) return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

    if (!data || data.length === 0) return (
      <div className="text-center p-12 bg-white rounded-xl border border-gray-100">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No records found for this period.</p>
      </div>
    );

    return (
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row) => (
                <tr key={row.Log_ID} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(row.Timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    User ID: {row.User_ID}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                      {row.Action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate font-mono text-xs">
                    {typeof row.Details === 'string' ? row.Details : JSON.stringify(row.Details)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.IP_Address || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'activity':
        return (
          <div className="space-y-4">
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by action, admin, or target..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
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
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase">Uptime</p>
                <p className="text-xl font-bold text-green-600">99.9%</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase">Error Rate</p>
                <p className="text-xl font-bold text-gray-600">0.05%</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase">API Latency</p>
                <p className="text-xl font-bold text-gray-600">45ms</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase">Queue Backlog</p>
                <p className="text-xl font-bold text-gray-600">0</p>
              </div>
            </div>
            {renderTable(['Time', 'System/Admin', 'Event', 'Status', 'Notes'])}
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
