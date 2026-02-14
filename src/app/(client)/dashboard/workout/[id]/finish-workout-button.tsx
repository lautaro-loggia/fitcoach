'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { WorkoutFeedback } from '@/components/clients/open/workout-feedback-form'
import dynamic from 'next/dynamic'
import { completeSession, validateSessionCompletionStatus } from './actions'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

// Dynamic import for the feedback form to avoid hydration issues and improve loading
const WorkoutFeedbackForm = dynamic(() => import('@/components/clients/open/workout-feedback-form'), {
    ssr: false
})

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { createPortal } from 'react-dom'
import { useEffect } from 'react'

export function FinishWorkoutButton({ sessionId }: { sessionId: string }) {
    const [showFeedback, setShowFeedback] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [missingExercises, setMissingExercises] = useState<string[]>([])
    const [showWarning, setShowWarning] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleFinishClick = async (e: React.FormEvent) => {
        e.preventDefault()

        setIsSubmitting(true) // prevent double clicks while checking
        const validation = await validateSessionCompletionStatus(sessionId)
        setIsSubmitting(false)

        if (!validation.valid) {
            setMissingExercises(validation.missingExercises || [])
            setShowWarning(true)
            return
        }

        setShowFeedback(true)
    }

    const handleConfirmFinish = () => {
        setShowWarning(false)
        setShowFeedback(true)
    }

    const handleFinalSubmit = async (feedback: WorkoutFeedback) => {
        setIsSubmitting(true)
        try {
            const result = await completeSession(sessionId, feedback)

            if (result.error) {
                toast.error(result.error)
                return
            }

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })

            toast.success('¡Entrenamiento completado!')
            router.push('/dashboard')
            router.refresh()
        } catch (error) {
            toast.error('Error al completar el entrenamiento')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <Button
                onClick={handleFinishClick}
                variant="default"
                size="sm"
                className="gap-1 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"
            >
                <Check className="h-4 w-4" />
                Finalizar
            </Button>

            {showFeedback && mounted && createPortal(
                <div className="fixed inset-0 z-[9999] bg-white overflow-hidden">
                    <WorkoutFeedbackForm
                        onSubmit={handleFinalSubmit}
                        isSubmitting={isSubmitting}
                    />
                </div>,
                document.body
            )}

            {/* Warning Dialog for Pending Exercises */}
            <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Finalizar con ejercicios pendientes?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="text-sm text-muted-foreground">
                                Aún no has registrado series para los siguientes ejercicios:
                                <ul className="mt-3 space-y-1 list-disc list-inside text-amber-600 font-medium">
                                    {missingExercises.map((name, idx) => (
                                        <li key={idx}>{name}</li>
                                    ))}
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Continuar entrenando</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmFinish} className="bg-black hover:bg-gray-900 text-white">
                            Sí, finalizar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
