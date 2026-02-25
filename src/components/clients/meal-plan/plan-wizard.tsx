'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface PlanWizardProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (config: string[]) => void
}

export function PlanWizard({ open, onOpenChange, onConfirm }: PlanWizardProps) {
    const [meals, setMeals] = useState([
        { id: 'desayuno', label: 'Desayuno', checked: true },
        { id: 'snack_am', label: 'Snack (Media Mañana)', checked: false },
        { id: 'almuerzo', label: 'Almuerzo', checked: true },
        { id: 'merienda', label: 'Merienda', checked: true },
        { id: 'cena', label: 'Cena', checked: true },
        { id: 'snack_pm', label: 'Snack (Noche)', checked: false },
    ])

    const handleToggle = (id: string, checked: boolean) => {
        setMeals(meals.map(m => m.id === id ? { ...m, checked } : m))
    }

    const handleConfirm = () => {
        const selectedMeals = meals.filter(m => m.checked).map(m => m.label)
        onConfirm(selectedMeals)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Configuración del Plan</DialogTitle>
                    <DialogDescription>
                        Selecciona las comidas que se aplicarán a todos los días de la semana. Podrás personalizar cada día después.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {meals.map((meal) => (
                        <div key={meal.id} className="flex items-center space-x-3 border p-4 rounded-md">
                            <Checkbox
                                id={meal.id}
                                checked={meal.checked}
                                onCheckedChange={(c) => handleToggle(meal.id, c as boolean)}
                            />
                            <Label
                                htmlFor={meal.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
                            >
                                {meal.label}
                            </Label>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={!meals.some(m => m.checked)} className="cursor-pointer disabled:cursor-not-allowed">
                        Crear Plan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
