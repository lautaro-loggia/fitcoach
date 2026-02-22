'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface AddMealDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (name: string) => void
    dayName: string
}

export function AddMealDialog({ open, onOpenChange, onConfirm, dayName }: AddMealDialogProps) {
    const [name, setName] = useState('')

    const handleConfirm = () => {
        if (!name.trim()) return
        onConfirm(name.trim())
        setName('')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Agregar comida a {dayName}</DialogTitle>
                    <DialogDescription>
                        Ingresa el nombre de la nueva comida (por ejemplo, "Snack Post-Entreno", "Cena 2").
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre de la comida</Label>
                        <Input
                            id="name"
                            autoComplete="off"
                            placeholder="Ej. Snack de tarde"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleConfirm()
                                }
                            }}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={!name.trim()}>
                        Agregar Comida
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
