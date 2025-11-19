import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Clock, History, AlertCircle, Search, Filter, Calendar, RotateCcw } from 'lucide-react';
import './Dashboard.css'; // Reuse dashboard styles

const Inventory = () => {
    const [activeTab, setActiveTab] = useState('loans');
    const [loans, setLoans] = useState([]);
    const [holds, setHolds] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch borrows (active and history)
                const borrowsRes = await fetch('/api/borrow-records/user');
                const borrowsData = await borrowsRes.json();

                if (Array.isArray(borrowsData)) {
                    const activeLoans = borrowsData.filter(b => !b.Return_Date);
                    const returnedLoans = borrowsData.filter(b => b.Return_Date);
                    setLoans(activeLoans);
                    setHistory(returnedLoans);
                }

                // Fetch holds
                const holdsRes = await fetch('/api/holds/user');
                const holdsData = await holdsRes.json();
                if (Array.isArray(holdsData)) {
                    setHolds(holdsData);
                }

            } catch (error) {
                console.error("Error fetching inventory:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filterData = (data) => {
        if (!searchTerm) return data;
        return data.filter(item =>
            (item.Asset_Title && item.Asset_Title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Author && item.Author.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'text-green-600 bg-green-50';
            case 'overdue': return 'text-red-600 bg-red-50';
            case 'returned': return 'text-gray-600 bg-gray-50';
            case 'cancelled': return 'text-red-600 bg-red-50';
            case 'fulfilled': return 'text-blue-600 bg-blue-50';
            case 'expired': return 'text-orange-600 bg-orange-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="student-dashboard-content">
            <div className="student-section-header">
                <div>
                    <h3>My Inventory</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                        Manage your loans, holds, and viewing history.
                    </p>
                </div>
            </div>

            {/* Tabs & Search */}
            <div className="student-tabs-panel" style={{ padding: '0', overflow: 'visible', background: 'transparent', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="student-tabs" style={{ border: 'none', padding: 0, background: 'transparent', margin: 0 }}>
                        <button
                            className={`student-tab ${activeTab === 'loans' ? 'active' : ''}`}
                            onClick={() => setActiveTab('loans')}
                            style={{ background: activeTab === 'loans' ? 'white' : 'transparent' }}
                        >
                            <BookOpen size={18} style={{ marginRight: '8px' }} />
                            Active Loans ({loans.length})
                        </button>
                        <button
                            className={`student-tab ${activeTab === 'holds' ? 'active' : ''}`}
                            onClick={() => setActiveTab('holds')}
                            style={{ background: activeTab === 'holds' ? 'white' : 'transparent' }}
                        >
                            <Clock size={18} style={{ marginRight: '8px' }} />
                            Holds ({holds.filter(h => h.Status === 'Active').length})
                        </button>
                        <button
                            className={`student-tab ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                            style={{ background: activeTab === 'history' ? 'white' : 'transparent' }}
                        >
                            <History size={18} style={{ marginRight: '8px' }} />
                            History
                        </button>
                    </div>

                    <div className="student-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="student-content-card" style={{ minHeight: '400px' }}>
                    {loading ? (
                        <div className="student-placeholder-panel" style={{ border: 'none', height: '200px' }}>
                            <div className="student-placeholder-chip">Loading...</div>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {activeTab === 'loans' && (
                                <motion.div
                                    key="loans"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="student-preview-list"
                                >
                                    {filterData(loans).length > 0 ? (
                                        filterData(loans).map((loan) => (
                                            <div key={loan.Borrow_ID} className="student-preview-item">
                                                <div className="student-preview-info">
                                                    <h4>{loan.Asset_Title}</h4>
                                                    <p>{loan.Asset_Type} • Due: {new Date(loan.Due_Date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="student-preview-status">
                                                    {loan.Overdue_Days > 0 && (
                                                        <span className="status-badge overdue">Overdue by {loan.Overdue_Days} days</span>
                                                    )}
                                                    <span className="status-badge active">Borrowed</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="student-empty-state">
                                            <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                            <p>No active loans found.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'holds' && (
                                <motion.div
                                    key="holds"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="student-preview-list"
                                >
                                    {filterData(holds).length > 0 ? (
                                        filterData(holds).map((hold) => (
                                            <div key={hold.Hold_ID} className="student-preview-item">
                                                <div className="student-preview-info">
                                                    <h4>{hold.Asset_Title}</h4>
                                                    <p>{hold.Asset_Type} • Expires: {new Date(hold.Hold_Expires).toLocaleDateString()}</p>
                                                </div>
                                                <div className="student-preview-status">
                                                    <span className={`status-badge ${hold.Status.toLowerCase() === 'active' ? 'pending' : ''}`}>
                                                        {hold.Status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="student-empty-state">
                                            <Clock size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                            <p>No active holds found.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'history' && (
                                <motion.div
                                    key="history"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="student-preview-list"
                                >
                                    {filterData(history).length > 0 ? (
                                        filterData(history).map((item) => (
                                            <div key={item.Borrow_ID} className="student-preview-item">
                                                <div className="student-preview-info">
                                                    <h4>{item.Asset_Title}</h4>
                                                    <p>{item.Asset_Type} • Returned: {new Date(item.Return_Date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="student-preview-status">
                                                    <span className="status-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Returned</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="student-empty-state">
                                            <History size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                            <p>No borrowing history found.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Inventory;
