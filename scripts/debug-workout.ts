
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Try loading .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugWorkout() {
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

    console.log(`Found client: ${client.full_name} (${client.id})`)

    // Get today's date in ART
    const today = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" });
    const dateObj = new Date(today);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    console.log(`Checking logs for date: ${todayStr} (Calculated from ART)`)

    const { data: logs, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('client_id', client.id)
        .order('date', { ascending: false })
        .limit(5)

    if (error) {
        console.error('Error fetching logs:', error)
        return
    }

    console.log('Recent logs found:', logs.length)
    logs.forEach(log => {
        console.log(`- ID: ${log.id}, Date: ${log.date}, WorkoutID: ${log.workout_id}`)
        if (log.date === todayStr) {
            console.log('  -> MATCH FOUND for today!')
        } else {
            console.log(`  -> No match. Log date "${log.date}" vs Today "${todayStr}"`)
        }
    })
}

debugWorkout()
