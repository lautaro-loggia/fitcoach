
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkMealLogs() {
    console.log('Checking meal_logs table...')
    const { count, error } = await supabase.from('meal_logs').select('*', { count: 'exact', head: true })

    // Also try simple select without head to confirm existence via error
    const { error: error2 } = await supabase.from('meal_logs').select('id').limit(1)

    if (error2) {
        console.log('meal_logs SELECT Error:', error2)
    } else {
        console.log('meal_logs OK. Count:', count)
    }

    // Now check workout_logs again
    const { error: error3 } = await supabase.from('workout_logs').select('id').limit(1)
    if (error3) {
        console.log('workout_logs SELECT Error:', error3)
    } else {
        console.log('workout_logs OK')
    }
}
checkMealLogs()
