'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AddCheckinDialog } from '../add-checkin-dialog'
import { deleteCheckinAction } from '@/app/(dashboard)/clients/[id]/checkin-actions'
import { MeasuresTable } from '@/components/clients/checkin/measures-table'
import { WeightSummary } from '@/components/clients/checkin/weight-summary'
import { WeightChart } from '@/components/clients/checkin/weight-chart'
import { HistoryTable } from '@/components/clients/checkin/history-table'

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

    useEffect(() => {
        fetchCheckins()
    }, [client.id])

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

    // Helper to get series data for selected metric
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

    const metricData = getMetricData(selectedMetric)
    const metricConfig = METRICS_CONFIG[selectedMetric] || { label: 'Medida', unit: '' }

    const startVal = metricData.length > 0 ? metricData[0].value : null
    const currentVal = metricData.length > 0 ? metricData[metricData.length - 1].value : null

    // Target logic: simple default handling for weight/fat, others null for now
    let targetVal = null
    if (selectedMetric === 'weight') targetVal = client.target_weight
    if (selectedMetric === 'body_fat') targetVal = client.target_fat

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            <div className="flex justify-end mb-2">
                <AddCheckinDialog clientId={client.id} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column (40%) */}
                <div className="lg:col-span-5">
                    <MeasuresTable
                        checkins={checkins}
                        selectedMetric={selectedMetric}
                        onSelect={setSelectedMetric}
                    />
                </div>

                {/* Right Column (60%) */}
                <div className="lg:col-span-7 flex flex-col">
                    <WeightSummary
                        current={currentVal}
                        start={startVal}
                        target={targetVal}
                        label={metricConfig.label}
                        unit={metricConfig.unit}
                    />

                    <WeightChart
                        data={metricData} // Pass normalized {date, value}
                        target={targetVal}
                        unit={metricConfig.unit}
                    />

                    <HistoryTable
                        data={metricData} // Pass normalized
                        unit={metricConfig.unit}
                    />
                </div>
            </div>
        </div>
    )
}
