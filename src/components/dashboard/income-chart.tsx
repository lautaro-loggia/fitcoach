
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { getIncomeHistory, type IncomeData } from "@/app/(dashboard)/pagos/actions"
import { DateRange } from "react-day-picker"

interface IncomeChartProps {
    initialData: IncomeData[]
}

export function IncomeChart({ initialData }: IncomeChartProps) {
    const [data, setData] = useState<IncomeData[]>(initialData)
    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().setMonth(new Date().getMonth() - 5)),
        to: new Date()
    })

    // Update data when date range changes
    const fetchData = async (start: Date, end: Date) => {
        setLoading(true)
        try {
            const newData = await getIncomeHistory(start, end)
            setData(newData)
        } catch (error) {
            console.error("Failed to fetch income data", error)
        } finally {
            setLoading(false)
        }
    }

    // Effect to handle manual date picker changes if we wanted auto-fetch, 
    // but buttons are explicit. Let's make date picker trigger fetch or have an "Apply" feeling.
    // Ideally, for better UX, filtered buttons set the date state AND trigger fetch.
    // Date picker changes only set state, user might need to wait or we debounce. 
    // Let's trigger fetch immediately on date change for simplicity if valid.

    useEffect(() => {
        if (date?.from && date?.to) {
            fetchData(date.from, date.to)
        }
    }, [date])


    const setFilter = (type: 'quarter' | 'semester' | 'year') => {
        const end = new Date()
        let start = new Date()

        switch (type) {
            case 'quarter':
                start.setMonth(end.getMonth() - 2) // Current + previous 2 = 3 months
                start.setDate(1)
                break
            case 'semester':
                start.setMonth(end.getMonth() - 5) // Current + previous 5 = 6 months
                start.setDate(1)
                break
            case 'year':
                start = new Date(end.getFullYear(), 0, 1) // Jan 1st of current year
                break
        }

        setDate({ from: start, to: end })
        // useEffect will trigger fetch
    }

    return (
        <Card className="col-span-full">
            <CardHeader>
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <CardTitle>Evolución de Ingresos</CardTitle>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {/* Date Picker */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    size="sm"
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                                                {format(date.to, "LLL dd, y", { locale: es })}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y", { locale: es })
                                        )
                                    ) : (
                                        <span>Seleccionar fechas</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>

                        {/* Quick Filters */}
                        <div className="flex items-center rounded-md border bg-muted p-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-3 text-xs"
                                onClick={() => setFilter('quarter')}
                            >
                                Trimestral
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-3 text-xs"
                                onClick={() => setFilter('semester')}
                            >
                                Semestral
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-3 text-xs"
                                onClick={() => setFilter('year')}
                            >
                                Anual
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="relative h-[350px] w-full">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-[1px]">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis
                                dataKey="month"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Ingresos
                                                        </span>
                                                        <span className="font-bold text-muted-foreground">
                                                            {formatCurrency(payload[0].value as number)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Bar
                                dataKey="amount"
                                fill="currentColor"
                                radius={[4, 4, 0, 0]}
                                className="fill-primary"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
