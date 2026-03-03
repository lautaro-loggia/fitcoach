import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Dumbbell, Calendar, Info } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatStoredWorkoutRest } from '@/lib/workout-rest'

export default async function WorkoutDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: workout, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !workout) {
        notFound()
    }

    const exercises = Array.isArray(workout.structure) ? workout.structure : []

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/workouts">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{workout.name}</h2>
                    {workout.description && (
                        <p className="text-muted-foreground">{workout.description}</p>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Workout Info */}
                <Card className="md:col-span-1 border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Info className="h-5 w-5" />
                            Resumen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Ejercicios</span>
                            <Badge variant="secondary" className="text-lg">{exercises.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Series Totales</span>
                            <Badge variant="secondary" className="text-lg">
                                {exercises.reduce((acc: number, ex: any) => acc + (parseInt(ex.sets) || 0), 0)}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Exercises List */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Dumbbell className="h-5 w-5" />
                            Planificación
                        </CardTitle>
                        <CardDescription>Detalle de ejercicios, series y repeticiones.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {exercises.map((ex: any, index: number) => (
                                <div
                                    key={index}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-lg">{ex.name}</p>
                                            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                                {ex.rest && <Badge variant="outline" className="text-xs">Descanso: {formatStoredWorkoutRest(ex.rest)}</Badge>}
                                                {ex.rpe && <Badge variant="outline" className="text-xs">RPE: {ex.rpe}</Badge>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-6 text-center">
                                        <div>
                                            <p className="text-xl font-bold">{ex.sets}</p>
                                            <p className="text-xs text-muted-foreground uppercase">Series</p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold">{ex.reps}</p>
                                            <p className="text-xs text-muted-foreground uppercase">Reps</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {exercises.length === 0 && (
                                <p className="text-muted-foreground">No hay ejercicios en esta rutina.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
