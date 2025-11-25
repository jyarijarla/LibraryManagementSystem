import React from 'react';
import GenericReportTable from './GenericReportTable';

const SystemHealthTab = ({ data, loading, error, onRetry }) => {
    // Defensive check for data structure
    const healthStats = data?.stats || { errorRate: '0%', backupSuccessRate: '100%', totalErrors: 0, recentBackups: 0 };
    const healthLogs = data?.logs || [];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">24h Error Rate</p>
                    <p className={`text-xl font-bold ${parseFloat(healthStats.errorRate) > 5 ? 'text-red-600' : 'text-green-600'}`}>
                        {healthStats.errorRate}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Backup Success</p>
                    <p className="text-xl font-bold text-blue-600">{healthStats.backupSuccessRate}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Total Errors (24h)</p>
                    <p className="text-xl font-bold text-gray-600">{healthStats.totalErrors}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Recent Backups</p>
                    <p className="text-xl font-bold text-gray-600">{healthStats.recentBackups}</p>
                </div>
            </div>

            <GenericReportTable
                data={healthLogs}
                columns={['Time', 'System/Admin', 'Event', 'Status', 'Notes']}
                loading={loading}
                error={error}
                onRetry={onRetry}
            />
        </div>
    );
};

export default SystemHealthTab;
