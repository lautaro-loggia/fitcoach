'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { StepAccountPassword } from './step-account-password'
import { StepBinding } from './step-binding'
import { StepProfile } from './step-profile'
import { StepGoals } from './step-goals'
import { StepLifestyle } from './step-lifestyle'
import { StepInjuries } from './step-injuries'
import { StepNutrition } from './step-nutrition'
import { StepBodyFat } from './step-body-fat'
import { StepSuccess } from './step-success'

const TOTAL_STEPS = 9 // 0 a 8

const STEP_LABELS = [
    'Cuenta y contraseña',
    'Bienvenida',
    'Perfil básico',
    'Objetivos',
    'Estilo de vida',
    'Salud física',
    'Nutrición',
    'Grasa corporal',
    'Finalización',
]

function clampStep(value: number) {
    return Math.min(Math.max(value, 0), TOTAL_STEPS - 1)
}

function createDemoClientData(): Partial<OnboardingClient> {
    return {
        birth_date: '1995-06-15',
        height: 178,
        current_weight: 86.4,
        initial_weight: 86.4,
        gender: 'male',
        main_goal: 'fat_loss',
        goal_text: 'Quiero bajar grasa abdominal y mejorar mi energía diaria.',
        goals: {
            timeframe: '3-6 months',
        },
        target_weight: 79.5,
        target_fat: 15.5,
        activity_level: 'moderate',
        work_type: 'mixed',
        training_availability: {
            days_per_week: 4,
        },
        injuries: [
            {
                zone: 'Rodillas',
                severity: 'low',
                description: 'Molestia al correr en superficies duras.',
                diagnosed: false,
                since: 'Hace 6 meses',
            },
        ],
        dietary_info: {
            preference: 'high_protein',
            meals_count: 4,
            experience: 'beginner',
            allergens: ['Lácteos'],
            other: 'Evitar picante por gastritis.',
        },
    }
}

export type OnboardingClient = {
    id?: string
    full_name?: string | null
    onboarding_status?: string | null
    trainer?: {
        full_name?: string | null
    } | null
    email?: string | null
    registered_email?: string | null
    birth_date?: string | null
    height?: number | null
    current_weight?: number | null
    initial_weight?: number | null
    gender?: string | null
    main_goal?: string | null
    goal_text?: string | null
    goals?: {
        timeframe?: string | null
        [key: string]: unknown
    } | null
    target_weight?: number | null
    target_fat?: number | null
    activity_level?: string | null
    work_type?: string | null
    training_availability?: {
        days_per_week?: number | null
        [key: string]: unknown
    } | null
    injuries?: unknown[] | null
    dietary_info?: {
        preference?: string
        meals_count?: number
        experience?: string
        allergens?: string[]
        other?: string
    } | null
}

type OnboardingWizardProps = {
    client: OnboardingClient
    isPreview?: boolean
    qaMode?: boolean
    initialStep?: number
}

export function OnboardingWizard({
    client,
    isPreview,
    qaMode = false,
    initialStep = 0,
}: OnboardingWizardProps) {
    const [step, setStep] = useState(clampStep(initialStep))
    const [clientData, setClientData] = useState(client)
    const [stepRenderKey, setStepRenderKey] = useState(0)

    const nextStep = () => setStep(s => clampStep(s + 1))
    const prevStep = () => setStep(s => clampStep(s - 1))
    const goToStep = (next: number) => setStep(clampStep(next))

    const updateClient = (data: Partial<OnboardingClient>) => {
        setClientData(prev => ({ ...prev, ...data }))
    }

    const resetQaSession = () => {
        setClientData({ ...client })
        setStep(0)
        setStepRenderKey(prev => prev + 1)
    }

    const applyDemoData = () => {
        setClientData(prev => ({ ...prev, ...createDemoClientData() }))
        setStepRenderKey(prev => prev + 1)
    }

    const isLastStep = step === TOTAL_STEPS - 1
    const activeStepKey = `${step}-${stepRenderKey}`

    return (
        <div className="flex-1 flex flex-col bg-[#F9F9F8]">
            {qaMode && (
                <div className="sticky top-0 z-20 border-b border-sky-200 bg-sky-50/95 backdrop-blur supports-[backdrop-filter]:bg-sky-50/80">
                    <div className="px-4 py-3 space-y-3 max-w-lg mx-auto w-full">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] font-black uppercase tracking-wider text-sky-800">
                                QA Playground
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                                Paso {step + 1} de {TOTAL_STEPS}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-1.5">
                            <label
                                htmlFor="qa-step-selector"
                                className="text-[10px] font-bold uppercase tracking-wide text-sky-700"
                            >
                                Ir a paso
                            </label>
                            <select
                                id="qa-step-selector"
                                value={step}
                                onChange={e => goToStep(Number(e.target.value))}
                                className="h-10 rounded-md border border-sky-200 bg-white px-3 text-sm text-sky-900 outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                {STEP_LABELS.map((label, index) => (
                                    <option key={label} value={index}>
                                        {index + 1}. {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                                disabled={step === 0}
                                className="border-sky-200 bg-white text-sky-900 hover:bg-sky-100"
                            >
                                Anterior
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={nextStep}
                                disabled={step === TOTAL_STEPS - 1}
                                className="border-sky-200 bg-white text-sky-900 hover:bg-sky-100"
                            >
                                Siguiente
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetQaSession}
                                className="border-sky-200 bg-white text-sky-900 hover:bg-sky-100"
                            >
                                Reset
                            </Button>
                            <Button
                                type="button"
                                onClick={applyDemoData}
                                className="bg-sky-700 text-white hover:bg-sky-800"
                            >
                                Cargar demo
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header / Progress Section */}
            {!isLastStep && (
                <div className={`${qaMode ? '' : 'sticky top-0 z-10'} bg-[#F9F9F8] border-b border-gray-100`}>
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
                <div className="bg-amber-50 text-amber-700 text-[11px] py-1.5 px-4 text-center font-medium border-b border-amber-100">
                    Modo Vista Previa: Los datos no se guardarán.
                </div>
            )}

            <div className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full overflow-y-auto">
                <div key={activeStepKey} className="flex-1 mb-8">
                    {step === 0 && <StepAccountPassword client={clientData} onNext={nextStep} isPreview={isPreview} />}
                    {step === 1 && <StepBinding client={clientData} onNext={nextStep} isPreview={isPreview} />}
                    {step === 2 && <StepProfile client={clientData} onUpdate={updateClient} onNext={nextStep} isNextTo="Objetivos" isPreview={isPreview} />}
                    {step === 3 && <StepGoals client={clientData} onNext={nextStep} onPrev={prevStep} isPreview={isPreview} />}
                    {step === 4 && <StepLifestyle client={clientData} onNext={nextStep} onPrev={prevStep} isPreview={isPreview} />}
                    {step === 5 && <StepInjuries client={clientData} onNext={nextStep} onPrev={prevStep} isPreview={isPreview} />}
                    {step === 6 && <StepNutrition client={clientData} onNext={nextStep} onPrev={prevStep} isPreview={isPreview} />}
                    {step === 7 && <StepBodyFat client={clientData} onNext={nextStep} onPrev={prevStep} isPreview={isPreview} />}
                    {step === 8 && (
                        <StepSuccess
                            isPreview={isPreview}
                            isQaMode={qaMode}
                            onRestart={qaMode ? resetQaSession : undefined}
                        />
                    )}
                </div>

            </div>
        </div>
    )
}
