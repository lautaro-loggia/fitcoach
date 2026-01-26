
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSchema() {
    console.log('Checking checkins table structure...')

    // We can't easily desc table via JS client without SQL function usually.
    // But we can try to insert a dummy row to see what error we get, or delete it immediately.
    // Better: insert a dummy valid row and see if it works.

    const dummyData = {
        client_id: 'fd7cfe9d-d5a6-4873-af71-09d0cebc91de', // orbit test id from previous logs
        trainer_id: '30495861-8f55-46aa-a90a-6e5ce679589d', // need a trainer id... 
        // We can fetch the client to get trainer_id
        weight: 70,
        date: new Date().toISOString().split('T')[0],
        observations: 'Debug test'
    }

    // First get client to be sure
    const { data: client } = await supabase.from('clients').select('*').eq('id', dummyData.client_id).single()
    if (!client) {
        console.error('Client not found')
        return
    }

    console.log('Client found. Trainer:', client.trainer_id)
    dummyData.trainer_id = client.trainer_id

    // Try insert
    const { data, error } = await supabase.from('checkins').insert(dummyData).select()

    if (error) {
        console.error('Insert Error:', error)
    } else {
        console.log('Insert Successful:', data)
        // Cleanup
        await supabase.from('checkins').delete().eq('id', data[0].id)
        console.log('Cleaned up test row')
    }
}

checkSchema()
