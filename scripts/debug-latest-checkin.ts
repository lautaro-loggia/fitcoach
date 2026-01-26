
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugLastCheckin() {
    console.log('Debugging last checkin...')

    // Get last checkin
    const { data: checkins, error } = await supabase
        .from('checkins')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

    if (error || !checkins || checkins.length === 0) {
        console.error('No checkins found or error:', error)
        return
    }

    const checkin = checkins[0]
    console.log('Checkin ID:', checkin.id)
    console.log('Photos Data:', JSON.stringify(checkin.photos, null, 2))

    if (Array.isArray(checkin.photos) && checkin.photos.length > 0) {
        const photo = checkin.photos[0]
        const pathToCheck = photo.path || (photo.url ? photo.url.split('/checkin-images/')[1] : null)

        console.log(`Testing access for path: ${pathToCheck}`)

        if (!pathToCheck) {
            console.error('Could not determine path.')
            return
        }

        // List file to match
        const { data: listData, error: listError } = await supabase.storage
            .from('checkin-images')
            .list(pathToCheck.split('/')[0]) // List the user folder

        if (listError) {
            console.error('Error listing storage:', listError)
        } else {
            const found = listData.find(f => pathToCheck.endsWith(f.name))
            console.log('File found in storage list?', !!found)
            if (found) console.log('File details:', found)
        }

        // Try generate Signed URL via Admin
        const { data: signedData, error: signError } = await supabase.storage
            .from('checkin-images')
            .createSignedUrl(pathToCheck, 60)

        if (signError) {
            console.error('Admin Sign Error:', signError)
        } else {
            console.log('Admin Signed URL Generated:', signedData?.signedUrl)
        }
    }
}

debugLastCheckin()
