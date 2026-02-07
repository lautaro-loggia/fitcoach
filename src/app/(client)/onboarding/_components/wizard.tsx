'use client'

import { useState } from 'react'
import { StepBinding } from './step-binding'
import { StepProfile } from './step-profile'
import { StepGoals } from './step-goals'
import { StepLifestyle } from './step-lifestyle'
import { StepInjuries } from './step-injuries'
import { StepNutrition } from './step-nutrition'
import { StepBodyFat } from './step-body-fat'
import { StepSuccess } from './step-success'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function OnboardingWizard({ client, isPreview }: { client: any, isPreview?: boolean }) {
    const [step, setStep] = useState(0)
    const [clientData, setClientData] = useState(client)
    const TOTAL_STEPS = 8 // 0 a 7

    const nextStep = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
    const prevStep = () => setStep(s => Math.max(s - 1, 0))

    const updateClient = (data: any) => {
        setClientData((prev: any) => ({ ...prev, ...data }))
    }

    const isLastStep = step === TOTAL_STEPS - 1

    return (
        <div className="flex-1 flex flex-col bg-[#F9F9F8]">
            {/* Header / Progress Section */}
            {!isLastStep && (
                <div className="sticky top-0 z-10 bg-[#F9F9F8] border-b border-gray-100">
                    <div className="h-1.5 w-full bg-gray-100">
                        <div
                            className="h-full transition-all duration-500 ease-in-out"
                            style={{
                                width: `${((step + 1) / (TOTAL_STEPS - 1)) * 100}%`,
                                backgroundColor: '#1A1A1A',
                                boxShadow: '0 0 8px rgba(0, 0, 0, 0.1)'
                            }}
                        />
                    </div>
                    <div className="flex justify-between items-center px-6 py-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Orbit Onboarding
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                            Paso {step + 1} de {TOTAL_STEPS - 1}
                        </span>
                    </div>
                </div>
            )}

            {isPreview && step < TOTAL_STEPS - 1 && (
                <div className="bg-amber-50 text-amber-700 text-[11px] py-1.5 px-4 text-center font-medium border-b border-amber-b-100">
                    Modo Vista Previa: Los datos no se guardarán.
                </div>
            )}

            <div className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full overflow-y-auto">
                <div className="flex-1 mb-8">
                    {step === 0 && <StepBinding client={clientData} onNext={nextStep} isPreview={isPreview} />}
                    {step === 1 && <StepProfile client={clientData} onUpdate={updateClient} onNext={nextStep} isNextTo="Objetivos" isPreview={isPreview} />}
                    {step === 2 && <StepGoals client={clientData} onNext={nextStep} onPrev={prevStep} isPreview={isPreview} />}
                    {step === 3 && <StepLifestyle client={clientData} onNext={nextStep} onPrev={prevStep} isPreview={isPreview} />}
                    {step === 4 && <StepInjuries client={clientData} onNext={nextStep} onPrev={prevStep} isPreview={isPreview} />}
                    {step === 5 && <StepNutrition client={clientData} onNext={nextStep} onPrev={prevStep} isPreview={isPreview} />}
                    {step === 6 && <StepBodyFat client={clientData} onNext={nextStep} onPrev={prevStep} isPreview={isPreview} />}
                    {step === 7 && <StepSuccess isPreview={isPreview} />}
                </div>

            </div>
        </div>
    )
}
