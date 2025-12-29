import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS for schema check if possible, or just anon if I want to test user access

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkSchema() {
    console.log("Checking 'clients' table schema...")

    // Fetch one client to inspect returned columns
    // We select * to see if allergens comes back
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .limit(1)

    if (error) {
        console.error("Error fetching clients:", error)
        return
    }

    if (!data || data.length === 0) {
        console.log("No clients found. Cannot verify columns by partial selection, but query succeeded.")
        // If query succeeded with *, it suggests table exists.
        // But if we want to confirm columns, might be harder if no data.
        // Let's try to insert a dummy with allergens if needed, or better, try to update a specific ID if we knew one.
    } else {
        const client = data[0]
        console.log("Columns found on client object:", Object.keys(client))

        if ('allergens' in client) {
            console.log("✅ 'allergens' column EXISTS.")
        } else {
            console.log("❌ 'allergens' column MISSING.")
        }

        if ('dietary_preference' in client) {
            console.log("✅ 'dietary_preference' column EXISTS.")
        } else {
            console.log("❌ 'dietary_preference' column MISSING.")
        }
    }
}

checkSchema()
