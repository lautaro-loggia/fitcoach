
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const FALLBACK_EXERCISES = [
    { id: '1', name: 'Sentadillas', muscle_group: 'Piernas', target: 'Fuerza', equipment: 'Barra', gif_url: 'https://media.giphy.com/media/l41YiO6Ygvbz7b0WY/giphy.gif', instructions: ['Baja la cadera', 'Mantén la espalda recta'] },
    { id: '2', name: 'Press de Banca', muscle_group: 'Pecho', target: 'Fuerza', equipment: 'Barra', gif_url: 'https://media.giphy.com/media/26Ffey6LzQ8q9f6IE/giphy.gif', instructions: ['Baja la barra al pecho', 'Empuja hacia arriba'] },
    { id: '3', name: 'Peso Muerto', muscle_group: 'Espalda/Piernas', target: 'Fuerza', equipment: 'Barra', gif_url: 'https://media.giphy.com/media/3o7TKsQ8g4L6a6E8yA/giphy.gif', instructions: ['Levanta la barra desde el suelo', 'Mantén la espalda neutra'] },
    { id: '4', name: 'Dominadas', muscle_group: 'Espalda', target: 'Fuerza', equipment: 'Barra fija', gif_url: 'https://media.giphy.com/media/l0HlPtbGpcnqa0fja/giphy.gif', instructions: ['Tracciona hasta que la barbilla pase la barra'] },
    { id: '5', name: 'Flexiones de brazos', muscle_group: 'Pecho', target: 'Fuerza', equipment: 'Peso corporal', gif_url: 'https://media.giphy.com/media/l0HlPtbGpcnqa0fja/giphy.gif', instructions: [] },
    { id: '6', name: 'Curl de Bíceps', muscle_group: 'Brazos', target: 'Fuerza', equipment: 'Mancuernas', gif_url: 'https://media.giphy.com/media/l0HlMh405JqlW6v5K/giphy.gif', instructions: [] },
    { id: '7', name: 'Caminata', muscle_group: 'Todo el cuerpo', target: 'Cardio', equipment: 'Ninguna', gif_url: '', instructions: [] },
    { id: '8', name: 'Trote', muscle_group: 'Todo el cuerpo', target: 'Cardio', equipment: 'Ninguna', gif_url: '', instructions: [] },
]

async function seedFallbacks() {
    console.log('Seeding fallback exercises...')

    // Convert to DB schema
    const rows = FALLBACK_EXERCISES.map(ex => ({
        id: `local_${ex.id}`,
        name: ex.name,
        english_name: ex.name,
        muscle_group: ex.muscle_group,
        target: ex.target,
        equipment: ex.equipment,
        gif_url: ex.gif_url,
        instructions: ex.instructions,
        created_at: new Date().toISOString()
    }))

    const { error } = await supabase
        .from('exercises_v2')
        .upsert(rows, { onConflict: 'id' })

    if (error) {
        console.error('Error seeding fallbacks:', error)
    } else {
        console.log(`Seeded ${rows.length} fallback exercises successfully.`)
    }
}

seedFallbacks()
