import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function applyMigration() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        console.error("DATABASE_URL not found in .env.local")
        process.exit(1)
    }

    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false // Often required for Supabase direct connections
        }
    })

    try {
        await client.connect()
        console.log("Connected to database.")

        const migrationPath = path.join(process.cwd(), 'supabase/migrations/add_client_allergens.sql')
        const migrationSql = fs.readFileSync(migrationPath, 'utf8')

        console.log("Applying migration:", migrationPath)
        await client.query(migrationSql)
        console.log("Migration applied successfully!")

    } catch (err) {
        console.error("Error applying migration:", err)
    } finally {
        await client.end()
    }
}

applyMigration()
