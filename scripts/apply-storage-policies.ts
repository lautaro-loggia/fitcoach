
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: '.env.local' })

async function applyStoragePolicies() {
    console.log("Applying storage policies...")
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
        console.error("DATABASE_URL not found in .env.local. Cannot apply policies automatically.")
        console.log("Please run the SQL in 'supabase/migrations/add_storage_policies.sql' manually in your Supabase Dashboard.")
        process.exit(1)
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    })

    try {
        await client.connect()
        console.log("Connected to database.")

        const migrationPath = path.join(process.cwd(), 'supabase/migrations/add_storage_policies.sql')
        if (!fs.existsSync(migrationPath)) {
            console.error("Migration file not found:", migrationPath)
            return
        }

        const migrationSql = fs.readFileSync(migrationPath, 'utf8')
        await client.query(migrationSql)
        console.log("Storage policies applied successfully!")

    } catch (err) {
        console.error("Error applying storage policies:", err)
    } finally {
        await client.end()
    }
}

applyStoragePolicies()
