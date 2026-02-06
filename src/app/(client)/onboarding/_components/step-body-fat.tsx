'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { completeOnboarding } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Loader2, Ruler, Info, Calculator, Target, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StepBodyFat({ client, onNext, onPrev, isPreview }: { client: any, onNext: () => void, onPrev: () => void, isPreview?: boolean }) {
    const [loading, setLoading] = useState(false)
    const [method, setMethod] = useState<'navy' | 'manual' | 'skip'>('navy')

    const [measurements, setMeasurements] = useState({
        neck: '',
        waist: '',
        hip: ''
    })

    const [manualFat, setManualFat] = useState('')
    const [calculatedFat, setCalculatedFat] = useState<number | null>(null)

    const gender = client.gender || 'male'

    const calculateNavy = () => {
        const neck = Number(measurements.neck)
        const waist = Number(measurements.waist)
        const hip = Number(measurements.hip)
        const height = Number(client.height)

        if (!neck || !waist || !height) return

        let fat = 0
        try {
            if (gender === 'male') {
                fat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450
            } else {
                if (!hip) return
                fat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450
            }
            if (isNaN(fat) || fat < 2 || fat > 60) {
                setCalculatedFat(null)
            } else {
                setCalculatedFat(Math.round(fat * 10) / 10)
            }
        } catch (e) {
            setCalculatedFat(null)
        }
    }

    const handleSubmit = async () => {
        setLoading(true)

        if (isPreview) {
            await new Promise(resolve => setTimeout(resolve, 800))
            onNext()
            setLoading(false)
            return
        }

        try {
            let finalFat = undefined
            let navyData = undefined

            if (method === 'navy') {
                if (!measurements.neck || !measurements.waist) {
                    toast.error('Completá las medidas para calcular.')
                    setLoading(false)
                    return
                }
                if (gender === 'female' && !measurements.hip) {
                    toast.error('Falta la medida de cadera.')
                    setLoading(false)
                    return
                }

                finalFat = calculatedFat || undefined
                navyData = {
                    neck: Number(measurements.neck),
                    waist: Number(measurements.waist),
                    hip: gender === 'female' ? Number(measurements.hip) : undefined
                }

            } else if (method === 'manual') {
                if (!manualFat) {
                    toast.error('Ingresá el porcentaje.')
                    setLoading(false)
                    return
                }
                finalFat = Number(manualFat)
            }

            const res = await completeOnboarding({
                method: method === 'skip' ? 'skipped' : method,
                body_fat_percentage: finalFat,
                navy_method: navyData as any
            })

            if (res?.error) {
                toast.error(res.error)
            } else {
                onNext()
            }

        } catch (err) {
            toast.error('Error al finalizar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">Composición Corporal</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                    Saber tu porcentaje de grasa nos permite calcular tus calorías con precisión quirúrgica.
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col gap-3">
                    {/* Opción Navy */}
                    <button
                        type="button"
                        onClick={() => setMethod('navy')}
                        className={cn(
                            "group flex flex-col p-5 rounded-2xl border-2 transition-all text-left",
                            method === 'navy'
                                ? "bg-white border-black shadow-md shadow-black/5"
                                : "bg-[#F9F9F8] border-transparent hover:border-gray-200"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", method === 'navy' ? "bg-black text-white" : "bg-gray-100 text-gray-400")}>
                                <Calculator className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <span className={cn("font-bold block text-sm", method === 'navy' ? "text-[#1A1A1A]" : "text-gray-600")}>
                                    Método US Navy
                                </span>
                                <p className="text-[11px] text-gray-400">Estimación científica con cinta métrica.</p>
                            </div>
                        </div>

                        {method === 'navy' && (
                            <div className="mt-6 space-y-5 w-full animate-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-bold text-[#1A1A1A] flex items-center gap-1">
                                            <Ruler className="w-3 h-3" /> Cuello
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="0.0"
                                                className="w-full h-11 pr-10 border-gray-200 focus:ring-black"
                                                value={measurements.neck}
                                                onChange={e => setMeasurements({ ...measurements, neck: e.target.value })}
                                                onBlur={calculateNavy}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300">cm</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-bold text-[#1A1A1A] flex items-center gap-1">
                                            <Ruler className="w-3 h-3" /> Cintura
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="0.0"
                                                className="w-full h-11 pr-10 border-gray-200 focus:ring-black"
                                                value={measurements.waist}
                                                onChange={e => setMeasurements({ ...measurements, waist: e.target.value })}
                                                onBlur={calculateNavy}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300">cm</span>
                                        </div>
                                    </div>
                                    {gender === 'female' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-bold text-[#1A1A1A] flex items-center gap-1">
                                                <Ruler className="w-3 h-3" /> Cadera
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    placeholder="0.0"
                                                    className="w-full h-11 pr-10 border-gray-200 focus:ring-black"
                                                    value={measurements.hip}
                                                    onChange={e => setMeasurements({ ...measurements, hip: e.target.value })}
                                                    onBlur={calculateNavy}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300">cm</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {calculatedFat !== null ? (
                                    <div className="bg-[#1A1A1A] rounded-2xl p-4 text-white flex items-center justify-between shadow-lg shadow-black/10">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold text-white/70">Resultado estimado</p>
                                            <p className="text-2xl font-black">{calculatedFat}%</p>
                                        </div>
                                        <Target className="w-8 h-8 opacity-20" />
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-start gap-2">
                                        <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                                        <p className="text-[10px] text-gray-500 leading-tight">
                                            Medí tu cuello (debajo de la laringe) y tu cintura (al nivel del ombligo). Las mujeres deben medir también cadera (zona más ancha).
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </button>

                    {/* Opción Manual */}
                    <button
                        type="button"
                        onClick={() => setMethod('manual')}
                        className={cn(
                            "flex items-center p-5 rounded-2xl border-2 transition-all text-left",
                            method === 'manual'
                                ? "bg-white border-black shadow-md shadow-black/5"
                                : "bg-[#F9F9F8] border-transparent hover:border-gray-200"
                        )}
                    >
                        <div className={cn("p-2 rounded-lg mr-4", method === 'manual' ? "bg-black text-white" : "bg-gray-100 text-gray-400")}>
                            <Target className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <span className={cn("font-bold block text-sm", method === 'manual' ? "text-[#1A1A1A]" : "text-gray-600")}>
                                Ya lo conozco
                            </span>
                            {method === 'manual' ? (
                                <div className="mt-3 flex items-center gap-2 animate-in slide-in-from-left-2">
                                    <Input
                                        type="number"
                                        placeholder="15.0"
                                        className="h-10 w-24 border-gray-200 focus:ring-black font-bold"
                                        value={manualFat}
                                        onChange={e => setManualFat(e.target.value)}
                                    />
                                    <span className="text-sm font-bold text-[#1A1A1A]">% grasa</span>
                                </div>
                            ) : (
                                <p className="text-[11px] text-gray-400">Ingresá el valor manualmente si te hiciste un InBody o DXA.</p>
                            )}
                        </div>
                    </button>

                    {/* Opción Omitir */}
                    <button
                        type="button"
                        onClick={() => setMethod('skip')}
                        className={cn(
                            "flex items-center p-5 rounded-2xl border-2 transition-all text-left",
                            method === 'skip'
                                ? "bg-white border-black shadow-md shadow-black/5"
                                : "bg-[#F9F9F8] border-transparent hover:border-gray-200"
                        )}
                    >
                        <div className={cn("p-2 rounded-lg mr-4", method === 'skip' ? "bg-black text-white" : "bg-gray-100 text-gray-400")}>
                            <EyeOff className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <span className={cn("font-bold block text-sm", method === 'skip' ? "text-[#1A1A1A]" : "text-gray-600")}>
                                Omitir por ahora
                            </span>
                            <p className="text-[11px] text-gray-400">Usaremos valores promedio según tu perfil.</p>
                        </div>
                    </button>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onPrev}
                    disabled={loading}
                    className="w-1/3 h-14 font-bold border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl"
                >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Atrás
                </Button>
                <Button
                    onClick={handleSubmit}
                    className="w-2/3 h-14 text-base font-bold bg-[#1A1A1A] hover:bg-black shadow-lg shadow-black/10 transition-all rounded-xl"
                    disabled={loading}
                >
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    Continuar
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </div>
        </div>
    )
}
