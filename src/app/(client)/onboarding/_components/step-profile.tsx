'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateBasicProfile } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { ArrowRight, Loader2 } from 'lucide-react'

export function StepProfile({ client, onNext, isNextTo, isPreview }: { client: any, onNext: () => void, isNextTo?: string, isPreview?: boolean }) {
    const [loading, setLoading] = useState(false)

    // Pre-fill if exists
    const [formData, setFormData] = useState({
        birth_date: client.birth_date ? new Date(client.birth_date).toISOString().split('T')[0] : '',
        height: client.height || '',
        weight: client.current_weight || client.initial_weight || '',
        gender: client.gender || ''
    })

    const calculateAge = (dob: string) => {
        if (!dob) return null
        const birthDate = new Date(dob)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age
    }

    const age = calculateAge(formData.birth_date)

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
            const res = await updateBasicProfile({
                birth_date: formData.birth_date,
                height: Number(formData.height),
                weight: Number(formData.weight),
                gender: formData.gender
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                onNext()
            }
        } catch (err) {
            toast.error('Ocurrió un error al guardar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">Perfil Básico</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                    Comencemos con lo fundamental para personalizar tu plan.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-bold text-[#1A1A1A]">Sexo</Label>
                    <Select
                        value={formData.gender}
                        onValueChange={v => setFormData({ ...formData, gender: v })}
                        required
                    >
                        <SelectTrigger id="gender" className="w-full h-12 border-gray-200 focus:ring-black transition-all">
                            <SelectValue placeholder="Seleccioná tu sexo..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Femenino</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="dob" className="text-sm font-bold text-[#1A1A1A]">Fecha de Nacimiento</Label>
                        {age !== null && age > 0 && (
                            <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full animate-in zoom-in-50">
                                {age} años
                            </span>
                        )}
                    </div>
                    <Input
                        id="dob"
                        type="date"
                        required
                        className="h-12 border-gray-200 focus:ring-black"
                        value={formData.birth_date}
                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="height" className="text-sm font-bold text-[#1A1A1A]">Altura</Label>
                        <div className="relative">
                            <Input
                                id="height"
                                type="number"
                                placeholder="175"
                                required
                                min={100}
                                max={250}
                                className="w-full h-12 pr-12 border-gray-200 focus:ring-black"
                                value={formData.height}
                                onChange={e => setFormData({ ...formData, height: e.target.value })}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">
                                cm
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="weight" className="text-sm font-bold text-[#1A1A1A]">Peso Actual</Label>
                        <div className="relative">
                            <Input
                                id="weight"
                                type="number"
                                placeholder="70.5"
                                required
                                step="0.1"
                                min={30}
                                max={300}
                                className="w-full h-12 pr-12 border-gray-200 focus:ring-black"
                                value={formData.weight}
                                onChange={e => setFormData({ ...formData, weight: e.target.value })}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">
                                kg
                            </span>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <Button
                        type="submit"
                        className="w-full h-14 text-base font-bold bg-[#1A1A1A] hover:bg-black shadow-lg shadow-black/10 transition-all rounded-xl group"
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                Continuar
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
