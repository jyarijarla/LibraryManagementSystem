import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, UserPlus } from 'lucide-react';

const DemographicsSection = ({ data }) => {
    const { growth = [], breakdown = [] } = data || {};

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 1. Membership Growth Rate */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUpIcon className="w-5 h-5 text-indigo-600" /> Membership Growth Rate
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={growth}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} name="New Users" dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Demographic Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" /> Demographic Breakdown
                </h3>
                <div className="space-y-4">
                    {breakdown.map((role, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700 capitalize">{role.role_name}</span>
                            <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-900">
                                {role.count}
                            </span>
                        </div>
                    ))}
                    {breakdown.length === 0 && <p className="text-sm text-gray-400">No demographic data available.</p>}
                </div>
            </div>
        </div>
    );
};

// Helper icon since TrendingUp is used in another file, just defining it here or importing if needed.
// Actually I can import it.
import { TrendingUp as TrendingUpIcon } from 'lucide-react';

export default DemographicsSection;
