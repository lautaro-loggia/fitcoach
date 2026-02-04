
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

async function setupMealLogsStorage() {
    console.log('Checking storage buckets...')
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
        console.error('Error listing buckets:', error)
        return
    }

    const bucketName = 'meal-logs'
    const exists = buckets.find(b => b.name === bucketName)

    if (exists) {
        console.log(`✅ Bucket "${bucketName}" exists.`)
    } else {
        console.log(`❌ Bucket "${bucketName}" does NOT exist.`)

        console.log(`Creating bucket "${bucketName}"...`)
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: false // Debería ser privado, usamos signedUrls
        })

        if (createError) {
            console.error(`Error creating bucket "${bucketName}":`, createError)
        } else {
            console.log(`✅ Bucket "${bucketName}" created successfully.`)
        }
    }

    // Asegurar que las políticas básicas existan (esto es más complejo vía JS, 
    // pero al menos el bucket existirá)
}

setupMealLogsStorage()
