import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Settings.css'

function Settings() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings', userId],
    queryFn: async () => {
      const response = await api.get('/user/settings')
      return response.data
    },
    enabled: !!userId,
  })

  const [formData, setFormData] = useState({
    timezone: 'UTC',
    preferences: {},
  })

  useEffect(() => {
    if (!settingsData?.settings) return
    setFormData({
      timezone: settingsData.settings.timezone || 'UTC',
      preferences: settingsData.settings.preferences || {},
    })
  }, [userId, settingsData?.settings?.timezone, settingsData?.settings?.preferences])

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/user/settings', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Settings saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to save settings'
      toast.error(message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateSettingsMutation.mutate(formData)
  }

  const handlePreferenceChange = (category, key, value) => {
    setFormData({
      ...formData,
      preferences: {
        ...formData.preferences,
        [category]: {
          ...formData.preferences[category],
          [key]: value,
        },
      },
    })
  }

  if (isLoading) {
    return <div className="loading-state">Loading settings...</div>
  }

  const preferences = formData.preferences || {}
  const notificationChannels = preferences.notificationChannels || {}
  const dndWindow = preferences.dndWindow || {}

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your preferences and notifications</p>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-section card">
          <h2 className="section-title">General</h2>
          
          <div className="form-group">
            <label className="label" htmlFor="timezone">
              Timezone
            </label>
            <select
              id="timezone"
              className="input"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Asia/Kolkata">India Standard Time</option>
              <option value="Europe/London">London</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </div>

        <div className="settings-section card">
          <h2 className="section-title">Notifications</h2>
          
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={notificationChannels.push !== false}
                onChange={(e) =>
                  handlePreferenceChange('notificationChannels', 'push', e.target.checked)
                }
              />
              <span>Push Notifications</span>
            </label>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={notificationChannels.email === true}
                onChange={(e) =>
                  handlePreferenceChange('notificationChannels', 'email', e.target.checked)
                }
              />
              <span>Email Notifications</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={dndWindow.enabled === true}
                onChange={(e) =>
                  handlePreferenceChange('dndWindow', 'enabled', e.target.checked)
                }
              />
              <span>Enable Do Not Disturb</span>
            </label>
          </div>

          {dndWindow.enabled && (
            <div className="dnd-times">
              <div className="form-group">
                <label className="label" htmlFor="dndStart">
                  Start Time
                </label>
                <input
                  id="dndStart"
                  type="time"
                  className="input"
                  value={dndWindow.start || '22:00'}
                  onChange={(e) =>
                    handlePreferenceChange('dndWindow', 'start', e.target.value)
                  }
                />
              </div>
              
              <div className="form-group">
                <label className="label" htmlFor="dndEnd">
                  End Time
                </label>
                <input
                  id="dndEnd"
                  type="time"
                  className="input"
                  value={dndWindow.end || '08:00'}
                  onChange={(e) =>
                    handlePreferenceChange('dndWindow', 'end', e.target.value)
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <Save size={20} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Settings
