
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkCounts() {
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
    console.log(`Client: ${client.full_name} (${client.id})`)

    // Date
    const date = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    console.log('Today:', todayStr)

    // Check 1: Any logs for client?
    const { count: totalLogs, error: e1 } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)

    if (e1) console.error('E1:', e1)
    else console.log('Total Logs for Client:', totalLogs)

    // Check 2: Logs for TODAY?
    const { count: todayLogs, error: e2 } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('date', todayStr)

    if (e2) console.error('E2:', e2)
    else console.log('Today Logs for Client:', todayLogs)

    // Check 3: Logs for TODAY + Workout?
    // We need to find the workout ID first. Matches "Espalda y Biceps"?
    // Or just query assigned_workouts.

    // Get assigned workouts
    const { data: workouts } = await supabase
        .from('assigned_workouts')
        .select('*')
        .eq('client_id', client.id)

    if (workouts) {
        console.log(`Found ${workouts.length} assigned workouts.`)
        for (const w of workouts) {
            const { count: wLogs } = await supabase
                .from('workout_logs')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', client.id)
                .eq('workout_id', w.id)
                .eq('date', todayStr)

            console.log(`- Workout "${w.name}" (ID: ${w.id}): ${wLogs} logs today`)
        }
    }
}
checkCounts()
