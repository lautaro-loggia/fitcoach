'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AddCheckinDialog } from '../add-checkin-dialog'
import { deleteCheckinAction } from '@/app/(dashboard)/clients/[id]/checkin-actions'
import { MeasuresTable } from '@/components/clients/checkin/measures-table'
import { WeightSummary } from '@/components/clients/checkin/weight-summary'
import { WeightChart } from '@/components/clients/checkin/weight-chart'
import { HistoryTable } from '@/components/clients/checkin/history-table'
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
    'measurements.calves': { label: 'Medida Gemelos', unit: 'cm' },
}

export function CheckinTab({ client }: { client: any }) {
    const [checkins, setCheckins] = useState<any[]>([])
    const [selectedMetric, setSelectedMetric] = useState<string>('weight')

    // Navigation hooks for auto-open feature
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // Determine if we should auto-open based on URL search params
    const shouldAutoOpen = searchParams.get('action') === 'new'

    // Effect to clear the 'action' param after opening so it doesn't persist across refreshes
    useEffect(() => {
        if (shouldAutoOpen) {
            const params = new URLSearchParams(searchParams.toString())
            params.delete('action')
            // Using replace to avoid adding to history stack
            router.replace(`${pathname}?${params.toString()}`)
        }
    }, [shouldAutoOpen, searchParams, pathname, router])

    const fetchCheckins = async () => {
        try {
            const supabase = createClient()
            const { data } = await supabase
                .from('checkins')
                .select('*')
                .eq('client_id', client.id)
                .order('date', { ascending: true })

            if (data) setCheckins(data)
        } catch (error) {
            console.error("Error fetching checkins", error)
        }
    }

    const [isEditTargetOpen, setIsEditTargetOpen] = useState(false)
    const [localTargets, setLocalTargets] = useState<Record<string, number>>({})

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
                const measKey = key.split('.')[1]
                val = c.measurements?.[measKey]
            } else {
                val = c[key]
            }
            return {
                date: c.date,
                value: val ? Number(val) : null
            }
        }).filter(d => d.value !== null)
    }

    const handleSaveTarget = async (value: number) => {
        const { updateClientTargetAction } = await import('@/app/(dashboard)/clients/[id]/target-actions')
        const result = await updateClientTargetAction(client.id, selectedMetric, value)

        if (result.success) {
            setLocalTargets(prev => ({
                ...prev,
                [selectedMetric]: value
            }))
            fetchClientDetails()
        }
    }

    const metricData = getMetricData(selectedMetric)
    const metricConfig = METRICS_CONFIG[selectedMetric] || { label: 'Medida', unit: '' }

    const startVal = metricData.length > 0 ? metricData[0].value : null
    const currentVal = metricData.length > 0 ? metricData[metricData.length - 1].value : null

    const targetVal = localTargets[selectedMetric] || null

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            <div className="flex justify-end mb-2">
                <AddCheckinDialog
                    clientId={client.id}
                    autoOpen={shouldAutoOpen}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5">
                    <MeasuresTable
                        checkins={checkins}
                        selectedMetric={selectedMetric}
                        onSelect={setSelectedMetric}
                    />
                </div>

                <div className="lg:col-span-7 flex flex-col">
                    <WeightSummary
                        current={currentVal}
                        start={startVal}
                        target={targetVal}
                        label={metricConfig.label}
                        unit={metricConfig.unit}
                        onEditTarget={() => setIsEditTargetOpen(true)}
                    />

                    <WeightChart
                        data={metricData}
                        target={targetVal}
                        unit={metricConfig.unit}
                    />

                    <HistoryTable
                        data={metricData}
                        unit={metricConfig.unit}
                    />
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
