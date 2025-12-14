import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Home,
  Calendar as CalendarIcon,
  Clock,
  RotateCcw,
  Users,
  Settings as SettingsIcon,
  User as UserIcon,
  LogOut,
  Menu,
  Sun,
  Moon,
  X,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import './Layout.css'

const THEME_STORAGE_KEY = 'trilog_theme'

const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    // Back-compat for earlier theme names.
    if (stored === 'dark' || stored === 'bw') return 'dark'
    return 'light'
  } catch {
    return 'light'
  }
}

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()

  const [theme, setTheme] = useState(getInitialTheme)
  const isDarkTheme = theme === 'dark'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')

    const sync = () => {
      const mobile = mq.matches
      setIsMobile(mobile)
      setIsSidebarOpen(!mobile)
    }

    sync()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync)
      return () => mq.removeEventListener('change', sync)
    }

    // Safari fallback
    mq.addListener(sync)
    return () => mq.removeListener(sync)
  }, [])

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // ignore storage errors
    }
  }, [theme])

  const handleLogout = () => {
    queryClient.clear()
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/calendar', icon: CalendarIcon, label: 'Calendar' },
    { path: '/schedule', icon: Clock, label: 'Schedule' },
    { path: '/revisions', icon: RotateCcw, label: 'Revisions' },
    { path: '/friends', icon: Users, label: 'Friends' },
    { path: '/profile', icon: UserIcon, label: 'Profile' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  const displayName = user?.name?.trim() || 'there'
  const greeting = `Hello ${displayName}!`

  return (
    <div
      className={`layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
    >
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <h1 className="logo">TriLog</h1>
            <p className="tagline">3-Point Daily Tracker</p>
          </div>
          <div className="sidebar-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <p className="user-name">{user?.name}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="content-shell app-bg">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <button
                type="button"
                className="icon-btn topbar-menu"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open sidebar"
                title="Open sidebar"
              >
                <Menu size={18} />
              </button>

              <h2 className="topbar-title">{greeting}</h2>
            </div>

            <button
              type="button"
              className="theme-switch"
              role="switch"
              aria-checked={isDarkTheme}
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Toggle theme"
            >
              <span className="switch-label">{isDarkTheme ? 'Dark' : 'Light'}</span>
              {isDarkTheme ? <Moon size={16} /> : <Sun size={16} />}
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
            </button>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
