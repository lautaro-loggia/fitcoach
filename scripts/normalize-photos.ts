
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function normalizePhotosStructure() {
    console.log('Normalizing photos structure...')

    const { data: checkins } = await supabase
        .from('checkins')
        .select('id, photos')
        .not('photos', 'is', null)

    if (!checkins) return

    let count = 0

    for (const checkin of checkins) {
        const photos = checkin.photos
        if (!Array.isArray(photos)) continue

        let changed = false
        const normalized = photos.map((p: any) => {
            // Case 1: Simple string URL
            if (typeof p === 'string') {
                changed = true
                return {
                    url: p,
                    type: 'other', // Default type for legacy photos
                    // Don't set path for old bucket `progress-photos` as we handle them as public URLs usually
                    // or we can't sign them with 'checkin-images' bucket logic anyway.
                }
            }
            // Case 2: Object but missing path? We handled that in previous script logic but failed because pattern mismatch.
            // We leave objects as is.
            return p
        })

        if (changed) {
            console.log(`Migrating checkin ${checkin.id}...`)
            const { error } = await supabase
                .from('checkins')
                .update({ photos: normalized })
                .eq('id', checkin.id)

            if (error) console.error('Error updating:', error)
            else count++
        }
    }

    console.log(`Normalized ${count} checkins.`)
}

normalizePhotosStructure()
