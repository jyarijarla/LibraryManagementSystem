import React, { useState } from 'react';
import { FileText, Calendar, ChevronDown, File, Database, RefreshCw } from 'lucide-react';

const ReportHeader = ({ dateRange, setDateRange, onExport, onRefresh }) => {
    const [showDateMenu, setShowDateMenu] = useState(false);

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
            case 'thisYear':
                start = new Date(now.getFullYear(), 0, 1);
                end = now;
                break;
            default:
                return;
        }

        const formatDate = (d) => d.toISOString().split('T')[0];
        setDateRange({ start: formatDate(start), end: formatDate(end) });
    };

    return (
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
                                <div className="fixed inset-0 z-0" onClick={() => setShowDateMenu(false)}></div>
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
                        <button onClick={() => onExport('PDF')} className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                            <File className="w-4 h-4" /> PDF
                        </button>
                        <button onClick={() => onExport('CSV')} className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                            <Database className="w-4 h-4" /> CSV
                        </button>
                        <button onClick={onRefresh} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" /> Generate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportHeader;
