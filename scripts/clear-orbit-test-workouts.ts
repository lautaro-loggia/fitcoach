import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=')
        envVars[key] = value
    }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearWorkouts() {
    console.log('🔍 Searching for client "orbit test"...')

    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, full_name')
        .ilike('full_name', '%orbit test%')

    if (clientError) {
        console.error('Error fetching client:', clientError)
        return
    }

    if (!clients || clients.length === 0) {
        console.error('❌ Client "orbit test" not found.')
        return
    }

    const client = clients[0]
    console.log(`✅ Found client: ${client.full_name} (${client.id})`)

    console.log('🗑️  Deleting workout sessions...')

    const { error: deleteError } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('client_id', client.id)

    if (deleteError) {
        console.error('❌ Error deleting sessions:', deleteError)
    } else {
        console.log('✅ Successfully deleted all workout sessions for "orbit test".')
    }
}

clearWorkouts().catch(console.error)
