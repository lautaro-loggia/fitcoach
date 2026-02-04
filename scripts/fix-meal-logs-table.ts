
import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env.local')
    process.exit(1)
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
})

async function fixMealLogsTable() {
    try {
        await client.connect()
        console.log('Connected to database.')

        console.log('Ensuring meal_logs table exists...')

        // Create table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.meal_logs (
                id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
                image_path text NOT NULL,
                meal_type text,
                status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
                coach_comment text,
                created_at timestamp with time zone NOT NULL DEFAULT now()
            );
        `)
        console.log('✅ Table public.meal_logs ensured.')

        // Enable RLS
        await client.query(`ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;`).catch(() => { });

        // Basic policies (matching what was in migrations)
        console.log('Applying RLS policies...')
        await client.query(`
            DROP POLICY IF EXISTS "Clients can view own meal logs" ON public.meal_logs;
            CREATE POLICY "Clients can view own meal logs"
                ON public.meal_logs FOR SELECT
                USING (auth.uid() IN (
                    SELECT user_id FROM public.clients WHERE id = meal_logs.client_id
                ));

            DROP POLICY IF EXISTS "Clients can insert own meal logs" ON public.meal_logs;
            CREATE POLICY "Clients can insert own meal logs"
                ON public.meal_logs FOR INSERT
                WITH CHECK (auth.uid() IN (
                    SELECT user_id FROM public.clients WHERE id = meal_logs.client_id
                ));

            DROP POLICY IF EXISTS "Trainers can view their clients' meal logs" ON public.meal_logs;
            CREATE POLICY "Trainers can view their clients' meal logs"
                ON public.meal_logs FOR SELECT
                USING (auth.uid() IN (
                    SELECT user_id FROM public.profiles
                    JOIN public.clients ON clients.trainer_id = profiles.id
                    WHERE clients.id = meal_logs.client_id
                ));
        `)
        console.log('✅ RLS policies applied.')

        // Force a schema reload by doing a dummy comment or notify
        // (PostgREST usually picks up DDL changes, but sometimes a small push helps)
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('✅ Schema reload notified.')

    } catch (err) {
        console.error('Error fixing table:', err)
    } finally {
        await client.end()
    }
}

fixMealLogsTable()
