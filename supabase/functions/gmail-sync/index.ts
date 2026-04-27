// supabase/functions/gmail-sync/index.ts
// This runs every 15 minutes via Supabase cron and checks Gmail for new tasks

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all users who have Gmail connected
    const { data: connections, error: connError } = await supabase
      .from('gmail_connections')
      .select('*')
      .eq('active', true)

    if (connError) throw connError
    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ message: 'No Gmail connections found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let totalImported = 0

    for (const connection of connections) {
      try {
        // Refresh access token if expired
        const accessToken = await refreshTokenIfNeeded(connection, supabase)
        if (!accessToken) continue

        // Fetch emails based on user's trigger preference
        const emails = await fetchEmails(accessToken, connection.trigger_type, connection.gmail_label)

        for (const email of emails) {
          // Check if task already exists for this email
          const { data: existing } = await supabase
            .from('items')
            .select('id')
            .eq('user_id', connection.user_id)
            .eq('gmail_message_id', email.id)
            .single()

          if (existing) continue // Already imported

          // Create as a pending task (user still needs to confirm)
          const { error: insertError } = await supabase
            .from('items')
            .insert({
              user_id: connection.user_id,
              kind: 'task',
              title: email.subject,
              note: `From: ${email.from}\n\n${email.snippet}`,
              source: 'email',
              priority: 'medium',
              done: false,
              gmail_message_id: email.id,
              gmail_pending: true,
              due_date: null,
            })

          if (!insertError) totalImported++
        }

        // Update last synced timestamp
        await supabase
          .from('gmail_connections')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', connection.id)

      } catch (userError) {
        console.error(`Error syncing for user ${connection.user_id}:`, userError)
      }
    }

    return new Response(JSON.stringify({ success: true, imported: totalImported }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function refreshTokenIfNeeded(connection: any, supabase: any): Promise<string | null> {
  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      const data = await response.json()
      if (data.access_token) {
        await supabase
          .from('gmail_connections')
          .update({
            access_token: data.access_token,
            token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
          })
          .eq('id', connection.id)
        return data.access_token
      }
    } catch {
      return null
    }
  }

  return connection.access_token
}

async function fetchEmails(accessToken: string, triggerType: string, labelName: string): Promise<any[]> {
  let query = ''

  if (triggerType === 'label' && labelName) {
    query = `label:${labelName} is:unread`
  } else if (triggerType === 'star') {
    query = 'is:starred is:unread'
  } else {
    query = `label:${labelName || 'capture'} OR is:starred`
  }

  // Get message IDs
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const listData = await listRes.json()

  if (!listData.messages || listData.messages.length === 0) return []

  // Get details for each message
  const emails = await Promise.all(
    listData.messages.map(async (msg: any) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const msgData = await msgRes.json()

      const subject = msgData.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '(No subject)'
      const from    = msgData.payload?.headers?.find((h: any) => h.name === 'From')?.value || ''

      return {
        id: msg.id,
        subject,
        from,
        snippet: msgData.snippet || '',
      }
    })
  )

  return emails
}
