
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function enableCheckin() {
    console.log('Searching for "Orbit test" (using full_name)...')

    // Search using full_name
    const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .ilike('full_name', '%Orbit test%')

    const target = clients?.[0]

    if (target) {
        console.log(`✅ Found client: ${target.full_name} (ID: ${target.id})`)

        // Hardcode a past date to ensure check-in is due
        const pastDate = '2026-01-25'

        console.log(`Setting next_checkin_date to ${pastDate} (Yesterday) to force enable...`)
        const { error: updateError } = await supabase
            .from('clients')
            .update({ next_checkin_date: pastDate })
            .eq('id', target.id)

        if (!updateError) {
            console.log(`✅ Successfully updated check-in date. Button should be visible now.`)
        } else {
            console.error('Update failed:', updateError)
        }
    } else {
        console.log('❌ Client "Orbit test" not found.')
    }
}

enableCheckin()
