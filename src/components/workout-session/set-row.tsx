'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, MoreVertical, Pencil, Trash2 } from 'lucide-react'
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
    onDelete,
}: SetRowProps) {
    const [weight, setWeight] = useState(currentWeight ?? defaultWeight)
    const [reps, setReps] = useState(currentReps ?? defaultReps)
    const [isCompleted, setIsCompleted] = useState(initialCompleted)
    const [isEditing, setIsEditing] = useState(!initialCompleted)

    // Sync with props changes
    useEffect(() => {
        if (currentWeight !== undefined) setWeight(currentWeight)
        if (currentReps !== undefined) setReps(currentReps)
        setIsCompleted(initialCompleted)
        setIsEditing(!initialCompleted)
    }, [currentWeight, currentReps, initialCompleted])

    const handleComplete = () => {
        const newCompleted = !isCompleted
        setIsCompleted(newCompleted)
        setIsEditing(!newCompleted)
        onSave(reps, weight, newCompleted)
    }

    const handleEdit = () => {
        setIsEditing(true)
        setIsCompleted(false)
    }

    const handleWeightChange = (value: string) => {
        const num = parseFloat(value) || 0
        setWeight(num)
    }

    const handleRepsChange = (value: string) => {
        const num = parseInt(value) || 0
        setReps(num)
    }

    const handleBlur = () => {
        // Auto-save on blur if values changed
        if (!isCompleted) {
            onSave(reps, weight, false)
        }
    }

    return (
        <div
            className={cn(
                "grid grid-cols-[40px_1fr_80px_60px_50px] items-center gap-2 px-3 py-3 border-b border-border/50 last:border-0",
                isCompleted && "bg-muted/30"
            )}
        >
            {/* Set Number */}
            <span className={cn(
                "text-lg font-semibold",
                isCompleted ? "text-blue-500" : "text-muted-foreground"
            )}>
                {setNumber}
            </span>

            {/* Previous Data */}
            <span className="text-sm text-muted-foreground">
                {previousData
                    ? `${previousData.weight}kg x ${previousData.reps}`
                    : '-'
                }
            </span>

            {/* Weight Input */}
            <div className="flex items-center justify-center">
                <Input
                    type="number"
                    value={weight}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    step={0.5}
                    min={0}
                    className={cn(
                        "h-9 w-full text-center font-medium text-base",
                        "border-0 bg-transparent focus-visible:ring-0",
                        !isEditing && "opacity-70"
                    )}
                />
            </div>

            {/* Reps Input */}
            <div className="flex items-center justify-center">
                <Input
                    type="number"
                    value={reps}
                    onChange={(e) => handleRepsChange(e.target.value)}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    min={0}
                    className={cn(
                        "h-9 w-full text-center font-medium text-base",
                        "border-0 bg-transparent focus-visible:ring-0",
                        !isEditing && "opacity-70"
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
                        className={cn(
                            "h-9 w-9 rounded-md",
                            "bg-muted hover:bg-muted-foreground/20"
                        )}
                    >
                        <Check className="h-5 w-5 text-muted-foreground" />
                    </Button>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-md bg-green-500/20"
                            >
                                <Check className="h-5 w-5 text-green-600" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleEdit}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                            </DropdownMenuItem>
                            {onDelete && (
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
