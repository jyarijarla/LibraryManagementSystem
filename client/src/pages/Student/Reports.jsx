import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, DollarSign, CreditCard, CheckCircle } from 'lucide-react';
import './Dashboard.css'; // Reusing dashboard styles for consistency

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://librarymanagementsystem-z2yw.onrender.com/api';

const Reports = () => {
    const [fines, setFines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchFines();
    }, []);

    const fetchFines = async () => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            if (!user.id && !user.User_ID) {
                throw new Error('User ID not found');
            }

            const userId = user.id || user.User_ID;

            const response = await fetch(`${API_URL}/fines/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch fines');
            }

            const data = await response.json();
            setFines(data);
        } catch (err) {
            console.error('Error fetching fines:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
            fetchFines(); // Refresh list
        } catch (err) {
            console.error('Payment error:', err);
            alert(`Payment failed: ${err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="student-loading">Loading reports...</div>;

    const unpaidFines = fines.filter(f => f.Status !== 'Paid' && f.Status !== 'Waived' && parseFloat(f.Fine_Amount) > 0);
    const paidFines = fines.filter(f => f.Status === 'Paid' || f.Status === 'Waived');

    return (
        <div className="student-dashboard-content">
            <div className="student-section-header">
                <h3>My Fines & Reports</h3>
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

            <div className="student-dashboard-split">
                <div className="student-dashboard-main-col">
                    <section className="student-section-card">
                        <h3>Outstanding Fines</h3>
                        {unpaidFines.length === 0 ? (
                            <div className="student-empty-state">
                                <ShieldCheck size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>You have no outstanding fines. Great job!</p>
                            </div>
                        ) : (
                            <div className="student-preview-list">
                                {unpaidFines.map((fine) => (
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
                        {paidFines.length === 0 ? (
                            <div className="student-empty-state">No payment history</div>
                        ) : (
                            <div className="student-preview-list">
                                {paidFines.map((fine) => (
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
        </div>
    );
};

export default Reports;
