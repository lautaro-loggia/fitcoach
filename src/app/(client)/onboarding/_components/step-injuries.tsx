'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { updateInjuries } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Loader2, Plus, Trash2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

type Injury = {
    zone: string
    severity: 'low' | 'moderate' | 'severe'
    description: string
    diagnosed: boolean
    since?: string
    id: number // temp id for UI
}

const BODY_ZONES = [
    'Hombros', 'Rodillas', 'Espalda Alta', 'Espalda Baja', 'Cuello', 'Caderas', 'Tobillos', 'Muñecas', 'Codos', 'Otra'
]

export function StepInjuries({ client, onNext, onPrev, isPreview }: { client: any, onNext: () => void, onPrev: () => void, isPreview?: boolean }) {
    const [loading, setLoading] = useState(false)
    const [hasInjuries, setHasInjuries] = useState(
        (client.injuries && client.injuries.length > 0) || false
    )

    const [injuries, setInjuries] = useState<Injury[]>(
        Array.isArray(client.injuries) ? client.injuries.map((i: any, idx: number) => ({
            ...i,
            id: idx,
            since: i.since || ''
        })) : []
    )

    const addInjury = () => {
        setInjuries([...injuries, {
            id: Date.now(),
            zone: '',
            severity: 'low',
            description: '',
            diagnosed: false,
            since: ''
        }])
    }

    const removeInjury = (id: number) => {
        setInjuries(injuries.filter(i => i.id !== id))
    }

    const updateInjury = (id: number, field: keyof Injury, value: any) => {
        setInjuries(injuries.map(i => i.id === id ? { ...i, [field]: value } : i))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        if (hasInjuries && (injuries.length === 0 || injuries.some(i => !i.zone))) {
            toast.error('Por favor detallá la zona afectada.')
            setLoading(false)
            return
        }

        if (isPreview) {
            await new Promise(resolve => setTimeout(resolve, 500))
            onNext()
            setLoading(false)
            return
        }

        try {
            const cleanInjuries = injuries.map(({ id, ...rest }) => ({
                ...rest,
                created_at: new Date().toISOString(),
                is_active: true
            }))

            const res = await updateInjuries({
                has_injuries: hasInjuries,
                injuries: cleanInjuries
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                onNext()
            }
        } catch (err) {
            toast.error('Error al guardar lesiones')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">Salud Física</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                    Personalizaremos tus ejercicios para proteger tus articulaciones y mejorar molestias.
                </p>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => { setHasInjuries(false); setInjuries([]) }}
                        className={cn(
                            "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3",
                            !hasInjuries
                                ? "bg-white border-black shadow-md shadow-black/5"
                                : "bg-[#F9F9F8] border-transparent text-gray-400"
                        )}
                    >
                        <ShieldCheck className={cn("w-8 h-8", !hasInjuries ? "text-[#1A1A1A]" : "text-gray-300")} />
                        <span className="font-bold text-sm">Todo OK</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setHasInjuries(true); if (injuries.length === 0) addInjury() }}
                        className={cn(
                            "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3",
                            hasInjuries
                                ? "bg-white border-black shadow-md shadow-black/5"
                                : "bg-[#F9F9F8] border-transparent text-gray-400"
                        )}
                    >
                        <Activity className={cn("w-8 h-8", hasInjuries ? "text-[#1A1A1A]" : "text-gray-300")} />
                        <span className="font-bold text-sm">Tengo molestias</span>
                    </button>
                </div>

                {!hasInjuries ? (
                    <div className="bg-[#E8F5E9] border border-[#C8E6C9] p-6 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 duration-500">
                        <div className="p-3 bg-white rounded-full text-[#4CAF50] shadow-sm">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-[#2E7D32]">¡Excelente estado!</p>
                            <p className="text-sm text-[#388E3C]">Estamos listos para entrenar sin limitaciones.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                        {injuries.map((injury, index) => (
                            <div
                                key={injury.id}
                                className="border-2 border-gray-100 rounded-2xl p-6 bg-white space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-[#1A1A1A] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">
                                            {index + 1}
                                        </span>
                                        <h3 className="font-bold text-[#1A1A1A]">Molestia #{index + 1}</h3>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeInjury(injury.id)}
                                        className="text-gray-300 hover:text-red-500 h-8 px-2"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-[#1A1A1A]">¿Dónde?</Label>
                                        <Select
                                            value={injury.zone}
                                            onValueChange={v => updateInjury(injury.id, 'zone', v)}
                                        >
                                            <SelectTrigger className="w-full h-11 border-gray-200 focus:ring-black">
                                                <SelectValue placeholder="Zona" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BODY_ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-[#1A1A1A]">Intensidad</Label>
                                        <Select
                                            value={injury.severity}
                                            onValueChange={v => updateInjury(injury.id, 'severity', v)}
                                        >
                                            <SelectTrigger className="w-full h-11 border-gray-200 focus:ring-black">
                                                <SelectValue placeholder="Nivel" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Leve (Solo molesta algo)</SelectItem>
                                                <SelectItem value="moderate">Moderada (Limita rangos)</SelectItem>
                                                <SelectItem value="severe">Severa (Dolor agudo)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-[#1A1A1A]">Antigüedad</Label>
                                    <Input
                                        placeholder="Ej: Hace 2 semanas, o Crónica"
                                        className="h-11 border-gray-200 focus:ring-black"
                                        value={injury.since}
                                        onChange={e => updateInjury(injury.id, 'since', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-[#1A1A1A]">Detalles</Label>
                                    <Textarea
                                        placeholder="Ej: Me duele solo al hacer press de banca..."
                                        value={injury.description}
                                        onChange={e => updateInjury(injury.id, 'description', e.target.value)}
                                        className="min-h-[80px] border-gray-200 rounded-xl focus:ring-black"
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`diag-${injury.id}`}
                                        checked={injury.diagnosed}
                                        onCheckedChange={(c) => updateInjury(injury.id, 'diagnosed', !!c)}
                                    />
                                    <Label htmlFor={`diag-${injury.id}`} className="text-xs font-medium text-gray-500">
                                        Diagnosticado por profesional
                                    </Label>
                                </div>
                            </div>
                        ))}

                        <Button type="button" variant="outline" onClick={addInjury} className="w-full border-dashed border-2 py-8 rounded-2xl text-gray-400 bg-transparent hover:bg-gray-50 hover:border-gray-300 transition-all">
                            <Plus className="mr-2 h-5 w-5" /> Agregar otra molestia
                        </Button>

                        <div className="flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-2xl text-[11px] leading-relaxed border border-amber-100">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                            <p>Tu coach revisará cada detalle para filtrar ejercicios que puedan ser contraindicados para vos.</p>
                        </div>
                    </div>
                )}
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
