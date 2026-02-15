
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debug() {
    // Check if table works
    const { data: tables, error: tableError } = await supabase.from('workout_logs').select('id').limit(1)
    if (tableError) {
        console.error('Table access error:', tableError)
        return
    }
    console.log('Table access OK')

    // Find client
    const { data: clients } = await supabase
        .from('clients')
        .select('id, full_name')
        .ilike('full_name', '%Lautaro%')
        .limit(1)

    const client = clients?.[0]
    if (!client) {
        console.log('Client not found')
        return
    }
    console.log(`Client found: ${client.full_name} (${client.id})`)

    // Fetch logs
    const { data: logs, error: logError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('client_id', client.id)
        .order('date', { ascending: false })

    if (logError) {
        console.error('Log error:', logError)
        return
    }

    console.log(`Found ${logs.length} logs for client.`)
    logs.forEach(l => console.log(`- ${l.date} (ID: ${l.id}, Workout: ${l.workout_id})`))
}

debug()
