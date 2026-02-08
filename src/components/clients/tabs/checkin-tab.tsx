'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MeasuresTable } from '@/components/clients/checkin/measures-table'
import { CheckinKPIs } from '@/components/clients/checkin/checkin-kpis'
import { WeightChart } from '@/components/clients/checkin/weight-chart'
import { CheckinHistoryNav } from '@/components/clients/checkin/checkin-history-nav'
import { CoachNoteCard } from '@/components/clients/checkin/coach-note-card'
import { CheckinSelector } from '@/components/clients/checkin/checkin-selector'
import { CheckinPhotos } from '@/components/clients/checkin/checkin-photos'
import { EditTargetDialog } from '@/components/clients/checkin/edit-target-dialog'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export const METRICS_CONFIG: Record<string, { label: string, unit: string }> = {
    weight: { label: 'Peso', unit: 'kg' },
    body_fat: { label: 'Grasa corporal', unit: '%' },
    lean_mass: { label: 'Masa magra', unit: 'kg' },
    'measurements.chest': { label: 'Medida Pecho', unit: 'cm' },
    'measurements.waist': { label: 'Medida Cintura', unit: 'cm' },
    'measurements.hips': { label: 'Medida Cadera', unit: 'cm' },
    'measurements.arm': { label: 'Medida Brazo', unit: 'cm' },
    'measurements.thigh': { label: 'Medida Muslo', unit: 'cm' },
    'measurements.calf': { label: 'Medida Gemelos', unit: 'cm' },
}

export function CheckinTab({ client }: { client: any }) {
    const [checkins, setCheckins] = useState<any[]>([])
    const [selectedMetric, setSelectedMetric] = useState<string>('weight')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [comparisonId, setComparisonId] = useState<string | null>(null)
    const [isCompareMode, setIsCompareMode] = useState(false)
    const [isEditTargetOpen, setIsEditTargetOpen] = useState(false)
    const [localTargets, setLocalTargets] = useState<Record<string, number>>({})
    const [signedPhotos, setSignedPhotos] = useState<any[]>([])

    const fetchCheckins = async () => {
        try {
            const supabase = createClient()
            const { data } = await supabase
                .from('checkins')
                .select('*')
                .eq('client_id', client.id)
                .order('date', { ascending: true })

            if (data) {
                setCheckins(data)
                if (data.length > 0 && !selectedId) {
                    const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    setSelectedId(sorted[0].id)
                    // Auto-set comparison to previous if exists
                    if (sorted.length > 1) {
                        setComparisonId(sorted[1].id)
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching checkins", error)
        }
    }

    const signPhotos = async (rawPhotos: any[]) => {
        if (!rawPhotos || rawPhotos.length === 0) {
            setSignedPhotos([])
            return
        }

        try {
            const supabase = createClient()

            // Normalize photos structure
            let normalized = rawPhotos.map(p => {
                if (typeof p === 'string') {
                    if (p.trim().startsWith('{')) {
                        try { return JSON.parse(p) } catch (e) { return { url: p, type: 'front' } }
                    }
                    return { url: p, type: 'front' }
                }
                return p
            })

            // Generate signed URLs if multiple paths are found
            const signed = await Promise.all(normalized.map(async (p) => {
                let signedUrl = p.url
                let storagePath = p.path
                let bucketName = 'checkin-images'

                if (!storagePath && p.url) {
                    if (p.url.includes('/checkin-images/')) {
                        const pathPart = p.url.split('/checkin-images/')[1]
                        if (pathPart) {
                            storagePath = decodeURIComponent(pathPart.split('?')[0])
                            bucketName = 'checkin-images'
                        }
                    } else if (p.url.includes('/progress-photos/')) {
                        const pathPart = p.url.split('/progress-photos/')[1]
                        if (pathPart) {
                            storagePath = decodeURIComponent(pathPart.split('?')[0])
                            bucketName = 'progress-photos'
                        }
                    }
                }

                if (storagePath) {
                    const { data } = await supabase.storage.from(bucketName).createSignedUrl(storagePath, 3600)
                    if (data?.signedUrl) signedUrl = data.signedUrl
                }

                return { ...p, url: signedUrl }
            }))

            setSignedPhotos(signed)
        } catch (error) {
            console.error("Error signing photos:", error)
        }
    }

    const fetchClientDetails = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('clients')
            .select('target_weight, target_fat, targets')
            .eq('id', client.id)
            .single()

        if (data) {
            const merged = { ...data.targets, weight: data.target_weight, body_fat: data.target_fat }
            setLocalTargets(merged)
        }
    }

    useEffect(() => {
        fetchCheckins()
        fetchClientDetails()
    }, [client.id])

    const getMetricData = (key: string) => {
        return checkins.map(c => {
            let val = null
            if (key.startsWith('measurements.')) {
                val = c.measurements?.[key.split('.')[1]]
            } else {
                val = c[key]
            }
            return {
                id: c.id,
                date: c.date,
                value: val ? Number(val) : null
            }
        }).filter(d => d.value !== null)
    }

    const handleSaveTarget = async (value: number) => {
        const { updateClientTargetAction } = await import('@/app/(dashboard)/clients/[id]/target-actions')
        const result = await updateClientTargetAction(client.id, selectedMetric, value)

        if (result.success) {
            setLocalTargets(prev => ({ ...prev, [selectedMetric]: value }))
            fetchClientDetails()
        }
    }

    const selectedCheckin = checkins.find(c => c.id === selectedId)

    useEffect(() => {
        if (selectedCheckin) {
            signPhotos(selectedCheckin.photos || [])
        } else {
            setSignedPhotos([])
        }
    }, [selectedId, checkins])
    // If not in compare mode, we can still show deltas vs previous checkin automatically
    const getComparisonCheckin = () => {
        if (isCompareMode && comparisonId) {
            return checkins.find(c => c.id === comparisonId)
        }
        // Auto-comparison with previous
        const sorted = [...checkins].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        const currentIndex = sorted.findIndex(c => c.id === selectedId)
        if (currentIndex !== -1 && currentIndex < sorted.length - 1) {
            return sorted[currentIndex + 1]
        }
        return null
    }

    const comparisonCheckin = getComparisonCheckin()
    const metricData = getMetricData(selectedMetric)
    const metricConfig = METRICS_CONFIG[selectedMetric] || { label: 'Medida', unit: '' }
    const targetVal = localTargets[selectedMetric] || null

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
            {/* Context Header Bar */}
            <CheckinSelector
                checkins={checkins}
                selectedId={selectedId}
                comparisonId={comparisonId}
                isCompareMode={isCompareMode}
                feedbackStatus={{
                    hasNote: !!selectedCheckin?.coach_note,
                    isSeen: !!selectedCheckin?.coach_note_seen_at
                }}
                onSelect={setSelectedId}
                onComparisonSelect={setComparisonId}
                onCompareModeChange={setIsCompareMode}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Lateral Navigation & Details */}
                <div className="lg:col-span-4 space-y-6">
                    <CheckinHistoryNav
                        checkins={checkins}
                        selectedId={selectedId}
                        comparisonId={isCompareMode ? comparisonId : null}
                        onSelect={setSelectedId}
                    />

                    <MeasuresTable
                        selected={selectedCheckin}
                        comparison={comparisonCheckin}
                        activeMetric={selectedMetric}
                        onSelectMetric={setSelectedMetric}
                    />
                </div>

                {/* Main Visual Content */}
                <div className="lg:col-span-8 space-y-6">
                    <CheckinPhotos
                        photos={signedPhotos}
                    />

                    <CheckinKPIs
                        selected={selectedCheckin}
                        comparison={comparisonCheckin}
                    />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">
                                Evolución de {metricConfig.label}
                            </h3>
                            {targetVal && (
                                <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    Meta: {targetVal}{metricConfig.unit}
                                </span>
                            )}
                        </div>
                        <WeightChart
                            data={metricData}
                            target={targetVal}
                            unit={metricConfig.unit}
                            selectedId={selectedId}
                            comparisonId={isCompareMode ? comparisonId : null}
                        />
                    </div>

                    <div id="coach-notes" className="pt-4">
                        <CoachNoteCard
                            checkin={selectedCheckin}
                            comparisonCheckin={isCompareMode ? comparisonCheckin : null}
                            clientId={client.id}
                            onUpdate={fetchCheckins}
                        />
                    </div>
                </div>
            </div>

            <EditTargetDialog
                open={isEditTargetOpen}
                onOpenChange={setIsEditTargetOpen}
                metricLabel={metricConfig.label}
                metricUnit={metricConfig.unit}
                initialValue={targetVal}
                onSave={handleSaveTarget}
            />
        </div>
    )
}
