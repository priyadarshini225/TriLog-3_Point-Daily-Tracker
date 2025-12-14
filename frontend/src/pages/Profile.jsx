import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save, User, Mail, Lock, TrendingUp, Camera, Award, Calendar, Target } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Profile.css'

function Profile() {
  const queryClient = useQueryClient()
  const { user, updateUser } = useAuthStore()
  const fileInputRef = useRef(null)
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatar: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [previewAvatar, setPreviewAvatar] = useState(null)

  // Fetch user profile
  const { data: profileResponse, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await api.get('/user/profile')
      return response.data
    },
  })

  // Fetch user stats
  const { data: statsResponse } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await api.get('/user/stats')
      return response.data
    },
  })

  useEffect(() => {
    if (profileResponse?.profile) {
      setProfileData({
        name: profileResponse.profile.name,
        email: profileResponse.profile.email,
        avatar: profileResponse.profile.avatar || '',
      })
      setPreviewAvatar(profileResponse.profile.avatar || null)
    }
  }, [profileResponse])

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/user/profile', data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Profile updated successfully!')
      updateUser(data.profile)
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update profile'
      toast.error(message)
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/user/password', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Password changed successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to change password'
      toast.error(message)
    },
  })

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewAvatar(reader.result)
        setProfileData({ ...profileData, avatar: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    updateProfileMutation.mutate(profileData)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    })
  }

  const stats = statsResponse?.stats
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return <div className="loading-state">Loading profile...</div>
  }

  return (
    <div className="profile-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account and track your progress</p>
      </div>

      {/* Profile Header Card */}
      <div className="profile-header-card card glass-card">
        <div className="profile-avatar-section">
          <div className="avatar-wrapper" onClick={handleAvatarClick}>
            {previewAvatar ? (
              <img src={previewAvatar} alt="Profile" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                {profileData.name ? getInitials(profileData.name) : <User size={40} />}
              </div>
            )}
            <div className="avatar-overlay">
              <Camera size={24} />
              <span>Change</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
        </div>
        <div className="profile-header-info">
          <h2 className="profile-name">{profileData.name}</h2>
          <p className="profile-email">{profileData.email}</p>
          <div className="profile-badge">
            <Award size={16} />
            <span>Active Learner</span>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card card glass-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.currentStreak}</div>
              <div className="stat-label">Day Streak</div>
            </div>
          </div>
          
          <div className="stat-card card glass-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <Calendar size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalEntries}</div>
              <div className="stat-label">Total Entries</div>
            </div>
          </div>
          
          <div className="stat-card card glass-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <Target size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.completedRevisions}</div>
              <div className="stat-label">Revisions Done</div>
            </div>
          </div>
          
          <div className="stat-card card glass-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
              <Award size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.questionsAnswered}</div>
              <div className="stat-label">Questions Answered</div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Information */}
      <form onSubmit={handleProfileSubmit} className="profile-form">
        <div className="settings-section card glass-card">
          <h2 className="section-title">
            <User size={20} />
            Profile Information
          </h2>

          <div className="form-group">
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              type="text"
              className="input"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="email">
              <Mail size={16} style={{ marginRight: '0.5rem' }} />
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <Save size={20} />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form onSubmit={handlePasswordSubmit} className="profile-form">
        <div className="settings-section card glass-card">
          <h2 className="section-title">
            <Lock size={20} />
            Security Settings
          </h2>

          <div className="form-group">
            <label className="label" htmlFor="currentPassword">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              className="input"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, currentPassword: e.target.value })
              }
              placeholder="Enter your current password"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="newPassword">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                className="input"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                placeholder="Enter new password"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <Lock size={20} />
                Update Password
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Profile
