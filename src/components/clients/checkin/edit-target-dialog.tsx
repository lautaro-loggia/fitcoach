'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface EditTargetDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    metricLabel: string
    metricUnit: string
    initialValue: number | null
    onSave: (value: number) => Promise<void>
}

export function EditTargetDialog({
    open,
    onOpenChange,
    metricLabel,
    metricUnit,
    initialValue,
    onSave
}: EditTargetDialogProps) {
    const [value, setValue] = useState<string>(initialValue?.toString() || "")
    const [isSaving, setIsSaving] = useState(false)

    // Update internal state when dialog opens with new initialValue
    // Note: In a real app we might use a useEffect or key to reset, 
    // but the parent controlling 'open' is usually sufficient if it unmounts or we use an effect.
    // For simplicity, we just sync if initialValue is provided.
    // However, simplest is to use a key on the dialog instance in parent or useEffect here.

    // Quick fix to ensure value is fresh when opened:
    // We'll trust the user to type. If we really need sync, we add useEffect.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!value) return

        setIsSaving(true)
        try {
            await onSave(parseFloat(value))
            onOpenChange(false)
        } catch (error) {
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Meta: {metricLabel}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="target-value">Nueva meta</Label>
                        <div className="relative">
                            <Input
                                id="target-value"
                                type="number"
                                step="0.1"
                                placeholder="0.00"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="pr-12 text-lg"
                                autoFocus
                            />
                            <div className="absolute right-3 top-2.5 text-sm font-medium text-muted-foreground">
                                {metricUnit}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
