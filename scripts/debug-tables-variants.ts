
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkBothTables() {
    console.log('Searching for client "Lautaro"...')
    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .ilike('full_name', '%Lautaro%')
        .limit(1)

    const client = clients?.[0]
    if (!client) {
        console.error('Client not found')
        return
    }

    // Check workout_logs
    const { count: c1, error: e1 } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)

    console.log(`workout_logs count: ${c1}, error: ${e1?.message}`)

    // Check workouts_log
    const { count: c2, error: e2 } = await supabase
        .from('workouts_log') // Singular/Typo
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)

    console.log(`workouts_log count: ${c2}, error: ${e2?.message}`)

    // Check logs
    const { count: c3, error: e3 } = await supabase
        .from('logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)

    console.log(`logs count: ${c3}, error: ${e3?.message}`)
}
checkBothTables()
