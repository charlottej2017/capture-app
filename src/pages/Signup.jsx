import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './Auth.module.css'

export default function Signup() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(false)
  const [loading, setLoading]   = useState(false)

  const handleEmail = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + '/dashboard' }
    })
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    })
    if (error) setError(error.message)
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <div className={styles.logo}>Check your email</div>
          <p style={{ fontSize: 14, color: 'var(--chestnut)', marginTop: 12, lineHeight: 1.6 }}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
          <Link to="/login" className={styles.backLink} style={{ marginTop: 24, display: 'block' }}>
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>Capture</div>
        <div className={styles.subtitle}>Create your free account</div>

        {/* Google */}
        <button className={styles.googleBtn} onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.5 5C9.7 39.6 16.4 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.7 6l6.2 5.2C40.4 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Continue with Google
        </button>

        <div className={styles.divider}>
          <div className={styles.dividerLine}/>
          <span className={styles.dividerText}>or</span>
          <div className={styles.dividerLine}/>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleEmail}>
          <div>
            <label className={styles.label}>Email</label>
            <input className={styles.input} type="email" placeholder="you@company.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className={styles.label}>Password</label>
            <input className={styles.input} type="password" placeholder="At least 8 characters"
              value={password} onChange={e => setPassword(e.target.value)}
              minLength={8} required />
          </div>
          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.footerLink}>Sign in</Link>
        </div>
        <Link to="/" className={styles.backLink}>← Back to home</Link>
      </div>
    </div>
  )
}
