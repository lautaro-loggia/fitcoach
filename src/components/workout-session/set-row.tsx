'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface SetRowProps {
    setNumber: number
    previousData: { weight: number; reps: number } | null
    defaultWeight: number
    defaultReps: number
    currentWeight?: number
    currentReps?: number
    isCompleted: boolean
    onSave: (reps: number, weight: number, isCompleted: boolean) => void
    canDelete?: boolean
    onDelete?: () => void
}

export function SetRow({
    setNumber,
    previousData,
    defaultWeight,
    defaultReps,
    currentWeight,
    currentReps,
    isCompleted: initialCompleted,
    onSave,
    canDelete = false,
    onDelete,
}: SetRowProps) {
    const [weight, setWeight] = useState<string>((currentWeight ?? defaultWeight).toString())
    const [reps, setReps] = useState<string>((currentReps ?? defaultReps).toString())
    const [isCompleted, setIsCompleted] = useState(initialCompleted)
    const [isEditing, setIsEditing] = useState(!initialCompleted)

    // Sync with props changes
    useEffect(() => {
        if (currentWeight !== undefined) setWeight(currentWeight.toString())
        if (currentReps !== undefined) setReps(currentReps.toString())
        setIsCompleted(initialCompleted)
        setIsEditing(!initialCompleted)
    }, [currentWeight, currentReps, initialCompleted])

    const handleComplete = () => {
        const newCompleted = !isCompleted
        setIsCompleted(newCompleted)
        setIsEditing(!newCompleted)
        onSave(parseInt(reps) || 0, parseFloat(weight) || 0, newCompleted)
    }

    const handleEdit = () => {
        setIsEditing(true)
        setIsCompleted(false)
    }

    const handleReset = () => {
        setWeight(defaultWeight.toString())
        setReps(defaultReps.toString())
        setIsEditing(true)
        setIsCompleted(false)
        onSave(defaultReps, defaultWeight, false)
    }

    const handleWeightChange = (value: string) => {
        setWeight(value)
    }

    const handleRepsChange = (value: string) => {
        setReps(value)
    }

    const handleWeightFocus = () => {
        if (weight === '0') setWeight('')
    }

    const handleRepsFocus = () => {
        if (reps === '0') setReps('')
    }

    const handleBlur = () => {
        // Auto-save on blur if values changed
        if (!isCompleted) {
            onSave(parseInt(reps) || 0, parseFloat(weight) || 0, false)
        }

        // Restore 0 if left empty
        if (weight === '') setWeight('0')
        if (reps === '') setReps('0')
    }

    return (
        <div className={cn("grid grid-cols-[40px_1fr_70px_60px_40px] items-center gap-2 py-3 border-b border-border/50 last:border-0")}>
            {/* Set Number */}
            <span className="text-sm font-semibold text-center">
                {setNumber}
            </span>

            {/* Previous Data */}
            <span className="text-sm text-muted-foreground text-center">
                {previousData
                    ? `${previousData.weight}kg x${previousData.reps}`
                    : '-'
                }
            </span>

            {/* Weight Input */}
            <div className="flex items-center justify-center relative">
                <Input
                    type="number"
                    value={weight}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    onFocus={handleWeightFocus}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    step={0.5}
                    min={0}
                    className={cn(
                        "h-8 w-full text-center font-medium bg-transparent border-none p-0 focus-visible:ring-0",
                        !isEditing && "text-foreground"
                    )}
                />
                <span className="text-xs text-muted-foreground absolute right-0 pointer-events-none">kg</span>
            </div>

            {/* Reps Input */}
            <div className="flex items-center justify-center">
                <Input
                    type="number"
                    value={reps}
                    onChange={(e) => handleRepsChange(e.target.value)}
                    onFocus={handleRepsFocus}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    min={0}
                    className={cn(
                        "h-8 w-full text-center font-medium bg-transparent border-none p-0 focus-visible:ring-0",
                        !isEditing && "text-foreground"
                    )}
                />
            </div>

            {/* Check Button / Menu */}
            <div className="flex items-center justify-center">
                {isEditing ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleComplete}
                        className="h-8 w-8 rounded-md bg-muted hover:bg-muted-foreground/20 text-muted-foreground"
                    >
                        <Check className="h-4 w-4" />
                    </Button>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="default"
                                size="icon"
                                className="h-8 w-8 rounded-md bg-foreground hover:bg-foreground/90 text-background"
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleEdit}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleReset}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reiniciar
                            </DropdownMenuItem>
                            {canDelete && onDelete && (
                                <DropdownMenuItem
                                    onClick={onDelete}
                                    className="text-destructive"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    )
}
