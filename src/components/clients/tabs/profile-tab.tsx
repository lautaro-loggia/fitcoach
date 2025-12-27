'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Plus, ArrowDown, ArrowUp, ImageIcon, TrendingDown, TrendingUp } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import Image from 'next/image'
import { AddCheckinDialog } from '../add-checkin-dialog'
import { PhotoComparisonDialog } from '../photo-comparison-dialog'

interface ProfileTabProps {
    client: any
}

const goalTranslations: { [key: string]: string } = {
    gain_muscle: "Ganar Músculo",
    lose_weight: "Perder Peso",
    maintenance: "Mantenimiento",
    improve_endurance: "Mejorar Resistencia",
    increase_strength: "Aumentar Fuerza"
}

const activityTranslations: { [key: string]: string } = {
    sedentary: "Sedentario",
    light: "Ligero",
    moderate: "Moderado",
    active: "Activo",
    very_active: "Muy Activo"
}


export function ProfileTab({ client }: ProfileTabProps) {
    const [checkins, setCheckins] = useState<any[]>([])
    const [photos, setPhotos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [client.id])

    const fetchData = async () => {
        try {
            const supabase = createClient()

            // Fetch checkins for charts and history
            const { data: checkinsData, error } = await supabase
                .from('checkins')
                .select('*')
                .eq('client_id', client.id)
                .order('date', { ascending: true })

            if (error) {
                console.error("Error fetching checkins:", error)
                return
            }

            if (checkinsData) {
                setCheckins(checkinsData)

                // Extract photos
                // Assuming checkin.photos is string[]
                const allPhotos: any[] = []
                checkinsData.forEach(c => {
                    if (c.photos && Array.isArray(c.photos)) {
                        c.photos.forEach((url: string) => {
                            allPhotos.push({
                                id: c.id, // Use checkin ID as base, ideally photos should have unique IDs if in separate table, but here url is unique enough or index
                                url,
                                date: c.date,
                                weight: c.weight,
                                bodyFat: c.body_fat
                            })
                        })
                    }
                })
                // Sort photos descending
                setPhotos(allPhotos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
            }
        } catch (err) {
            console.error("UNEXPECTED ERROR in ProfileTab fetchData:", err)
        } finally {
            setLoading(false)
        }
    }

    // -- Process Data for Charts --

    // Last 6 months or all data? Design shows months abbreviated.
    const weightData = checkins.map(c => ({
        name: format(new Date(c.date), 'MMM', { locale: es }),
        fullDate: c.date,
        weight: c.weight,
    })).slice(-6) // Last 6 entries for simplicity in view, or aggregate by month?
    // Use raw entries for now, assuming 1 checkin per month roughly or just showing last N points.
    // Ideally, aggregate mainly if multiple checkins per month.

    const bodyFatData = checkins.map(c => ({
        name: format(new Date(c.date), 'MMM', { locale: es }),
        fullDate: c.date,
        fat: c.body_fat
    })).filter(d => d.fat).slice(-6)

    // -- Metrics Calculation --
    const currentWeight = checkins.length > 0 ? checkins[checkins.length - 1].weight : client.initial_weight
    const previousWeight = checkins.length > 1 ? checkins[checkins.length - 2].weight : client.initial_weight
    const weightDiff = currentWeight - previousWeight

    const currentFat = checkins.length > 0 ? checkins[checkins.length - 1].body_fat : client.initial_body_fat
    const previousFat = checkins.length > 1 ? checkins[checkins.length - 2].body_fat : client.initial_body_fat
    const fatDiff = (currentFat && previousFat) ? currentFat - previousFat : 0


    // -- Mock Updates (Since we don't have a notifications system yet) --
    // We can generate "Updates" from checkins
    const updates = checkins.slice().reverse().slice(0, 3).map(c => ({
        title: "Actualización corporal",
        description: "Se actualizaron las medidas corporales del asesorado.",
        daysAgo: Math.floor((new Date().getTime() - new Date(c.date).getTime()) / (1000 * 3600 * 24))
    }))

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Top Cards: Objectives */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-background">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Objetivo personal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {client.goal_text || "Sin objetivo definido."}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-background">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Objetivo a realizar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground capitalize">
                            {client.goal_specific ? (goalTranslations[client.goal_specific] || client.goal_specific.replace(/_/g, ' ')) : "Mantener"}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-background">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Nivel de actividad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground capitalize">
                            {client.activity_level ? (activityTranslations[client.activity_level] || client.activity_level.replace(/_/g, ' ')) : "Moderado"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row: Metrics & Photos */}
            <div className="grid gap-4 md:grid-cols-3">

                {/* Weight Card */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Peso Actual</CardTitle>
                        {client.target_weight && (
                            <Badge variant="secondary" className="text-xs font-normal">
                                Peso objetivo {client.target_weight}kg
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-3xl font-bold">{currentWeight} kg</span>
                            {weightDiff !== 0 && (
                                <Badge
                                    variant="secondary"
                                    className={`${weightDiff > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} mb-1 flex items-center gap-1`}
                                >
                                    {Math.abs(weightDiff).toFixed(1)}kg
                                    {weightDiff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                </Badge>
                            )}
                        </div>
                        <div className="h-[150px] w-full mt-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weightData}>
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#888' }}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none' }}
                                        cursor={{ fill: '#f4f4f5' }}
                                    />
                                    <Bar dataKey="weight" radius={[4, 4, 0, 0]}>
                                        {weightData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={index === weightData.length - 1 ? '#ea580c' : '#e4e4e7'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Body Fat Card */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Grasa corporal</CardTitle>
                        {client.target_fat && (
                            <Badge variant="secondary" className="text-xs font-normal">
                                Grasa objetiva {client.target_fat}%
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-3xl font-bold">{currentFat || '-'}%</span>
                            {fatDiff !== 0 && (
                                <Badge
                                    variant="secondary"
                                    className={`${fatDiff > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} mb-1 flex items-center gap-1`}
                                >
                                    {Math.abs(fatDiff).toFixed(1)}%
                                    {fatDiff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                </Badge>
                            )}
                        </div>
                        <div className="h-[150px] w-full mt-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={bodyFatData}>
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#888' }}
                                    />
                                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="fat"
                                        stroke="#ea580c"
                                        strokeWidth={3}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Photos Card */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Fotos del progreso</CardTitle>
                        <AddCheckinDialog clientId={client.id} />
                        {/* Note: Ideally just a small 'Add' trigger, but reusing dialog for now. 
                      Modify AddCheckinDialog to custom trigger in future or use here. */}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <div className="space-y-4 flex-1 overflow-y-auto max-h-[220px] scrollbar-hide py-2">
                            {photos.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-8">Sin fotos aún</p>
                            )}
                            {photos.slice(0, 3).map((photo, i) => (
                                <div key={i} className="flex gap-3 items-center">
                                    <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                        <Image src={photo.url} alt="Progress" fill className="object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">{format(new Date(photo.date), "d 'de' MMMM, yyyy", { locale: es })}</p>
                                        <p className="text-xs font-medium">{photo.weight ? `${photo.weight}kg` : ''}</p>
                                    </div>
                                    {/* Mock Diff badge for list */}
                                    <Badge variant="secondary" className="text-[10px] h-5 bg-red-100 text-red-700">
                                        -1kg <ArrowDown className="h-2 w-2 ml-0.5" />
                                    </Badge>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 mt-4 pt-2 border-t">
                            <Button variant="outline" size="sm" className="flex-1 text-xs">
                                <Eye className="mr-2 h-3 w-3" /> Ver todo
                            </Button>
                            <PhotoComparisonDialog photos={photos} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Updates */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-muted-foreground">Actualizaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {updates.length === 0 && <p className="text-sm text-muted-foreground">No hay actualizaciones recientes.</p>}
                            {updates.map((update, i) => (
                                <div key={i} className="flex justify-between items-start pb-4 border-b last:border-0 last:pb-0">
                                    <div>
                                        <h4 className="font-semibold text-sm">{update.title}</h4>
                                        <p className="text-sm text-muted-foreground">{update.description}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{update.daysAgo} dias</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* General Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-bold">Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <span className="block text-xs text-muted-foreground mb-1">Email</span>
                            <p className="font-medium text-sm">{client.email || '-'}</p>
                        </div>
                        <div>
                            <span className="block text-xs text-muted-foreground mb-1">Teléfono</span>
                            <p className="font-medium text-sm">{client.phone || '-'}</p>
                        </div>
                        <div>
                            <span className="block text-xs text-muted-foreground mb-1">Fecha de Nacimiento</span>
                            <p className="font-medium text-sm">
                                {client.birth_date ? format(new Date(client.birth_date), 'dd/MM/yyyy') : '-'}
                            </p>
                        </div>
                        <div>
                            <span className="block text-xs text-muted-foreground mb-1">Altura</span>
                            <p className="font-medium text-sm">{client.height ? `${client.height} cm` : '-'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
