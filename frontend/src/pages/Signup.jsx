import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { UserPlus } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Auth.css'

function Signup() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  })

  const signupMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/auth/signup', data)
      return response.data
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      toast.success('Account created successfully!')
      navigate('/')
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Signup failed'
      toast.error(message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    signupMutation.mutate(formData)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="auth-container app-bg">
      <div className="auth-card glass-card fade-in">
        <div className="auth-header">
          <h1 className="auth-logo">TriLog</h1>
          <p className="auth-subtitle">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="input"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <p className="input-hint">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={signupMutation.isPending}
          >
            {signupMutation.isPending ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <UserPlus size={20} />
                Sign Up
              </>
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
