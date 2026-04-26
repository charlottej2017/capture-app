import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function GmailCallback() {
  const [status, setStatus] = useState('Connecting Gmail...')
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code  = params.get('code')
      const userId = params.get('state')

      if (!code || !userId) {
        setStatus('Something went wrong. Redirecting...')
        setTimeout(() => navigate('/dashboard'), 2000)
        return
      }

      try {
        // Exchange code for tokens via Supabase edge function
        const { data, error } = await supabase.functions.invoke('gmail-auth', {
          body: {
            code,
            userId,
            redirectUri: `${window.location.origin}/gmail-callback`
          }
        })

        if (error || !data?.success) {
          setStatus('Connection failed. Please try again.')
          setTimeout(() => navigate('/dashboard'), 2000)
          return
        }

        setStatus('Gmail connected! Redirecting...')
        setTimeout(() => navigate('/dashboard'), 1500)

      } catch {
        setStatus('Connection failed. Please try again.')
        setTimeout(() => navigate('/dashboard'), 2000)
      }
    }

    handleCallback()
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#faf6f6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Lato', sans-serif",
    }}>
      <div style={{
        background: '#fff', border: '1px solid #ECDCDC', borderRadius: 16,
        padding: '40px 48px', textAlign: 'center', maxWidth: 360,
        boxShadow: '0 8px 32px rgba(83,28,36,0.08)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 20,
          fontWeight: 900, color: '#531C24', marginBottom: 8,
        }}>
          {status}
        </div>
        <div style={{ fontSize: 13, color: '#CCA0A0' }}>
          Please wait a moment...
        </div>
      </div>
    </div>
  )
}
