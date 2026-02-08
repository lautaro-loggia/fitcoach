"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Comment01Icon, Edit01Icon, FloppyDiskIcon, Cancel01Icon, ViewIcon, ViewOffIcon } from 'hugeicons-react'
import { updateCheckinNoteAction } from '@/app/(dashboard)/clients/[id]/checkin-actions'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface CoachNoteCardProps {
    checkin: any
    comparisonCheckin?: any
    clientId: string
    onUpdate: () => void
}

export function CoachNoteCard({ checkin, comparisonCheckin, clientId, onUpdate }: CoachNoteCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [note, setNote] = useState(checkin?.coach_note || '')
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'current' | 'comparison'>('current')

    useEffect(() => {
        setNote(checkin?.coach_note || '')
    }, [checkin?.id, checkin?.coach_note])

    if (!checkin) {
        return (
            <Card className="rounded-2xl shadow-sm border-border/40">
                <CardHeader className="pb-3 px-6 pt-6">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Comment01Icon className="h-4 w-4 text-primary" />
                        Notas del coach
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8 text-center text-muted-foreground py-10">
                    Selecciona un check-in para ver o agregar feedback.
                </CardContent>
            </Card>
        )
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const result = await updateCheckinNoteAction(checkin.id, clientId, note)
            if (result.success) {
                toast.success('Nota guardada correctamente')
                setIsEditing(false)
                onUpdate()
            } else {
                toast.error(result.error || 'Error al guardar la nota')
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancel = () => {
        setNote(checkin.coach_note || '')
        setIsEditing(false)
    }

    const displayedCheckin = activeTab === 'current' ? checkin : comparisonCheckin
    const hasNote = !!displayedCheckin?.coach_note
    const isSeen = !!displayedCheckin?.coach_note_seen_at
    const canEdit = activeTab === 'current'

    return (
        <Card className="rounded-2xl shadow-sm border-border/40 overflow-hidden bg-white">
            <CardHeader className="pb-3 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Comment01Icon className="h-4 w-4 text-primary" />
                    Notas del coach
                </CardTitle>

                {canEdit && !isEditing && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full text-xs font-bold text-primary hover:text-primary hover:bg-primary/5"
                        onClick={() => setIsEditing(true)}
                    >
                        {hasNote ? <Edit01Icon className="h-3.5 w-3.5 mr-1" /> : null}
                        {hasNote ? 'Editar' : 'Agregar nota'}
                    </Button>
                )}
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

                {isEditing && canEdit ? (
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Escribe aquí tu feedback..."
                            className="min-h-[120px] resize-none rounded-xl bg-gray-50 border-none focus-visible:ring-primary/20 text-sm"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={600}
                        />
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span>{note.length} / 600</span>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 rounded-full px-3 text-[10px] uppercase tracking-wider"
                                    onClick={handleCancel}
                                    disabled={isLoading}
                                >
                                    <Cancel01Icon className="h-3 w-3 mr-1" />
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-7 rounded-full px-4 text-[10px] uppercase tracking-wider"
                                    onClick={handleSave}
                                    disabled={isLoading}
                                >
                                    {isLoading ? '...' : <><FloppyDiskIcon className="h-3 w-3 mr-1" /> Guardar</>}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {hasNote ? (
                            <>
                                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap font-medium">
                                    {displayedCheckin.coach_note}
                                </p>
                                <div className="flex flex-wrap items-center justify-between pt-4 border-t border-gray-50 gap-2">
                                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                        {displayedCheckin.coach_note_updated_at && (
                                            <>Editado el {format(new Date(displayedCheckin.coach_note_updated_at), 'd MMM')}</>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isSeen ? (
                                            <Badge variant="secondary" className="bg-green-50 text-green-600 border-0 font-black text-[9px] h-5 px-2 flex items-center gap-1 uppercase tracking-wider">
                                                <ViewIcon className="h-3 w-3" />
                                                Visto
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-0 font-black text-[9px] h-5 px-2 flex items-center gap-1 uppercase tracking-wider">
                                                <ViewOffIcon className="h-3 w-3" />
                                                Pendiente
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-8 text-center flex flex-col items-center justify-center">
                                <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                                    <Comment01Icon className="h-5 w-5 text-gray-200" />
                                </div>
                                <p className="text-xs text-muted-foreground font-medium italic">
                                    No hay feedback registrado para este check-in.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
