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
import { Loader2 } from 'lucide-react'

// Allergens based on standard list + prompt requests
const ALLERGENS_LIST = [
    'Gluten (TACC)', 'Lácteos', 'Huevos', 'Frutos Secos', 'Mariscos', 'Pescado', 'Soja'
]

export function StepNutrition({ client, onNext, onPrev }: { client: any, onNext: () => void, onPrev: () => void }) {
    const [loading, setLoading] = useState(false)

    const savedInfo = client.dietary_info || {}

    const [formData, setFormData] = useState({
        diet_preference: savedInfo.preference || 'no_preference',
        meals_per_day: savedInfo.meals_count?.toString() || '4',
        experience: savedInfo.experience || 'none',
        allergens: (savedInfo.allergens as string[]) || [], // array of strings
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
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Nutrición</h2>
                <p className="text-gray-500 text-sm">Preferencias para tu plan de alimentación.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                <div className="space-y-3">
                    <Label>Preferencia de Dieta</Label>
                    <Select
                        value={formData.diet_preference}
                        onValueChange={(val) => setFormData({ ...formData, diet_preference: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccioná..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="no_preference">Sin preferencia especial</SelectItem>
                            <SelectItem value="high_protein">Alta en Proteína</SelectItem>
                            <SelectItem value="vegetarian">Vegetariana</SelectItem>
                            <SelectItem value="vegan">Vegana</SelectItem>
                            <SelectItem value="keto">Keto / Low Carb</SelectItem>
                            <SelectItem value="other">Otra</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label>Comidas por día (aprox)</Label>
                    <Input
                        type="number"
                        min={1}
                        max={8}
                        value={formData.meals_per_day}
                        onChange={e => setFormData({ ...formData, meals_per_day: e.target.value })}
                    />
                </div>

                <div className="space-y-3">
                    <Label>Experiencia con dietas/macros</Label>
                    <RadioGroup
                        value={formData.experience}
                        onValueChange={val => setFormData({ ...formData, experience: val })}
                        className="flex flex-col space-y-1"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="exp1" />
                            <Label htmlFor="exp1" className="font-normal">Ninguna / Poca</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="some" id="exp2" />
                            <Label htmlFor="exp2" className="font-normal">Algo de experiencia</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="high" id="exp3" />
                            <Label htmlFor="exp3" className="font-normal">Mucha (Trackeo macros, etc)</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-3">
                    <Label>Alergias o Restricciones</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {ALLERGENS_LIST.map(alg => (
                            <div key={alg} className="flex items-center space-x-2 border p-2 rounded-md">
                                <Checkbox
                                    id={alg}
                                    checked={formData.allergens.includes(alg)}
                                    onCheckedChange={() => toggleAllergen(alg)}
                                />
                                <Label htmlFor={alg} className="font-normal text-xs cursor-pointer select-none">
                                    {alg}
                                </Label>
                            </div>
                        ))}
                    </div>
                    <Input
                        placeholder="Otras restricciones (opcional)..."
                        value={formData.other_restrictions}
                        onChange={e => setFormData({ ...formData, other_restrictions: e.target.value })}
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={onPrev} disabled={loading} className="w-1/3">
                        Atrás
                    </Button>
                    <Button type="submit" className="w-2/3" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Siguiente
                    </Button>
                </div>
            </form>
        </div>
    )
}
