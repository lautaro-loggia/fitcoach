'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { WorkoutFeedback } from '@/components/clients/open/workout-feedback-form'
import dynamic from 'next/dynamic'
import { completeSession } from './actions'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

// Dynamic import for the feedback form to avoid hydration issues and improve loading
const WorkoutFeedbackForm = dynamic(() => import('@/components/clients/open/workout-feedback-form'), {
    ssr: false
})

export function FinishWorkoutButton({ sessionId }: { sessionId: string }) {
    const [showFeedback, setShowFeedback] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const handleFinishClick = (e: React.FormEvent) => {
        e.preventDefault()
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
            router.push('/dashboard/workout')
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

            {showFeedback && (
                <div className="fixed inset-0 z-[9999] bg-white">
                    <WorkoutFeedbackForm
                        onSubmit={handleFinalSubmit}
                        isSubmitting={isSubmitting}
                    />
                </div>
            )}
        </>
    )
}
