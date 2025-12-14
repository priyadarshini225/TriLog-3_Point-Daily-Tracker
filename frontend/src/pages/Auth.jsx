import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff, Sparkles, Zap, TrendingUp, Heart } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Auth.css'

function Auth() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showLoveAnimation, setShowLoveAnimation] = useState(false)
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  })
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
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

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    
    // Easter egg check
    if (loginData.email === 'yellishettypriyadarshini@gmail.com' && 
        loginData.password === 'naniloveswho?') {
      setShowLoveAnimation(true)
      setTimeout(() => {
        setShowLoveAnimation(false)
      }, 5000)
      return
    }
    
    loginMutation.mutate(loginData)
  }

  const handleSignupSubmit = (e) => {
    e.preventDefault()
    signupMutation.mutate(signupData)
  }

  const toggleForm = () => {
    setIsLogin(!isLogin)
    setShowPassword(false)
  }

  return (
    <div className="auth-page">
      {/* Love Animation Easter Egg */}
      {showLoveAnimation && (
        <div className="love-animation-overlay">
          <div className="love-message">
            <Heart className="love-heart-icon" size={60} />
            <h1 className="love-text">Nani loves Mammulu</h1>
            <Heart className="love-heart-icon" size={60} />
          </div>
          {[...Array(30)].map((_, i) => (
            <Heart
              key={i}
              className="floating-heart"
              size={Math.random() * 30 + 20}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 3 + 3}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Animated Background */}
      <div className="auth-bg">
        <div className="gradient-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="auth-content">
        {/* Left Side - Branding */}
        <div className="auth-brand">
          <div className="brand-content">
            <div className="logo-3d">
              <div className="logo-cube">
                <div className="cube-face front">
                  <Sparkles size={48} />
                </div>
                <div className="cube-face back">
                  <TrendingUp size={48} />
                </div>
                <div className="cube-face right">
                  <Zap size={48} />
                </div>
                <div className="cube-face left">
                  <Sparkles size={48} />
                </div>
                <div className="cube-face top">
                  <TrendingUp size={48} />
                </div>
                <div className="cube-face bottom">
                  <Zap size={48} />
                </div>
              </div>
            </div>
            <h1 className="brand-title">TriLog</h1>
            <p className="brand-tagline">3-Point Daily Tracker</p>
            <div className="brand-features">
              <div className="feature">
                <div className="feature-icon">📝</div>
                <span>Daily Tracking</span>
              </div>
              <div className="feature">
                <div className="feature-icon">🧠</div>
                <span>Smart Revisions</span>
              </div>
              <div className="feature">
                <div className="feature-icon">📊</div>
                <span>Analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="auth-forms-container">
          <div className={`auth-flip-card ${!isLogin ? 'flipped' : ''}`}>
            {/* Login Form - Front */}
            <div className="auth-card-face auth-card-front">
              <div className="auth-card-inner">
                <div className="auth-header">
                  <h2 className="auth-title">Welcome Back</h2>
                  <p className="auth-description">Sign in to continue your journey</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="auth-form">
                  <div className="input-group">
                    <div className="input-icon">
                      <Mail size={20} />
                    </div>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="input-group">
                    <div className="input-icon">
                      <Lock size={20} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <span className="btn-spinner"></span>
                    ) : (
                      <>
                        <LogIn size={20} />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="auth-divider">
                  <span>Don't have an account?</span>
                </div>

                <button className="auth-switch-btn" onClick={toggleForm}>
                  <UserPlus size={18} />
                  <span>Create Account</span>
                </button>
              </div>
            </div>

            {/* Signup Form - Back */}
            <div className="auth-card-face auth-card-back">
              <div className="auth-card-inner">
                <div className="auth-header">
                  <h2 className="auth-title">Create Account</h2>
                  <p className="auth-description">Start tracking your daily progress</p>
                </div>

                <form onSubmit={handleSignupSubmit} className="auth-form">
                  <div className="input-group">
                    <div className="input-icon">
                      <User size={20} />
                    </div>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="input-group">
                    <div className="input-icon">
                      <Mail size={20} />
                    </div>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="input-group">
                    <div className="input-icon">
                      <Lock size={20} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password (min 6 characters)"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={signupMutation.isPending}
                  >
                    {signupMutation.isPending ? (
                      <span className="btn-spinner"></span>
                    ) : (
                      <>
                        <UserPlus size={20} />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="auth-divider">
                  <span>Already have an account?</span>
                </div>

                <button className="auth-switch-btn" onClick={toggleForm}>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth