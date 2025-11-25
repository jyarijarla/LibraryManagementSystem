import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Briefcase, UserCheck, AlertCircle } from 'lucide-react';

const StaffPerformance = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-center p-8 text-gray-500">No staff performance data available.</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 1. Transactions Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-600" /> Transactions by Staff Member
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="First_Name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Transactions" fill="#4F46E5" name="Checkouts/Returns" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Cataloging" fill="#10B981" name="New Records Added" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Manual Overrides List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" /> Manual Override Report
                </h3>
                <div className="space-y-4">
                    {data.map((staff, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
                                    {staff.First_Name[0]}{staff.Last_Name[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{staff.First_Name} {staff.Last_Name}</p>
                                    <p className="text-xs text-gray-500">Librarian</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-amber-600">{staff.Overrides}</p>
                                <p className="text-xs text-gray-400">Overrides</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StaffPerformance;
