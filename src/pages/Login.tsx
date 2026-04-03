import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import '../Login.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await login(username, password)
      if (!success) {
        setError('Invalid username or password')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSSO = () => {
    // SSO integration placeholder
    console.log('SSO login clicked')
  }

  return (
    <div className="login-container">
      {/* ── Left panel ── */}
      <section className="login-background">
        <img src="/background.jpg" alt="Background" className="login-bg-image" />
        <div className="login-overlay" />
        <div className="login-left-content">
          <div className="login-brand">
            <div className="login-title">DockPull</div>
            <p className="login-subtitle">
              A lightweight Docker image management system for pulling and organizing container images with ease
            </p>
          </div>
          <div className="login-version">© 2026 DockPull — v2.4.1</div>
        </div>
        <div className="login-dots">
          {Array.from({ length: 25 }).map((_, i) => <span key={i} />)}
        </div>
      </section>

      {/* ── Right panel ── */}
      <section className="login-form-container">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h2>Sign In</h2>
            <p>Enter your credentials to access the system</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error">{error}</div>}

            <div className="login-field">
              <label htmlFor="username">Username</label>
              <div className="login-input-wrapper">
                <User size={16} className="login-input-icon" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-input-wrapper">
                <Lock size={16} className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="login-row-meta">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <a href="#" className="login-forgot">Forgot password?</a>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">or</span>
            <div className="login-divider-line" />
          </div>

          <button type="button" className="login-sso-btn" onClick={handleSSO}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            Continue with SSO
          </button>

          <p className="login-form-footer">
            New to DockPull? <a href="#">Request access</a>
          </p>
        </div>
      </section>
    </div>
  )
}
