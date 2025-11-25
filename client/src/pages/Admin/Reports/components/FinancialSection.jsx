import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard } from 'lucide-react';
import DateFilter from './DateFilter';
import CheckboxFilter from './CheckboxFilter';

const FinancialSection = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFinancialData();
    }, []);

    const fetchFinancialData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/reports/admin/financial', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            setTransactions(data);
        } catch (error) {
            console.error('Error fetching financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const [filters, setFilters] = useState({ search: '', status: ['All'], startDate: '', endDate: '' });

    const metrics = {
        revenue: transactions.filter(t => t.Status === 'Collected').reduce((sum, t) => sum + Number(t.Amount_Due || 0), 0),
        outstanding: transactions.filter(t => t.Status === 'Unpaid').reduce((sum, t) => sum + Number(t.Amount_Due || 0), 0),
        waived: transactions.filter(t => t.Status === 'Waived').reduce((sum, t) => sum + Number(t.Amount_Due || 0), 0)
    };

    const filteredTransactions = transactions.filter(txn => {
        const matchesSearch = (`${txn.First_Name} ${txn.Last_Name}`.toLowerCase()).includes(filters.search.toLowerCase());

        if (!matchesSearch) return false;

        // Status Filter
        if (!filters.status.includes('All') && !filters.status.includes(txn.Status)) return false;

        if (filters.startDate && new Date(txn.Fine_Date) < new Date(filters.startDate)) return false;
        if (filters.endDate && new Date(txn.Fine_Date) > new Date(filters.endDate)) return false;

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

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard title="Total Revenue" value={`$${metrics.revenue.toFixed(2)}`} color="bg-green-500" icon={DollarSign} />
                <SummaryCard title="Outstanding Fines" value={`$${metrics.outstanding.toFixed(2)}`} color="bg-red-500" icon={CreditCard} />
                <SummaryCard title="Waived Amount" value={`$${metrics.waived.toFixed(2)}`} color="bg-gray-500" icon={DollarSign} />
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
                            placeholder="Search by user..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    <CheckboxFilter
                        label="Payment Status"
                        options={['Collected', 'Unpaid', 'Waived']}
                        selected={filters.status}
                        onChange={(newStatus) => setFilters({ ...filters, status: newStatus })}
                        color="green"
                    />
                </div>     <div className="flex gap-2">
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
                        <DollarSign className="w-4 h-4 text-green-600" />
                        Fines & Payments Ledger
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Transaction ID</th>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No financial records found matching filters</td></tr>
                            ) : (
                                filteredTransactions.map((txn) => (
                                    <tr key={txn.Fine_ID} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-500">#{txn.Fine_ID}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {txn.First_Name} {txn.Last_Name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(txn.Fine_Date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            ${Number(txn.Amount_Due).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${txn.Status === 'Collected' ? 'bg-green-100 text-green-800' :
                                                    txn.Status === 'Waived' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-red-100 text-red-800'}`}>
                                                {txn.Status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default FinancialSection;
