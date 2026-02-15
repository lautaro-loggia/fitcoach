
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testInsert() {
    const clientId = '06aa2e58-d57b-4fd1-9588-ed51aaa8d2b6'
    const workoutId = 'c12e9788-484d-4c54-9fc2-c47f0669e739' // Espalda y Biceps

    console.log('Attempting to insert log for:', { clientId, workoutId })

    const payload = {
        client_id: clientId,
        workout_id: workoutId,
        date: new Date().toISOString().split('T')[0],
        exercises_log: [{ id: 'test', name: 'Test Exercise', sets: [] }],
        feedback: { difficulty: 5, comment: 'Test from script' }
    }

    const { data, error } = await supabase
        .from('workout_logs')
        .insert(payload)
        .select()

    if (error) {
        console.error('INSERT FAILED:', error)
    } else {
        console.log('INSERT SUCCESS:', data)
    }
}

testInsert()
