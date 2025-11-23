import React, { useState, useEffect } from 'react';
import { X, User, BookOpen, Clock, AlertCircle, CheckCircle, Ban, History, DollarSign, Calendar, Activity } from 'lucide-react';

const UserProfileDrawer = ({ isOpen, onClose, userId }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Use local server for development, production for deployed app
    const API_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:3000/api'
        : 'https://librarymanagementsystem-z2yw.onrender.com/api';

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserDetails();
        } else {
            setData(null);
        }
    }, [isOpen, userId]);

    const fetchUserDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/members/${userId}/details`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user details');
            }

            const result = await response.json();
            setData(result);
            // Default to activity tab for staff, overview for students
            if (result.user.Role === 2 || result.user.Role === 3) {
                setActiveTab('activity');
            } else {
                setActiveTab('overview');
            }
        } catch (err) {
            console.error('Error fetching user details:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        User Profile
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center text-red-500">
                        <AlertCircle className="w-6 h-6 mr-2" />
                        {error}
                    </div>
                ) : data ? (
                    <>
                        {/* User Info Summary */}
                        <div className="px-6 py-6 bg-white border-b border-gray-100">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600">
                                        {data.user.First_Name?.[0]}{data.user.Last_Name?.[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {data.user.First_Name} {data.user.Last_Name}
                                        </h3>
                                        <p className="text-gray-500">{data.user.User_Email}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${data.user.Role === 2 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                data.user.Role === 3 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-gray-50 text-gray-700 border-gray-200'
                                                }`}>
                                                {data.user.Role === 2 ? 'Admin' : data.user.Role === 3 ? 'Librarian' : 'Student'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${data.user.Is_Blocked ? 'bg-red-50 text-red-700 border-red-200' :
                                                !data.user.Is_Active ? 'bg-gray-50 text-gray-500 border-gray-200' :
                                                    'bg-green-50 text-green-700 border-green-200'
                                                }`}>
                                                {data.user.Is_Blocked ? 'Blocked' : !data.user.Is_Active ? 'Inactive' : 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                    <p>ID: {data.user.User_ID}</p>
                                    <p>Joined: {new Date(data.user.Created_At).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 border-b border-gray-100 flex gap-6">
                            {(() => {
                                const isStaff = data.user.Role === 2 || data.user.Role === 3;
                                const tabs = isStaff
                                    ? ['overview', 'activity']
                                    : ['overview', 'loans', 'history', 'fines', 'holds'];

                                return tabs.map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ));
                            })()}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            {activeTab === 'overview' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {(data.user.Role === 2 || data.user.Role === 3) ? (
                                        // Staff Overview
                                        <>
                                            <StatCard title="Role" value={data.user.Role === 2 ? 'Administrator' : 'Librarian'} icon={User} color="purple" />
                                            <StatCard title="Account Status" value={data.user.Is_Active ? 'Active' : 'Inactive'} icon={CheckCircle} color="green" />
                                            <StatCard title="Recent Actions" value={data.activity ? data.activity.length : 0} icon={Activity} color="blue" />
                                            <StatCard title="Joined" value={new Date(data.user.Created_At).toLocaleDateString()} icon={Calendar} color="gray" />
                                        </>
                                    ) : (
                                        // Student Overview
                                        <>
                                            <StatCard title="Active Loans" value={data.loans.length} icon={BookOpen} color="blue" />
                                            <StatCard title="Unpaid Fines" value={`$${data.fines.filter(f => f.Paid_Status === 'Unpaid').reduce((sum, f) => sum + parseFloat(f.Amount), 0).toFixed(2)}`} icon={DollarSign} color="red" />
                                            <StatCard title="Total Borrows" value={data.history.length + data.loans.length} icon={History} color="indigo" />
                                            <StatCard title="Active Holds" value={data.holds.filter(h => h.Status === 'Active').length} icon={Clock} color="amber" />
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="space-y-4">
                                    {(!data.activity || data.activity.length === 0) ? (
                                        <EmptyState message="No recent activity" />
                                    ) : (
                                        data.activity.map(log => (
                                            <div key={log.Log_ID} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">
                                                                {log.Action}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(log.Timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1 font-mono text-xs bg-gray-50 p-2 rounded border border-gray-100">
                                                            {log.Details}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-400">{log.IP_Address}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'loans' && (
                                <div className="space-y-4">
                                    {data.loans.length === 0 ? (
                                        <EmptyState message="No active loans" />
                                    ) : (
                                        data.loans.map(loan => (
                                            <div key={loan.Borrow_ID} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">{loan.Title}</h4>
                                                        <p className="text-sm text-gray-500">Due: {new Date(loan.Due_Date).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${new Date(loan.Due_Date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {new Date(loan.Due_Date) < new Date() ? 'Overdue' : 'On Time'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-4">
                                    {data.history.length === 0 ? (
                                        <EmptyState message="No borrowing history" />
                                    ) : (
                                        data.history.map(record => (
                                            <div key={record.Borrow_ID} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{record.Title}</h4>
                                                    <p className="text-sm text-gray-500">Returned: {new Date(record.Return_Date).toLocaleDateString()}</p>
                                                </div>
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'fines' && (
                                <div className="space-y-4">
                                    {data.fines.length === 0 ? (
                                        <EmptyState message="No fines record" />
                                    ) : (
                                        data.fines.map(fine => (
                                            <div key={fine.Fine_ID} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">${parseFloat(fine.Amount).toFixed(2)}</h4>
                                                        <p className="text-sm text-gray-500">{fine.Reason}</p>
                                                        <p className="text-xs text-gray-400">{new Date(fine.Fine_Date).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${fine.Paid_Status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {fine.Paid_Status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'holds' && (
                                <div className="space-y-4">
                                    {data.holds.length === 0 ? (
                                        <EmptyState message="No active holds" />
                                    ) : (
                                        data.holds.map(hold => (
                                            <div key={hold.Hold_ID} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">{hold.Title}</h4>
                                                        <p className="text-sm text-gray-500">Expires: {new Date(hold.Expiry_Date).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                                        {hold.Status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-${color}-50`}>
            <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
);

const EmptyState = ({ message }) => (
    <div className="text-center py-12">
        <p className="text-gray-500">{message}</p>
    </div>
);

export default UserProfileDrawer;
