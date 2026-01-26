
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixGender() {
    console.log('Updating gender for Orbit Test...')

    // Check if client exists
    const { data: clients, error: searchError } = await supabase
        .from('clients')
        .select('*')
        .eq('email', 'contacto.orbit.coach@gmail.com')

    if (searchError) {
        console.error('Error searching client:', searchError)
        return
    }

    if (!clients || clients.length === 0) {
        console.error('Client orbit test not found by email')
        return
    }

    const client = clients[0]
    console.log(`Found client: ${client.full_name} (${client.id}). Current gender: ${client.gender}`)

    // Update
    const { error: updateError } = await supabase
        .from('clients')
        .update({ gender: 'male' })
        .eq('id', client.id)

    if (updateError) {
        console.error('Error updating gender:', updateError)
    } else {
        console.log('Successfully updated gender to male')
    }
}

fixGender()
