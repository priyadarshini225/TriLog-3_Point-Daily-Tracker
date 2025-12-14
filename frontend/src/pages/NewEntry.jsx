import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './NewEntry.css'

function NewEntry() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const userId = useAuthStore((s) => s.user?.id)

  const [formData, setFormData] = useState({
    date: today,
    completed: '',
    learned: '',
    reviseLater: [],
    answer: '',
  })

  const [newRevisionItem, setNewRevisionItem] = useState('')

  // Get today's question
  const { data: questionData } = useQuery({
    queryKey: ['question', userId, 'today'],
    queryFn: async () => {
      const response = await api.get('/questions/today')
      return response.data
    },
    enabled: !!userId,
  })

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/entries', {
        date: data.date,
        completed: data.completed,
        learned: data.learned,
        reviseLater: data.reviseLater.map(text => ({ text, tags: [] })),
      })
      return response.data
    },
    onSuccess: async (data) => {
      // If there's an answer, submit it
      if (formData.answer && questionData?.question?.id) {
        try {
          await api.post(`/questions/${questionData.question.id}/answer`, {
            answerText: formData.answer,
          })
        } catch (error) {
          console.error('Failed to submit answer:', error)
        }
      }

      toast.success('Entry saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['question'] })
      queryClient.invalidateQueries({ queryKey: ['revisions'] })
      navigate('/')
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to save entry'
      toast.error(message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createEntryMutation.mutate(formData)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const addRevisionItem = () => {
    if (newRevisionItem.trim()) {
      setFormData({
        ...formData,
        reviseLater: [...formData.reviseLater, newRevisionItem.trim()],
      })
      setNewRevisionItem('')
    }
  }

  const removeRevisionItem = (index) => {
    setFormData({
      ...formData,
      reviseLater: formData.reviseLater.filter((_, i) => i !== index),
    })
  }

  const isFormValid = formData.completed.trim() && formData.learned.trim()

  return (
    <div className="new-entry fade-in">
      <div className="page-header">
        <h1 className="page-title">New Daily Entry</h1>
        <p className="page-subtitle">{format(new Date(formData.date), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-section glass-card">
          <h2 className="section-title">Three-Point Reflection</h2>

          <div className="form-group">
            <label className="label" htmlFor="completed">
              1. What did I complete today? <span className="required">*</span>
            </label>
            <textarea
              id="completed"
              name="completed"
              className="textarea"
              value={formData.completed}
              onChange={handleChange}
              placeholder="Describe what you accomplished today..."
              maxLength={500}
              required
            />
            <p className="char-count">{formData.completed.length}/500</p>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="learned">
              2. What did I learn today? <span className="required">*</span>
            </label>
            <textarea
              id="learned"
              name="learned"
              className="textarea"
              value={formData.learned}
              onChange={handleChange}
              placeholder="Share your key learning or insight..."
              maxLength={500}
              required
            />
            <p className="char-count">{formData.learned.length}/500</p>
          </div>

          <div className="form-group">
            <label className="label">
              3. What should I revise later?
            </label>
            <div className="revision-input-group">
              <input
                type="text"
                className="input"
                value={newRevisionItem}
                onChange={(e) => setNewRevisionItem(e.target.value)}
                placeholder="Add item to review (will be scheduled for days 1, 3, 7)"
                maxLength={500}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addRevisionItem()
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addRevisionItem}
                disabled={!newRevisionItem.trim()}
              >
                <Plus size={20} />
              </button>
            </div>

            {formData.reviseLater.length > 0 && (
              <div className="revision-items">
                {formData.reviseLater.map((item, index) => (
                  <div key={index} className="revision-item-tag">
                    <span>{item}</span>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeRevisionItem(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {questionData?.question && !questionData?.answered && (
          <div className="form-section glass-card">
            <h2 className="section-title">Daily Question</h2>
            <div className="question-box glass-card--tight">
              <div className="question-category">{questionData.question.category}</div>
              <p className="question-text">{questionData.question.text}</p>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="answer">
                Your Answer
              </label>
              <textarea
                id="answer"
                name="answer"
                className="textarea"
                value={formData.answer}
                onChange={handleChange}
                placeholder="Share your thoughts..."
                maxLength={2000}
                style={{ minHeight: '120px' }}
              />
              <p className="char-count">{formData.answer.length}/2000</p>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={createEntryMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!isFormValid || createEntryMutation.isPending}
          >
            {createEntryMutation.isPending ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <Save size={20} />
                Save Entry
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewEntry
