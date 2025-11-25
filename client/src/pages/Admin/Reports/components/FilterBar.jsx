import React from 'react';
import { Search } from 'lucide-react';

const FilterBar = ({
    search,
    setSearch,
    role,
    setRole,
    action,
    setAction,
    showRoleFilter = true,
    showActionFilter = true
}) => {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 mb-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search logs (User, Action, Details, IP)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                {showRoleFilter && (
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="">All Roles</option>
                        <option value="student">Student</option>
                        <option value="librarian">Librarian</option>
                        <option value="admin">Admin</option>
                    </select>
                )}

                {showActionFilter && (
                    <select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="">All Actions</option>
                        <option value="USER_CREATE">User Create</option>
                        <option value="USER_UPDATE">User Update</option>
                        <option value="LOGIN_FAILED">Login Failed</option>
                        <option value="PAYMENT_PROCESSED">Payment</option>
                        <option value="FINE_WAIVE">Fine Waive</option>
                        <option value="BACKUP_SUCCESS">Backup Success</option>
                        <option value="BACKUP_FAIL">Backup Fail</option>
                    </select>
                )}

                <button
                    onClick={() => {
                        setSearch('');
                        if (setRole) setRole('');
                        if (setAction) setAction('');
                    }}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

export default FilterBar;
