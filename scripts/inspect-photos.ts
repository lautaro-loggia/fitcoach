
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function inspectPhotos() {
    console.log('Inspecting photos...')
    const { data: checkins } = await supabase
        .from('checkins')
        .select('id, photos')
        .not('photos', 'is', null)
        .limit(3)

    if (checkins) {
        checkins.forEach(c => {
            console.log(`Checkin ${c.id}:`, JSON.stringify(c.photos, null, 2))
        })
    }
}

inspectPhotos()
