import React, { useState, useEffect } from 'react';
import { Users, UserCheck, ShieldAlert } from 'lucide-react';

const UserStaffSection = () => {
    const [data, setData] = useState({ students: {}, staff: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserStaffData();
    }, []);

    const fetchUserStaffData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/reports/admin/user-staff', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch data');
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching user/staff data:', error);
        } finally {
            setLoading(false);
        }
    };

    const [search, setSearch] = useState('');

    const filteredStaff = data.staff.filter(staff =>
        (`${staff.First_Name} ${staff.Last_Name}`.toLowerCase()).includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Student Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        <h4 className="font-medium text-gray-700">Total Students</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{data.students?.Total_Students || 0}</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <UserCheck className="w-5 h-5 text-green-500" />
                        <h4 className="font-medium text-gray-700">New Registrations (30d)</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{data.students?.New_Registrations || 0}</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <h4 className="font-medium text-gray-700">Blocked Accounts</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{data.students?.Blocked_Users || 0}</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldAlert className="w-5 h-5 text-gray-500" />
                        <h4 className="font-medium text-gray-700">Deleted Users</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{data.students?.Deleted_Users || 0}</p>
                </div>
            </div>

            {/* Staff Activity Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">Staff Activity Oversight</h3>
                        <div className="relative w-64">
                            <input
                                type="text"
                                placeholder="Search staff..."
                                className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Staff Member</th>
                                <th className="px-6 py-3 text-center">Transactions Handled</th>
                                <th className="px-6 py-3 text-center">Manual Overrides</th>
                                <th className="px-6 py-3 text-center">Fine Waivers</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                            ) : filteredStaff.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No staff found matching search</td></tr>
                            ) : (
                                filteredStaff.map((staff, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {staff.First_Name} {staff.Last_Name}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-900">
                                            {staff.Transactions_Handled}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-500">
                                            - {/* Placeholder for overrides */}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-500">
                                            - {/* Placeholder for waivers */}
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

export default UserStaffSection;
