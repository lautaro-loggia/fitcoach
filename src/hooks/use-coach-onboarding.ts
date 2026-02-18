'use client'

import { useState, useEffect, useCallback } from 'react'

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

    // Cargar del localStorage al montar
    useEffect(() => {
        setState(getStoredState())
        setIsLoaded(true)
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
