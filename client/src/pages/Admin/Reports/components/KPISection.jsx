import React, { useState, useEffect } from 'react';
import { Activity, BookOpen, AlertCircle, Server, CheckCircle, XCircle } from 'lucide-react';

const KPISection = () => {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/reports/admin/dashboard-stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ label, value, subtext, icon: Icon, color }) => (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{loading ? '-' : value}</h3>
                {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    );

    const JobStatus = ({ label, status, time }) => (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3">
                {status === 'Success' || status === 'Completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-500">Last run: {time ? new Date(time).toLocaleTimeString() : '-'}</p>
                </div>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${status === 'Success' || status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                {status}
            </span>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Active Loans"
                    value={stats.activeLoans}
                    subtext={`${stats.overdueRate || '0%'} Overdue`}
                    icon={BookOpen}
                    color="bg-blue-500"
                />
                <StatCard
                    label="Outstanding Fines"
                    value={`$${Number(stats.outstandingFines || 0).toFixed(2)}`}
                    subtext="Total Unpaid"
                    icon={AlertCircle}
                    color="bg-red-500"
                />
                <StatCard
                    label="Total Items"
                    value={stats.totalItems}
                    subtext="Available for Loan"
                    icon={Activity}
                    color="bg-green-500"
                />
                <StatCard
                    label="Blocked Students"
                    value={stats.blockedStudents}
                    subtext="Action Required"
                    icon={AlertCircle}
                    color="bg-orange-500"
                />
            </div>

            {/* System Health / Jobs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4 text-gray-500" />
                    System Jobs Status
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <JobStatus
                        label="Daily Overdue Scan"
                        status={stats.overdueScan?.status}
                        time={stats.overdueScan?.time}
                    />
                    <JobStatus
                        label="Database Backup"
                        status={stats.lastBackup?.status}
                        time={stats.lastBackup?.time}
                    />
                </div>
            </div>
        </div>
    );
};

export default KPISection;
