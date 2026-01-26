
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function resetCheckins() {
    console.log('Resetting checkins for Orbit Test...')

    // 1. Get Client
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('email', 'contacto.orbit.coach@gmail.com')
        .single() // Expecting one

    if (clientError || !clients) {
        console.error('Client not found or error:', clientError)
        return
    }

    const clientId = clients.id
    console.log(`Found client: ${clients.full_name} (${clientId})`)

    // 2. Delete Checkins
    const { error: deleteError, count } = await supabase
        .from('checkins')
        .delete({ count: 'exact' })
        .eq('client_id', clientId)

    if (deleteError) {
        console.error('Error deleting checkins:', deleteError)
    } else {
        console.log(`Successfully deleted ${count} checkins. Account is ready for 1st check-in test.`)
    }
}

resetCheckins()
