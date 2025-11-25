import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp } from 'lucide-react';

const PolicySection = () => {
    const [changes, setChanges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPolicyData();
    }, []);

    const fetchPolicyData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/reports/admin/policy', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            setChanges(data);
        } catch (error) {
            console.error('Error fetching policy data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Trend Overlay (Mocked Visual) */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-gray-700">Policy Impact Analysis</h3>
                </div>
                <div className="h-48 bg-gray-50 rounded border border-gray-100 flex items-center justify-center text-gray-400">
                    Chart Placeholder: Overdue Rate vs Policy Changes (Trend Overlay)
                </div>
            </div>

            {/* Change Log Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Policy Change Log
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Setting Changed</th>
                                <th className="px-6 py-3">Old Value</th>
                                <th className="px-6 py-3">New Value</th>
                                <th className="px-6 py-3">Changed By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                            ) : changes.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No policy changes recorded</td></tr>
                            ) : (
                                changes.map((change, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(change.Date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {change.Setting}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                            {change.Old}
                                        </td>
                                        <td className="px-6 py-4 text-blue-600 font-mono text-xs font-bold">
                                            {change.New}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {change.Changed_By}
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

export default PolicySection;
