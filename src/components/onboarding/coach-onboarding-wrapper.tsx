'use client'

import { CoachOnboardingModal } from '@/components/onboarding/coach-onboarding-modal'
import { CoachSetupChecklist } from '@/components/onboarding/coach-setup-checklist'
import { useCoachOnboarding, type CoachOnboardingState } from '@/hooks/use-coach-onboarding'

export function CoachOnboardingWrapper() {
    const {
        state,
        shouldShowModal,
        shouldShowChecklist,
        completeModal,
        completeTask,
    } = useCoachOnboarding()

    const handleTaskAction = (action: string) => {
        completeTask(action as keyof CoachOnboardingState['tasks'])
    }

    return (
        <>
            {/* Modal wizard */}
            <CoachOnboardingModal
                open={shouldShowModal}
                onComplete={completeModal}
                onTaskAction={handleTaskAction}
            />

            {/* Checklist persistente en el dashboard */}
            {shouldShowChecklist && (
                <CoachSetupChecklist
                    tasks={state.tasks}
                    onCompleteTask={completeTask}
                />
            )}
        </>
    )
}
