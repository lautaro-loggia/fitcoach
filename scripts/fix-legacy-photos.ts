
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixLegacyPhotos() {
    console.log('Fixing legacy photos path...')

    // Get all checkins with photos
    const { data: checkins, error } = await supabase
        .from('checkins')
        .select('id, photos')
        .not('photos', 'is', null)

    if (error) {
        console.error('Error fetching checkins:', error)
        return
    }

    console.log(`Found ${checkins.length} checkins to verify.`)

    let updatedCount = 0

    for (const checkin of checkins) {
        const photos = checkin.photos
        if (!Array.isArray(photos) || photos.length === 0) continue

        let needsUpdate = false
        const updatedPhotos = photos.map((p: any) => {
            // Fix 1: Missing Path
            if (!p.path && p.url && p.url.includes('/checkin-images/')) {
                const derivedPath = p.url.split('/checkin-images/')[1]
                if (derivedPath) {
                    p.path = derivedPath
                    needsUpdate = true
                }
            }

            // Fix 2: Default "other" types if generic
            // Optional: We can map logic here if we wanted, but risk of error is high.
            // We only fix the path to ensure visibility.

            return p
        })

        if (needsUpdate) {
            const { error: updateError } = await supabase
                .from('checkins')
                .update({ photos: updatedPhotos })
                .eq('id', checkin.id)

            if (updateError) {
                console.error(`Failed to update checkin ${checkin.id}:`, updateError)
            } else {
                updatedCount++
            }
        }
    }

    console.log(`Fixed photos for ${updatedCount} checkins.`)
}

fixLegacyPhotos()
