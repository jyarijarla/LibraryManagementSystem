import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLoading } from '../../components/FeedbackUI/LoadingContext'
import { ErrorPopup } from '../../components/FeedbackUI/FeedbackUI'
import {
    ShieldCheck,
    AlertCircle,
    DollarSign,
    CreditCard,
    CheckCircle,
    BookOpen,
    Clock,
    History as HistoryIcon,
    Search,
    Filter,
    Calendar,
    RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Dashboard.css';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://librarymanagementsystem-z2yw.onrender.com/api';

const History = () => {
    const { setLoading } = useLoading();
    const [activeTab, setActiveTab] = useState('fines');
    const [fines, setFines] = useState([]);
    const [loans, setLoans] = useState([]);
    const [holds, setHolds] = useState([]);
    const [history, setHistory] = useState([]);
    
    const [error, setErrorState] = useState('')
    const setError = (sendError) => {
        setErrorState(sendError)
        setTimeout(() => setError(''), 5000)
    }
    const [processingId, setProcessingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading({ isLoading: true });
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.id || user.User_ID;

            if (!userId) throw new Error('User ID not found');

            const headers = { 'Authorization': `Bearer ${token}` };

            // 1. Fetch Fines
            const finesRes = await fetch(`${API_URL}/fines/user/${userId}`, { headers });
            if (finesRes.ok) {
                const finesData = await finesRes.json();
                setFines(finesData);
            }

            // 2. Fetch Borrows (Active & History)
            const borrowsRes = await fetch(`${API_URL}/borrow-records/user`, { headers });
            if (borrowsRes.ok) {
                const borrowsData = await borrowsRes.json();
                if (Array.isArray(borrowsData)) {
                    const activeLoans = borrowsData.filter(b => !b.Return_Date);
                    const returnedLoans = borrowsData.filter(b => b.Return_Date);
                    setLoans(activeLoans);
                    setHistory(returnedLoans);
                }
            }

            // 3. Fetch Holds
            const holdsRes = await fetch(`${API_URL}/holds/user`, { headers });
            if (holdsRes.ok) {
                const holdsData = await holdsRes.json();
                if (Array.isArray(holdsData)) {
                    setHolds(holdsData);
                }
            }

        } catch (err) {
            console.error('Error fetching report data:', err);
            setError(err.message);
        } finally {
            setLoading({ isLoading: false })
        }
    };

    const handleReturn = async (borrowID) => {
        setLoading({ isLoading: true })
        try {
            await axios.put(`${API_URL}/borrow/return/${borrowID}`, 
                { userID: localStorage.getItem("userId") }, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            fetchAllData();
        } catch (error) {
            console.error('Error returning asset:', error);
            setError(error.response.data.message);
        } finally {
            setLoading({ isLoading: false })
        }
    }

    const handlePayFine = async (fine) => {
        setProcessingId(fine.Borrow_ID);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/fines/${fine.Borrow_ID}/pay-online`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: fine.Fine_Amount
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Payment failed');
            }

            setSuccessMessage(`Payment successful for ${fine.Item_Title}`);
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchAllData(); // Refresh all data
        } catch (err) {
            console.error('Payment error:', err);
            alert(`Payment failed: ${err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const filterData = (data) => {
        if (!searchTerm) return data;
        return data.filter(item =>
            (item.Asset_Title && item.Asset_Title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Item_Title && item.Item_Title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Author && item.Author.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    const unpaidFines = fines.filter(f => f.Status !== 'Paid' && f.Status !== 'Waived' && parseFloat(f.Fine_Amount) > 0);
    const paidFines = fines.filter(f => f.Status === 'Paid' || f.Status === 'Waived');

    const totalFinesAmount = unpaidFines.reduce((sum, f) => sum + parseFloat(f.Fine_Amount), 0);
    const activeHoldsCount = holds.filter(h => h.Status === 'Active').length;

    return (
        <div className="student-dashboard-content">
            <div className="student-section-header">
                <ErrorPopup errorMessage={error} />
                <div>
                    <h3>My History</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                        View your active loans and borrowing history.
                    </p>
                </div>
            </div>

            {successMessage && (
                <div className="student-success-message" style={{
                    padding: '1rem',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <CheckCircle size={20} />
                    {successMessage}
                </div>
            )}

            {/* Summary Cards */}
            <section className="student-summary-grid" style={{ marginBottom: '2rem' }}>
                <div className="student-stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', border: '1px solid #bbf7d0' }}>
                    <div className={`student-stat-icon ${totalFinesAmount > 0 ? 'accent-red' : 'accent-green'}`}>
                        <DollarSign size={20} />
                    </div>
                    <div>
                        <p>Unpaid Fines</p>
                        <h3 style={{ color: totalFinesAmount > 0 ? '#dc2626' : '#166534' }}>${totalFinesAmount.toFixed(2)}</h3>
                    </div>
                </div>
                <div className="student-stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)', border: '1px solid #bfdbfe' }}>
                    <div className="student-stat-icon accent-blue">
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <p>Active Loans</p>
                        <h3 style={{ color: '#1e40af' }}>{loans.length}</h3>
                    </div>
                </div>
                <div className="student-stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', border: '1px solid #fde68a' }}>
                    <div className="student-stat-icon accent-amber">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p>Active Holds</p>
                        <h3 style={{ color: '#b45309' }}>{activeHoldsCount}</h3>
                    </div>
                </div>
                <div className="student-stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)', border: '1px solid #e9d5ff' }}>
                    <div className="student-stat-icon accent-purple">
                        <HistoryIcon size={20} />
                    </div>
                    <div>
                        <p>Returned Items</p>
                        <h3 style={{ color: '#6b21a8' }}>{history.length}</h3>
                    </div>
                </div>
            </section>

            {/* Tabs & Search */}
            <div className="student-tabs-panel" style={{ padding: '0', overflow: 'visible', background: 'transparent', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="student-tabs" style={{
                        border: '1px solid var(--border-color)',
                        padding: '4px',
                        background: 'white',
                        margin: 0,
                        borderRadius: '12px',
                        display: 'flex',
                        gap: '4px'
                    }}>
                        <button
                            className={`student-tab ${activeTab === 'fines' ? 'active' : ''}`}
                            onClick={() => setActiveTab('fines')}
                            style={{
                                background: activeTab === 'fines' ? 'var(--bg-secondary)' : 'transparent',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontWeight: activeTab === 'fines' ? 600 : 500,
                                color: activeTab === 'fines' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <DollarSign size={16} style={{ marginRight: '8px' }} />
                            Fines ({unpaidFines.length})
                        </button>
                        <button
                            className={`student-tab ${activeTab === 'loans' ? 'active' : ''}`}
                            onClick={() => setActiveTab('loans')}
                            style={{
                                background: activeTab === 'loans' ? 'var(--bg-secondary)' : 'transparent',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontWeight: activeTab === 'loans' ? 600 : 500,
                                color: activeTab === 'loans' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <BookOpen size={16} style={{ marginRight: '8px' }} />
                            Active Loans ({loans.length})
                        </button>
                        <button
                            className={`student-tab ${activeTab === 'holds' ? 'active' : ''}`}
                            onClick={() => setActiveTab('holds')}
                            style={{
                                background: activeTab === 'holds' ? 'var(--bg-secondary)' : 'transparent',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontWeight: activeTab === 'holds' ? 600 : 500,
                                color: activeTab === 'holds' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Clock size={16} style={{ marginRight: '8px' }} />
                            Holds ({holds.filter(h => h.Status === 'Active').length})
                        </button>
                        <button
                            className={`student-tab ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                            style={{
                                background: activeTab === 'history' ? 'var(--bg-secondary)' : 'transparent',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontWeight: activeTab === 'history' ? 600 : 500,
                                color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <HistoryIcon size={16} style={{ marginRight: '8px' }} />
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

                <div className="student-content-card" style={{ minHeight: '400px', background: 'transparent', boxShadow: 'none', padding: 0 }}>
                    <AnimatePresence mode="wait">

                        {/* FINES TAB */}
                        {activeTab === 'fines' && (
                            <motion.div
                                key="fines"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="student-dashboard-split">
                                    <div className="student-dashboard-main-col">
                                        <section className="student-section-card">
                                            <h3>Outstanding Fines</h3>
                                            {filterData(unpaidFines).length === 0 ? (
                                                <div className="student-empty-state">
                                                    <ShieldCheck size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                    <p>You have no outstanding fines. Great job!</p>
                                                </div>
                                            ) : (
                                                <div className="student-preview-list">
                                                    {filterData(unpaidFines).map((fine) => (
                                                        <div key={fine.Borrow_ID} className="student-preview-item" style={{ alignItems: 'center' }}>
                                                            <div className="student-preview-info">
                                                                <h4>{fine.Item_Title}</h4>
                                                                <p className="text-red">
                                                                    Overdue by {fine.Days_Overdue} days
                                                                </p>
                                                                <small>Due: {new Date(fine.Due_Date).toLocaleDateString()}</small>
                                                            </div>
                                                            <div className="student-preview-status" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                                                <span className="fines-amount" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>
                                                                    ${parseFloat(fine.Fine_Amount).toFixed(2)}
                                                                </span>
                                                                <button
                                                                    className="student-action-btn-sm primary"
                                                                    onClick={() => handlePayFine(fine)}
                                                                    disabled={processingId === fine.Borrow_ID}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                                >
                                                                    {processingId === fine.Borrow_ID ? 'Processing...' : (
                                                                        <>
                                                                            <CreditCard size={14} /> Pay Now
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    </div>

                                    <div className="student-dashboard-side-col">
                                        <section className="student-section-card">
                                            <h3>Payment History</h3>
                                            {filterData(paidFines).length === 0 ? (
                                                <div className="student-empty-state">No payment history</div>
                                            ) : (
                                                <div className="student-preview-list">
                                                    {filterData(paidFines).map((fine) => (
                                                        <div key={fine.Borrow_ID} className="student-preview-item">
                                                            <div className="student-preview-info">
                                                                <h4>{fine.Item_Title}</h4>
                                                                <p>{fine.Status}</p>
                                                            </div>
                                                            <div className="student-preview-status">
                                                                <span className="status-badge success">Paid</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* LOANS TAB */}
                        {activeTab === 'loans' && (
                            <motion.div
                                key="loans"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="student-section-card"
                            >
                                <div className="student-preview-list">
                                    {filterData(loans).length > 0 ? (
                                        filterData(loans).map((loan) => (
                                            <div key={loan.Borrow_ID} className="student-preview-item">
                                                <div className="student-preview-info">
                                                    <h4>{loan.Asset_Title}</h4>
                                                    <p>{loan.Asset_Type} • Due: {new Date(loan.Due_Date).toLocaleDateString()}</p>
                                                </div>
                                                <div className='student-preview-ui'>
                                                    <div className="student-preview-status">
                                                        {loan.Overdue_Days > 0 && (
                                                            <span className="status-badge overdue">Overdue by {loan.Overdue_Days} days</span>
                                                        )}
                                                        <span className="status-badge active">Borrowed</span>
                                                    </div>
                                                    {<button className="student-log-action-btn" onClick={() => handleReturn(loan.Borrow_ID)}>Return</button>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="student-empty-state">
                                            <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                            <p>No active loans found.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* HOLDS TAB */}
                        {activeTab === 'holds' && (
                            <motion.div
                                key="holds"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="student-section-card"
                            >
                                <div className="student-preview-list">
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
                                </div>
                            </motion.div>
                        )}

                        {/* HISTORY TAB */}
                        {activeTab === 'history' && (
                            <motion.div
                                key="history"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="student-section-card"
                            >
                                <div className="student-preview-list">
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
                                            <HistoryIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                            <p>No borrowing history found.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default History;
