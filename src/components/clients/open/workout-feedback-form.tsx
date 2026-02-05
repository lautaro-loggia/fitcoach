'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Check, AlertCircle, TrendingUp, Battery, Activity, ThumbsUp } from 'lucide-react'

export interface WorkoutFeedback {
    generalSensation: string
    rpe: number
    energy: string
    pain: boolean
    painIntensity?: string
    painZones?: string[]
    performance: string
}

interface WorkoutFeedbackFormProps {
    onSubmit: (feedback: WorkoutFeedback) => void
    isSubmitting: boolean
}

export default function WorkoutFeedbackForm({ onSubmit, isSubmitting }: WorkoutFeedbackFormProps) {
    const [generalSensation, setGeneralSensation] = useState<string | null>(null)
    const [rpe, setRpe] = useState<number | null>(null)
    const [energy, setEnergy] = useState<string | null>(null)
    const [hasPain, setHasPain] = useState<boolean | null>(null)
    const [painIntensity, setPainIntensity] = useState<string | null>(null)
    const [painZones, setPainZones] = useState<string[]>([])
    const [performance, setPerformance] = useState<string | null>(null)

    const sensationOptions = ['Muy liviano', 'Correcto', 'Intenso', 'Demasiado intenso']
    const energyOptions = ['Baja', 'Media', 'Alta']
    const performanceOptions = ['Peor', 'Igual', 'Mejor']
    const painZonesOptions = ['Hombros', 'Rodillas', 'Espalda', 'Cadera', 'Otros']
    const rpeValues = [6, 7, 8, 9, 10]

    // Form validity check
    const isValid =
        generalSensation !== null &&
        rpe !== null &&
        energy !== null &&
        hasPain !== null &&
        (hasPain === false || (hasPain === true && painIntensity !== null && painZones.length > 0)) &&
        performance !== null

    const handleSubmit = () => {
        if (!isValid) return

        const feedback: WorkoutFeedback = {
            generalSensation: generalSensation!,
            rpe: rpe!,
            energy: energy!,
            pain: hasPain!,
            performance: performance!,
            ...(hasPain && {
                painIntensity: painIntensity!,
                painZones: painZones
            })
        }

        onSubmit(feedback)
    }

    const togglePainZone = (zone: string) => {
        setPainZones(prev =>
            prev.includes(zone)
                ? prev.filter(z => z !== zone)
                : [...prev, zone]
        )
    }

    // Helper for selection buttons
    const SelectButton = ({
        selected,
        onClick,
        label,
        className = ""
    }: {
        selected: boolean,
        onClick: () => void,
        label: string,
        className?: string
    }) => (
        <button
            onClick={onClick}
            className={cn(
                "py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 border-2 w-full",
                selected
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50",
                className
            )}
        >
            {label}
        </button>
    )

    return (
        <div className="flex flex-col h-full bg-gray-50/50 overflow-y-auto sm:rounded-xl relative">
            <div className="p-6 space-y-8 pb-32 max-w-lg mx-auto w-full">

                <div className="text-center space-y-2 mb-8 pt-6">
                    <h2 className="text-2xl font-bold text-gray-900">Resumen de sesión</h2>
                    <p className="text-gray-500">Completa este rápido feedback para finalizar.</p>
                </div>

                {/* 1. Sensation */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        <h3>¿Cómo sentiste el entrenamiento?</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {sensationOptions.map(opt => (
                            <SelectButton
                                key={opt}
                                label={opt}
                                selected={generalSensation === opt}
                                onClick={() => setGeneralSensation(opt)}
                            />
                        ))}
                    </div>
                </section>

                {/* 2. RPE */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between text-gray-900 font-semibold mb-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                            <h3>Nivel de esfuerzo (RPE)</h3>
                        </div>
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {rpe ? `${rpe}/10` : '-'}
                        </span>
                    </div>
                    <div className="flex justify-between gap-2">
                        {rpeValues.map(val => (
                            <button
                                key={val}
                                onClick={() => setRpe(val)}
                                className={cn(
                                    "flex-1 aspect-square rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center border-2",
                                    rpe === val
                                        ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm transform scale-105"
                                        : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"
                                )}
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 px-1">
                        <span>Moderado</span>
                        <span>Fallo total</span>
                    </div>
                </section>

                {/* 3. Energy */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
                        <Battery className="w-5 h-5 text-green-600" />
                        <h3>¿Cómo estuvo tu energía?</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {energyOptions.map(opt => (
                            <SelectButton
                                key={opt}
                                label={opt}
                                selected={energy === opt}
                                onClick={() => setEnergy(opt)}
                            />
                        ))}
                    </div>
                </section>

                {/* 4. Pain */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <h3>¿Tuviste molestias?</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <SelectButton
                            label="No"
                            selected={hasPain === false}
                            onClick={() => {
                                setHasPain(false)
                                setPainIntensity(null)
                                setPainZones([])
                            }}
                            className={hasPain === false ? "border-green-500 bg-green-50 text-green-700" : ""}
                        />
                        <SelectButton
                            label="Sí"
                            selected={hasPain === true}
                            onClick={() => setHasPain(true)}
                            className={hasPain === true ? "border-red-500 bg-red-50 text-red-700" : ""}
                        />
                    </div>

                    {hasPain && (
                        <div className="mt-4 p-4 bg-red-50/50 rounded-2xl border border-red-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <h4 className="text-xs font-bold uppercase text-red-400 mb-2">Intensidad</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Leve', 'Moderado'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setPainIntensity(opt)}
                                            className={cn(
                                                "py-2 px-3 rounded-lg text-sm font-medium transition-all w-full border",
                                                painIntensity === opt
                                                    ? "bg-white border-red-200 text-red-600 shadow-sm"
                                                    : "bg-transparent border-transparent text-gray-500 hover:bg-white/50"
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase text-red-400 mb-2">Zona(s)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {painZonesOptions.map(zone => (
                                        <button
                                            key={zone}
                                            onClick={() => togglePainZone(zone)}
                                            className={cn(
                                                "py-1.5 px-3 rounded-full text-xs font-medium transition-all border",
                                                painZones.includes(zone)
                                                    ? "bg-red-100 border-red-200 text-red-700"
                                                    : "bg-white border-gray-100 text-gray-500"
                                            )}
                                        >
                                            {zone}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* 5. Performance */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
                        <ThumbsUp className="w-5 h-5 text-indigo-600" />
                        <h3>Rendimiento comparado</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {performanceOptions.map(opt => (
                            <SelectButton
                                key={opt}
                                label={opt}
                                selected={performance === opt}
                                onClick={() => setPerformance(opt)}
                            />
                        ))}
                    </div>
                </section>

                {/* Submit Action */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-[10000] pb-8 md:pb-4">
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                        className={cn(
                            "w-full h-14 text-lg font-bold shadow-lg transition-all",
                            isValid
                                ? "bg-black hover:bg-gray-900 text-white"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        {isSubmitting ? "Guardando..." : "Finalizar Entrenamiento"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
