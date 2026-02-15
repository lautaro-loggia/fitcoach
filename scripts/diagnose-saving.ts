
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkNow() {
    console.log('--- DIAGNOSIS START ---')

    // 1. Find Client
    const { data: clients } = await supabase.from('clients').select('id, full_name').ilike('full_name', '%Lautaro%').limit(1)
    const client = clients?.[0]
    if (!client) { console.log('Client not found'); return }
    console.log(`Client: ${client.full_name} (${client.id})`)

    // 2. Check Logs Table Existence & Count
    const { count, error: tableError } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true })
    if (tableError) {
        console.error('CRITICAL: workout_logs table error:', tableError.message)
    } else {
        console.log(`workout_logs table seems accessible. Total rows: ${count}`)
    }

    // 3. Fetch Logs for this Client (Any date)
    const { data: logs } = await supabase
        .from('workout_logs')
        .select('id, date, created_at, workout_id')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })

    console.log(`Logs found for client: ${logs?.length || 0}`)
    if (logs && logs.length > 0) {
        logs.forEach(l => console.log(` - Log: Date=${l.date}, Created=${l.created_at}, WID=${l.workout_id}`))
    }

    // 4. Check Today's Workout ID
    const { data: workouts } = await supabase.from('assigned_workouts').select('*').eq('client_id', client.id)
    const todayName = new Date().toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase() // might depend on machine locale
    // Better to list all schedules
    console.log('Assigned Workouts:')
    workouts?.forEach(w => {
        console.log(` - ${w.name} (${w.id}) Days: ${JSON.stringify(w.scheduled_days)}`)
    })

    console.log('--- DIAGNOSIS END ---')
}

checkNow()
