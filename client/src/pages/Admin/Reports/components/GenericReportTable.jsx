import React from 'react';
import { AlertTriangle, Search } from 'lucide-react';

const GenericReportTable = ({ data, columns, loading, error, onRetry }) => {
    if (loading) return (
        <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (error) return (
        <div className="text-center p-12 bg-white rounded-xl border border-red-100">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 font-medium">Error loading report data</p>
            <p className="text-red-400 text-sm mt-1">
                {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
            </p>
            <button
                onClick={onRetry}
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

    const getActionColor = (action) => {
        if (!action) return 'bg-gray-100 text-gray-700 border-gray-200';
        if (action.includes('FAIL') || action.includes('DELETE') || action.includes('BLOCK')) return 'bg-red-100 text-red-700 border-red-200';
        if (action.includes('SUCCESS') || action.includes('CREATE') || action.includes('ACTIVATE') || action.includes('PAYMENT')) return 'bg-green-100 text-green-700 border-green-200';
        if (action.includes('UPDATE') || action.includes('CHANGE') || action.includes('RESET')) return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const formatDetails = (details) => {
        if (!details) return '-';
        try {
            const parsed = typeof details === 'string' ? JSON.parse(details) : details;
            if (typeof parsed !== 'object') return String(parsed);

            return Object.entries(parsed).map(([key, value]) => (
                <span key={key} className="block text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{key}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
            ));
        } catch (e) {
            return <span className="text-gray-400 italic">{String(details)}</span>;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                            {columns.map((col, idx) => (
                                <th key={idx} className="p-4 font-medium">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((log) => (
                            <tr key={log.Log_ID || Math.random()} className="hover:bg-gray-50/50 transition-colors">
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
                                        {log.Action ? log.Action.replace(/_/g, ' ') : 'Unknown'}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-gray-600 max-w-xs overflow-hidden">
                                    {formatDetails(log.Details)}
                                </td>
                                <td className="p-4 text-sm text-gray-500 font-mono">
                                    {log.IP_Address || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GenericReportTable;
