'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { updateNutrition } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Loader2, Utensils, ShieldAlert, Sparkles, Brain, BicepsFlexed, Leaf, Sprout, Plus, Minus, Check, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALLERGENS_LIST = [
    'Gluten (TACC)', 'Lácteos', 'Huevos', 'Frutos Secos', 'Mariscos', 'Pescado', 'Soja'
]

const DIET_PREFS = [
    { id: 'no_preference', label: 'Sin preferencia', desc: 'Comés de todo un poco.', icon: Utensils },
    { id: 'high_protein', label: 'Alta en Proteína', desc: 'Priorizar músculo.', icon: BicepsFlexed },
    { id: 'vegetarian', label: 'Vegetariana', desc: 'Sin carne, incluye huevos y lácteos.', icon: Leaf },
    { id: 'vegan', label: 'Vegana', desc: '100% origen vegetal.', icon: Sprout },
    { id: 'keto', label: 'Keto / Low Carb', desc: 'Baja en hidratos.', icon: Brain },
]

export function StepNutrition({ client, onNext, onPrev, isPreview }: { client: any, onNext: () => void, onPrev: () => void, isPreview?: boolean }) {
    const [loading, setLoading] = useState(false)
    const savedInfo = client.dietary_info || {}

    const [formData, setFormData] = useState({
        diet_preference: savedInfo.preference || 'no_preference',
        meals_per_day: savedInfo.meals_count?.toString() || '4',
        experience: savedInfo.experience || 'none',
        allergens: (savedInfo.allergens as string[]) || [],
        other_restrictions: savedInfo.other || ''
    })

    const toggleAllergen = (allergen: string) => {
        if (formData.allergens.includes(allergen)) {
            setFormData({ ...formData, allergens: formData.allergens.filter((a: string) => a !== allergen) })
        } else {
            setFormData({ ...formData, allergens: [...formData.allergens, allergen] })
        }
    }

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
            const res = await updateNutrition({
                diet_preference: formData.diet_preference,
                meals_per_day: Number(formData.meals_per_day),
                experience: formData.experience,
                allergens: formData.allergens,
                other_restrictions: formData.other_restrictions
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
            <div className="space-y-1">
                <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">Nutrición</h2>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">
                    Ajustemos el plan a tus gustos y necesidades.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                    <Label className="text-sm font-bold text-[#1A1A1A]">Preferencia de Dieta</Label>
                    <div className="grid grid-cols-1 gap-3">
                        {DIET_PREFS.map((pref) => (
                            <button
                                key={pref.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, diet_preference: pref.id })}
                                className={cn(
                                    "flex items-center p-4 rounded-xl border-2 transition-all text-left",
                                    formData.diet_preference === pref.id
                                        ? "bg-white border-black shadow-md shadow-black/5"
                                        : "bg-[#F9F9F8] border-transparent hover:border-gray-200"
                                )}
                            >
                                <div className={cn("p-2 rounded-lg mr-4", formData.diet_preference === pref.id ? "bg-black text-white" : "bg-gray-100 text-gray-400")}>
                                    <pref.icon className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <span className={cn(
                                        "font-bold block text-sm",
                                        formData.diet_preference === pref.id ? "text-[#1A1A1A]" : "text-gray-600"
                                    )}>
                                        {pref.label}
                                    </span>
                                    <p className="text-[11px] text-gray-400">{pref.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4">
                        <Label className="text-sm font-bold text-[#1A1A1A]">Comidas por día</Label>
                        <div className="flex items-center gap-4 bg-white border border-gray-200 p-2 rounded-xl h-14">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    const current = Number(formData.meals_per_day)
                                    if (current > 1) setFormData({ ...formData, meals_per_day: (current - 1).toString() })
                                }}
                                className="h-10 w-10 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg"
                            >
                                <Minus className="w-4 h-4" />
                            </Button>
                            <div className="flex-1 text-center">
                                <span className="text-xl font-bold text-[#1A1A1A]">{formData.meals_per_day}</span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    const current = Number(formData.meals_per_day)
                                    if (current < 8) setFormData({ ...formData, meals_per_day: (current + 1).toString() })
                                }}
                                className="h-10 w-10 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium text-center">
                            4–5 suele funcionar bien para la mayoría.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-sm font-bold text-[#1A1A1A]">Experiencia con macros</Label>
                        <Select
                            value={formData.experience}
                            onValueChange={val => setFormData({ ...formData, experience: val })}
                        >
                            <SelectTrigger className="w-full h-14 border-gray-200 focus:ring-black rounded-xl">
                                <SelectValue placeholder="Seleccioná..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Principiante</SelectItem>
                                <SelectItem value="some">Intermedio</SelectItem>
                                <SelectItem value="high">Avanzado</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-gray-400 font-medium">
                            Esto define qué tan complejo será tu plan de comidas.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-sm font-bold text-[#1A1A1A] flex items-center justify-between">
                        Alergias o Restricciones
                        <span className="text-[10px] text-gray-400 lowercase font-normal italic">Seleccioná todas las que apliquen</span>
                    </Label>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {ALLERGENS_LIST.map(alg => {
                            const isSelected = formData.allergens.includes(alg)
                            return (
                                <button
                                    key={alg}
                                    type="button"
                                    onClick={() => toggleAllergen(alg)}
                                    className={cn(
                                        "px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2",
                                        isSelected
                                            ? "bg-black border-black text-white shadow-md shadow-black/10"
                                            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                                    )}
                                >
                                    {alg}
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                </button>
                            )
                        })}
                    </div>
                    <div className="relative mt-4">
                        <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Solo si no está en la lista..."
                            className="h-14 pl-11 border-gray-200 focus:ring-black rounded-xl text-sm bg-gray-50/50"
                            value={formData.other_restrictions}
                            onChange={e => setFormData({ ...formData, other_restrictions: e.target.value })}
                        />
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
                        type="submit"
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
