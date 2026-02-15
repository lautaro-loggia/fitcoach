
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!key) {
    console.log('No key found')
} else {
    try {
        const parts = key.split('.')
        if (parts.length !== 3) {
            console.log('Not a valid JWT structure')
        } else {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
            console.log('Key Role:', payload.role)
            console.log('Key Iss:', payload.iss)
        }
    } catch (e) {
        console.error('Error decoding key:', e)
    }
}
