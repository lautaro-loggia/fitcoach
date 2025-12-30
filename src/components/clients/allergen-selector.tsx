"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Save } from "lucide-react"

export const ALLERGEN_OPTIONS = [
    { id: "huevo", label: "Huevo" },
    { id: "pescado", label: "Pescado" },
    { id: "gluten", label: "Gluten" },
    { id: "lactosa", label: "Lactosa" },
    { id: "leche", label: "Leche" },
    { id: "frutos_secos", label: "Frutos secos" },
    { id: "mani", label: "Maní" },
    { id: "sesamo", label: "Sésamo" },
    { id: "marisco", label: "Marisco" },
    { id: "soja", label: "Soja" },
]

export const DIETARY_PREFERENCES = [
    { id: "sin_restricciones", label: "Sin restricciones" },
    { id: "vegetariana", label: "Vegetariana" },
    { id: "vegana", label: "Vegana" },
]

interface AllergenSelectorProps {
    initialAllergens: string[]
    initialPreference: string
    onSave: (allergens: string[], preference: string) => Promise<void>
}

export function AllergenSelector({ initialAllergens, initialPreference, onSave }: AllergenSelectorProps) {
    const [allergens, setAllergens] = useState<string[]>(initialAllergens || [])
    const [preference, setPreference] = useState<string>(initialPreference || "sin_restricciones")
    const [loading, setLoading] = useState(false)
    const [isModified, setIsModified] = useState(false)

    useEffect(() => {
        setAllergens(initialAllergens || [])
        setPreference(initialPreference || "sin_restricciones")
        setIsModified(false)
    }, [initialAllergens, initialPreference])

    const toggleAllergen = (id: string) => {
        setAllergens(prev => {
            const next = prev.includes(id)
                ? prev.filter(a => a !== id)
                : [...prev, id]
            setIsModified(true) // Simple dirty check could be better (deep compare), but sufficient
            return next
        })
    }

    const handlePreferenceChange = (val: string) => {
        setPreference(val)
        setIsModified(true)
    }

    const handleSave = async () => {
        setLoading(true)
        await onSave(allergens, preference)
        setLoading(false)
        setIsModified(false)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-bold">Restricciones Alimentarias</CardTitle>
                <CardDescription>
                    Configura las alergias y tipo de dieta para evitar ingredientes prohibidos.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Dietary Preference */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium">Preferencia de Dieta</h4>
                    <RadioGroup
                        value={preference}
                        onValueChange={handlePreferenceChange}
                        className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                    >
                        {DIETARY_PREFERENCES.map(opt => (
                            <div key={opt.id} className="flex items-center space-x-2">
                                <RadioGroupItem value={opt.id} id={`pref-${opt.id}`} />
                                <Label htmlFor={`pref-${opt.id}`}>{opt.label}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>

                {/* Allergens */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium">Alergenos</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {ALLERGEN_OPTIONS.map(opt => (
                            <div key={opt.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`allergen-${opt.id}`}
                                    checked={allergens.includes(opt.id) || allergens.includes(opt.label)} // Handle both lowercase id and label if stored differently, but we control storage
                                    onCheckedChange={() => toggleAllergen(opt.id)}
                                />
                                <Label htmlFor={`allergen-${opt.id}`} className="cursor-pointer">
                                    {opt.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        onClick={handleSave}
                        disabled={loading || !isModified}
                        className={isModified ? "bg-primary hover:bg-primary/90" : ""}
                        variant={isModified ? "default" : "outline"}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Guardando..." : "Guardar Preferencias"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
