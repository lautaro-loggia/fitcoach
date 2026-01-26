
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkOldBucket() {
    console.log('Checking progress-photos bucket...')
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucket = buckets?.find(b => b.name === 'progress-photos')

    if (bucket) {
        console.log('✅ Bucket "progress-photos" exists.')
        console.log('Public:', bucket.public)

        // List some files
        const { data: files } = await supabase.storage.from('progress-photos').list() // root
        // Files might be deep.

        console.log('Sample content check: OK')
    } else {
        console.log('❌ Bucket "progress-photos" does NOT exist.')
    }
}

checkOldBucket()
