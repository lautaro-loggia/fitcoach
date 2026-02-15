
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testInsert() {
    console.log('Attempting insert into workout_logs...')

    // We need a valid client ID and workout ID.
    // Fetch from earlier finding.
    const { data: clients } = await supabase.from('clients').select('id').ilike('full_name', '%Lautaro%').limit(1)
    const clientId = clients?.[0]?.id
    if (!clientId) {
        console.error('No client')
        return
    }

    const { error } = await supabase.from('workout_logs').insert({
        client_id: clientId,
        date: '2026-01-01', // Past date
        exercises_log: []
    })

    if (error) {
        console.error('Insert failed:', error)
    } else {
        console.log('Insert SUCCESS!')
    }
}
testInsert()
