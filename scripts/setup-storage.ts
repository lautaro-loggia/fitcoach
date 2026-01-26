
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

async function checkStorage() {
    console.log('Checking storage buckets...')
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
        console.error('Error listing buckets:', error)
        return
    }

    const checkinBucket = buckets.find(b => b.name === 'checkin-images')
    if (checkinBucket) {
        console.log('✅ Bucket "checkin-images" exists.')
        console.log('Public:', checkinBucket.public)
    } else {
        console.log('❌ Bucket "checkin-images" does NOT exist.')

        console.log('Creating bucket...')
        const { data, error: createError } = await supabase.storage.createBucket('checkin-images', {
            public: true
        })

        if (createError) {
            console.error('Error creating bucket:', createError)
        } else {
            console.log('✅ Bucket "checkin-images" created successfully.')
        }
    }
}

checkStorage()
