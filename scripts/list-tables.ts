
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listTables() {
    const { data, error } = await supabase.from('pg_tables').select('*') // No, Supabase JS can't access pg_tables directly usually unless exposed.
    // Instead try standard RPC or look at what tables exist by trying to select from them?
    // Or just look at the codebase.

    // I can list a few common ones to check:
    const checks = ['workout_logs', 'workouts_log', 'logs', 'checkins']

    for (const table of checks) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true })
        if (!error) console.log(`Table exists: ${table}`)
        else console.log(`Table error: ${table}`, error.message)
    }
}
listTables()
