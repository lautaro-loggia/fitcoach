'use client'

import { useState } from 'react'
import { StepBinding } from './step-binding'
import { StepProfile } from './step-profile'
import { StepGoals } from './step-goals'
import { StepLifestyle } from './step-lifestyle'
import { StepInjuries } from './step-injuries'
import { StepNutrition } from './step-nutrition'
import { StepBodyFat } from './step-body-fat'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function OnboardingWizard({ client }: { client: any }) {
    const [step, setStep] = useState(0)
    const TOTAL_STEPS = 7 // 0 to 6

    const nextStep = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
    const prevStep = () => setStep(s => Math.max(s - 1, 0))

    return (
        <div className="flex-1 flex flex-col">
            {/* Progress Bar */}
            <div className="h-2 bg-gray-200">
                <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                />
            </div>

            <div className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full">
                {step === 0 && <StepBinding client={client} onNext={nextStep} />}
                {step === 1 && <StepProfile client={client} onNext={nextStep} />}
                {step === 2 && <StepGoals client={client} onNext={nextStep} onPrev={prevStep} />}
                {step === 3 && <StepLifestyle client={client} onNext={nextStep} onPrev={prevStep} />}
                {step === 4 && <StepInjuries client={client} onNext={nextStep} onPrev={prevStep} />}
                {step === 5 && <StepNutrition client={client} onNext={nextStep} onPrev={prevStep} />}
                {step === 6 && <StepBodyFat client={client} onPrev={prevStep} />}

                {/* Save for later logic could be here or in header */}
                {step > 1 && (
                    <div className="mt-auto pt-6 text-center">
                        <Button variant="ghost" size="sm" onClick={() => window.location.href = '/dashboard'}>
                            Guardar y terminar luego
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
