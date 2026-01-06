// Script para verificar datos de ejercicios
// Ejecutar con: npx tsx scripts/check-exercises.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkExercises() {
    console.log('📊 Verificando ejercicios en la base de datos...\n')

    // Get all exercises
    const { data: allExercises, error: allError } = await supabase
        .from('exercises')
        .select('id, name, main_muscle_group, category')
        .order('name')

    if (allError) {
        console.error('Error fetching exercises:', allError)
        return
    }

    console.log(`Total ejercicios: ${allExercises?.length || 0}\n`)

    // Group by main_muscle_group
    const groupedByMuscle: Record<string, number> = {}
    const withoutMuscleGroup: any[] = []

    allExercises?.forEach(ex => {
        if (ex.main_muscle_group) {
            groupedByMuscle[ex.main_muscle_group] = (groupedByMuscle[ex.main_muscle_group] || 0) + 1
        } else {
            withoutMuscleGroup.push(ex)
        }
    })

    console.log('📋 Ejercicios por grupo muscular:')
    console.log('─'.repeat(40))
    Object.entries(groupedByMuscle)
        .sort((a, b) => b[1] - a[1])
        .forEach(([group, count]) => {
            console.log(`  ${group}: ${count}`)
        })

    console.log('\n')

    if (withoutMuscleGroup.length > 0) {
        console.log(`⚠️  Ejercicios SIN grupo muscular asignado: ${withoutMuscleGroup.length}`)
        console.log('─'.repeat(40))
        withoutMuscleGroup.forEach(ex => {
            console.log(`  - ${ex.name}`)
        })
    } else {
        console.log('✅ Todos los ejercicios tienen grupo muscular asignado!')
    }
}

checkExercises().catch(console.error)
