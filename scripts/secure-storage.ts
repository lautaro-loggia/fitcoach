
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function makeBucketPrivate() {
    console.log('Securing bucket "checkin-images"...')

    const { data, error } = await supabase.storage.updateBucket('checkin-images', {
        public: false,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
        fileSizeLimit: 5242880 // 5MB limit
    })

    if (error) {
        console.error('Error updating bucket:', error)
    } else {
        console.log('✅ Bucket is now PRIVATE.')
    }
}

makeBucketPrivate()
