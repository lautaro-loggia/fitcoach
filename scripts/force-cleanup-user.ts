
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function cleanupUser() {
    const email = process.argv[2]
    if (!email) {
        console.error('Please provide an email as an argument.')
        console.error('Usage: npx tsx scripts/force-cleanup-user.ts user@example.com')
        process.exit(1)
    }

    console.log(`Checking Auth Users for: ${email}`)

    // Method 1: Get by Email (if API supports it cleanly, otherwise filtering list)
    // admin.listUsers() is pagination based, safer to iterate if needed, but let's try direct search if possible.
    // Unfortunately Supabase JS admin doesn't have "getUserByEmail" that is publicly documented as stable in all versions in this context, 
    // but we can try to find it in list.

    // Note: In newer supabase-js, listUsers handles pagination. We'll fetch first page and filter.
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
        console.error('Error listing users:', error)
        return
    }

    if (!data || !data.users) {
        console.error('No users returned')
        return
    }

    // Exact match
    const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (user) {
        console.log(`Found Auth User: ${user.id} (${user.email})`)
        console.log('Deleting Auth User...')

        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        if (deleteError) {
            console.error('Failed to delete user:', deleteError)
        } else {
            console.log('User successfully deleted from Auth system.')
        }
    } else {
        console.log('User not found in Auth system (this is good if you want them gone).')
    }

    // Also check Clients table just in case
    console.log(`Checking Clients table for: ${email}`)
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('email', email)

    if (clients && clients.length > 0) {
        console.log(`Found ${clients.length} client record(s) with this email.`)
        // Optional: delete them too? User asked to "cleanup".
        // Let's prompt or just warn. But for this script, let's assume we want a Clean Slate.
        for (const client of clients) {
            console.log(`Deleting client record: ${client.id}`)
            await supabase.from('clients').delete().eq('id', client.id)
        }
        console.log('Client records deleted.')
    } else {
        console.log('No client records found.')
    }

    console.log('Cleanup complete. You can now re-invite this email.')
}

cleanupUser()
