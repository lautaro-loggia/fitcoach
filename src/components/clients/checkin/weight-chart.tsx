"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts'
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface WeightChartProps {
    data: any[] // Expects { date: string, value: number, id: string } sorted asc
    target?: number | null
    unit: string
    selectedId?: string | null
    comparisonId?: string | null
}

export function WeightChart({ data, target, unit, selectedId, comparisonId }: WeightChartProps) {
    const formattedData = data.map(d => ({
        ...d,
        displayDate: format(new Date(d.date), 'dd MMM', { locale: es }),
        fullDate: d.date
    }))

    const selectedPoint = formattedData.find(d => d.id === selectedId)
    const comparisonPoint = formattedData.find(d => d.id === comparisonId)

    return (
        <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6">
                <div className="h-[280px] w-full">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={formattedData} margin={{ top: 20, right: 10, bottom: 0, left: -20 }}>
                                <defs>
                                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5254D9" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#5254D9" stopOpacity={0.01} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="displayDate"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
                                    padding={{ left: 10, right: 10 }}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
                                    tickCount={6}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#5254D9', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                        padding: '10px 14px',
                                        backgroundColor: '#fff',
                                        fontSize: '12px'
                                    }}
                                    itemStyle={{ color: '#111827', fontSize: '13px', fontWeight: 900 }}
                                    labelStyle={{ color: '#6b7280', fontSize: '10px', fontWeight: 600, marginBottom: '4px' }}
                                    formatter={(value) => [`${value}${unit}`, '']}
                                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate ? format(new Date(payload[0].payload.fullDate), 'dd MMMM, yyyy', { locale: es }) : label}
                                />
                                {target && (
                                    <ReferenceLine y={target} stroke="#5254D9" strokeDasharray="4 4" opacity={0.3} />
                                )}

                                {selectedPoint && (
                                    <ReferenceDot
                                        x={selectedPoint.displayDate}
                                        y={selectedPoint.value}
                                        r={8}
                                        fill="#5254D9"
                                        stroke="#fff"
                                        strokeWidth={3}
                                    />
                                )}

                                {comparisonPoint && (
                                    <ReferenceDot
                                        x={comparisonPoint.displayDate}
                                        y={comparisonPoint.value}
                                        r={8}
                                        fill="#818cf8"
                                        stroke="#fff"
                                        strokeWidth={3}
                                    />
                                )}

                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#5254D9"
                                    fillOpacity={1}
                                    fill="url(#colorWeight)"
                                    strokeWidth={4}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#5254D9' }}
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-gray-50/50 rounded-2xl border border-dashed border-border/60">
                            <p className="text-sm font-medium">No hay datos suficientes para el gráfico</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
