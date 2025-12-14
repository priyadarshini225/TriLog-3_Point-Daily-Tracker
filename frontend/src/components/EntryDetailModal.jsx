import { X, Edit2, Calendar, CheckCircle, BookOpen, Brain, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import './EntryDetailModal.css'

function EntryDetailModal({ entry, onClose }) {
  const navigate = useNavigate()

  // Fetch revisions completed on this date
  const { data: revisionsData } = useQuery({
    queryKey: ['revisions', 'completed', entry?.date],
    queryFn: async () => {
      const response = await api.get(`/revisions?completedDate=${entry.date}&limit=100`)
      return response.data
    },
    enabled: !!entry?.date,
  })

  const completedRevisions = revisionsData?.revisions || []

  if (!entry) return null

  const handleEdit = () => {
    navigate(`/edit/${entry._id}`)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content entry-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <Calendar size={24} />
            <div>
              <h2 className="modal-title">Entry Details</h2>
              <p className="modal-subtitle">
                {format(new Date(entry.date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {/* What I Completed */}
          <div className="entry-section">
            <div className="section-header">
              <CheckCircle size={20} className="section-icon completed-icon" />
              <h3>What I Completed Today</h3>
            </div>
            <div className="section-content">
              <p>{entry.completed}</p>
            </div>
          </div>

          {/* What I Learned */}
          <div className="entry-section">
            <div className="section-header">
              <BookOpen size={20} className="section-icon learned-icon" />
              <h3>What I Learned</h3>
            </div>
            <div className="section-content">
              <p>{entry.learned}</p>
            </div>
          </div>

          {/* What to Revise Later */}
          {entry.reviseLater && entry.reviseLater.length > 0 && (
            <div className="entry-section">
              <div className="section-header">
                <Brain size={20} className="section-icon revise-icon" />
                <h3>What to Revise Later</h3>
              </div>
              <div className="section-content">
                <ul className="revise-list">
                  {entry.reviseLater.map((item, index) => (
                    <li key={item.id || index} className="revise-item">
                      {typeof item === 'string' ? item : item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Revisions Completed Today */}
          {completedRevisions.length > 0 && (
            <div className="entry-section">
              <div className="section-header">
                <RefreshCw size={20} className="section-icon revision-icon" />
                <h3>Revisions Completed Today</h3>
                <span className="revision-count">{completedRevisions.length}</span>
              </div>
              <div className="section-content">
                <ul className="revision-completed-list">
                  {completedRevisions.map((revision) => (
                    <li key={revision._id} className="revision-completed-item">
                      <div className="revision-text">{revision.originalText}</div>
                      <div className="revision-meta">
                        <span className="revision-type">Day {revision.revisionType} Revision</span>
                        {revision.confidence && (
                          <span className="revision-confidence">
                            Confidence: {revision.confidence}/5
                          </span>
                        )}
                      </div>
                      {revision.entryId && (
                        <div className="revision-source">
                          From: {format(new Date(revision.entryId.date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="entry-section">
              <div className="section-header">
                <h3>Tags</h3>
              </div>
              <div className="tags-container">
                {entry.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handleEdit}>
            <Edit2 size={16} />
            Edit Entry
          </button>
        </div>
      </div>
    </div>
  )
}

export default EntryDetailModal
