import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Calendar, CheckCircle, Clock, TrendingUp, Award, Target, BookOpen, BarChart3, Flame, Brain, Zap, AlertCircle, Mail } from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns'
import { useState } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Dashboard.css'

function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const userId = useAuthStore((s) => s.user?.id)
  const user = useAuthStore((s) => s.user)
  const [showVerificationBanner, setShowVerificationBanner] = useState(true)
  const [resendStatus, setResendStatus] = useState(null) // 'sending', 'success', 'error'
  const last7Days = format(subDays(new Date(), 7), 'yyyy-MM-dd')
  const last30Days = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  // Get today's entry
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['entries', userId, today],
    queryFn: async () => {
      const response = await api.get(`/entries?date=${today}`)
      return response.data
    },
    enabled: !!userId,
  })

  // Get user stats
  const { data: statsData } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await api.get('/user/stats')
      return response.data
    },
    enabled: !!userId,
  })

  // Get recent entries for analytics
  const { data: recentEntriesData } = useQuery({
    queryKey: ['entries', userId, 'recent'],
    queryFn: async () => {
      const response = await api.get(`/entries?startDate=${last30Days}&limit=100`)
      return response.data
    },
    enabled: !!userId,
  })

  // Get pending revisions
  const { data: revisionsData } = useQuery({
    queryKey: ['revisions', userId, 'pending'],
    queryFn: async () => {
      const response = await api.get('/revisions?status=pending&limit=5')
      return response.data
    },
    enabled: !!userId,
  })

  const todayEntry = todayData?.entries?.[0]
  const hasEntryToday = !!todayEntry
  const pendingRevisions = revisionsData?.revisions || []
  const stats = statsData?.stats
  const recentEntries = recentEntriesData?.entries || []

  // Calculate weekly activity
  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(new Date())
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weekActivity = weekDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const hasEntry = recentEntries.some(e => e.date === dateStr)
    return { date: dateStr, hasEntry, isToday: isToday(day) }
  })

  // Calculate completion rate
  const last7DaysEntries = recentEntries.filter(e => e.date >= last7Days).length
  const weekCompletionRate = Math.round((last7DaysEntries / 7) * 100)

  // Calculate average items to revise
  const totalReviseItems = recentEntries.reduce((sum, e) => sum + (e.reviseLater?.length || 0), 0)
  const avgReviseItems = recentEntries.length > 0 ? (totalReviseItems / recentEntries.length).toFixed(1) : 0

  // Resend verification email mutation
  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/resend-verification')
      return response.data
    },
    onSuccess: () => {
      setResendStatus('success')
      setTimeout(() => setResendStatus(null), 5000)
    },
    onError: () => {
      setResendStatus('error')
      setTimeout(() => setResendStatus(null), 5000)
    },
  })

  const handleResendVerification = () => {
    setResendStatus('sending')
    resendVerificationMutation.mutate()
  }

  return (
    <div className="dashboard fade-in">
      {/* Email Verification Banner */}
      {user && !user.isEmailVerified && showVerificationBanner && (
        <div className="verification-banner">
          <div className="banner-content">
            <AlertCircle size={24} className="banner-icon" />
            <div className="banner-text">
              <strong>Verify your email address</strong>
              <p>Please check your inbox and click the verification link we sent to <strong>{user.email}</strong></p>
            </div>
          </div>
          <div className="banner-actions">
            <button 
              className="btn-resend"
              onClick={handleResendVerification}
              disabled={resendStatus === 'sending'}
            >
              <Mail size={16} />
              {resendStatus === 'sending' ? 'Sending...' : 
               resendStatus === 'success' ? 'Email Sent!' :
               resendStatus === 'error' ? 'Failed - Try Again' :
               'Resend Email'}
            </button>
            <button 
              className="btn-dismiss"
              onClick={() => setShowVerificationBanner(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        
        {!hasEntryToday && (
          <Link to="/new" className="btn btn-primary">
            <Plus size={20} />
            New Entry
          </Link>
        )}
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card card glass-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Flame size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{stats?.currentStreak || 0}</div>
            <div className="metric-label">Day Streak</div>
            <div className="metric-change positive">Keep it going! 🔥</div>
          </div>
        </div>

        <div className="metric-card card glass-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Calendar size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{stats?.totalEntries || 0}</div>
            <div className="metric-label">Total Entries</div>
            <div className="metric-change">{last7DaysEntries} this week</div>
          </div>
        </div>

        <div className="metric-card card glass-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Target size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{weekCompletionRate}%</div>
            <div className="metric-label">Week Completion</div>
            <div className="metric-change">{last7DaysEntries}/7 days</div>
          </div>
        </div>

        <div className="metric-card card glass-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <Brain size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{stats?.completedRevisions || 0}</div>
            <div className="metric-label">Revisions Done</div>
            <div className="metric-change">{pendingRevisions.length} pending</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Weekly Activity Heatmap */}
        <div className="card dashboard-card glass-card">
          <div className="card-header">
            <h3 className="card-title">
              <BarChart3 size={20} />
              This Week's Activity
            </h3>
          </div>
          
          <div className="activity-heatmap">
            {weekActivity.map((day, idx) => (
              <div key={idx} className="activity-day">
                <div className={`activity-bar ${day.hasEntry ? 'active' : ''} ${day.isToday ? 'today' : ''}`} 
                     style={{ height: day.hasEntry ? '100%' : '20%' }}>
                </div>
                <div className="activity-label">{format(new Date(day.date), 'EEE')}</div>
              </div>
            ))}
          </div>
          <div className="activity-legend">
            <span className="legend-item"><span className="dot active"></span> Completed</span>
            <span className="legend-item"><span className="dot"></span> Pending</span>
          </div>
        </div>

        {/* Today's Entry Status */}
        <div className="card dashboard-card glass-card">
          <div className="card-header">
            <h3 className="card-title">
              <Calendar size={20} />
              Today's Entry
            </h3>
          </div>
          
          {todayLoading ? (
            <div className="loading-state">Loading...</div>
          ) : hasEntryToday ? (
            <div className="entry-preview">
              <div className="entry-status">
                <CheckCircle size={24} className="status-icon success" />
                <p className="status-text">Entry completed!</p>
              </div>
              
              <div className="entry-content">
                <div className="entry-field">
                  <strong>Completed:</strong>
                  <p>{todayEntry.completed}</p>
                </div>
                <div className="entry-field">
                  <strong>Learned:</strong>
                  <p>{todayEntry.learned}</p>
                </div>
                {todayEntry.reviseLater?.length > 0 && (
                  <div className="entry-field">
                    <strong>To Review ({todayEntry.reviseLater.length}):</strong>
                    <ul>
                      {todayEntry.reviseLater.slice(0, 2).map((item) => (
                        <li key={item.id}>{item.text}</li>
                      ))}
                      {todayEntry.reviseLater.length > 2 && (
                        <li>+{todayEntry.reviseLater.length - 2} more...</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <Link to={`/edit/${todayEntry._id}`} className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
                Edit Entry
              </Link>
            </div>
          ) : (
            <div className="empty-state">
              <Clock size={48} className="empty-icon" />
              <p>No entry for today yet</p>
              <Link to="/new" className="btn btn-primary btn-sm">
                Create Entry
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Insights & Stats */}
      <div className="insights-section">
        <h3 className="section-title">
          <TrendingUp size={20} />
          Insights & Trends
        </h3>
        
        <div className="insights-grid">
          <div className="insight-card card glass-card">
            <div className="insight-icon">
              <BookOpen size={20} />
            </div>
            <div className="insight-content">
              <div className="insight-value">{avgReviseItems}</div>
              <div className="insight-label">Avg Items to Revise</div>
              <div className="insight-desc">per entry</div>
            </div>
          </div>

          <div className="insight-card card glass-card">
            <div className="insight-icon">
              <Award size={20} />
            </div>
            <div className="insight-content">
              <div className="insight-value">{stats?.questionsAnswered || 0}</div>
              <div className="insight-label">Questions Answered</div>
              <div className="insight-desc">total responses</div>
            </div>
          </div>

          <div className="insight-card card glass-card">
            <div className="insight-icon">
              <Zap size={20} />
            </div>
            <div className="insight-content">
              <div className="insight-value">{recentEntries.length}</div>
              <div className="insight-label">Last 30 Days</div>
              <div className="insight-desc">{Math.round((recentEntries.length / 30) * 100)}% completion</div>
            </div>
          </div>

          <div className="insight-card card glass-card">
            <div className="insight-icon">
              <Target size={20} />
            </div>
            <div className="insight-content">
              <div className="insight-value">{totalReviseItems}</div>
              <div className="insight-label">Total Revision Items</div>
              <div className="insight-desc">ready to review</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Revisions */}
      {pendingRevisions.length > 0 && (
        <div className="card glass-card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock size={20} />
              Pending Revisions
            </h3>
            <Link to="/revisions" className="btn btn-secondary btn-sm">
              View All
            </Link>
          </div>
          
          <div className="revisions-list">
            {pendingRevisions.map((revision) => (
              <div key={revision._id} className="revision-item">
                <div className="revision-badge">Day {revision.revisionType}</div>
                <div className="revision-content">
                  <p className="revision-text">{revision.originalText}</p>
                  <p className="revision-date">
                    From {format(new Date(revision.entryId?.date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card glass-card">
        <div className="card-header">
          <h3 className="card-title">
            <BarChart3 size={20} />
            Recent Activity
          </h3>
          <Link to="/calendar" className="btn btn-secondary btn-sm">
            View Calendar
          </Link>
        </div>
        
        <div className="recent-activity">
          {recentEntries.slice(0, 5).map((entry) => (
            <Link key={entry._id} to={`/edit/${entry._id}`} className="activity-item">
              <div className="activity-date">
                <div className="date-day">{format(new Date(entry.date), 'd')}</div>
                <div className="date-month">{format(new Date(entry.date), 'MMM')}</div>
              </div>
              <div className="activity-content">
                <p className="activity-text">{entry.completed}</p>
                <div className="activity-meta">
                  {entry.reviseLater?.length > 0 && (
                    <span className="meta-badge">{entry.reviseLater.length} to review</span>
                  )}
                  <span className="meta-time">{format(new Date(entry.createdAt), 'h:mm a')}</span>
                </div>
              </div>
            </Link>
          ))}
          {recentEntries.length === 0 && (
            <div className="empty-state">
              <p>No recent entries. Start your journey today!</p>
              <Link to="/new" className="btn btn-primary btn-sm">
                Create First Entry
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
