"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface WeightChartProps {
    data: any[] // Expects { date: string, value: number } sorted asc
    target?: number | null
    unit: string
}

export function WeightChart({ data, target, unit }: WeightChartProps) {
    const formattedData = data.map(d => ({
        ...d,
        displayDate: format(new Date(d.date), 'MMM', { locale: es }), // Simplified for XAxis
        fullDate: d.date
    }))

    return (
        <Card className="border-muted/60 shadow-sm mb-6">
            <CardContent className="p-6">
                <div className="h-[300px] w-full">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={formattedData} margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="displayDate"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                                    padding={{ left: 10, right: 10 }}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                                    tickCount={6}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#ea580c', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        padding: '8px 12px',
                                        backgroundColor: '#1f2937',
                                        color: '#fff'
                                    }}
                                    itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}
                                    labelStyle={{ display: 'none' }}
                                    formatter={(value) => [`${value} ${unit}`, '']}
                                />
                                {target && (
                                    <ReferenceLine y={target} stroke="#ea580c" strokeDasharray="3 3" opacity={0.5} />
                                )}
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#ea580c"
                                    strokeWidth={3}
                                    dot={{ fill: '#ea580c', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 7, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">
                            <p className="text-sm">Aún no hay datos para mostrar el gráfico</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
