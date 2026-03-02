'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CoachOnboardingModal } from '@/components/onboarding/coach-onboarding-modal'

const TOTAL_STEPS = 6

type SessionConfig = {
    key: number
    initialStep: number
}

function clampStep(value: number) {
    return Math.min(Math.max(value, 0), TOTAL_STEPS - 1)
}

export function CoachOnboardingTestHarness({ initialStep = 0 }: { initialStep?: number }) {
    const [selectedStep, setSelectedStep] = useState(clampStep(initialStep))
    const [session, setSession] = useState<SessionConfig>({
        key: 0,
        initialStep: clampStep(initialStep),
    })
    const [open, setOpen] = useState(true)
    const [completed, setCompleted] = useState(false)

    const startSession = () => {
        setSession(prev => ({
            key: prev.key + 1,
            initialStep: clampStep(selectedStep),
        }))
        setCompleted(false)
        setOpen(true)
    }

    return (
        <div className="min-h-full bg-[#f9f9fa] px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-[#0e0e0e]">Coach Onboarding Test</h1>
                <p className="mt-2 text-sm text-[#6b7280]">
                    Entorno de prueba aislado para revisar el onboarding de coaches sin redirecciones a módulos productivos.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <div>
                        <label htmlFor="coach-test-step" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                            Iniciar desde
                        </label>
                        <select
                            id="coach-test-step"
                            value={selectedStep}
                            onChange={e => setSelectedStep(Number(e.target.value))}
                            className="h-10 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm text-[#0e0e0e] outline-none focus:ring-2 focus:ring-[#4139CF]"
                        >
                            <option value={0}>Intro - Bienvenida</option>
                            <option value={1}>Paso 1 - Invitar asesorado</option>
                            <option value={2}>Paso 2 - Entrenamiento</option>
                            <option value={3}>Paso 3 - Nutrición</option>
                            <option value={4}>Paso 4 - Pagos</option>
                            <option value={5}>Paso 5 - Finalización</option>
                        </select>
                    </div>

                    <Button onClick={startSession} className="h-10 bg-[#0e0e0e] hover:bg-[#1a1a1a] text-white">
                        {open ? 'Reiniciar test' : 'Abrir test'}
                    </Button>

                    <Button asChild variant="outline" className="h-10">
                        <Link href="/">Volver al inicio</Link>
                    </Button>
                </div>

                <div className="mt-4 rounded-lg bg-[#f3f4f6] px-3 py-2 text-xs text-[#4b5563]">
                    Estado: {open ? 'Onboarding en curso' : completed ? 'Test completado' : 'Test cerrado'}
                </div>
            </div>

            <CoachOnboardingModal
                key={session.key}
                open={open}
                onComplete={() => {
                    setCompleted(true)
                    setOpen(false)
                }}
                testMode={true}
                initialStep={session.initialStep}
            />
        </div>
    )
}
