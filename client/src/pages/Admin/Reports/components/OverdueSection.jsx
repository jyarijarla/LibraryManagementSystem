import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import DateFilter from './DateFilter';
import CheckboxFilter from './CheckboxFilter';

const OverdueSection = () => {
    const [data, setData] = useState({ rawTable: [], buckets: {} });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        riskLevel: ['All'],
        category: ['All'],
        startDate: '',
        endDate: ''
    });

    const filteredData = data.rawTable.filter(item => {
        const matchesSearch = (item.Title?.toLowerCase() || '').includes(filters.search.toLowerCase()) ||
            (`${item.First_Name} ${item.Last_Name}`.toLowerCase()).includes(filters.search.toLowerCase());

        if (!matchesSearch) return false;

        // Risk Level Filter
        if (!filters.riskLevel.includes('All')) {
            const isHigh = filters.riskLevel.includes('High Risk (90+ Days)') && item.Aging_Bucket === '90+ Days';
            const isMedium = filters.riskLevel.includes('Medium Risk (31-90 Days)') && item.Aging_Bucket === '31-90 Days';
            const isLow = filters.riskLevel.includes('Low Risk (1-30 Days)') && (item.Aging_Bucket === '1-7 Days' || item.Aging_Bucket === '8-30 Days');

            if (!isHigh && !isMedium && !isLow) return false;
        }

        // Category Filter
        if (!filters.category.includes('All') && !filters.category.includes(item.Category)) return false;

        if (filters.startDate && new Date(item.Due_Date) < new Date(filters.startDate)) return false;
        if (filters.endDate && new Date(item.Due_Date) > new Date(filters.endDate)) return false;

        return true;
    });

    useEffect(() => {
        fetchOverdueData();
    }, []);

    const fetchOverdueData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/reports/admin/overdue', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch data');
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching overdue data:', error);
        } finally {
            setLoading(false);
        }
    };

    const BucketCard = ({ label, count, color }) => (
        <div className={`p-4 rounded-lg border ${color} bg-white shadow-sm flex flex-col items-center justify-center`}>
            <span className="text-sm text-gray-500 font-medium mb-1">{label}</span>
            <span className="text-2xl font-bold text-gray-800">{count || 0}</span>
            <span className="text-xs text-gray-400 mt-1">Items</span>
        </div>
    );

    const categories = ['All', ...new Set(data.rawTable.map(item => item.Category).filter(Boolean))];

    return (
        <div className="space-y-6">
            {/* Aging Buckets */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <BucketCard label="1-7 Days" count={data.buckets['1-7 Days']} color="border-yellow-200" />
                <BucketCard label="8-30 Days" count={data.buckets['8-30 Days']} color="border-orange-200" />
                <BucketCard label="31-90 Days" count={data.buckets['31-90 Days']} color="border-red-200" />
                <BucketCard label="90+ Days" count={data.buckets['90+ Days']} color="border-red-400" />
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
                            placeholder="Search by title or borrower..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    <CheckboxFilter
                        label="Risk Level"
                        options={['High Risk (90+ Days)', 'Medium Risk (31-90 Days)', 'Low Risk (1-30 Days)']}
                        selected={filters.riskLevel}
                        onChange={(newRisk) => setFilters({ ...filters, riskLevel: newRisk })}
                        color="red"
                    />

                    <CheckboxFilter
                        label="Category"
                        options={categories.filter(c => c !== 'All')}
                        selected={filters.category}
                        onChange={(newCategory) => setFilters({ ...filters, category: newCategory })}
                        color="orange"
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
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        Overdue Items List
                    </h3>
                    <span className="text-xs text-gray-500">Sorted by days overdue (desc)</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Borrower</th>
                                <th className="px-6 py-3">Item Title</th>
                                <th className="px-6 py-3">Due Date</th>
                                <th className="px-6 py-3">Days Overdue</th>
                                <th className="px-6 py-3">Current Fine</th>
                                <th className="px-6 py-3">Risk Level</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No overdue items found matching filters</td></tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.Borrow_ID} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {item.First_Name} {item.Last_Name}
                                            <div className="text-xs text-gray-500">{item.User_Email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 max-w-xs truncate" title={item.Title}>
                                            {item.Title}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(item.Due_Date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-red-600">
                                            {item.Days_Overdue} days
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            ${Number(item.Current_Fine).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${item.Aging_Bucket === '90+ Days' ? 'bg-red-900 text-red-100' :
                                                    item.Aging_Bucket === '31-90 Days' ? 'bg-red-100 text-red-800' :
                                                        item.Aging_Bucket === '8-30 Days' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-yellow-100 text-yellow-800'}`}>
                                                {item.Aging_Bucket}
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
    );
};

export default OverdueSection;
