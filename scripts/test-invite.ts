
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables.')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.error('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log(`🔌 Connecting to Supabase at: ${supabaseUrl}`)

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function testInvite() {
    const testEmail = `test-invite-orbit-${Date.now()}@yopmail.com`
    console.log(`📧 Sending invite to: ${testEmail}`)

    try {
        const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(testEmail, {
            redirectTo: 'http://localhost:3000/auth/callback', // Localhost for test
            data: {
                full_name: 'Test Invite',
                role: 'client'
            }
        })

        if (error) {
            console.error('❌ Error sending invitation:')
            console.error(error)
        } else {
            console.log('✅ Invitation sent successfully!')
            console.log('User ID:', data.user.id)

            // Step 4 simulation: Upsert client
            // We need a trainer ID. Let's just pick the first user we find or use a placeholder if we assume FK is loose (it's likely strict).
            // Let's try to fetch a user to act as trainer.
            const { data: trainers } = await adminSupabase.from('clients').select('trainer_id').limit(1)
            // Or better, just list users
            const { data: { users } } = await adminSupabase.auth.admin.listUsers({ perPage: 1 })
            const trainerId = users?.[0]?.id || '00000000-0000-0000-0000-000000000000'
            console.log('Using Trainer ID:', trainerId)

            const { error: dbError } = await adminSupabase
                .from('clients')
                .insert({
                    trainer_id: trainerId,
                    email: testEmail,
                    full_name: 'Test Invite Local Manual',
                    onboarding_status: 'invited',
                    status: 'active',
                    user_id: data.user.id
                })

            if (dbError) {
                console.error('❌ DB Error inserting client:', dbError)
            } else {
                console.log('✅ Client DB record created successfully (Manual Insert)!')
            }
        }

    } catch (err) {
        console.error('🔥 Unexpected error:', err)
    }
}

testInvite()
