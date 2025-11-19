import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, BookOpen, Calendar, Award, TrendingUp } from 'lucide-react';
import './Dashboard.css';

const Reports = () => {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({
        totalRead: 0,
        thisMonth: 0,
        favoriteGenre: 'N/A'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/borrow-records/user');
                const data = await response.json();

                if (Array.isArray(data)) {
                    const returned = data.filter(item => item.Return_Date);
                    setHistory(returned);

                    // Calculate stats
                    const totalRead = returned.length;

                    const now = new Date();
                    const thisMonth = returned.filter(item => {
                        const returnDate = new Date(item.Return_Date);
                        return returnDate.getMonth() === now.getMonth() &&
                            returnDate.getFullYear() === now.getFullYear();
                    }).length;

                    // Calculate favorite genre
                    const genres = {};
                    returned.forEach(item => {
                        if (item.Asset_Type) {
                            genres[item.Asset_Type] = (genres[item.Asset_Type] || 0) + 1;
                        }
                    });
                    let favoriteGenre = 'N/A';
                    let maxCount = 0;
                    for (const [genre, count] of Object.entries(genres)) {
                        if (count > maxCount) {
                            maxCount = count;
                            favoriteGenre = genre;
                        }
                    }

                    setStats({ totalRead, thisMonth, favoriteGenre });
                }
            } catch (error) {
                console.error("Error fetching reports:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="student-dashboard-content">
            <div className="student-section-header">
                <div>
                    <h3>My Reports</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                        Insights into your reading habits and learning journey.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="student-summary-grid">
                <div className="student-stat-card">
                    <div className="student-stat-icon accent-purple">
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <p>Total Read</p>
                        <h3>{stats.totalRead}</h3>
                        <span>Lifetime</span>
                    </div>
                </div>
                <div className="student-stat-card">
                    <div className="student-stat-icon accent-blue">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <p>Read This Month</p>
                        <h3>{stats.thisMonth}</h3>
                        <span>Current Month</span>
                    </div>
                </div>
                <div className="student-stat-card">
                    <div className="student-stat-icon accent-amber">
                        <Award size={20} />
                    </div>
                    <div>
                        <p>Favorite Genre</p>
                        <h3 style={{ fontSize: '1.2rem' }}>{stats.favoriteGenre}</h3>
                        <span>Most Borrowed</span>
                    </div>
                </div>
            </div>

            {/* Reading History List */}
            <div className="student-section-card">
                <div className="student-section-header">
                    <h3>Reading History</h3>
                </div>

                {loading ? (
                    <div className="student-loading">Loading history...</div>
                ) : (
                    <div className="student-preview-list">
                        {history.length > 0 ? (
                            history.map((item) => (
                                <div key={item.Borrow_ID} className="student-preview-item">
                                    <div className="student-preview-info">
                                        <h4>{item.Asset_Title}</h4>
                                        <p>{item.Author} • Returned on {new Date(item.Return_Date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="student-preview-status">
                                        <span className="status-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                                            {item.Asset_Type}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="student-empty-state">
                                <p>No reading history available yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
