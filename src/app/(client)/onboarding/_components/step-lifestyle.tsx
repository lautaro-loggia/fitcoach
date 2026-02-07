'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateLifestyle } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Loader2, Briefcase, Zap, Dumbbell, Armchair, Footprints, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIVITY_LEVELS = [
    { id: 'sedentary', label: 'Sedentario', desc: 'Menos de 5,000 pasos. Trabajo de oficina, poco movimiento diario.', icon: Armchair, color: 'text-slate-400' },
    { id: 'light', label: 'Ligero', desc: '5,000 - 8,000 pasos. Caminatas ocasionales o tareas domésticas.', icon: Footprints, color: 'text-blue-400' },
    { id: 'moderate', label: 'Moderado', desc: '8,000 - 12,000 pasos. Persona activa, camina al trabajo o entrena suave.', icon: Activity, color: 'text-green-500' },
    { id: 'active', label: 'Muy Activo', desc: '12,000+ pasos. Trabajo físico intenso o entrenamiento diario exigente.', icon: Zap, color: 'text-orange-500' },
]

export function StepLifestyle({ client, onNext, onPrev, isPreview }: { client: any, onNext: () => void, onPrev: () => void, isPreview?: boolean }) {
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        activity_level: client.activity_level || '',
        work_type: client.work_type || '',
        training_days: client.training_availability?.days_per_week?.toString() || ''
    })


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!formData.activity_level) {
            toast.error('Por favor seleccioná tu nivel de actividad diaria.')
            return
        }
        if (!formData.work_type) {
            toast.error('Por favor seleccioná tu tipo de trabajo.')
            return
        }
        if (!formData.training_days) {
            toast.error('Por favor seleccioná los días de entrenamiento.')
            return
        }

        setLoading(true)

        if (isPreview) {
            await new Promise(resolve => setTimeout(resolve, 500))
            onNext()
            setLoading(false)
            return
        }

        try {
            const res = await updateLifestyle({
                activity_level: formData.activity_level,
                work_type: formData.work_type,
                training_days: Number(formData.training_days)
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                onNext()
            }
        } catch (err) {
            toast.error('Error al guardar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">Estilo de Vida</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                    Necesitamos entender tu día para que el plan se adapte a vos, y no al revés.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                    <Label className="text-sm font-bold text-[#1A1A1A]">Actividad Diaria (pasos/movimiento)</Label>
                    <div className="grid grid-cols-1 gap-3">
                        {ACTIVITY_LEVELS.map((level) => (
                            <button
                                key={level.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, activity_level: level.id })}
                                className={cn(
                                    "flex items-start p-4 rounded-xl border-2 transition-all text-left",
                                    formData.activity_level === level.id
                                        ? "bg-white border-black shadow-md shadow-black/5"
                                        : "bg-[#F9F9F8] border-transparent hover:border-gray-200"
                                )}
                            >
                                <div className={cn("p-2 rounded-lg mr-4 mt-0.5", formData.activity_level === level.id ? "bg-black text-white" : "bg-gray-100 text-gray-400")}>
                                    <level.icon className="w-4 h-4" />
                                </div>
                                <div className="space-y-1">
                                    <span className={cn(
                                        "font-bold block",
                                        formData.activity_level === level.id ? "text-[#1A1A1A]" : "text-gray-600"
                                    )}>
                                        {level.label}
                                    </span>
                                    <p className="text-xs text-gray-400 leading-tight">
                                        {level.desc}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Label className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                            <Briefcase className="w-3 h-3" /> Tipo de Trabajo
                        </Label>
                        <Select
                            value={formData.work_type}
                            onValueChange={(val) => setFormData({ ...formData, work_type: val })}
                        >
                            <SelectTrigger className="w-full h-12 border-gray-200 focus:ring-black">
                                <SelectValue placeholder="Seleccioná..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sedentary">Escritorio / Sentado</SelectItem>
                                <SelectItem value="mixed">Mixto (Pies / Movimiento)</SelectItem>
                                <SelectItem value="physical">Físico (Esfuerzo constante)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                            <Dumbbell className="w-3 h-3" /> Días de entrenamiento
                        </Label>
                        <Select
                            value={formData.training_days}
                            onValueChange={(val) => setFormData({ ...formData, training_days: val })}
                        >
                            <SelectTrigger className="w-full h-12 border-gray-200 focus:ring-black">
                                <SelectValue placeholder="Días por semana" />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                                    <SelectItem key={d} value={d.toString()}>{d} {d === 1 ? 'día' : 'días'} a la semana</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>


                <div className="flex gap-3 pt-6">
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
            </form>
        </div>
    )
}
