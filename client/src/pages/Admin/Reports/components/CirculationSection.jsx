import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Calendar } from 'lucide-react';
import DateFilter from './DateFilter';
import CheckboxFilter from './CheckboxFilter';

const CirculationSection = () => {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: ['All'],
        category: ['All'],
        search: ''
    });

    useEffect(() => {
        fetchLoans();
    }, [filters.startDate, filters.endDate]);

    const fetchLoans = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                startDate: filters.startDate,
                endDate: filters.endDate
            });

            const response = await fetch(`/api/reports/admin/circulation?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            setLoans(data);
        } catch (error) {
            console.error('Error fetching circulation data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLoans = loans.filter(loan => {
        const matchesSearch = loan.Title.toLowerCase().includes(filters.search.toLowerCase()) ||
            `${loan.First_Name} ${loan.Last_Name}`.toLowerCase().includes(filters.search.toLowerCase());

        if (!matchesSearch) return false;

        // Status Filter
        if (!filters.status.includes('All') && !filters.status.includes(loan.Loan_Status)) return false;

        // Category Filter
        if (!filters.category.includes('All') && !filters.category.includes(loan.Category)) return false;

        return true;
    });

    const metrics = {
        total: loans.length,
        active: loans.filter(l => l.Loan_Status === 'Active').length,
        overdue: loans.filter(l => l.Loan_Status === 'Overdue').length,
        returned: loans.filter(l => l.Loan_Status === 'Returned').length
    };

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

    const categories = ['All', ...new Set(loans.map(l => l.Category).filter(Boolean))];

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard title="Total Loans" value={metrics.total} color="bg-blue-500" icon={Calendar} />
                <SummaryCard title="Active Loans" value={metrics.active} color="bg-green-500" icon={Filter} />
                <SummaryCard title="Overdue Loans" value={metrics.overdue} color="bg-red-500" icon={Download} />
                <SummaryCard title="Returned" value={metrics.returned} color="bg-gray-500" icon={Search} />
            </div>
            {/* Filters Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex gap-4 flex-1 w-full flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by title or student..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    <CheckboxFilter
                        label="Status"
                        options={['Active', 'Overdue', 'Returned']}
                        selected={filters.status}
                        onChange={(newStatus) => setFilters({ ...filters, status: newStatus })}
                        color="blue"
                    />

                    <CheckboxFilter
                        label="Category"
                        options={categories.filter(c => c !== 'All')}
                        selected={filters.category}
                        onChange={(newCategory) => setFilters({ ...filters, category: newCategory })}
                        color="indigo"
                    />
                </div>

                <div className="flex gap-2">
                    <DateFilter
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onDateChange={(start, end) => setFilters({ ...filters, startDate: start, endDate: end })}
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Borrower</th>
                                <th className="px-6 py-3">Item Title</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Borrowed Date</th>
                                <th className="px-6 py-3">Due Date</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Fine</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                            ) : filteredLoans.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No records found</td></tr>
                            ) : (
                                filteredLoans.map((loan) => (
                                    <tr key={loan.Borrow_ID} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {loan.First_Name} {loan.Last_Name}
                                            <div className="text-xs text-gray-500">ID: {loan.User_ID}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 max-w-xs truncate" title={loan.Title}>
                                            {loan.Title}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {loan.Category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(loan.Borrow_Date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(loan.Due_Date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${loan.Loan_Status === 'Active' ? 'bg-green-100 text-green-800' :
                                                    loan.Loan_Status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {loan.Loan_Status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {loan.Fine_Amount ? `$${Number(loan.Fine_Amount).toFixed(2)}` : '-'}
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

export default CirculationSection;
