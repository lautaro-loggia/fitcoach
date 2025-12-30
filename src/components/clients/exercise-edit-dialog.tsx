"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Save } from "lucide-react"

interface ExerciseEditDialogProps {
    isOpen: boolean
    onClose: () => void
    exerciseName: string
    initialSets?: any[]
    onSave: (sets: any[]) => void
}

export function ExerciseEditDialog({
    isOpen,
    onClose,
    exerciseName,
    initialSets = [],
    onSave
}: ExerciseEditDialogProps) {
    // We'll normalize sets to have a uniform structure
    const [sets, setSets] = useState<any[]>(
        initialSets.length > 0
            ? initialSets
            : [{ reps: "8-10", weight: "0kg", rest: "1:00" }]
    )

    const handleAddSet = () => {
        setSets([...sets, { reps: "8-10", weight: "0kg", rest: "1:00" }])
    }

    const handleRemoveSet = (index: number) => {
        setSets(sets.filter((_, i) => i !== index))
    }

    const updateSet = (index: number, field: string, value: string) => {
        const newSets = [...sets]
        newSets[index] = { ...newSets[index], [field]: value }
        setSets(newSets)
    }

    const handleSave = () => {
        onSave(sets)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{exerciseName}</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <div className="grid grid-cols-12 gap-4 mb-2 text-sm font-medium text-muted-foreground text-center">
                        <div className="col-span-1">N</div>
                        <div className="col-span-3">Repes</div>
                        <div className="col-span-3">Peso</div>
                        <div className="col-span-3">Descanso</div>
                        <div className="col-span-2"></div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {sets.map((set, index) => (
                            <div key={index} className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-1 text-center font-medium">
                                    {index + 1}
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        value={set.reps || ""}
                                        onChange={(e) => updateSet(index, 'reps', e.target.value)}
                                        className="h-8 text-center"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        value={set.weight || ""}
                                        onChange={(e) => updateSet(index, 'weight', e.target.value)}
                                        className="h-8 text-center"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        value={set.rest || ""}
                                        onChange={(e) => updateSet(index, 'rest', e.target.value)}
                                        className="h-8 text-center"
                                    />
                                </div>
                                <div className="col-span-2 flex justify-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemoveSet(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={handleAddSet}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Agregar Set
                    </Button>
                </div>

                <DialogFooter className="flex sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                    <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white">Guadar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
