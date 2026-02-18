'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCoachOnboardingStatus } from '@/actions/onboarding-status'

export interface CoachOnboardingState {
    /** Si el modal wizard ya fue completado/cerrado */
    modalCompleted: boolean
    /** Tareas del checklist */
    tasks: {
        clientInvited: boolean
        workoutCreated: boolean
        recipeCreated: boolean
        paymentsReviewed: boolean
    }
}

const STORAGE_KEY = 'orbit-coach-onboarding'

const DEFAULT_STATE: CoachOnboardingState = {
    modalCompleted: false,
    tasks: {
        clientInvited: false,
        workoutCreated: false,
        recipeCreated: false,
        paymentsReviewed: false,
    },
}

function getStoredState(): CoachOnboardingState {
    if (typeof window === 'undefined') return DEFAULT_STATE
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored) as CoachOnboardingState
        }
    } catch {
        // Si hay error de parsing, retornar default
    }
    return DEFAULT_STATE
}

export function useCoachOnboarding() {
    const [state, setState] = useState<CoachOnboardingState>(DEFAULT_STATE)
    const [isLoaded, setIsLoaded] = useState(false)

    // Cargar del localStorage y verificar estado del servidor
    useEffect(() => {
        const initialize = async () => {
            const localState = getStoredState()

            // Si ya completó el modal localmente, usamos ese estado inmediatamente
            if (localState.modalCompleted) {
                setState(localState)
                setIsLoaded(true)

                // Aún así, podemos sincronizar tareas en background por si completó alguna en otro lado
                try {
                    const status = await getCoachOnboardingStatus()
                    let hasChanges = false
                    const newState = { ...localState }

                    if (status.hasClients && !newState.tasks.clientInvited) {
                        newState.tasks.clientInvited = true
                        hasChanges = true
                    }
                    if (status.hasWorkouts && !newState.tasks.workoutCreated) {
                        newState.tasks.workoutCreated = true
                        hasChanges = true
                    }
                    if (status.hasRecipes && !newState.tasks.recipeCreated) {
                        newState.tasks.recipeCreated = true
                        hasChanges = true
                    }

                    if (hasChanges) {
                        setState(newState)
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
                    }
                } catch (e) {
                    console.error("Error syncing background onboarding status", e)
                }
                return
            }

            // Si no está completado localmente, verificamos con el servidor para evitar mostrarlo a usuarios viejos
            try {
                const status = await getCoachOnboardingStatus()
                const newState = { ...localState }
                let hasChanges = false

                // Actualizar tareas basadas en datos reales
                if (status.hasClients) {
                    newState.tasks.clientInvited = true
                    // Si ya tiene clientes, asumimos que es un usuario activo y completamos todo el onboarding
                    // para evitar que le aparezca el checklist o el modal
                    newState.tasks.workoutCreated = true
                    newState.tasks.recipeCreated = true
                    newState.tasks.paymentsReviewed = true
                    newState.modalCompleted = true
                    hasChanges = true
                } else {
                    // Si no tiene clientes, verificamos los otros estados individualmente
                    if (status.hasWorkouts) {
                        newState.tasks.workoutCreated = true
                        hasChanges = true
                    }
                    if (status.hasRecipes) {
                        newState.tasks.recipeCreated = true
                        hasChanges = true
                    }

                    // Si tiene alguna actividad pero no clientes, marcamos el modal como visto pero dejamos el checklist
                    if (status.hasWorkouts || status.hasRecipes) {
                        newState.modalCompleted = true
                        hasChanges = true
                    }
                }

                if (hasChanges) {
                    setState(newState)
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
                } else {
                    setState(localState)
                }
            } catch (error) {
                console.error("Error checking onboarding status:", error)
                setState(localState)
            } finally {
                setIsLoaded(true)
            }
        }

        initialize()
    }, [])

    // Persistir cambios
    const persistState = useCallback((newState: CoachOnboardingState) => {
        setState(newState)
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
        } catch {
            // Silenciar errores de storage
        }
    }, [])

    /** Marcar el modal como completado */
    const completeModal = useCallback(() => {
        persistState({ ...state, modalCompleted: true })
    }, [state, persistState])

    /** Marcar una tarea como completada */
    const completeTask = useCallback(
        (task: keyof CoachOnboardingState['tasks']) => {
            persistState({
                ...state,
                tasks: { ...state.tasks, [task]: true },
            })
        },
        [state, persistState]
    )

    /** Verificar si todas las tareas están completas */
    const allTasksComplete = Object.values(state.tasks).every(Boolean)

    /** Verificar si se debe mostrar el modal */
    const shouldShowModal = isLoaded && !state.modalCompleted

    /** Verificar si se debe mostrar el checklist */
    const shouldShowChecklist = isLoaded && state.modalCompleted && !allTasksComplete

    return {
        state,
        isLoaded,
        shouldShowModal,
        shouldShowChecklist,
        allTasksComplete,
        completeModal,
        completeTask,
    }
}
