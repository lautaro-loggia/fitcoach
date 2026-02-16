'use client'

import { Area, AreaChart, ResponsiveContainer, YAxis, ReferenceLine, XAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface WeightChartProps {
    data: { date: string; weight: number }[]
    currentWeight: number
    startWeight: number
    targetWeight: number | null
}

export function WeightChart({ data, currentWeight, startWeight, targetWeight }: WeightChartProps) {
    // Reverse data to be chronological (Oldest -> Newest)
    const chartData = [...data].reverse()

    // Calculate min/max for Y domain domain
    const allWeights = chartData.map(d => d.weight)
    if (targetWeight) allWeights.push(targetWeight)

    const minWeight = Math.min(...allWeights) - 2
    const maxWeight = Math.max(...allWeights) + 2

    const weightChange = (currentWeight - startWeight).toFixed(1)
    const isWeightLoss = currentWeight < startWeight

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Evolución de peso</h3>
            </div>

            <Card className="bg-white p-6 rounded-[24px] shadow-none border border-gray-200">
                {/* Header Stats */}
                <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold tracking-tight">{currentWeight} <span className="text-xl text-gray-500 font-normal">kg</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${Number(weightChange) <= 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {Number(weightChange) > 0 ? '+' : ''}{weightChange} kg
                            </span>
                            <span className="text-xs text-gray-400">desde el inicio</span>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs text-gray-400 mb-1">Objetivo</div>
                        {targetWeight ? (
                            <div className="text-xl font-bold text-gray-900">{targetWeight} <span className="text-sm text-gray-500 font-normal">kg</span></div>
                        ) : (
                            <div className="text-xl font-bold text-gray-900">--</div>
                        )}
                    </div>
                </div>

                {/* Chart */}
                <div className="h-[140px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <YAxis
                                domain={[minWeight, maxWeight]}
                                hide={true}
                            />
                            <XAxis
                                dataKey="date"
                                hide={true}
                                axisLine={false}
                                tickLine={false}
                            />
                            {targetWeight && (
                                <ReferenceLine
                                    y={targetWeight}
                                    stroke="#e5e7eb"
                                    strokeDasharray="4 4"
                                    strokeWidth={1}
                                    label={{
                                        value: 'Meta',
                                        position: 'right',
                                        fill: '#9ca3af',
                                        fontSize: 10,
                                        dy: -10
                                    }}
                                />
                            )}
                            <Area
                                type="monotone"
                                dataKey="weight"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorWeight)"
                                dot={(props) => {
                                    const { cx, cy, index, payload } = props;
                                    // Only show dot for the last point
                                    if (index === chartData.length - 1) {
                                        return (
                                            <g key={`dot-${index}`}>
                                                <circle cx={cx} cy={cy} r={6} fill="white" stroke="#8b5cf6" strokeWidth={3} />
                                            </g>
                                        );
                                    }
                                    // Show small dot for others or none? Image shows one intermediate point maybe, but main focus is end.
                                    // Let's hide others for cleanliness or make them very subtle
                                    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={0} />;
                                }}
                                activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 3, fill: 'white' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>

                    {/* X Axis Labels Manually Positioned for "INICIO" and "HOY" */}
                    <div className="absolute bottom-0 left-0 w-full flex justify-between text-[10px] text-gray-400 font-medium uppercase mt-2">
                        <span>Inicio</span>
                        <span>Hoy</span>
                    </div>
                </div>
            </Card>
        </div>
    )
}
