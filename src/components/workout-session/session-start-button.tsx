'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Play,
    ChevronRight,
    Users,
    Dumbbell,
    Clock
} from 'lucide-react'
import { getTodaysWorkouts } from '@/app/(dashboard)/session/actions'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'

interface TodayWorkout {
    id: string
    name: string
    structure: any[]
    clients: {
        id: string
        full_name: string
    } | null
}

export function SessionStartButton() {
    const router = useRouter()
    const [workouts, setWorkouts] = useState<TodayWorkout[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadWorkouts()
    }, [])

    const loadWorkouts = async () => {
        setLoading(true)
        const { workouts: data } = await getTodaysWorkouts()
        if (data) {
            // Transform data to match our interface
            const transformed = data.map((w: any) => ({
                ...w,
                clients: Array.isArray(w.clients) ? w.clients[0] : w.clients
            }))
            setWorkouts(transformed as TodayWorkout[])
        }
        setLoading(false)
    }

    const handleSelectWorkout = (workout: TodayWorkout) => {
        if (!workout.clients) return
        // Navigate to session start with workout
        router.push(`/session/start?workoutId=${workout.id}&clientId=${workout.clients.id}`)
        setIsOpen(false)
    }

    // Only show on mobile
    return (
        <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-2 border-dashed border-green-500/30 bg-green-500/5">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Play className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-green-600">Iniciar Sesión</h3>
                                <p className="text-sm text-muted-foreground">
                                    Entrenar con un asesorado
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Dumbbell className="h-5 w-5" />
                            Entrenamientos de Hoy
                        </SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-3">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                            </div>
                        ) : workouts.length === 0 ? (
                            <div className="text-center py-12 space-y-2">
                                <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground">
                                    No hay entrenamientos programados para hoy
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Asigná una rutina con días programados a tus asesorados
                                </p>
                            </div>
                        ) : (
                            workouts.map((workout) => (
                                <Card
                                    key={workout.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => handleSelectWorkout(workout)}
                                >
                                    <CardContent className="flex items-center gap-4 p-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium truncate">
                                                {(workout.clients as any)?.full_name || 'Cliente'}
                                            </h4>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {workout.name} • {workout.structure?.length || 0} ejercicios
                                            </p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
