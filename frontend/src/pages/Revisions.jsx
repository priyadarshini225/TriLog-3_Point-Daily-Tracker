import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { CheckCircle, Clock, X } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Revisions.css'

function Revisions() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const userId = useAuthStore((s) => s.user?.id)
  const [activeRevisionId, setActiveRevisionId] = useState(null)
  const [revisionResponse, setRevisionResponse] = useState('')
  const [confidence, setConfidence] = useState(3)

  const { data, isLoading } = useQuery({
    queryKey: ['revisions', userId, filter, page],
    queryFn: async () => {
      const status = filter === 'all' ? '' : `status=${filter}&`
      const response = await api.get(`/revisions?${status}limit=10&page=${page}`)
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
      setActiveRevisionId(null)
      setRevisionResponse('')
      setConfidence(3)
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to complete revision'
      toast.error(message)
    },
  })

  const handleComplete = (revisionId) => {
    if (activeRevisionId === revisionId) {
      completeRevisionMutation.mutate({ 
        id: revisionId, 
        responseText: revisionResponse,
        confidence: confidence
      })
    } else {
      setActiveRevisionId(revisionId)
    }
  }

  const handleCancel = () => {
    setActiveRevisionId(null)
    setRevisionResponse('')
    setConfidence(3)
  }

  const revisions = data?.revisions || []
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 }

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
                    {activeRevisionId === revision._id ? (
                      <div className="revision-response-form" style={{ width: '100%' }}>
                        <div className="form-group">
                          <label className="label" style={{ fontSize: '0.875rem' }}>
                            Your reflection on this topic:
                          </label>
                          <textarea
                            className="textarea"
                            value={revisionResponse}
                            onChange={(e) => setRevisionResponse(e.target.value)}
                            placeholder="What do you remember? What have you learned?"
                            maxLength={1000}
                            style={{ minHeight: '100px', marginBottom: '1rem' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                          <label className="label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Confidence level: {confidence}/5
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={confidence}
                            onChange={(e) => setConfidence(parseInt(e.target.value))}
                            className="confidence-slider"
                            style={{ width: '100%' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                            <span>1 - Need review</span>
                            <span>5 - Mastered</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleCancel}
                          >
                            <X size={16} />
                            Cancel
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleComplete(revision._id)}
                            disabled={completeRevisionMutation.isPending}
                          >
                            <CheckCircle size={16} />
                            Mark Complete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleComplete(revision._id)}
                      >
                        <CheckCircle size={16} />
                        Complete Review
                      </button>
                    )}
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

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem' }}>
              Page {page} of {pagination.pages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Revisions
