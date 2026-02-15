
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
console.log('Service Role:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')
console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
