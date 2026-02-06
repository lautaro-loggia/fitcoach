'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'

export function StepSuccess({ isPreview }: { isPreview?: boolean }) {
    useEffect(() => {
        const duration = 3 * 1000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

        const interval: any = setInterval(function () {
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

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-8 animate-in zoom-in-95 duration-700">
            <div className="relative">
                <div className="absolute -inset-4 bg-[#5254D9]/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-white p-6 rounded-full shadow-2xl shadow-[#5254D9]/40 border-4 border-[#5254D9]">
                    <CheckCircle2 className="w-16 h-16 text-[#5254D9]" />
                </div>
                <div className="absolute -top-2 -right-2">
                    <Sparkles className="w-8 h-8 text-amber-400 animate-bounce" />
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-4xl font-black tracking-tight text-[#1A1A1A]">¡Estás dentro!</h2>
                <p className="text-gray-500 max-w-xs mx-auto text-lg leading-relaxed">
                    Hemos configurado tu perfil con éxito. Tu coach ya tiene todo listo para empezar.
                </p>
            </div>

            <Button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full h-16 text-lg font-bold bg-[#1A1A1A] hover:bg-black text-white shadow-xl rounded-2xl group transition-all"
            >
                Ir a mi Dashboard
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-300">
                Prepárate para el cambio
            </p>
        </div>
    )
}
