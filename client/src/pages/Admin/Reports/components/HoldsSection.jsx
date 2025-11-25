import React, { useState, useEffect } from 'react';
import { Clock, Users, Calendar } from 'lucide-react';
import DateFilter from './DateFilter';

const HoldsSection = () => {
    const [data, setData] = useState({ rawTable: [], metrics: { totalHolds: 0, avgWaitTime: '0 Days' } });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHoldsData();
    }, []);

    const fetchHoldsData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/reports/admin/holds', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch data');
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching holds data:', error);
        } finally {
            setLoading(false);
        }
    };

    const [filters, setFilters] = useState({ search: '', status: 'All', startDate: '', endDate: '' });

    const filteredHolds = data.rawTable.filter(hold => {
        const matchesSearch = (hold.Title?.toLowerCase() || '').includes(filters.search.toLowerCase()) ||
            (`${hold.First_Name} ${hold.Last_Name}`.toLowerCase()).includes(filters.search.toLowerCase());

        if (!matchesSearch) return false;

        if (filters.status === 'All') return true;
        const isExpired = hold.Hold_Expires && new Date(hold.Hold_Expires) < new Date();
        if (filters.status === 'Active') return !isExpired;
        if (filters.status === 'Expired') return isExpired;

        if (filters.startDate && new Date(hold.Hold_Date) < new Date(filters.startDate)) return false;
        if (filters.endDate && new Date(hold.Hold_Date) > new Date(filters.endDate)) return false;

        return true;
    });

    return (
        <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Active Holds</p>
                        <p className="text-2xl font-bold text-gray-900">{data.metrics.totalHolds}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Average Wait Time</p>
                        <p className="text-2xl font-bold text-gray-900">{data.metrics.avgWaitTime}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex gap-4 flex-1 w-full">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by title or student..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    <select
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                    </select>

                    <DateFilter
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onDateChange={(start, end) => setFilters({ ...filters, startDate: start, endDate: end })}
                    />
                </div>
            </div>

            {/* Holds Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Active Holds Queue</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Student</th>
                                <th className="px-6 py-3">Requested Item</th>
                                <th className="px-6 py-3">Request Date</th>
                                <th className="px-6 py-3">Wait Time</th>
                                <th className="px-6 py-3">Expires On</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                            ) : filteredHolds.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No active holds found matching filters</td></tr>
                            ) : (
                                filteredHolds.map((hold) => (
                                    <tr key={hold.Hold_ID} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {hold.First_Name} {hold.Last_Name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 max-w-xs truncate" title={hold.Title}>
                                            {hold.Title}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(hold.Hold_Date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-blue-600">
                                            {hold.Wait_Days} days
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {hold.Hold_Expires ? new Date(hold.Hold_Expires).toLocaleDateString() : 'Never'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HoldsSection;
