import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save, Plus, X, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './NewEntry.css'

function EditEntry() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  const [formData, setFormData] = useState({
    date: '',
    completed: '',
    learned: '',
    reviseLater: [],
    reviseLaterWithIds: [], // Keep track of items with their IDs
    tags: [],
  })

  const [newRevisionItem, setNewRevisionItem] = useState('')

  // Fetch entry data
  const { data: entryData, isLoading, isError, error } = useQuery({
    queryKey: ['entry', id],
    queryFn: async () => {
      const response = await api.get(`/entries/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (entryData?.entry) {
      const entry = entryData.entry
      
      // Handle reviseLater items - they might be strings or objects
      const reviseLaterArray = Array.isArray(entry.reviseLater) 
        ? entry.reviseLater.map(item => {
            if (typeof item === 'string') return item
            return item.text || item.toString()
          })
        : []

      const reviseLaterWithIdsArray = Array.isArray(entry.reviseLater)
        ? entry.reviseLater.map(item => {
            if (typeof item === 'string') return { text: item }
            return item
          })
        : []

      setFormData({
        date: entry.date || '',
        completed: entry.completed || '',
        learned: entry.learned || '',
        reviseLater: reviseLaterArray,
        reviseLaterWithIds: reviseLaterWithIdsArray,
        tags: entry.tags || [],
      })
    }
  }, [entryData])

  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/entries/${id}`, {
        completed: data.completed,
        learned: data.learned,
        reviseLater: data.reviseLater, // Send as strings array
        tags: data.tags,
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Entry updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['entry', id] })
      navigate('/')
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update entry'
      toast.error(message)
    },
  })

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/entries/${id}`)
    },
    onSuccess: () => {
      toast.success('Entry deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      navigate('/')
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete entry'
      toast.error(message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateEntryMutation.mutate(formData)
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      deleteEntryMutation.mutate()
    }
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

  if (isLoading) {
    return <div className="loading-state">Loading entry...</div>
  }

  if (isError) {
    return (
      <div className="error-state">
        <h2>Error Loading Entry</h2>
        <p>{error?.response?.data?.message || error?.message || 'Failed to load entry'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (!entryData?.entry) {
    return (
      <div className="error-state">
        <h2>Entry Not Found</h2>
        <p>The requested entry could not be found.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="new-entry fade-in">
      <div className="page-header">
        <h1 className="page-title">Edit Entry</h1>
        <p className="page-subtitle">{formData.date ? format(new Date(formData.date), 'EEEE, MMMM d, yyyy') : ''}</p>
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

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleteEntryMutation.isPending}
          >
            <Trash2 size={20} />
            Delete Entry
          </button>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              disabled={updateEntryMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isFormValid || updateEntryMutation.isPending}
            >
              {updateEntryMutation.isPending ? (
                <span className="loading-spinner" />
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default EditEntry
