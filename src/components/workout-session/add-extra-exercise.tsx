'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Check, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { searchExercises } from '@/app/(dashboard)/workouts/actions'
import { cn } from '@/lib/utils'

interface AddExtraExerciseProps {
    onAdd: (exercise: any) => void
}

export function AddExtraExercise({ onAdd }: AddExtraExerciseProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [exercises, setExercises] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open) {
            setQuery('')
            setExercises([])
            return
        }

        const timer = setTimeout(async () => {
            setLoading(true)
            try {
                const { exercises: results } = await searchExercises(query, 20)
                setExercises(results || [])
            } catch (error) {
                console.error('Error searching exercises:', error)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query, open])

    const handleSelect = (exercise: any) => {
        onAdd(exercise)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    className="w-full bg-card border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30 text-foreground rounded-2xl p-6 transition-all active:scale-[0.98] group flex flex-col items-center justify-center gap-3"
                >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-bold group-hover:text-primary transition-colors">Agregar ejercicio extra</h3>
                        <p className="text-sm text-muted-foreground">Busca y añade un ejercicio a tu rutina</p>
                    </div>
                </button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-32px)] sm:max-w-[450px] p-0 gap-0 overflow-hidden rounded-[32px] border shadow-2xl">
                <DialogHeader className="p-6 pb-3 text-left">
                    <DialogTitle className="text-xl font-bold">Agregar ejercicio</DialogTitle>
                    <p className="text-xs text-muted-foreground">Busca y añade un ejercicio extra a tu sesión</p>
                </DialogHeader>
                <div className="px-6 pb-4">
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Ej: Press de banca, Sentadillas..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-10 h-11 rounded-xl border-muted bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background transition-all text-sm w-full"
                            autoFocus
                        />
                    </div>
                </div>

                <ScrollArea className="h-[50vh] px-2">
                    <div className="p-3 space-y-1">
                        {loading ? (
                            <div className="p-8 text-center">
                                <span className="text-sm text-muted-foreground animate-pulse">Buscando ejercicios...</span>
                            </div>
                        ) : exercises.length > 0 ? (
                            exercises.map((ex) => (
                                <button
                                    key={ex.id}
                                    onClick={() => handleSelect(ex)}
                                    className="w-full flex items-center gap-3 p-3 text-left rounded-2xl hover:bg-muted/50 active:bg-muted transition-all border border-transparent hover:border-border group"
                                >
                                    <div className="h-12 w-12 rounded-xl bg-white flex-shrink-0 flex items-center justify-center overflow-hidden border shadow-sm">
                                        {ex.gif_url ? (
                                            <img src={ex.gif_url} alt={ex.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <Dumbbell className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-1">
                                        <p className="font-bold text-[14px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                            {ex.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase tracking-tight font-bold mt-0.5">
                                            <span className="inline-block w-1 h-1 rounded-full bg-primary/40" />
                                            {ex.main_muscle_group}
                                        </p>
                                    </div>
                                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shrink-0">
                                        <Plus className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                </button>
                            ))
                        ) : query.length > 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-muted-foreground font-medium">No encontramos "{query}"</p>
                                <p className="text-sm text-muted-foreground/60 mt-1">Intenta con otro nombre</p>
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <Dumbbell className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium text-lg">Tu próximo ejercicio</p>
                                <p className="text-sm text-muted-foreground/60">Escribe el nombre para empezar</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
