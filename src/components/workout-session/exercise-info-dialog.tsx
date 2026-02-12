"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info, PlayCircle } from "lucide-react"
import Image from "next/image"

interface ExerciseInfoDialogProps {
    name: string
    gifUrl?: string
    instructions?: string[]
    trigger?: React.ReactNode
}

export function ExerciseInfoDialog({ name, gifUrl, instructions, trigger }: ExerciseInfoDialogProps) {
    if (!gifUrl && (!instructions || instructions.length === 0)) return null

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Info className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {gifUrl && (
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted border shadow-inner">
                            <img
                                src={gifUrl}
                                alt={name}
                                className="object-cover w-full h-full"
                            />
                        </div>
                    )}

                    {instructions && instructions.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Instrucciones</h4>
                            <ol className="space-y-3">
                                {instructions.map((step, index) => (
                                    <li key={index} className="text-sm leading-relaxed flex gap-3">
                                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="text-foreground/90">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
