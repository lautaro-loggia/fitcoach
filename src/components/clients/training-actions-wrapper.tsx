'use client'

import { Button } from '@/components/ui/button'
import { PlusSignIcon, LayoutTopIcon } from 'hugeicons-react'
import { useRouter } from 'next/navigation'
import { AssignWorkoutDialog } from './assign-workout-dialog'

interface TrainingActionsWrapperProps {
    clientId: string
    clientName: string
}

export function TrainingActionsWrapper({ clientId, clientName }: TrainingActionsWrapperProps) {
    const router = useRouter()

    const handleRefresh = (open: boolean) => {
        if (!open) {
            window.dispatchEvent(new CustomEvent('refresh-workouts'))
        }
    }

    return (
        <div className="flex items-center gap-3">
            <Button
                variant="outline"
                size="sm"
                className="h-10 px-4 rounded-xl border-gray-200 bg-white text-gray-900 font-bold text-xs gap-2 shadow-sm"
                onClick={() => router.push(`/clients/${clientId}?tab=profile`)}
            >
                <LayoutTopIcon className="h-4 w-4" /> Reporte de progreso
            </Button>

            <AssignWorkoutDialog
                clientId={clientId}
                clientName={clientName}
                onOpenChange={handleRefresh}
                trigger={
                    <Button size="sm" className="bg-black hover:bg-black/90 text-white h-10 px-5 rounded-xl font-bold text-xs gap-2 shadow-sm">
                        <PlusSignIcon className="h-4 w-4" /> Nueva rutina
                    </Button>
                }
            />
        </div>
    )
}
