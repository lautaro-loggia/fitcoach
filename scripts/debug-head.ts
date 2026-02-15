
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkHead() {
    const { count, error, status, statusText } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })

    console.log('Response:', { count, error, status, statusText })
}
checkHead()
