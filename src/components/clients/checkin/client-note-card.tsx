"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Comment01Icon } from 'hugeicons-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ClientNoteCardProps {
    checkin: any
    comparisonCheckin?: any
}

export function ClientNoteCard({ checkin, comparisonCheckin }: ClientNoteCardProps) {
    const [activeTab, setActiveTab] = useState<'current' | 'comparison'>('current')

    if (!checkin) {
        return (
            <Card className="rounded-2xl shadow-sm border-border/40">
                <CardHeader className="pb-3 px-6 pt-6">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Comment01Icon className="h-4 w-4 text-primary" />
                        Observaciones del asesorado
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8 text-center text-muted-foreground py-10">
                    Selecciona un check-in para ver las observaciones.
                </CardContent>
            </Card>
        )
    }

    const displayedCheckin = activeTab === 'current' ? checkin : comparisonCheckin
    const hasNote = !!displayedCheckin?.observations

    return (
        <Card className="rounded-2xl shadow-sm border-border/40 overflow-hidden bg-white">
            <CardHeader className="pb-3 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Comment01Icon className="h-4 w-4 text-primary" />
                    Observaciones del asesorado
                </CardTitle>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-0">
                {comparisonCheckin && (
                    <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="mb-4">
                        <TabsList className="grid grid-cols-2 w-full h-8 bg-gray-50 p-1">
                            <TabsTrigger value="current" className="text-[10px] font-bold h-6">Check Actual</TabsTrigger>
                            <TabsTrigger value="comparison" className="text-[10px] font-bold h-6">Check Comparado</TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}

                <div className="space-y-4 animate-in fade-in duration-300">
                    {hasNote ? (
                        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap font-medium">
                            {displayedCheckin.observations}
                        </p>
                    ) : (
                        <div className="py-8 text-center flex flex-col items-center justify-center">
                            <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                                <Comment01Icon className="h-5 w-5 text-gray-200" />
                            </div>
                            <p className="text-xs text-muted-foreground font-medium italic">
                                El asesorado no dejó observaciones en este check-in.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
