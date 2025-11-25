import { useState, useCallback } from 'react';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://librarymanagementsystem-z2yw.onrender.com/api';

export const useReportData = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Dashboard Data
    const [dashboardStats, setDashboardStats] = useState(null);
    const [activityTrends, setActivityTrends] = useState([]);
    const [userGrowth, setUserGrowth] = useState([]);
    const [financialTrends, setFinancialTrends] = useState([]);
    const [inventoryHealth, setInventoryHealth] = useState([]);

    // Tab Data
    const [tabData, setTabData] = useState(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statsRes, activityRes, growthRes, financeRes, inventoryRes] = await Promise.all([
                fetch(`${API_URL}/reports/admin/dashboard-stats`, { headers }),
                fetch(`${API_URL}/reports/admin/activity-trends`, { headers }),
                fetch(`${API_URL}/reports/admin/user-growth`, { headers }),
                fetch(`${API_URL}/reports/admin/financial-trends`, { headers }),
                fetch(`${API_URL}/reports/admin/inventory-health`, { headers })
            ]);

            const stats = statsRes.ok ? await statsRes.json() : {};
            const activity = activityRes.ok ? await activityRes.json() : [];
            const growth = growthRes.ok ? await growthRes.json() : [];
            const finance = financeRes.ok ? await financeRes.json() : [];
            const inventory = inventoryRes.ok ? await inventoryRes.json() : [];

            setDashboardStats(stats);
            setActivityTrends(Array.isArray(activity) ? activity : []);
            setUserGrowth(Array.isArray(growth) ? growth : []);
            setFinancialTrends(Array.isArray(finance) ? finance : []);
            setInventoryHealth(Array.isArray(inventory) ? inventory : []);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            // We don't necessarily want to block the whole UI if dashboard stats fail, 
            // but we could set a specific error state if needed.
        }
    }, []);

    const fetchTabData = useCallback(async (tab, dateRange, filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            let endpoint = '';
            switch (tab) {
                case 'activity': endpoint = '/reports/admin/audit-trail'; break;
                case 'users': endpoint = '/reports/admin/user-changes'; break;
                case 'policy': endpoint = '/reports/admin/policy-changes'; break;
                case 'catalog': endpoint = '/reports/admin/catalog-overrides'; break;
                case 'financial': endpoint = '/reports/admin/financial'; break;
                case 'health': endpoint = '/reports/admin/system-health'; break;
                case 'exports': endpoint = '/reports/admin/generated'; break;
                default: endpoint = '/reports/admin/audit-trail';
            }

            const queryParams = new URLSearchParams();
            if (dateRange?.start) queryParams.append('startDate', dateRange.start);
            if (dateRange?.end) queryParams.append('endDate', dateRange.end);

            // Add filters
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.role) queryParams.append('role', filters.role);
            if (filters.action) queryParams.append('action', filters.action);

            const url = `${API_URL}${endpoint}?${queryParams.toString()}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            setTabData(result);
        } catch (err) {
            console.error('Error fetching tab data:', err);
            setError(err.message || 'Failed to fetch data');
            setTabData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        dashboardStats,
        activityTrends,
        userGrowth,
        financialTrends,
        inventoryHealth,
        tabData,
        fetchDashboardData,
        fetchTabData
    };
};
