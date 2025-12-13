import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Calendar, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Dashboard.css'

function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const userId = useAuthStore((s) => s.user?.id)

  // Get today's entry
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['entries', userId, today],
    queryFn: async () => {
      const response = await api.get(`/entries?date=${today}`)
      return response.data
    },
    enabled: !!userId,
  })

  // Get today's question
  const { data: questionData, isLoading: questionLoading } = useQuery({
    queryKey: ['question', userId, 'today'],
    queryFn: async () => {
      const response = await api.get('/questions/today')
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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        
        {!hasEntryToday && (
          <Link to="/new" className="btn btn-primary">
            <Plus size={20} />
            New Entry
          </Link>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Today's Entry Status */}
        <div className="card dashboard-card">
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
                    <strong>To Review:</strong>
                    <ul>
                      {todayEntry.reviseLater.map((item) => (
                        <li key={item.id}>{item.text}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
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

        {/* Today's Question */}
        <div className="card dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Daily Question</h3>
          </div>
          
          {questionLoading ? (
            <div className="loading-state">Loading...</div>
          ) : questionData?.question ? (
            <div className="question-card">
              <div className="question-category">{questionData.question.category}</div>
              <p className="question-text">{questionData.question.text}</p>
              
              {questionData.answered ? (
                <div className="question-answered">
                  <CheckCircle size={16} />
                  <span>Answered</span>
                </div>
              ) : (
                <Link to="/new" className="btn btn-secondary btn-sm">
                  Answer Now
                </Link>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <p>No question available</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Revisions */}
      {pendingRevisions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pending Revisions</h3>
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
    </div>
  )
}

export default Dashboard
