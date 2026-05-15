
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

serve(async (req) => {
  try {
    // Initialize Supabase Client with Service Role Key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch collections that have an auto_expiry date set
    const { data: collections, error: fetchError } = await supabaseAdmin
      .from('collections')
      .select('*')
      .not('auto_expiry', 'is', null)
      .is('last_expiry_email_sent_at', null) // Only send once for now

    if (fetchError) throw fetchError

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Setup SMTP Client
    const client = new SmtpClient()
    const smtpConfig = {
      hostname: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
      port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
      username: Deno.env.get('SMTP_USER') || '',
      password: Deno.env.get('SMTP_PASS') || '',
    }

    const results = []

    for (const collection of collections) {
      const expiryDate = new Date(collection.auto_expiry)
      expiryDate.setHours(0, 0, 0, 0)

      // Parse timing (e.g., "1 day before auto expiry date")
      const daysBefore = parseInt(collection.expiry_email_timing?.split(' ')[0] || '1')
      
      const targetDate = new Date(expiryDate)
      targetDate.setDate(targetDate.getDate() - daysBefore)

      // Check if today is the day to send
      if (today.getTime() === targetDate.getTime()) {
        // 2. Identify Recipients
        const recipients = new Set<string>()
        if (collection.expiry_email_to) {
          collection.expiry_email_to.split(',').forEach(email => recipients.add(email.trim()))
        }

        // Fetch from activity lists if enabled
        const lists = collection.expiry_email_lists || []
        
        if (lists.includes('downloaded') || lists.includes('registered') || lists.includes('contacts')) {
          const { data: sessions } = await supabaseAdmin
            .from('client_sessions')
            .select('visitor_email')
            .eq('collection_id', collection.id)
          
          if (sessions) {
            sessions.forEach(s => {
              if (s.visitor_email) recipients.add(s.visitor_email)
            })
          }
        }

        if (lists.includes('favorited')) {
          const { data: favLists } = await supabaseAdmin
            .from('favorite_lists')
            .select('id, session_id')
            .eq('collection_id', collection.id)
          
          if (favLists && favLists.length > 0) {
            const listIds = favLists.map(l => l.id)
            const { data: favItems } = await supabaseAdmin
              .from('favorite_items')
              .select('list_id')
              .in('list_id', listIds)
            
            const activeSessionIds = new Set(favLists.filter(l => favItems?.some(i => i.list_id === l.id)).map(l => l.session_id))
            
            const { data: favSessions } = await supabaseAdmin
              .from('client_sessions')
              .select('visitor_email')
              .in('id', Array.from(activeSessionIds))
            
            if (favSessions) {
              favSessions.forEach(s => {
                if (s.visitor_email) recipients.add(s.visitor_email)
              })
            }
          }
        }

        // 3. Connect and Send Emails via SMTP
        if (recipients.size > 0) {
          await client.connectTLS(smtpConfig)

          for (const email of Array.from(recipients)) {
            console.log(`Sending SMTP expiry reminder to ${email} for collection ${collection.name}`)
            
            // Replace placeholders in subject and body
            let subject = collection.expiry_email_subject || 'Your gallery is expiring soon!'
            let body = collection.expiry_email_body || ''
            
            const replacements = {
              '{collection.name}': collection.name,
              '{expiry.date}': expiryDate.toLocaleDateString(),
              '{days.prior}': `${daysBefore} day${daysBefore > 1 ? 's' : ''}`,
              '{collection.url}': `${Deno.env.get('PUBLIC_SITE_URL')}/gallery/${collection.slug}`
            }

            Object.entries(replacements).forEach(([key, value]) => {
              subject = subject.replace(new RegExp(key, 'g'), value)
              body = body.replace(new RegExp(key, 'g'), value)
            })

            await client.send({
              from: smtpConfig.username,
              to: email,
              subject: subject,
              content: body,
            })
          }

          await client.close()
        }

        // 4. Update collection to mark as sent
        await supabaseAdmin
          .from('collections')
          .update({ last_expiry_email_sent_at: new Date().toISOString() })
          .eq('id', collection.id)
        
        results.push({ collectionId: collection.id, recipients: Array.from(recipients) })
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('SMTP Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
