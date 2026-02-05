import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

async function runMigration() {
    // 1. Load env vars
    const envPath = path.join(process.cwd(), '.env.local')

    if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath))
        for (const k in envConfig) {
            process.env[k] = envConfig[k]
        }
    }

    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL

    if (!connectionString) {
        console.error('❌ No DATABASE_URL found in .env.local. Cannot run migration directly.')
        // Fallback: Print instructions
        console.log('\nPlease run the following SQL in your Supabase SQL Editor:')
        console.log(`
        ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb;
        `)
        process.exit(1)
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase usually
    })

    try {
        await client.connect()
        console.log('🔌 Connected to database')

        console.log('🔄 Applying migrations...')

        await client.query(`ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb;`)
        console.log('   ✅ Added feedback to workout_logs')

        await client.query(`ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb;`)
        console.log('   ✅ Added feedback to workout_sessions')

    } catch (err: any) {
        console.error('❌ Migration failed:', err.message)
    } finally {
        await client.end()
    }
}

runMigration().catch(console.error)
