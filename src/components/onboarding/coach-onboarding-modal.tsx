'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Dumbbell, Utensils, CreditCard, TrendingUp, ClipboardList, CheckCircle, Camera, CalendarCheck, RefreshCw } from 'lucide-react'

// ─── Íconos SVG inline ────────────────────────────────────────────────

function OrbitIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="8" fill="#4139CF" />
            <ellipse cx="24" cy="24" rx="22" ry="10" stroke="#4139CF" strokeWidth="2" fill="none" opacity="0.4" />
            <ellipse cx="24" cy="24" rx="22" ry="10" stroke="#4139CF" strokeWidth="2" fill="none" opacity="0.25" transform="rotate(60 24 24)" />
            <ellipse cx="24" cy="24" rx="22" ry="10" stroke="#4139CF" strokeWidth="2" fill="none" opacity="0.15" transform="rotate(120 24 24)" />
        </svg>
    )
}

function InviteIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="18" r="7" stroke="#4139CF" strokeWidth="2" fill="none" />
            <path d="M8 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#4139CF" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="36" cy="16" r="3" fill="#4139CF" opacity="0.3" />
            <line x1="36" y1="12" x2="36" y2="20" stroke="#4139CF" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="16" x2="40" y2="16" stroke="#4139CF" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function DumbbellIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="18" width="6" height="12" rx="2" stroke="#4139CF" strokeWidth="2" fill="none" />
            <rect x="34" y="18" width="6" height="12" rx="2" stroke="#4139CF" strokeWidth="2" fill="none" />
            <line x1="14" y1="24" x2="34" y2="24" stroke="#4139CF" strokeWidth="2" strokeLinecap="round" />
            <rect x="4" y="20" width="4" height="8" rx="1.5" fill="#4139CF" opacity="0.3" />
            <rect x="40" y="20" width="4" height="8" rx="1.5" fill="#4139CF" opacity="0.3" />
        </svg>
    )
}

function NutritionIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="24" cy="30" rx="16" ry="8" stroke="#4139CF" strokeWidth="2" fill="none" />
            <path d="M8 30c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="#4139CF" strokeWidth="2" fill="none" opacity="0.4" />
            <circle cx="20" cy="28" r="2" fill="#4139CF" opacity="0.5" />
            <circle cx="28" cy="26" r="1.5" fill="#4139CF" opacity="0.5" />
            <circle cx="24" cy="32" r="1.5" fill="#4139CF" opacity="0.3" />
        </svg>
    )
}

function PaymentIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="12" width="36" height="24" rx="4" stroke="#4139CF" strokeWidth="2" fill="none" />
            <line x1="6" y1="20" x2="42" y2="20" stroke="#4139CF" strokeWidth="2" opacity="0.4" />
            <rect x="10" y="28" width="12" height="4" rx="1" fill="#4139CF" opacity="0.2" />
            <circle cx="36" cy="30" r="3" fill="#4139CF" opacity="0.3" />
        </svg>
    )
}

// ─── Tipos ─────────────────────────────────────────────────────────────

interface StepProps {
    onNext: () => void
    onSkip?: () => void
    onAction?: (action: string) => void
}

// ─── Steps ─────────────────────────────────────────────────────────────

function StepWelcome({ onNext }: StepProps) {
    return (
        <div className="flex flex-col items-center text-center">
            <Image src="/orbit_logo_black.png" alt="Orbit" width={140} height={46} className="h-10 w-auto object-contain mb-6" priority />

            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                Bienvenido a Orbit 🚀
            </h2>

            <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed max-w-sm">
                Orbit centraliza tu trabajo como coach.<br />
                Vos gestionás desde acá.<br />
                Tus asesorados usan su propia app.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-6">
                <div className="rounded-xl border border-border bg-background p-4 text-left">
                    <p className="text-[13px] font-semibold text-foreground mb-2">Panel Coach</p>
                    <ul className="space-y-1.5">
                        <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <Dumbbell className="h-4 w-4 flex-shrink-0" style={{ color: '#4139CF' }} strokeWidth={1.5} />
                            Creás entrenamientos
                        </li>
                        <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <Utensils className="h-4 w-4 flex-shrink-0" style={{ color: '#4139CF' }} strokeWidth={1.5} />
                            Armás planes de comida
                        </li>
                        <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <CreditCard className="h-4 w-4 flex-shrink-0" style={{ color: '#4139CF' }} strokeWidth={1.5} />
                            Gestionás pagos
                        </li>
                        <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <TrendingUp className="h-4 w-4 flex-shrink-0" style={{ color: '#4139CF' }} strokeWidth={1.5} />
                            Seguís el progreso
                        </li>
                    </ul>
                </div>

                <div className="rounded-xl border border-border bg-background p-4 text-left">
                    <p className="text-[13px] font-semibold text-foreground mb-2">App del Asesorado</p>
                    <ul className="space-y-1.5">
                        <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <ClipboardList className="h-4 w-4 flex-shrink-0" style={{ color: '#4139CF' }} strokeWidth={1.5} />
                            Ve su rutina
                        </li>
                        <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#4139CF' }} strokeWidth={1.5} />
                            Registra ejercicios
                        </li>
                        <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <Camera className="h-4 w-4 flex-shrink-0" style={{ color: '#4139CF' }} strokeWidth={1.5} />
                            Sube fotos de comida
                        </li>
                        <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <CalendarCheck className="h-4 w-4 flex-shrink-0" style={{ color: '#4139CF' }} strokeWidth={1.5} />
                            Hace check-ins
                        </li>
                    </ul>
                </div>

                <div className="rounded-xl border border-border bg-background p-4 text-left">
                    <p className="text-[13px] font-semibold text-foreground mb-2">Sincronización</p>
                    <div className="flex items-start gap-2">
                        <RefreshCw className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#4139CF' }} strokeWidth={1.5} />
                        <p className="text-[12px] text-muted-foreground leading-relaxed">
                            Todo lo que cargan ellos actualiza tu panel automáticamente.
                        </p>
                    </div>
                </div>
            </div>

            <Button
                onClick={onNext}
                className="mt-8 w-full h-11 text-[15px] font-medium rounded-xl bg-foreground hover:bg-foreground/90 text-background"
            >
                Entendido, empezar
            </Button>
        </div>
    )
}

function StepInvite({ onNext, onSkip }: StepProps) {
    return (
        <div className="flex flex-col items-center text-center">
            <InviteIcon className="w-14 h-14 mb-6" />

            <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: '#4139CF' }}>
                Paso 1 de 4
            </p>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
                Invitá a tu primer asesorado
            </h2>

            <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed max-w-sm">
                Cada asesorado tiene su propia app.
                Desde ahí registrará entrenamientos, nutrición y check-ins.
                Esa información alimenta tu panel automáticamente.
            </p>

            <div className="flex flex-col gap-2 w-full mt-8">
                <Button
                    onClick={() => {
                        onNext()
                    }}
                    className="w-full h-11 text-[15px] font-medium rounded-xl bg-foreground hover:bg-foreground/90 text-background"
                >
                    Invitar asesorado
                </Button>
                <Button
                    variant="ghost"
                    onClick={onSkip}
                    className="w-full h-10 text-[13px] text-muted-foreground hover:text-foreground"
                >
                    Omitir por ahora
                </Button>
            </div>
        </div>
    )
}

function StepWorkout({ onNext }: StepProps) {
    return (
        <div className="flex flex-col items-center text-center">
            <DumbbellIcon className="w-14 h-14 mb-6" />

            <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: '#4139CF' }}>
                Paso 2 de 4
            </p>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
                Creá un plan de entrenamiento
            </h2>

            <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed max-w-sm">
                Antes de asignar un entrenamiento, necesitás crearlo.
            </p>

            <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed max-w-sm">
                Podés crearlo desde el perfil del asesorado o crear uno general en &ldquo;Mis entrenamientos&rdquo; para reutilizar con varios.
            </p>

            <div className="rounded-xl border border-border bg-muted/50 p-3 mt-4 w-full">
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                    💡 Un mismo plan puede asignarse a varios asesorados y adaptarse según sus necesidades.
                </p>
            </div>

            <Button
                onClick={onNext}
                className="mt-6 w-full h-11 text-[15px] font-medium rounded-xl bg-foreground hover:bg-foreground/90 text-background"
            >
                Crear entrenamiento
            </Button>
        </div>
    )
}

function StepNutrition({ onNext }: StepProps) {
    return (
        <div className="flex flex-col items-center text-center">
            <NutritionIcon className="w-14 h-14 mb-6" />

            <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: '#4139CF' }}>
                Paso 3 de 4
            </p>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
                Cargá tus recetas de nutrición
            </h2>

            <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed max-w-sm">
                Subí las recetas que armás para tus asesorados.
                Después podrás asignarlas fácilmente a cada plan de alimentación.
            </p>

            <Button
                onClick={onNext}
                className="mt-8 w-full h-11 text-[15px] font-medium rounded-xl bg-foreground hover:bg-foreground/90 text-background"
            >
                Crear primera receta
            </Button>
        </div>
    )
}

function StepPayments({ onNext }: StepProps) {
    return (
        <div className="flex flex-col items-center text-center">
            <PaymentIcon className="w-14 h-14 mb-6" />

            <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: '#4139CF' }}>
                Paso 4 de 4
            </p>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
                Organizá tus ingresos
            </h2>

            <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed max-w-sm">
                Desde el panel de pagos podés:
            </p>

            <ul className="text-left mt-3 space-y-2 w-full max-w-sm">
                <li className="flex items-start gap-2 text-[14px] text-muted-foreground">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#4139CF' }} />
                    Ver pagos realizados y atrasados
                </li>
                <li className="flex items-start gap-2 text-[14px] text-muted-foreground">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#4139CF' }} />
                    Crear planes de pago
                </li>
                <li className="flex items-start gap-2 text-[14px] text-muted-foreground">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#4139CF' }} />
                    Llevar control completo de tu facturación
                </li>
            </ul>

            <Button
                onClick={onNext}
                className="mt-8 w-full h-11 text-[15px] font-medium rounded-xl bg-foreground hover:bg-foreground/90 text-background"
            >
                Ir a Pagos
            </Button>
        </div>
    )
}

// ─── Modal principal ───────────────────────────────────────────────────

interface CoachOnboardingModalProps {
    open: boolean
    onComplete: () => void
    onTaskAction?: (action: string) => void
}

const TOTAL_STEPS = 5

export function CoachOnboardingModal({ open, onComplete, onTaskAction }: CoachOnboardingModalProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
    const [isAnimating, setIsAnimating] = useState(false)
    const router = useRouter()

    const goNext = useCallback(() => {
        if (isAnimating) return
        if (currentStep >= TOTAL_STEPS - 1) {
            // Último paso
            onComplete()
            onTaskAction?.('paymentsReviewed')
            router.push('/pagos')
            return
        }

        setDirection('forward')
        setIsAnimating(true)
        setTimeout(() => {
            setCurrentStep(prev => prev + 1)
            setIsAnimating(false)
        }, 200)
    }, [currentStep, isAnimating, onComplete, onTaskAction, router])

    const goSkip = useCallback(() => {
        if (isAnimating) return
        setDirection('forward')
        setIsAnimating(true)
        setTimeout(() => {
            setCurrentStep(prev => prev + 1)
            setIsAnimating(false)
        }, 200)
    }, [isAnimating])

    const handleAction = useCallback((action: string) => {
        onTaskAction?.(action)
    }, [onTaskAction])

    // Mapear acciones del CTA al router
    const handleStepAction = useCallback((step: number) => {
        switch (step) {
            case 1: // Invitar
                handleAction('clientInvited')
                router.push('/clients?new=true')
                onComplete()
                break
            case 2: // Workout
                handleAction('workoutCreated')
                router.push('/workouts')
                onComplete()
                break
            case 3: // Nutrition
                handleAction('recipeCreated')
                router.push('/recipes')
                onComplete()
                break
            case 4: // Pagos
                handleAction('paymentsReviewed')
                router.push('/pagos')
                onComplete()
                break
        }
    }, [handleAction, router, onComplete])

    const progressPercent = ((currentStep + 1) / TOTAL_STEPS) * 100

    const steps: React.ReactNode[] = [
        <StepWelcome key="welcome" onNext={goNext} />,
        <StepInvite key="invite" onNext={() => handleStepAction(1)} onSkip={goSkip} />,
        <StepWorkout key="workout" onNext={() => handleStepAction(2)} />,
        <StepNutrition key="nutrition" onNext={() => handleStepAction(3)} />,
        <StepPayments key="payments" onNext={() => handleStepAction(4)} />,
    ]

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent
                showCloseButton={false}
                className={cn(
                    'max-w-[640px] sm:max-w-[640px] w-[calc(100%-48px)] sm:w-full',
                    'rounded-2xl p-0 gap-0 border-0',
                    'shadow-[0_24px_80px_rgba(0,0,0,0.12)]',
                    'overflow-hidden'
                )}
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                {/* Accesibilidad */}
                <DialogTitle className="sr-only">Onboarding de Orbit</DialogTitle>
                <DialogDescription className="sr-only">Wizard de configuración inicial para coaches</DialogDescription>

                {/* Barra de progreso */}
                <div className="w-full h-1 bg-border/50">
                    <div
                        className="h-full transition-all duration-500 ease-out rounded-full"
                        style={{
                            width: `${progressPercent}%`,
                            backgroundColor: '#4139CF',
                        }}
                    />
                </div>

                {/* Contenido del paso */}
                <div className="px-6 sm:px-10 py-8 sm:py-10 relative overflow-hidden min-h-[400px] flex items-center">
                    <div
                        className={cn(
                            'w-full transition-all duration-200 ease-out',
                            isAnimating && direction === 'forward' && 'opacity-0 -translate-x-4',
                            isAnimating && direction === 'backward' && 'opacity-0 translate-x-4',
                            !isAnimating && 'opacity-100 translate-x-0'
                        )}
                    >
                        {steps[currentStep]}
                    </div>
                </div>

                {/* Indicador de pasos (dots) */}
                <div className="flex items-center justify-center gap-1.5 pb-6">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                'h-1.5 rounded-full transition-all duration-300',
                                i === currentStep ? 'w-6' : 'w-1.5',
                            )}
                            style={{
                                backgroundColor: i === currentStep ? '#4139CF' : '#E6E6E6',
                            }}
                        />
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
