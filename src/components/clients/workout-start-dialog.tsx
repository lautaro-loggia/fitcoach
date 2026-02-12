'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog, DialogContent, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Dumbbell, Clock, Droplets, Smartphone, Flame, ArrowRight } from "lucide-react"

// Messages
const MESSAGES = [
    "¡Hoy es el día!",
    "Tu cuerpo puede más de lo que crees.",
    "Cada repetición cuenta.",
    "Concéntrate y da lo mejor.",
    "Disciplina es hacer lo que hay que hacer.",
    "¡A darlo todo!",
    "Este es tu momento.",
    "Construyendo tu mejor versión."
]

const TIPS = [
    { icon: Droplets, text: "Tené agua cerca para hidratarte." },
    { icon: Smartphone, text: "Poné tu playlist favorita." },
    { icon: Flame, text: "Hacé un buen calentamiento." },
]

interface WorkoutStartDialogProps {
    children: React.ReactNode
    workoutId: string
    workoutName: string
    exercisesCount: number
    estimatedTime?: string
}

export function WorkoutStartDialog({
    children,
    workoutId,
    workoutName,
    exercisesCount,
    estimatedTime = "60 min aprox."
}: WorkoutStartDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState(MESSAGES[0])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open) {
            setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)])
        }
    }, [open])

    const handleStart = () => {
        setIsLoading(true)
        router.push(`/dashboard/workout/${workoutId}`)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none p-0 overflow-hidden [&>button]:hidden">
                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl ring-1 ring-gray-200 m-1">
                    {/* Header with black theme */}
                    <div className="bg-zinc-950 p-6 pt-8 text-center text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 blur-xl pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="h-12 w-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-lg shadow-black/20 animate-in zoom-in duration-300">
                                <Flame className="h-6 w-6 text-white" fill="currentColor" />
                            </div>
                            <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">{message}</DialogTitle>
                            <p className="text-zinc-400 text-sm font-medium">Preparate para entrenar</p>
                        </div>
                    </div>

                    <div className="p-6 pt-4 space-y-5">
                        {/* Summary */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Resumen de hoy</h3>
                            <div className="text-center mb-4">
                                <p className="text-lg font-bold text-gray-900 leading-tight">{workoutName}</p>
                            </div>
                            <div className="flex items-center justify-center gap-8">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm text-black">
                                        <Dumbbell className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-bold text-gray-900">{exercisesCount}</span>
                                        <span className="text-[10px] text-gray-500 font-medium uppercase">Ejercicios</span>
                                    </div>
                                </div>
                                <div className="w-px h-10 bg-gray-200"></div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm text-black">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-bold text-gray-900">{estimatedTime}</span>
                                        <span className="text-[10px] text-gray-500 font-medium uppercase">Minutos</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="space-y-3 px-2">
                            {TIPS.map((tip, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                                    <div className="h-6 w-6 rounded-full bg-zinc-950 flex items-center justify-center shrink-0 text-white shadow-sm">
                                        <tip.icon className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-medium text-gray-700">{tip.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Button */}
                        <div className="pt-2">
                            <Button
                                className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-bold h-12 shadow-lg shadow-black/10 rounded-xl text-base transition-all active:scale-[0.98] hover:scale-[1.01]"
                                onClick={handleStart}
                                disabled={isLoading}
                            >
                                {isLoading ? "Iniciando..." : <span>¡Empezar ahora!</span>}
                                {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                            </Button>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-full mt-3 text-xs text-gray-400 font-medium hover:text-gray-600 transition-colors py-2"
                            >
                                Cancelar y volver
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
