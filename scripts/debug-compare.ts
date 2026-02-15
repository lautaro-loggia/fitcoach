
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testCheckins() {
    const { data, error } = await supabase.from('checkins').select('*').limit(1)
    if (error) {
        console.error('Checkins error:', error)
    } else {
        console.log('Checkins OK:', data)
    }

    // Try workout_logs again but with different casing? Or just to be sure.
    const { data: logs, error: logsError } = await supabase.from('workout_logs').select('*').limit(1)
    if (logsError) {
        console.error('Workout Logs error:', logsError)
    } else {
        console.log('Workout Logs OK:', logs)
    }
}

testCheckins()
