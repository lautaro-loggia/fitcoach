'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'
import Image from 'next/image'

type StepSuccessProps = {
    isPreview?: boolean
    isQaMode?: boolean
    onRestart?: () => void
}

export function StepSuccess({ isPreview, isQaMode, onRestart }: StepSuccessProps) {
    useEffect(() => {
        const duration = 3 * 1000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

        const interval: ReturnType<typeof setInterval> = setInterval(function () {
            const timeLeft = animationEnd - Date.now()

            if (timeLeft <= 0) {
                return clearInterval(interval)
            }

            const particleCount = 50 * (timeLeft / duration)
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
        }, 250)

        // One big burst at start
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#5254D9', '#FFFFFF', '#1A1A1A']
        })

        let timeout: ReturnType<typeof setTimeout>
        if (!isPreview && !isQaMode) {
            timeout = setTimeout(() => {
                window.location.href = '/dashboard'
            }, 4500)
        }

        return () => {
            clearInterval(interval)
            if (timeout) clearTimeout(timeout)
        }
    }, [isPreview, isQaMode])

    return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-8 animate-in zoom-in-95 duration-700">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 drop-shadow-2xl">
                <Image
                    src="/images/onboarding-congrats.png"
                    alt="Felicitaciones"
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight text-[#1A1A1A] max-w-xs mx-auto">
                    ¡Listo! Ya tenés tu perfil creado.
                </h2>
                <div className="text-gray-500 max-w-sm mx-auto text-lg leading-relaxed space-y-4">
                    <p>
                        Ahora tu coach va a armarte tu rutina<br />
                        y tu plan de alimentación.
                    </p>
                    <p>Te avisamos apenas esté todo asignado.</p>
                </div>
            </div>

            {isQaMode ? (
                <div className="w-full space-y-3">
                    <Button
                        onClick={() => onRestart?.()}
                        className="w-full h-16 text-lg font-bold bg-[#1A1A1A] hover:bg-black text-white shadow-xl rounded-2xl group transition-all"
                    >
                        Reiniciar onboarding
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.location.href = '/dashboard'}
                        className="w-full h-12 font-bold border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
                    >
                        Ir a mi Dashboard
                    </Button>
                </div>
            ) : (
                <Button
                    onClick={() => window.location.href = '/dashboard'}
                    className="w-full h-16 text-lg font-bold bg-[#1A1A1A] hover:bg-black text-white shadow-xl rounded-2xl group transition-all"
                >
                    Ir a mi Dashboard
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
            )}

            {isPreview && (
                <p className="text-[10px] uppercase font-bold tracking-widest text-amber-500">
                    Modo vista previa activo
                </p>
            )}

            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-300">
                Prepárate para el cambio
            </p>
        </div>
    )
}
