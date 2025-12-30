"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
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
                            <AreaChart data={formattedData} margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
                                <defs>
                                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5254D9" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#5254D9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
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
                                    cursor={{ stroke: '#5254D9', strokeWidth: 1, strokeDasharray: '4 4' }}
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
                                    <ReferenceLine y={target} stroke="#5254D9" strokeDasharray="3 3" opacity={0.5} />
                                )}
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#5254D9"
                                    fillOpacity={1}
                                    fill="url(#colorWeight)"
                                    strokeWidth={3}
                                    dot={{ fill: '#5254D9', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 7, strokeWidth: 0 }}
                                />
                            </AreaChart>
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
