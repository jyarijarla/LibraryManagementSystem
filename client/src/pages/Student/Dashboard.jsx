import { useState, useEffect } from 'react'
import { useNavigate, Navigate, NavLink, Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'


import {
    LayoutDashboard,
    BookOpenCheck,
    Layers,
    BarChart3,
    Activity,
    Menu,
    X,
    Search,
    Bell,
    LogOut,
    CalendarCheck,
    Bookmark,
    ShieldCheck,
    Sparkles,
    Clock3,
    BookOpen,
    User,
    ChevronRight,
    AlertCircle,
    History as HistoryIcon
} from 'lucide-react'
import { SuccessPopup } from '../../components/FeedbackUI/FeedbackUI'
import './Dashboard.css'
import { Assets } from './Assets'
import Profile from './Profile'

import History from './History'
import { OverlayProvider } from '../../components/FeedbackUI/OverlayContext'
import { LoadingProvider, useLoading } from '../../components/FeedbackUI/LoadingContext'

// --- Components ---

const StatCard = ({ title, value, icon: Icon, accent, subtext }) => (
    <div className="student-stat-card">
        <div className={`student-stat-icon ${accent}`}>
            <Icon size={20} />
        </div>
        <div>
            <p>{title}</p>
            <h3>{value}</h3>
            {subtext && <span>{subtext}</span>}
        </div>
    </div>
)

const QuickActionCard = ({ title, icon: Icon, onClick }) => (
    <button className="student-quick-action-card" onClick={onClick}>
        <div className="student-quick-action-icon">
            <Icon size={24} />
        </div>
        <span>{title}</span>
    </button>
)

const SectionHeader = ({ title, actionLabel, onAction }) => (
    <div className="student-section-header">
        <h3>{title}</h3>
        {actionLabel && (
            <button className="student-section-action" onClick={onAction}>
                {actionLabel} <ChevronRight size={16} />
            </button>
        )}
    </div>
)

const PreviewList = ({ items, type, emptyMessage }) => {
    if (!items || items.length === 0) {
        return <div className="student-empty-state">{emptyMessage}</div>
    }

    return (
        <div className="student-preview-list">
            {items.map((item, index) => (
                <div key={index} className="student-preview-item">
                    <div className="student-preview-info">
                        <h4>{item.Title || item.Room}</h4>
                        <p>
                            {type === 'borrowing' && `Due: ${new Date(item.Due_Date).toLocaleDateString()}`}
                            {type === 'booking' && `${new Date(item.Start_Time).toLocaleDateString()} · ${new Date(item.Start_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            {type === 'reservation' && `Requested: ${new Date(item.Hold_Date).toLocaleDateString()}`}
                        </p>
                    </div>
                    <div className="student-preview-status">
                        {type === 'borrowing' && (
                            <span className={`status-badge ${item.Status.toLowerCase()}`}>{item.Status}</span>
                        )}
                        {type === 'booking' && (
                            <button className="student-action-btn-sm danger">Cancel</button>
                        )}
                        {type === 'reservation' && (
                            <span className="status-badge pending">Pending</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

// --- Dashboard Page Component ---

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://librarymanagementsystem-z2yw.onrender.com/api'

function DashboardOverview() {
    const navigate = useNavigate()
    const [stats, setStats] = useState(null)
    const { setLoading } = useLoading();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading({ isLoading: true })
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/dashboard/student/stats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                } else {
                    console.error('Failed to fetch stats');
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading({ isLoading: false });
            }
        };

        fetchStats();
    }, []);

    // Safe access to stats
    const summary = stats?.summary || { borrowed: 0, overdue: 0, bookings: 0, reservations: 0, fines: 0 }
    const preview = stats?.preview || { borrowings: [], bookings: [], reservations: [] }

    return (
        <div className="student-dashboard-content">
            {/* 1. Header (Handled by Topbar, but we can add a greeting here if needed) */}

            {/* 2. Summary Section */}
            <section className="student-summary-grid">
                <StatCard
                    title="Borrowed Assets"
                    value={summary.borrowed}
                    icon={BookOpen}
                    accent="accent-blue"
                />
                <StatCard
                    title="Overdue Assets"
                    value={summary.overdue}
                    icon={AlertCircle}
                    accent="accent-red"
                    subtext={summary.overdue > 0 ? "Action needed" : "All good"}
                />
                <StatCard
                    title="Upcoming Bookings"
                    value={summary.bookings}
                    icon={CalendarCheck}
                    accent="accent-purple"
                />
                <StatCard
                    title="Reservations"
                    value={summary.reservations}
                    icon={Bookmark}
                    accent="accent-amber"
                />
                <StatCard
                    title="Outstanding Fines"
                    value={`$${summary.fines}`}
                    icon={ShieldCheck}
                    accent={parseFloat(summary.fines) > 0 ? "accent-red" : "accent-green"}
                />
            </section>

            {/* 3. Quick Actions */}
            <section className="student-quick-actions-row">
                <QuickActionCard title="Search Assets" icon={Search} onClick={() => navigate('/student/assets')} />
                <QuickActionCard title="My Borrowings" icon={BookOpenCheck} onClick={() => navigate('/student/history')} />
                <QuickActionCard title="Book a Room" icon={CalendarCheck} onClick={() => navigate('/student/assets?type=study-rooms')} />
                <QuickActionCard title="My Reservations" icon={Layers} onClick={() => navigate('/student/history')} />
                <QuickActionCard title="Pay Fines" icon={DollarSign} onClick={() => navigate('/student/history')} />
            </section>

            <div className="student-dashboard-split">
                <div className="student-dashboard-main-col">
                    {/* 4. Current Borrowings (Preview) */}
                    <section className="student-section-card">
                        <SectionHeader
                            title="Current Borrowings"
                            actionLabel="View All"
                            onAction={() => navigate('/student/history')}
                        />
                        <PreviewList
                            items={preview.borrowings}
                            type="borrowing"
                            emptyMessage="You don't have any active borrowings."
                        />
                    </section>

                    {/* 5. Upcoming Room Bookings (Preview) */}
                    <section className="student-section-card">
                        <SectionHeader
                            title="Upcoming Room Bookings"
                            actionLabel="View All"
                            onAction={() => navigate('/student/history')}
                        />
                        <PreviewList
                            items={preview.bookings}
                            type="booking"
                            emptyMessage="No upcoming room bookings."
                        />
                    </section>
                </div>

                <div className="student-dashboard-side-col">
                    {/* 6. Reservations / Holds (Preview) */}
                    <section className="student-section-card">
                        <SectionHeader
                            title="Reservations"
                            actionLabel="View All"
                            onAction={() => navigate('/student/history')}
                        />
                        <PreviewList
                            items={preview.reservations}
                            type="reservation"
                            emptyMessage="No active reservations."
                        />
                    </section>

                    {/* 7. Fines Overview */}
                    <section className="student-section-card fines-card">
                        <h3>Fines Overview</h3>
                        <div className="fines-summary">
                            <span className="fines-label">Total Unpaid</span>
                            <span className="fines-amount">${summary.fines}</span>
                        </div>
                        <button className="student-btn-primary full-width" onClick={() => navigate('/student/history')}>
                            View Details
                        </button>
                    </section>

                    {/* 10. Help & Library Info (Simplified) */}
                    <section className="student-section-card help-card">
                        <h3>Library Info</h3>
                        <ul className="library-info-list">
                            <li><span>🕒</span> Mon-Fri: 8am - 8pm</li>
                            <li><span>📞</span> (555) 123-4567</li>
                            <li><span>📧</span> help@library.edu</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    )
}

// --- Main Layout Components ---

const StudentSidebar = ({ sidebarOpen, setSidebarOpen, onLogout }) => (
    <>
        <div className={`student-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="student-sidebar-header">
                <div className="student-sidebar-logo">
                    <BookOpen size={24} />
                </div>
                <div>
                    <p>Library LMS</p>
                    <span>Student space</span>
                </div>
            </div>
            <nav className="student-sidebar-nav">
                <NavLink to="/student/overview" className={({ isActive }) => `student-sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/student/assets" className={({ isActive }) => `student-sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                    <BookOpenCheck size={20} />
                    <span>Assets</span>
                </NavLink>

                <NavLink to="/student/history" className={({ isActive }) => `student-sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                    <HistoryIcon size={20} />
                    <span>History</span>
                </NavLink>
            </nav>
            <div className="student-sidebar-footer">
                <button className="student-sidebar-logout" onClick={onLogout}>
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </div>
        <div className={`student-sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
    </>
)

const StudentTopbar = ({ sidebarOpen, setSidebarOpen }) => {
    const navigate = useNavigate()

    const user = JSON.parse(localStorage.getItem('user') || '{}')

    return (
        <header className="student-topbar">
            <div className="student-topbar-left">
                <button className="student-icon-button student-menu-button" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <div>
                    <p>Welcome back, {user.First_Name || 'Student'}</p>
                </div>
            </div>
            <div className="student-topbar-right">
                <button className="student-icon-button">
                    <Bell size={20} />
                    <span className="student-indicator" />
                </button>
                <div 
                className="student-profile-icon"
                onClick = {() => navigate('/student/profile')}
                >
                    <User size={20} />
                </div>
            </div>
        </header>
    )
}

// --- Main Component ---

function StudentDashboard() {
    const navigate = useNavigate()
    const [successMessage, setSuccessMessage] = useState('')
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('userId')
        localStorage.removeItem('role')
        navigate('/login')
    }

    return (
        <div className="student-dashboard-shell">
            <LoadingProvider>
                <OverlayProvider>
                    <SuccessPopup successMessage={successMessage} />
                    <StudentSidebar
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                        onLogout={handleLogout}
                    />
                    <div className="student-main">
                        <StudentTopbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                        <div className="student-inner">
                            <Routes>
                                <Route index element={<Navigate to="/student/overview" replace />} />
                                <Route path="overview" element={<DashboardOverview />} />
                                <Route path="assets" element={<Assets />} />
                                <Route path="history" element={<History />} />
                                {/* NEW */}
                                <Route path="profile" element={<Profile />} />
                            </Routes>
                        </div>
                    </div>
                </OverlayProvider>
            </LoadingProvider>
        </div>
    )
}

// Helper icon for Quick Actions (missing import)
import { DollarSign } from 'lucide-react'

export default StudentDashboard
