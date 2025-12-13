import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Home, Calendar as CalendarIcon, RotateCcw, Settings as SettingsIcon, LogOut, FileText } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import './Layout.css'

const THEME_STORAGE_KEY = 'trilog_theme'

const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'bw' ? 'bw' : 'color'
  } catch {
    return 'color'
  }
}

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()

  const [theme, setTheme] = useState(getInitialTheme)
  const isBwTheme = theme === 'bw'

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'bw') {
      root.setAttribute('data-theme', 'bw')
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
    { path: '/revisions', icon: RotateCcw, label: 'Revisions' },
    { path: '/summaries', icon: FileText, label: 'Summaries' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">TriLog</h1>
          <p className="tagline">3-Point Daily Tracker</p>
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
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setTheme((t) => (t === 'bw' ? 'color' : 'bw'))}
            aria-pressed={isBwTheme}
            title="Toggle black & white theme"
            type="button"
          >
            {isBwTheme ? 'Color Theme' : 'B/W Theme'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
