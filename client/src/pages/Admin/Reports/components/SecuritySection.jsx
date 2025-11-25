import React, { useState, useEffect } from 'react';
import { Shield, Lock, Activity } from 'lucide-react';
import DateFilter from './DateFilter';
import CheckboxFilter from './CheckboxFilter';

const SecuritySection = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSecurityData();
    }, []);

    const fetchSecurityData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/reports/admin/security', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            console.log('Security Data:', data);
            if (Array.isArray(data)) {
                setLogs(data);
            } else {
                console.error('Security data is not an array:', data);
                setLogs([]);
            }
        } catch (error) {
            console.error('Error fetching security data:', error);
        } finally {
            setLoading(false);
        }
    };

    const [filters, setFilters] = useState({ search: '', action: ['All'], startDate: '', endDate: '' });

    const metrics = {
        totalEvents: logs.length,
        failedLogins: logs.filter(l => l.Action === 'LOGIN_FAILED').length,
        uniqueUsers: new Set(logs.map(l => l.User_ID)).size
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = (log.Action?.toLowerCase() || '').includes(filters.search.toLowerCase()) ||
            (log.Details?.toLowerCase() || '').includes(filters.search.toLowerCase()) ||
            (log.IP_Address || '').includes(filters.search) ||
            String(log.User_ID || '').includes(filters.search);

        if (!matchesSearch) return false;

        // Action Filter
        if (!filters.action.includes('All') && !filters.action.includes(log.Action)) return false;

        if (filters.startDate && new Date(log.Timestamp) < new Date(filters.startDate)) return false;
        if (filters.endDate && new Date(log.Timestamp) > new Date(filters.endDate)) return false;

        return true;
    });

    const SummaryCard = ({ title, value, color, icon: Icon }) => (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    );

    const actionTypes = ['All', ...new Set(logs.map(log => log.Action))];

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard title="Total Events" value={metrics.totalEvents} color="bg-purple-500" icon={Activity} />
                <SummaryCard title="Failed Logins" value={metrics.failedLogins} color="bg-red-500" icon={Shield} />
                <SummaryCard title="Unique Users" value={metrics.uniqueUsers} color="bg-blue-500" icon={Lock} />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex gap-4 flex-1 w-full flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    <CheckboxFilter
                        label="Event Type"
                        options={actionTypes.filter(a => a !== 'All')}
                        selected={filters.action}
                        onChange={(newAction) => setFilters({ ...filters, action: newAction })}
                        color="purple"
                    />

                    <DateFilter
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onDateChange={(start, end) => setFilters({ ...filters, startDate: start, endDate: end })}
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600" />
                        System Audit Log
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Timestamp</th>
                                <th className="px-6 py-3">Action</th>
                                <th className="px-6 py-3">User ID</th>
                                <th className="px-6 py-3">Details</th>
                                <th className="px-6 py-3">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No audit logs found matching filters</td></tr>
                            ) : (
                                filteredLogs.map((log, index) => {
                                    if (!log || typeof log !== 'object') return null;
                                    return (
                                        <tr key={log.Log_ID || index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(log.Timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {log.Action}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {log.User_ID || 'System'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 max-w-md truncate" title={typeof log.Details === 'object' ? JSON.stringify(log.Details) : log.Details}>
                                                {typeof log.Details === 'object' ? JSON.stringify(log.Details) : log.Details}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                                {log.IP_Address}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default SecuritySection;
