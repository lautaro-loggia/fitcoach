'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Plus, ArrowDown, ArrowUp, ImageIcon, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { BarChart, Bar, AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, subMonths, parseISO, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import Image from 'next/image'
import { AddCheckinDialog } from '../add-checkin-dialog'
import { PhotoComparisonDialog } from '../photo-comparison-dialog'
import { getWeightProgressColor, progressColorClasses } from '@/lib/utils/progress-colors'
import { StrengthProgressCard } from '../cards/strength-progress-card'

interface ProfileTabProps {
    client: any
}

const goalTranslations: { [key: string]: string } = {
    gain_muscle: "Ganar Músculo",
    lose_weight: "Perder Peso",
    maintenance: "Mantenimiento",
    improve_endurance: "Mejorar Resistencia",
    increase_strength: "Aumentar Fuerza",
    // New values from onboarding
    fat_loss: "Pérdida de grasa",
    muscle_gain: "Ganancia muscular",
    recomp: "Recomposición corporal",
    performance: "Rendimiento",
    health: "Salud general"
}

const activityTranslations: { [key: string]: string } = {
    sedentary: "Sedentario",
    light: "Ligero",
    moderate: "Moderado",
    active: "Activo",
    very_active: "Muy Activo"
}

const workTypeTranslations: { [key: string]: string } = {
    sedentary: "Oficina / Sedentario",
    mixed: "Mixto (Parado/Sentado)",
    physical: "Físico / Activo"
}

export function ProfileTab({ client }: ProfileTabProps) {
    const router = useRouter()
    const [checkins, setCheckins] = useState<any[]>([])
    // ... (keep existing state)

    // -- Photos State (Missing in previous step) --
    const [photos, setPhotos] = useState<any[]>([])

    useEffect(() => {
        fetchData()
    }, [client.id])

    const fetchData = async () => {
        try {
            const supabase = createClient()
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

                // Process photos for top checkins (limit 5 for performance)
                const sortedCheckins = [...checkinsData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                const checkinsWithPhotos = sortedCheckins.filter(c => c.photos && Array.isArray(c.photos) && c.photos.length > 0).slice(0, 5)

                const processedPhotos = await Promise.all(checkinsWithPhotos.map(async (c) => {
                    let photos = c.photos as any[]
                    // Fix: Parse JSON strings if photos are stored as serialized strings
                    if (photos && photos.length > 0 && typeof photos[0] === 'string') {
                        try {
                            photos = photos.map(p => typeof p === 'string' ? JSON.parse(p) : p)
                        } catch (e) {
                            console.error('Error parsing photos JSON', e)
                        }
                    }

                    // Sign ALL photos in parallel to populate dialog immediately
                    const photosWithSignedUrls = await Promise.all(photos.map(async (p) => {
                        let signedUrl = p.url
                        // Try to get path from property OR extract from URL if legacy
                        let storagePath = p.path
                        if (!storagePath && p.url && p.url.includes('/checkin-images/')) {
                            // Extract everything after /checkin-images/
                            storagePath = p.url.split('/checkin-images/')[1]
                        }

                        if (storagePath) {
                            const { data } = await supabase.storage
                                .from('checkin-images')
                                .createSignedUrl(storagePath, 3600)
                            if (data?.signedUrl) signedUrl = data.signedUrl
                        }
                        return { ...p, signedUrl }
                    }))

                    // Front photo for display
                    const frontPhoto = photosWithSignedUrls.find(p => p.type === 'front') || photosWithSignedUrls[0]

                    return {
                        id: c.id,
                        checkinId: c.id,
                        displayUrl: frontPhoto.signedUrl,
                        date: c.date,
                        weight: c.weight,
                        bodyFat: c.body_fat,
                        allPhotos: photosWithSignedUrls
                    }
                }))

                setPhotos(processedPhotos)
            }
        } catch (err) {
            console.error("Error in fetchData:", err)
        }
    }

    // -- Process Data for Charts --
    const weightData = checkins.map(c => ({
        name: format(parse(c.date, 'yyyy-MM-dd', new Date()), 'MMM', { locale: es }),
        fullDate: c.date,
        weight: c.weight,
    })).slice(-6)

    const bodyFatData = checkins.map(c => ({
        name: format(parse(c.date, 'yyyy-MM-dd', new Date()), 'MMM', { locale: es }),
        fullDate: c.date,
        fat: c.body_fat
    })).filter(d => d.fat).slice(-6)

    // -- Metrics Calculation --
    const currentWeight = checkins.length > 0 ? checkins[checkins.length - 1].weight : client.initial_weight
    const previousWeight = checkins.length > 1 ? checkins[checkins.length - 2].weight : client.initial_weight

    // Ensure previousWeight is valid before calculating diff. 
    // If it's 0 or null, we treat it as no previous data, so diff is 0.
    const weightDiff = (previousWeight && previousWeight > 0) ? currentWeight - previousWeight : 0

    // -- Mock Updates --
    const updates = checkins.slice().reverse().slice(0, 3).map(c => ({
        title: "Actualización corporal",
        description: "Se actualizaron las medidas corporales del asesorado.",
        daysAgo: Math.floor((new Date().getTime() - new Date(c.date).getTime()) / (1000 * 3600 * 24))
    }))

    return (
        <div className="space-y-3 animate-in fade-in duration-500">

            {/* Top Row: Strength & Critical Info - Updated Layout */}
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                <StrengthProgressCard clientId={client.id} />

                <Card className="bg-white shadow-sm border border-gray-100 rounded-2xl flex flex-col justify-center p-4">
                    <div className="space-y-0.5">
                        <h3 className="text-[17px] font-bold text-gray-900 leading-tight">Objetivo</h3>
                        <p className="text-[15px] text-gray-400 leading-snug">
                            {client.main_goal ? (goalTranslations[client.main_goal] || client.main_goal) : "Mantener"}
                            {client.goal_text && <span className="block text-xs text-gray-300 mt-1">"{client.goal_text}"</span>}
                        </p>
                    </div>
                </Card>

                <Card className="bg-white shadow-sm border border-gray-100 rounded-2xl flex flex-col justify-center p-4">
                    <div className="space-y-0.5">
                        <h3 className="text-[17px] font-bold text-gray-900 leading-tight">Nivel de actividad</h3>
                        <p className="text-[15px] text-gray-400 leading-snug">
                            {client.activity_level ? (activityTranslations[client.activity_level] || client.activity_level) : "Moderado"}
                            <span className="block text-xs text-gray-300 mt-1">
                                {client.work_type ? `Trabajo: ${workTypeTranslations[client.work_type] || client.work_type}` : ''}
                            </span>
                        </p>
                    </div>
                </Card>
            </div>

            {/* Middle Row: Metrics & Photos */}
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">

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
                            {(() => {
                                const weightColor = getWeightProgressColor(
                                    weightDiff,
                                    client.target_weight,
                                    client.initial_weight,
                                    client.goal_specific
                                )
                                const colorClasses = progressColorClasses[weightColor]

                                if (weightDiff === 0) {
                                    return null
                                }

                                return (
                                    <Badge
                                        variant="secondary"
                                        className={`${colorClasses.badge} mb-1 flex items-center gap-1`}
                                    >
                                        {Math.abs(weightDiff).toFixed(1)}kg
                                        {weightDiff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                    </Badge>
                                )
                            })()}
                        </div>
                        <div className="h-[150px] w-full mt-auto">
                            {checkins.length === 0 ? (
                                <div className="h-full w-full flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
                                    <TrendingDown className="h-6 w-6 text-muted-foreground/30 mb-2" />
                                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium text-center px-4">
                                        Esperando primer check-in
                                    </p>
                                </div>
                            ) : (
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
                                        <Bar dataKey="weight" name="Peso" radius={[4, 4, 0, 0]}>
                                            {weightData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={index === weightData.length - 1 ? '#5254D9' : '#B2B3F5'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Body Fat Card */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Grasa corporal</CardTitle>
                        {client.target_body_fat && (
                            <Badge variant="secondary" className="text-xs font-normal">
                                Grasa objetiva {client.target_body_fat}%
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-3xl font-bold">
                                {bodyFatData.length > 0 ? bodyFatData[bodyFatData.length - 1].fat : (client.initial_body_fat || '-')} %
                            </span>
                            {(() => {
                                // Simple logic: if recent fat exists, compare with previous.
                                // If not, try initial.
                                const currentFat = bodyFatData.length > 0 ? bodyFatData[bodyFatData.length - 1].fat : client.initial_body_fat
                                const prevFat = bodyFatData.length > 1 ? bodyFatData[bodyFatData.length - 2].fat : client.initial_body_fat

                                if (!currentFat || !prevFat) return null

                                const diff = currentFat - prevFat
                                if (diff === 0) return null

                                // Green if drops (usually good), Red if rises? 
                                // Assuming goal is losing fat for most. 
                                // We can use getWeightProgressColor logic but flipped for fat?
                                // Or simply: Down = Green, Up = Red for Fat.
                                const isPositiveChange = diff < 0 // Losing fat is positive
                                const badgeColor = isPositiveChange ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"

                                return (
                                    <Badge
                                        variant="secondary"
                                        className={`${badgeColor} mb-1 flex items-center gap-1`}
                                    >
                                        {Math.abs(diff).toFixed(1)}%
                                        {diff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                    </Badge>
                                )
                            })()}
                        </div>
                        <div className="h-[150px] w-full mt-auto">
                            {!bodyFatData || bodyFatData.length === 0 ? (
                                <div className="h-full w-full flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
                                    <TrendingDown className="h-6 w-6 text-muted-foreground/30 mb-2" />
                                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium text-center px-4">
                                        Faltan datos de grasa
                                    </p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={bodyFatData}>
                                        <defs>
                                            <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: '#888' }}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none' }}
                                            cursor={{ stroke: '#8884d8', strokeWidth: 1, strokeDasharray: '3 3' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="fat"
                                            name="Grasa corporal"
                                            stroke="#8884d8"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorFat)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Photos Card */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Fotos del progreso</CardTitle>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Fotos del progreso</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <div className="space-y-4 flex-1 overflow-y-auto max-h-[220px] scrollbar-hide py-2">
                            {photos.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-8">Sin fotos aún</p>
                            )}
                            {photos.slice(0, 3).map((photo, i, arr) => {
                                // Calculate weight diff from previous photo (or initial weight)
                                const prevPhoto = arr[i + 1]
                                const prevWeight = prevPhoto?.weight || client.initial_weight
                                const photoDiff = photo.weight && prevWeight ? photo.weight - prevWeight : 0

                                const photoColor = getWeightProgressColor(
                                    photoDiff,
                                    client.target_weight,
                                    client.initial_weight,
                                    client.goal_specific
                                )
                                const colorClasses = progressColorClasses[photoColor]

                                return (
                                    <Dialog key={i}>
                                        <DialogTrigger asChild>
                                            <div className="flex gap-3 items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors group">
                                                <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-gray-100">
                                                    {photo.displayUrl ? (
                                                        <Image src={photo.displayUrl} alt="Progress" fill className="object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full w-full bg-gray-100">
                                                            <ImageIcon className="h-4 w-4 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs text-muted-foreground">{format(parse(photo.date, 'yyyy-MM-dd', new Date()), "d 'de' MMMM, yyyy", { locale: es })}</p>
                                                    <p className="text-xs font-medium">{photo.weight ? `${photo.weight}kg` : ''}</p>
                                                </div>
                                                {photoDiff !== 0 && (
                                                    <Badge variant="secondary" className={`text-[10px] h-5 ${colorClasses.badge}`}>
                                                        {photoDiff > 0 ? '+' : ''}{photoDiff.toFixed(1)}kg
                                                        {photoDiff > 0 ? <ArrowUp className="h-2 w-2 ml-0.5" /> : <ArrowDown className="h-2 w-2 ml-0.5" />}
                                                    </Badge>
                                                )}
                                                {photoDiff === 0 && photo.weight && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 bg-gray-100 text-gray-600">
                                                        0kg <Minus className="h-2 w-2 ml-0.5" />
                                                    </Badge>
                                                )}
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Check-in: {format(parse(photo.date, 'yyyy-MM-dd', new Date()), "d 'de' MMMM, yyyy", { locale: es })}</DialogTitle>
                                            </DialogHeader>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                                {photo.allPhotos.map((p: any, idx: number) => (
                                                    <div key={idx} className="space-y-2">
                                                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted border shadow-sm">
                                                            {p.signedUrl ? (
                                                                <Image src={p.signedUrl} alt={p.type} fill className="object-cover" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No imagen</div>
                                                            )}
                                                        </div>
                                                        <p className="text-center text-sm font-medium capitalize text-gray-700">
                                                            {p.type === 'front' ? 'Frente' : p.type === 'back' ? 'Espalda' : p.type === 'profile' ? 'Perfil' : 'Extra'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )
                            })}
                        </div>

                        <div className="flex gap-2 mt-4 pt-2 border-t text-right justify-end">
                            <PhotoComparisonDialog photos={photos} />

                            <AddCheckinDialog
                                clientId={client.id}
                                // @ts-ignore
                                trigger={
                                    <Button className="flex-1 md:flex-none text-xs bg-black hover:bg-black/90 text-white">
                                        <Plus className="mr-2 h-3 w-3" /> Nuevo Check-in
                                    </Button>
                                }
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
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
                                {client.birth_date ? format(parseISO(client.birth_date), 'dd/MM/yyyy') : '-'}
                            </p>
                        </div>
                        <div>
                            <span className="block text-xs text-muted-foreground mb-1">Altura</span>
                            <p className="font-medium text-sm">{client.height ? `${client.height} cm` : '-'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    )
}
