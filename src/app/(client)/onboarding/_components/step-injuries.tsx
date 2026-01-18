'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { updateInjuries } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'

type Injury = {
    zone: string
    severity: 'low' | 'moderate' | 'severe'
    description: string
    diagnosed: boolean
    id: number // temp id for UI
}

const BODY_ZONES = [
    'Hombros', 'Rodillas', 'Espalda Alta', 'Espalda Baja', 'Cuello', 'Caderas', 'Tobillos', 'Muñecas', 'Codos', 'Otra'
]

export function StepInjuries({ client, onNext, onPrev }: { client: any, onNext: () => void, onPrev: () => void }) {
    const [loading, setLoading] = useState(false)
    const [hasInjuries, setHasInjuries] = useState(
        (client.injuries && client.injuries.length > 0) || false
    )

    // Parse existing injuries or start empty
    const [injuries, setInjuries] = useState<Injury[]>(
        Array.isArray(client.injuries) ? client.injuries.map((i: any, idx: number) => ({ ...i, id: idx })) : []
    )

    const addInjury = () => {
        setInjuries([...injuries, {
            id: Date.now(),
            zone: '',
            severity: 'low',
            description: '',
            diagnosed: false
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

        // Validation: If hasInjuries is true, must have at least one injury with zone
        if (hasInjuries) {
            if (injuries.length === 0) {
                toast.error('Si indicaste que tenés molestias, por favor agregá al menos una.')
                setLoading(false)
                return
            }
            if (injuries.some(i => !i.zone)) {
                toast.error('Por favor seleccioná la zona afectada para todas tus lesiones.')
                setLoading(false)
                return
            }
        }

        try {
            // Strip internal IDs before sending
            const cleanInjuries = injuries.map(({ id, ...rest }) => ({
                ...rest,
                created_at: new Date().toISOString(), // Add timestamp as requested
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
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Salud Física</h2>
                <p className="text-gray-500 text-sm">¿Tenés alguna molestia o limitación física actualmente?</p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-xl bg-white">
                <div className="space-y-0.5">
                    <Label className="text-base">Sí, tengo molestias/lesiones</Label>
                    <p className="text-xs text-gray-500">Habilitar para detallar.</p>
                </div>
                <Switch
                    checked={hasInjuries}
                    onCheckedChange={setHasInjuries}
                />
            </div>

            {hasInjuries && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    {injuries.map((injury, index) => (
                        <Card key={injury.id} className="p-4 space-y-4 relative border-l-4 border-l-amber-400">
                            <button
                                type="button"
                                onClick={() => removeInjury(injury.id)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            >
                                <Trash2 size={18} />
                            </button>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Zona</Label>
                                    <Select
                                        value={injury.zone}
                                        onValueChange={v => updateInjury(injury.id, 'zone', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Zona" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BODY_ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Severidad</Label>
                                    <Select
                                        value={injury.severity}
                                        onValueChange={v => updateInjury(injury.id, 'severity', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Nivel" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Leve (Molestia)</SelectItem>
                                            <SelectItem value="moderate">Moderada (Limita)</SelectItem>
                                            <SelectItem value="severe">Severa (Impide)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Descripción breve</Label>
                                <Textarea
                                    placeholder="Ej: Me duele al levantar peso..."
                                    value={injury.description}
                                    onChange={e => updateInjury(injury.id, 'description', e.target.value)}
                                    className="min-h-[60px]"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`diag-${injury.id}`}
                                    checked={injury.diagnosed}
                                    onCheckedChange={(c) => updateInjury(injury.id, 'diagnosed', !!c)}
                                />
                                <Label htmlFor={`diag-${injury.id}`} className="text-sm font-normal">
                                    Diagnosticado por profesional
                                </Label>
                            </div>
                        </Card>
                    ))}

                    <Button type="button" variant="outline" onClick={addInjury} className="w-full border-dashed">
                        <Plus className="mr-2 h-4 w-4" /> Agregar otra molestia
                    </Button>

                    <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-md text-xs">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>Tu coach tendrá en cuenta esto para filtrar ejercicios que puedan lastimarte.</p>
                    </div>
                </div>
            )}

            <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onPrev} disabled={loading} className="w-1/3">
                    Atrás
                </Button>
                <Button onClick={handleSubmit} className="w-2/3" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Siguiente
                </Button>
            </div>
        </div>
    )
}
