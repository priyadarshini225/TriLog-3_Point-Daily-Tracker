import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { LogIn } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Auth.css'

function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const loginMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/auth/login', data)
      return response.data
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      toast.success('Welcome back!')
      navigate('/')
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    loginMutation.mutate(formData)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="auth-container app-bg">
      <div className="auth-card glass-card fade-in">
        <div className="auth-header">
          <h1 className="auth-logo">TriLog</h1>
          <p className="auth-subtitle">3-Point Daily Tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <LogIn size={20} />
                Log In
              </>
            )}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
