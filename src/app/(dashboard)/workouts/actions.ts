'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function searchExercises(query: string = '', limit: number = 50, offset: number = 0) {
    const supabase = await createClient()

    try {
        const normalize = (str: string) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : ""
        const mapExercise = (ex: any) => {
            const isCardio =
                normalize(ex.muscle_group).includes('cardio') ||
                normalize(ex.target).includes('cardio') ||
                normalize(ex.target).includes('cardiovascular')

            return {
                id: ex.id,
                name: ex.name,
                english_name: ex.english_name,
                main_muscle_group: ex.muscle_group,
                category: isCardio ? 'Cardio' : ex.target,
                equipment: ex.equipment,
                gif_url: ex.gif_url,
                instructions: ex.instructions || []
            }
        }
        const trimmedQuery = query.trim()

        let dbQuery = supabase
            .from('exercises_v2')
            .select('*')

        // Filtro en DB cuando hay query (reduce transferencia)
        if (trimmedQuery.length > 0) {
            const safeQuery = trimmedQuery.replace(/,/g, ' ')
            dbQuery = dbQuery.or(
                `name.ilike.%${safeQuery}%,english_name.ilike.%${safeQuery}%,muscle_group.ilike.%${safeQuery}%,target.ilike.%${safeQuery}%,equipment.ilike.%${safeQuery}%`
            )
        }

        const { data, error } = await dbQuery

        if (error) {
            console.error('Error fetching exercises from DB:', error)
            return { exercises: [] }
        }

        let exercises = (data || []).map(mapExercise)

        // Fallback fuzzy (acentos, grupo muscular) si el filtro DB no dio resultados
        if (trimmedQuery.length > 0 && exercises.length === 0) {
            const { data: allData } = await supabase.from('exercises_v2').select('*')
            const normalizedQuery = normalize(trimmedQuery)

            exercises = (allData || []).map(mapExercise).filter(ex =>
                normalize(ex.name).includes(normalizedQuery) ||
                normalize(ex.english_name).includes(normalizedQuery) ||
                normalize(ex.main_muscle_group).includes(normalizedQuery) ||
                normalize(ex.equipment).includes(normalizedQuery) ||
                (ex.category && normalize(ex.category).includes(normalizedQuery))
            )
        }

        const paginatedExercises = exercises.slice(offset, offset + limit)

        return { exercises: paginatedExercises }

    } catch (error) {
        console.error('Unexpected error searching exercises from DB:', error)
        return { exercises: [] }
    }
}

function mappingTitleCase(str: string) {
    if (!str) return ''
    return str.split(/[\s-]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
}

export async function createWorkoutAction(data: {
    name: string
    description?: string
    exercises: any[]
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    if (!data.name?.trim()) {
        return { error: 'El nombre es requerido' }
    }

    const { error } = await supabase.from('workouts').insert({
        trainer_id: user.id,
        name: data.name.trim(),
        description: data.description || null,
        structure: data.exercises,
    })

    if (error) {
        console.error('Error creating workout:', error)
        return { error: 'Error al crear la rutina' }
    }

    revalidatePath('/workouts')
    return { success: true }
}

export async function deleteWorkoutAction(workoutId: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)
        .eq('trainer_id', user.id)

    if (error) {
        console.error("Error deleting workout:", error)
        return { error: "Error al eliminar la rutina" }
    }

    revalidatePath('/workouts')
    return { success: true }
}

export async function updateWorkoutAction(id: string, name: string, description: string, exercises: any[]) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const { error } = await supabase.from('workouts').update({
        name,
        description,
        structure: exercises
    })
        .eq('id', id)
        .eq('trainer_id', user.id)

    if (error) return { error: "Error actualizando rutina" }
    revalidatePath('/workouts')
    return { success: true }
}

export async function assignWorkoutToClientsAction(
    templateId: string,
    clientIds: string[],
    name: string,
    structure: any[],
    schedules: Record<string, string[]> = {}
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autorizado" }

    const inserts = clientIds.map(clientId => ({
        trainer_id: user.id,
        client_id: clientId,
        name: name,
        origin_template_id: templateId,
        structure: structure,
        is_customized: false,
        scheduled_days: schedules[clientId] || []
    }))

    const { error } = await supabase.from('assigned_workouts').insert(inserts)

    if (error) {
        console.error("Error mass assigning workout:", error)
        return { error: "Error al asignar rutina" }
    }

    revalidatePath('/workouts')
    return { success: true }
}

export async function createExerciseAction(data: {
    name: string
    muscle_group: string
    video_url?: string
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    if (!data.name?.trim()) {
        return { error: 'El nombre es requerido' }
    }

    const { error } = await supabase.from('exercises_v2').insert({
        name: data.name.trim(),
        english_name: data.name.trim(), // Use same name for english
        muscle_group: data.muscle_group,
        gif_url: data.video_url || null,
        target: null,
        equipment: null,
        instructions: [],
    })

    if (error) {
        console.error('Error creating exercise:', error)
        return { error: 'Error al crear el ejercicio' }
    }

    revalidatePath('/workouts')
    return { success: true }
}
