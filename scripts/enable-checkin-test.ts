
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
        .ilike('full_name', '%Order Test%') // Let's try broad

    // Let's just list all to be sure if filter fails
    const { data: allClients } = await supabase.from('clients').select('id, full_name, email')

    const target = allClients?.find(c =>
        (c.full_name && c.full_name.toLowerCase().includes('orbit') && c.full_name.toLowerCase().includes('test'))
    )

    if (target) {
        console.log(`✅ Found client: ${target.full_name} (ID: ${target.id})`)
        const today = new Date().toISOString().split('T')[0]

        console.log(`Setting next_checkin_date to ${today}...`)
        const { error: updateError } = await supabase
            .from('clients')
            .update({ next_checkin_date: today })
            .eq('id', target.id)

        if (!updateError) {
            console.log(`✅ Successfully updated check-in date. Check-in should now be available in dashboard.`)
        } else {
            console.error('Update failed:', updateError)
        }
    } else {
        console.log('❌ Client "Orbit test" not found in list:')
        allClients?.forEach(c => console.log(` - ${c.full_name} (${c.email})`))
    }
}

enableCheckin()
