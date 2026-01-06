// Script para traducir "Core" a "Abdominales"
// Ejecutar con: npx tsx scripts/translate-core.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function translateCore() {
    console.log('🔄 Traduciendo "Core" a "Abdominales"...\n')

    // Get count of exercises with "Core"
    const { data: coreExercises, error: fetchError } = await supabase
        .from('exercises')
        .select('id, name, main_muscle_group')
        .eq('main_muscle_group', 'Core')

    if (fetchError) {
        console.error('Error fetching exercises:', fetchError)
        return
    }

    console.log(`Encontrados ${coreExercises?.length || 0} ejercicios con "Core":\n`)
    coreExercises?.forEach(ex => console.log(`  - ${ex.name}`))

    if (!coreExercises || coreExercises.length === 0) {
        console.log('\n⚠️ No hay ejercicios con "Core" para actualizar.')
        return
    }

    // Update to "Abdominales"
    const { error: updateError } = await supabase
        .from('exercises')
        .update({ main_muscle_group: 'Abdominales' })
        .eq('main_muscle_group', 'Core')

    if (updateError) {
        console.error('\n❌ Error updating exercises:', updateError)
        return
    }

    console.log(`\n✅ ${coreExercises.length} ejercicios actualizados de "Core" a "Abdominales"`)
}

translateCore().catch(console.error)
