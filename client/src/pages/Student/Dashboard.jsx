import { useState } from 'react'
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
    BookOpen
} from 'lucide-react'
import { SuccessPopup } from '../../components/FeedbackUI/FeedbackUI'
import './Dashboard.css'
import { Assets } from './Assets'
import { OverlayProvider } from '../../components/FeedbackUI/OverlayContext'
import { LoadingProvider, useLoading } from '../../components/FeedbackUI/LoadingContext'

function TestLoad() {
    const { setLoading } = useLoading()
    return (
        <button
            className="student-placeholder-action"
            onClick={() => {
                setLoading({ isLoading: true })
                setTimeout(() => setLoading({ isLoading: false }), 2000)
            }}
        >
            Trigger Loading Overlay
        </button>
    )
}

const PlaceholderPanel = ({ title, description }) => (
    <div className="student-placeholder-panel">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="student-placeholder-chip">Feature in progress</div>
    </div>
)

const studentRoutes = [
    {
        path: 'overview',
        label: 'Overview',
        icon: LayoutDashboard,
        element: (
            <PlaceholderPanel
                title="Overview"
                description="Personalized summaries, learning streaks and quick shortcuts will live here."
            />
        )
    },
    {
        path: 'assets',
        label: 'Assets',
        icon: BookOpenCheck,
        element: <Assets />
    },
    {
        path: 'inventory',
        label: 'Inventory',
        icon: Layers,
        element: (
            <PlaceholderPanel
                title="Inventory"
                description="Track the items you have borrowed, holds and wishlists with visual insights."
            />
        )
    },
    {
        path: 'reports',
        label: 'Reports',
        icon: BarChart3,
        element: (
            <PlaceholderPanel
                title="Reports"
                description="Reading history, learning analytics and exportable data will appear here soon."
            />
        )
    },
    {
        path: 'test-loading',
        label: 'Test Loading',
        icon: Activity,
        element: <TestLoad />
    }
]

const tabClassName = ({ isActive }) => `student-tab ${isActive ? 'active' : ''}`

const QuickStatCard = ({ title, value, change, icon: Icon, accent }) => (
    <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="student-stat-card"
    >
        <div className={`student-stat-icon ${accent}`}>
            <Icon size={20} />
        </div>
        <div>
            <p>{title}</p>
            <h3>{value}</h3>
            <span>{change}</span>
        </div>
    </motion.div>
)

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
                {studentRoutes.map(({ path, label, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={`/student/${path}`}
                        className={({ isActive }) => `student-sidebar-link ${isActive ? 'active' : ''}`}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <Icon size={20} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="student-sidebar-footer">
                <button className="student-sidebar-logout" onClick={onLogout}>
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </div>
        <div
            className={`student-sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
            onClick={() => setSidebarOpen(false)}
        />
    </>
)

const StudentTopbar = ({ sidebarOpen, setSidebarOpen }) => {
    const [searchValue, setSearchValue] = useState('')

    return (
        <header className="student-topbar">
            <div className="student-topbar-left">
                <button className="student-icon-button student-menu-button" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <div>
                    <p>Welcome back 👋</p>
                    <span>Ready to keep learning?</span>
                </div>
            </div>
            <div className="student-topbar-right">
                <div className="student-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search the catalog"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                    />
                </div>
                <button className="student-icon-button">
                    <Bell size={20} />
                    <span className="student-indicator" />
                </button>
            </div>
        </header>
    )
}

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

    const quickStats = [
        {
            title: 'Active loans',
            value: '04',
            change: '+1 this week',
            icon: Bookmark,
            accent: 'accent-sky'
        },
        {
            title: 'Reservations',
            value: '02',
            change: '1 ready for pickup',
            icon: CalendarCheck,
            accent: 'accent-rose'
        },
        {
            title: 'Fines & holds',
            value: '$0.00',
            change: 'Cleared this month',
            icon: ShieldCheck,
            accent: 'accent-emerald'
        },
        {
            title: 'Reading streak',
            value: '12 days',
            change: 'Keep it going!',
            icon: Sparkles,
            accent: 'accent-amber'
        }
    ]

    const reminders = [
        {
            title: 'Return "Digital Logic"',
            detail: 'Due Oct 12',
            status: '2 days left',
            icon: Clock3
        },
        {
            title: 'Study room reservation',
            detail: 'Room B · Oct 14 · 3PM',
            status: 'Confirmed',
            icon: CalendarCheck
        }
    ]

    const quickActions = [
        {
            title: 'Browse catalog',
            description: 'Explore books, movies, and more',
            icon: BookOpenCheck
        },
        {
            title: 'Reserve a room',
            description: 'Find a study space for your group',
            icon: CalendarCheck
        },
        {
            title: 'Ask a librarian',
            description: 'Get research or course support',
            icon: Sparkles
        }
    ]

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
                            <section className="student-hero">
                                <div className="student-hero-info">
                                    <p>Student dashboard</p>
                                    <h1>Track your borrowing journey</h1>
                                    <p>
                                        Stay aligned with the librarian experience—consistent typography, gradients,
                                        and card styles keep the platform feeling unified.
                                    </p>
                                    <div className="student-hero-highlights">
                                        <div>
                                            <span>Next pickup</span>
                                            <strong>Oct 14 · Room B</strong>
                                        </div>
                                        <div>
                                            <span>Goal progress</span>
                                            <strong>8/12 books</strong>
                                        </div>
                                    </div>
                                </div>
                                <div className="student-hero-reminders">
                                    <h4>Upcoming reminders</h4>
                                    <ul>
                                        {reminders.map(({ title, detail, status, icon: Icon }) => (
                                            <li key={title}>
                                                <div className="student-hero-icon">
                                                    <Icon size={18} />
                                                </div>
                                                <div>
                                                    <p>{title}</p>
                                                    <span>{detail}</span>
                                                </div>
                                                <span className="student-hero-status">{status}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </section>

                            <section className="student-quick-actions">
                                {quickActions.map(({ title, description, icon: Icon }) => (
                                    <div key={title} className="student-action-card">
                                        <div className="student-action-icon">
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <h4>{title}</h4>
                                            <p>{description}</p>
                                        </div>
                                        <button>Open</button>
                                    </div>
                                ))}
                            </section>

                            <section className="student-stats-grid">
                                {quickStats.map((stat) => (
                                    <QuickStatCard key={stat.title} {...stat} />
                                ))}
                            </section>

                            <section className="student-tabs-panel">
                                <nav className="student-tabs">
                                    {studentRoutes.map(({ path, label }) => (
                                        <NavLink key={path} to={`/student/${path}`} className={tabClassName}>
                                            {label}
                                        </NavLink>
                                    ))}
                                </nav>
                                <div className="student-content-card">
                                    <Routes>
                                        <Route index element={<Navigate to="/student/assets" replace />} />
                                        {studentRoutes.map(({ path, element }) => (
                                            <Route key={path} path={path} element={element} />
                                        ))}
                                    </Routes>
                                </div>
                            </section>
                        </div>
                    </div>
                </OverlayProvider>
            </LoadingProvider>
        </div>
    )
}

export default StudentDashboard
