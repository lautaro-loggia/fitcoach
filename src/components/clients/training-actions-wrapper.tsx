'use client'

import { Button } from '@/components/ui/button'
import { PlusSignIcon } from 'hugeicons-react'

import { AssignWorkoutDialog } from './assign-workout-dialog'

interface TrainingActionsWrapperProps {
    clientId: string
    clientName: string
}

export function TrainingActionsWrapper({ clientId, clientName }: TrainingActionsWrapperProps) {


    const handleRefresh = (open: boolean) => {
        if (!open) {
            window.dispatchEvent(new CustomEvent('refresh-workouts'))
        }
    }

    return (
        <div className="flex items-center gap-3">


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
