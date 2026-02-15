
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testHeadError() {
    const { error } = await supabase.from('non_existent_table').select('*', { head: true })
    console.log('Error for non_existent_table with HEAD:', error)
}
testHeadError()
