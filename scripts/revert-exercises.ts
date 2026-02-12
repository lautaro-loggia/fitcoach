
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables.')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function revertExercises() {
    console.log('Fetching original exercises...')

    // 1. Fetch data from the old table
    const { data: originalExercises, error: fetchError } = await supabase
        .from('exercises')
        .select('*')

    if (fetchError) {
        console.error('Error fetching original exercises:', fetchError)
        return
    }

    if (!originalExercises || originalExercises.length === 0) {
        console.warn('No exercises found in original table. Aborting to prevent data loss.')
        return
    }

    console.log(`Found ${originalExercises.length} original exercises.`)

    // 2. Truncate the new table (delete all rows)
    console.log('Truncating exercises_v2...')
    const { error: truncateError } = await supabase
        .from('exercises_v2')
        .delete()
        .neq('id', 'placeholder') // Delete all not equal to a dummy value (effectively all)

    if (truncateError) {
        console.error('Error truncating exercises_v2:', truncateError)
        return
    }

    // 3. Map and Insert into exercises_v2
    const mappedExercises = originalExercises.map(ex => ({
        id: ex.id.toString(), // Ensure ID is string if it was int
        name: ex.name,
        english_name: ex.name, // Fallback
        muscle_group: ex.main_muscle_group, // Map to main_muscle_group
        // Map other fields as best as possible or leave null/default
        target: null,
        equipment: null,
        gif_url: ex.video_url, // Map video_url to gif_url
        instructions: [], // Empty instructions
        created_at: ex.created_at || new Date().toISOString()
    }))

    console.log('Inserting original exercises into exercises_v2...')
    const { error: insertError } = await supabase
        .from('exercises_v2')
        .upsert(mappedExercises)

    if (insertError) {
        console.error('Error inserting exercises:', insertError)
    } else {
        console.log('Successfully reverted exercises database!')
    }
}

revertExercises()
