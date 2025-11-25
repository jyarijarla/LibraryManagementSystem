import React, { useState, useEffect } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import CheckboxFilter from './CheckboxFilter';

const InventorySection = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/reports/admin/inventory-health', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            setInventory(data);
        } catch (error) {
            console.error('Error fetching inventory data:', error);
        } finally {
            setLoading(false);
        }
    };

    const [filters, setFilters] = useState({ search: '', type: ['All'], stock: ['All'] });

    const metrics = {
        totalTitles: inventory.length,
        totalCopies: inventory.reduce((sum, item) => sum + (item.Total_Copies || 0), 0),
        lowStock: inventory.filter(item => item.Available_Copies === 0).length,
        highDemand: inventory.filter(item => item.Lifetime_Borrows > 10).length
    };

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = (item.Title?.toLowerCase() || '').includes(filters.search.toLowerCase()) ||
            String(item.Asset_ID).includes(filters.search);

        if (!matchesSearch) return false;

        // Type Filter
        if (!filters.type.includes('All') && !filters.type.includes(item.Type)) return false;

        // Stock Filter
        if (!filters.stock.includes('All')) {
            const isOutOfStock = filters.stock.includes('Out of Stock') && item.Available_Copies === 0;
            const isInStock = filters.stock.includes('In Stock') && item.Available_Copies > 0;
            const isLowStock = filters.stock.includes('Low Stock') && item.Available_Copies > 0 && item.Available_Copies < 3;

            if (!isOutOfStock && !isInStock && !isLowStock) return false;
        }

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

    const assetTypes = ['All', ...new Set(inventory.map(item => item.Type))];

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard title="Total Titles" value={metrics.totalTitles} color="bg-blue-500" icon={Package} />
                <SummaryCard title="Total Copies" value={metrics.totalCopies} color="bg-indigo-500" icon={Package} />
                <SummaryCard title="Out of Stock" value={metrics.lowStock} color="bg-red-500" icon={AlertCircle} />
                <SummaryCard title="High Demand" value={metrics.highDemand} color="bg-green-500" icon={Package} />
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
                            placeholder="Search by title or ID..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    <CheckboxFilter
                        label="Asset Type"
                        options={assetTypes.filter(t => t !== 'All')}
                        selected={filters.type}
                        onChange={(newType) => setFilters({ ...filters, type: newType })}
                        color="indigo"
                    />

                    <CheckboxFilter
                        label="Stock Status"
                        options={['In Stock', 'Out of Stock', 'Low Stock']}
                        selected={filters.stock}
                        onChange={(newStock) => setFilters({ ...filters, stock: newStock })}
                        color="blue"
                    />
                </div>

                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-500" />
                            Inventory Health & Usage
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3">Asset ID</th>
                                    <th className="px-6 py-3">Title</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3 text-center">Total Copies</th>
                                    <th className="px-6 py-3 text-center">Available</th>
                                    <th className="px-6 py-3 text-center">Lifetime Borrows</th>
                                    <th className="px-6 py-3">Health Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                                ) : filteredInventory.length === 0 ? (
                                    <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No inventory records found matching filters</td></tr>
                                ) : (
                                    filteredInventory.map((item) => (
                                        <tr key={item.Asset_ID} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-500">#{item.Asset_ID}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate" title={item.Title}>
                                                {item.Title}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {item.Type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium">{item.Total_Copies}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-bold ${item.Available_Copies === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {item.Available_Copies}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-600">{item.Lifetime_Borrows}</td>
                                            <td className="px-6 py-4">
                                                {item.Available_Copies === 0 ? (
                                                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                                        <AlertCircle className="w-3 h-3" /> Out of Stock
                                                    </span>
                                                ) : item.Lifetime_Borrows > 10 ? (
                                                    <span className="text-xs text-green-600 font-medium">High Demand</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Normal</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventorySection;
