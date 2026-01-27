
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

async function fixBucket() {
    console.log('Fixing "progress-photos" bucket settings...')

    const bucketName = 'progress-photos'

    // 1. Check if bucket exists
    const { data: bucket, error: getError } = await supabase.storage.getBucket(bucketName)

    if (getError) {
        if (getError.message.includes('not found')) {
            console.log(`Bucket ${bucketName} not found. Creating it...`)
            const { error: createError } = await supabase.storage.createBucket(bucketName, {
                public: true // Force public
            })
            if (createError) {
                console.error('Error creating bucket:', createError)
            } else {
                console.log(`✅ Bucket ${bucketName} created and set to public.`)
            }
        } else {
            console.error('Error getting bucket:', getError)
        }
    } else {
        console.log(`Bucket ${bucketName} found. Updating to public...`)
        // 2. Update to public
        const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
            public: true
        })

        if (updateError) {
            console.error('Error updating bucket:', updateError)
        } else {
            console.log(`✅ Bucket ${bucketName} is now PUBLIC.`)
        }
    }
}

fixBucket()
