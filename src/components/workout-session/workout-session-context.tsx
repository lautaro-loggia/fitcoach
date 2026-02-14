'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface WorkoutSessionContextType {
    completedExercises: Set<number>
    totalExercisesCount: number
    setExerciseCompleted: (index: number, completed: boolean) => void
    setTotalExercisesCount: (count: number) => void
    isAllCompleted: boolean
}

const WorkoutSessionContext = createContext<WorkoutSessionContextType | undefined>(undefined)

export function WorkoutSessionProvider({
    children,
    initialCompletedIndices = [],
    initialTotalCount = 0
}: {
    children: React.ReactNode,
    initialCompletedIndices?: number[],
    initialTotalCount?: number
}) {
    const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set(initialCompletedIndices))
    const [totalExercisesCount, setTotalExercisesCount] = useState(initialTotalCount)

    const setExerciseCompleted = useCallback((index: number, completed: boolean) => {
        setCompletedExercises(prev => {
            const newSet = new Set(prev)
            if (completed) {
                newSet.add(index)
            } else {
                newSet.delete(index)
            }
            return newSet
        })
    }, [])

    const isAllCompleted = totalExercisesCount > 0 && Array.from({ length: totalExercisesCount }).every((_, i) => completedExercises.has(i))

    return (
        <WorkoutSessionContext.Provider value={{
            completedExercises,
            totalExercisesCount,
            setExerciseCompleted,
            setTotalExercisesCount,
            isAllCompleted
        }}>
            {children}
        </WorkoutSessionContext.Provider>
    )
}

export function useWorkoutSession() {
    const context = useContext(WorkoutSessionContext)
    if (context === undefined) {
        throw new Error('useWorkoutSession must be used within a WorkoutSessionProvider')
    }
    return context
}
