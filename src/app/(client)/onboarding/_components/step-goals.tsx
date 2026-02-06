'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateGoals } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Loader2, Scale, BicepsFlexed, RefreshCw, Zap, HeartPulse, HelpCircle, AlertTriangle, TrendingDown } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const GOALS = [
    { id: 'fat_loss', label: 'Pérdida de grasa', icon: Scale, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'muscle_gain', label: 'Ganancia muscular', icon: BicepsFlexed, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'recomp', label: 'Recomposición', icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'performance', label: 'Rendimiento', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'health', label: 'Salud general', icon: HeartPulse, color: 'text-rose-500', bg: 'bg-rose-50' },
]

export function StepGoals({ client, onNext, onPrev, isPreview }: { client: any, onNext: () => void, onPrev: () => void, isPreview?: boolean }) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        main_goal: client.main_goal || '',
        goal_specific: client.goal_text || '',
        timeframe: client.goals?.timeframe || '1-3 months',
        target_weight: client.target_weight || '',
        target_fat: client.target_fat || ''
    })

    const weightDelta = formData.target_weight ? (Number(formData.target_weight) - (client.current_weight || client.initial_weight || 0)) : 0

    // Simple realism check: > 1kg per week loss/gain is "aggressive"
    const getRealismWarning = () => {
        if (!formData.target_weight || !formData.timeframe) return null
        const absDelta = Math.abs(weightDelta)
        let weeks = 0
        if (formData.timeframe === '1-3 months') weeks = 8
        if (formData.timeframe === '3-6 months') weeks = 18
        if (formData.timeframe === '6+ months') weeks = 36

        if (absDelta / weeks > 1) {
            return "Este objetivo requiere un ritmo muy intenso. Tu coach te ayudará a trazar un camino sostenible."
        }
        return null
    }

    const warning = getRealismWarning()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        if (isPreview) {
            await new Promise(resolve => setTimeout(resolve, 500))
            onNext()
            setLoading(false)
            return
        }

        try {
            const res = await updateGoals({
                main_goal: formData.main_goal,
                goal_specific: formData.goal_specific,
                timeframe: formData.timeframe,
                target_weight: formData.target_weight ? Number(formData.target_weight) : undefined,
                target_fat: formData.target_fat ? Number(formData.target_fat) : undefined
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
                <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">Tus Objetivos</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                    Definamos juntos hacia dónde apuntamos con tu plan.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                    <Label className="text-sm font-bold text-[#1A1A1A]">Objetivo Principal</Label>
                    <div className="grid grid-cols-1 gap-3">
                        {GOALS.map((g) => (
                            <button
                                key={g.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, main_goal: g.id })}
                                className={cn(
                                    "flex items-center p-5 rounded-2xl border-2 transition-all text-left group",
                                    formData.main_goal === g.id
                                        ? "bg-white border-black shadow-md shadow-black/5"
                                        : "bg-[#F9F9F8] border-transparent hover:border-gray-200"
                                )}
                            >
                                <div className={cn(
                                    "p-3 rounded-xl mr-4 transition-all",
                                    formData.main_goal === g.id
                                        ? cn(g.bg, g.color)
                                        : "bg-gray-100 text-gray-400"
                                )}>
                                    <g.icon className="w-7 h-7 stroke-[1.5]" />
                                </div>
                                <div className="flex-1">
                                    <span className={cn(
                                        "font-bold text-base transition-colors",
                                        formData.main_goal === g.id ? "text-[#1A1A1A]" : "text-gray-500"
                                    )}>
                                        {g.label}
                                    </span>
                                </div>
                                {formData.main_goal === g.id && (
                                    <div className="w-2 h-2 rounded-full bg-black ml-2" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-bold text-[#1A1A1A]">Plazo estimado</Label>
                    <Select
                        value={formData.timeframe}
                        onValueChange={(val) => setFormData({ ...formData, timeframe: val })}
                    >
                        <SelectTrigger className="w-full h-12 border-gray-200 focus:ring-black">
                            <SelectValue placeholder="Seleccioná plazo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1-3 months">1 - 3 Meses (Corto plazo)</SelectItem>
                            <SelectItem value="3-6 months">3 - 6 Meses (Media distancia)</SelectItem>
                            <SelectItem value="6+ months">Más de 6 Meses (Transformación)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-[#1A1A1A] relative">
                            Peso Meta
                        </Label>
                        <div className="relative">
                            <Input
                                type="number"
                                step="0.1"
                                placeholder="Ej: 75"
                                className="w-full h-12 pr-12 border-gray-200 focus:ring-black"
                                value={formData.target_weight}
                                onChange={e => setFormData({ ...formData, target_weight: e.target.value })}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">kg</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-[#1A1A1A] flex items-center justify-between">
                            % Grasa Meta
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[200px] text-xs">
                                        Si no sabés, podés dejarlo en blanco. Tu coach te guiará.
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </Label>
                        <div className="relative">
                            <Input
                                type="number"
                                step="0.1"
                                placeholder="15"
                                className="w-full h-12 pr-12 border-gray-200 focus:ring-black"
                                value={formData.target_fat}
                                onChange={e => setFormData({ ...formData, target_fat: e.target.value })}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">%</span>
                        </div>
                    </div>
                </div>

                {formData.target_weight && (
                    <div className={cn(
                        "p-4 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300",
                        warning ? "bg-amber-50 border border-amber-100" : "bg-gray-50 border border-gray-100"
                    )}>
                        {warning ? (
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                            <TrendingDown className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-[#1A1A1A]">
                                Objetivo: {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                            </p>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                {warning || "Este es un ritmo saludable para ver resultados sostenibles en tu composición corporal."}
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label className="text-sm font-bold text-[#1A1A1A]">Meta Personal (Opcional)</Label>
                    <Textarea
                        placeholder="Ej: Quiero recuperar la movilidad o entrar en un talle menos..."
                        className="min-h-[100px] border-gray-200 focus:ring-black rounded-xl"
                        value={formData.goal_specific}
                        onChange={e => setFormData({ ...formData, goal_specific: e.target.value })}
                    />
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
