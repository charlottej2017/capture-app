import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const P = {
  blush: '#CCA0A0', rose: '#CF7381', chestnut: '#795654',
  crimson: '#A3334B', burgundy: '#531C24',
  blushBg: '#F9F0F0', roseBg: '#F7EAEC', crimsonBg: '#F5E6EA', border: '#ECDCDC',
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly'

export default function GmailConnect({ userId, onClose }) {
  const [connection, setConnection]     = useState(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [syncing, setSyncing]           = useState(false)
  const [triggerType, setTriggerType]   = useState('both')
  const [gmailLabel, setGmailLabel]     = useState('Capture')
  const [lastSynced, setLastSynced]     = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [message, setMessage]           = useState(null)

  useEffect(() => { loadConnection() }, [])

  const loadConnection = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('gmail_connections')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      setConnection(data)
      setTriggerType(data.trigger_type)
      setGmailLabel(data.gmail_label || 'Capture')
      setLastSynced(data.last_synced_at)
    }

    // Count pending tasks from Gmail
    const { count } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('gmail_pending', true)
      .eq('done', false)

    setPendingCount(count || 0)
    setLoading(false)
  }

  const connectGmail = () => {
    const redirectUri = `${window.location.origin}/gmail-callback`
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', SCOPES)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', userId)
    window.location.href = authUrl.toString()
  }

  const saveSettings = async () => {
    if (!connection) return
    setSaving(true)
    await supabase
      .from('gmail_connections')
      .update({ trigger_type: triggerType, gmail_label: gmailLabel })
      .eq('user_id', userId)
    setMessage('Settings saved!')
    setTimeout(() => setMessage(null), 3000)
    setSaving(false)
  }

  const manualSync = async () => {
    setSyncing(true)
    setMessage('Syncing Gmail...')
    try {
      const { data, error } = await supabase.functions.invoke('gmail-sync')
      if (error) throw error
      await loadConnection()
      setMessage(`Sync complete! ${data?.imported || 0} new task(s) found.`)
    } catch {
      setMessage('Sync failed. Please try reconnecting Gmail.')
    }
    setTimeout(() => setMessage(null), 4000)
    setSyncing(false)
  }

  const disconnect = async () => {
    if (!confirm('Disconnect Gmail? Existing tasks will remain.')) return
    await supabase.from('gmail_connections').delete().eq('user_id', userId)
    setConnection(null)
    setMessage('Gmail disconnected.')
  }

  if (loading) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.panel} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: 40, color: P.blush }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Gmail Integration</div>
            <div style={styles.subtitle}>Auto-import emails as tasks</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {message && (
          <div style={styles.message}>{message}</div>
        )}

        {!connection ? (
          /* Not connected */
          <div style={styles.body}>
            <div style={styles.explainBox}>
              <div style={styles.explainIcon}>✉️</div>
              <div style={styles.explainTitle}>How it works</div>
              <div style={styles.explainText}>
                Connect your Gmail and choose a trigger — either apply a <strong>"Capture"</strong> label
                to an email, or <strong>star</strong> it. It'll automatically appear as a task
                every 15 minutes.
              </div>
            </div>
            <button style={styles.connectBtn} onClick={connectGmail}>
              <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.5 5C9.7 39.6 16.4 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.7 6l6.2 5.2C40.4 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
              </svg>
              Connect Gmail
            </button>
          </div>
        ) : (
          /* Connected */
          <div style={styles.body}>

            {/* Status bar */}
            <div style={styles.statusBar}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={styles.greenDot}/>
                <span style={{ fontSize: 13, fontWeight: 700, color: P.burgundy }}>Gmail connected</span>
              </div>
              <div style={{ fontSize: 11, color: P.blush }}>
                {lastSynced ? `Last synced ${new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not yet synced'}
              </div>
            </div>

            {/* Pending tasks notice */}
            {pendingCount > 0 && (
              <div style={styles.pendingBanner}>
                <span>📬 <strong>{pendingCount}</strong> email{pendingCount > 1 ? 's' : ''} imported and waiting in your task list</span>
              </div>
            )}

            {/* Trigger setting */}
            <div style={styles.settingBlock}>
              <label style={styles.settingLabel}>Trigger — how emails become tasks</label>
              <div style={styles.triggerGroup}>
                {[
                  { key: 'label', icon: '🏷️', title: 'Gmail Label', desc: `Apply "${gmailLabel}" label to email` },
                  { key: 'star',  icon: '⭐', title: 'Starred',     desc: 'Star an email in Gmail' },
                  { key: 'both',  icon: '✦',  title: 'Both',        desc: 'Either label or star works' },
                ].map(t => (
                  <button key={t.key} onClick={() => setTriggerType(t.key)}
                    style={{
                      ...styles.triggerBtn,
                      background: triggerType === t.key ? P.burgundy : '#fff',
                      color: triggerType === t.key ? '#fff' : P.chestnut,
                      borderColor: triggerType === t.key ? P.burgundy : P.border,
                    }}>
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{t.title}</div>
                      <div style={{ fontSize: 11, opacity: 0.75 }}>{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Label name setting */}
            {(triggerType === 'label' || triggerType === 'both') && (
              <div style={styles.settingBlock}>
                <label style={styles.settingLabel}>Gmail label name</label>
                <input
                  value={gmailLabel}
                  onChange={e => setGmailLabel(e.target.value)}
                  placeholder="Capture"
                  style={styles.labelInput}
                  onFocus={e => e.target.style.borderColor = P.rose}
                  onBlur={e => e.target.style.borderColor = P.border}
                />
                <div style={{ fontSize: 11, color: P.blush, marginTop: 5 }}>
                  Create this label in Gmail and apply it to emails you want as tasks
                </div>
              </div>
            )}

            {/* Sync info */}
            <div style={styles.syncInfo}>
              🔄 Auto-syncs every 15 minutes
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <button style={styles.saveBtn} onClick={saveSettings} disabled={saving}>
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
              <button style={styles.syncBtn} onClick={manualSync} disabled={syncing}>
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>

            <button style={styles.disconnectBtn} onClick={disconnect}>
              Disconnect Gmail
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(83,28,36,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100, padding: 24, backdropFilter: 'blur(2px)',
  },
  panel: {
    background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
    boxShadow: '0 20px 60px rgba(83,28,36,0.2)',
    animation: 'fadeUp 0.25s ease both', maxHeight: '90vh', overflowY: 'auto',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '24px 24px 0',
  },
  title: {
    fontFamily: "'Playfair Display', serif", fontSize: 20,
    fontWeight: 900, color: P.burgundy,
  },
  subtitle: { fontSize: 12, color: P.blush, marginTop: 3 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, color: P.blush, padding: 4, lineHeight: 1,
  },
  body: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  message: {
    margin: '12px 24px 0', background: P.blushBg, border: `1px solid ${P.border}`,
    borderRadius: 8, padding: '10px 14px', fontSize: 13,
    color: P.chestnut, fontWeight: 600,
  },
  explainBox: {
    background: P.blushBg, border: `1px solid ${P.border}`,
    borderRadius: 12, padding: 20, textAlign: 'center',
  },
  explainIcon: { fontSize: 32, marginBottom: 10 },
  explainTitle: { fontSize: 15, fontWeight: 800, color: P.burgundy, marginBottom: 8 },
  explainText: { fontSize: 13, color: P.chestnut, lineHeight: 1.6 },
  connectBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', background: '#fff', border: `1px solid ${P.border}`,
    borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700,
    color: P.burgundy, cursor: 'pointer', fontFamily: "'Lato', sans-serif",
    transition: 'all 0.15s',
  },
  statusBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 10, padding: '10px 14px',
  },
  greenDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
  },
  pendingBanner: {
    background: P.roseBg, border: `1px solid ${P.blush}`,
    borderRadius: 10, padding: '10px 14px',
    fontSize: 13, color: P.chestnut,
  },
  settingBlock: { display: 'flex', flexDirection: 'column', gap: 8 },
  settingLabel: {
    fontSize: 11, fontWeight: 800, color: P.blush,
    letterSpacing: '0.06em', textTransform: 'uppercase',
  },
  triggerGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  triggerBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: 10, border: '1px solid',
    cursor: 'pointer', fontFamily: "'Lato', sans-serif",
    textAlign: 'left', transition: 'all 0.15s',
  },
  labelInput: {
    background: P.blushBg, border: `1px solid ${P.border}`,
    borderRadius: 8, padding: '9px 12px', fontSize: 13,
    color: P.burgundy, outline: 'none', fontFamily: "'Lato', sans-serif",
    width: '100%', transition: 'border-color 0.15s',
  },
  syncInfo: {
    fontSize: 11, color: P.blush, textAlign: 'center',
    padding: '8px', background: P.blushBg, borderRadius: 8,
  },
  actions: { display: 'flex', gap: 8 },
  saveBtn: {
    flex: 1, background: P.burgundy, color: '#fff', border: 'none',
    cursor: 'pointer', borderRadius: 8, padding: '11px', fontSize: 13,
    fontWeight: 700, fontFamily: "'Lato', sans-serif", transition: 'background 0.15s',
  },
  syncBtn: {
    flex: 1, background: P.blushBg, color: P.chestnut, border: `1px solid ${P.border}`,
    cursor: 'pointer', borderRadius: 8, padding: '11px', fontSize: 13,
    fontWeight: 700, fontFamily: "'Lato', sans-serif", transition: 'all 0.15s',
  },
  disconnectBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: P.blush, fontFamily: "'Lato', sans-serif",
    fontWeight: 600, textAlign: 'center', width: '100%',
    padding: '4px', transition: 'color 0.15s',
  },
}
