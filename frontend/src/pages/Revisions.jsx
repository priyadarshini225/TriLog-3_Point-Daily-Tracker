import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { CheckCircle, Clock } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Revisions.css'

function Revisions() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('pending')
  const userId = useAuthStore((s) => s.user?.id)

  const { data, isLoading } = useQuery({
    queryKey: ['revisions', userId, filter],
    queryFn: async () => {
      const status = filter === 'all' ? '' : `status=${filter}`
      const response = await api.get(`/revisions?${status}&limit=50`)
      return response.data
    },
    enabled: !!userId,
  })

  const completeRevisionMutation = useMutation({
    mutationFn: async ({ id, responseText, confidence }) => {
      const response = await api.post(`/revisions/${id}/complete`, {
        responseText,
        confidence,
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Revision completed!')
      queryClient.invalidateQueries({ queryKey: ['revisions'] })
      queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to complete revision'
      toast.error(message)
    },
  })

  const handleComplete = (revisionId) => {
    completeRevisionMutation.mutate({ id: revisionId, confidence: 5 })
  }

  const revisions = data?.revisions || []

  return (
    <div className="revisions-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Revisions</h1>
          <p className="page-subtitle">Spaced repetition at 1, 3, and 7 days</p>
        </div>
      </div>

      <div className="revisions-filters">
        <button
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
      </div>

      <div className="revisions-container">
        {isLoading ? (
          <div className="loading-state card glass-card">Loading revisions...</div>
        ) : revisions.length === 0 ? (
          <div className="empty-state card glass-card">
            <Clock size={48} className="empty-icon" />
            <p>No {filter !== 'all' ? filter : ''} revisions found</p>
          </div>
        ) : (
          <div className="revisions-list">
            {revisions.map((revision) => (
              <div key={revision._id} className="revision-card card glass-card">
                <div className="revision-header">
                  <div className="revision-meta">
                    <span className="revision-type-badge">Day {revision.revisionType}</span>
                    <span className="revision-date">
                      {format(new Date(revision.scheduledAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className={`revision-status ${revision.status}`}>
                    {revision.status}
                  </div>
                </div>

                <div className="revision-content">
                  <p className="revision-text">{revision.originalText}</p>
                  {revision.entryId && (
                    <p className="revision-source">
                      From entry on {format(new Date(revision.entryId.date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>

                {revision.status === 'pending' && (
                  <div className="revision-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleComplete(revision._id)}
                      disabled={completeRevisionMutation.isPending}
                    >
                      <CheckCircle size={16} />
                      Mark Complete
                    </button>
                  </div>
                )}

                {revision.status === 'completed' && revision.completedAt && (
                  <div className="revision-completed">
                    <CheckCircle size={16} />
                    <span>Completed {format(new Date(revision.completedAt), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Revisions
