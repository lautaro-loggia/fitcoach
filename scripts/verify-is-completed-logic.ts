
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mock utils
function getARTDate() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
}

async function debugLogic() {
    console.log('--- LOGIC DEBUG START ---')

    const { data: clients } = await supabase.from('clients').select('id, full_name').ilike('full_name', '%Lautaro%').limit(1)
    const client = clients?.[0]
    if (!client) return

    // 1. Calc Today
    const artNow = getARTDate()
    const todayName = format(artNow, 'EEEE', { locale: es }).toLowerCase()

    console.log('ART Now:', artNow.toISOString())
    console.log('Today Name:', todayName)

    // 2. Find Workout
    const { data: workouts } = await supabase
        .from('assigned_workouts')
        .select('*')
        .eq('client_id', client.id)

    const todayWorkout = workouts?.find(w =>
        w.scheduled_days?.map((d: any) => d.toLowerCase()).includes(todayName)
    )

    if (!todayWorkout) {
        console.log('No workout found for today')
    } else {
        console.log(`Found Workout: ${todayWorkout.name} (${todayWorkout.id})`)
    }

    // 3. Check Logs logic
    if (todayWorkout) {
        const startOfDay = new Date(artNow)
        startOfDay.setHours(0, 0, 0, 0)
        console.log('Start of Day (Query):', startOfDay.toISOString())

        const { data: logs, count, error } = await supabase
            .from('workout_logs')
            .select('*', { count: 'exact' })
            .eq('client_id', client.id)
            .eq('workout_id', todayWorkout.id)
            .gte('created_at', startOfDay.toISOString())

        console.log('Query Result:', { count, error })
        console.log('Logs found:', logs)

        // Try date exact match
        const todayStr = artNow.toISOString().split('T')[0] // simplified
        console.log('Trying date match:', todayStr)
        const { count: c2 } = await supabase
            .from('workout_logs')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .eq('workout_id', todayWorkout.id)
            .eq('date', todayStr)

        console.log('Date Match Count:', c2)
    }

    console.log('--- LOGIC DEBUG END ---')
}

debugLogic()
