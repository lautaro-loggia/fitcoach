'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loading03Icon, Calendar03Icon, ArrowLeft01Icon } from "hugeicons-react"
import { assignWorkoutToClientsAction } from "@/app/(dashboard)/workouts/actions"
import { ClientAvatar } from "@/components/clients/client-avatar"
import { cn } from "@/lib/utils"

interface AssignWorkoutToClientsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    workout: any
}

export function AssignWorkoutToClientsDialog({ open, onOpenChange, workout }: AssignWorkoutToClientsDialogProps) {
    const [clients, setClients] = useState<any[]>([])
    const [selectedClients, setSelectedClients] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [assigning, setAssigning] = useState(false)
    const [step, setStep] = useState<'clients' | 'days'>('clients')
    const [schedules, setSchedules] = useState<Record<string, string[]>>({})

    const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    useEffect(() => {
        if (open) {
            fetchClients()
            setSelectedClients([])
            setSchedules({})
            setStep('clients')
        }
    }, [open])

    const fetchClients = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('clients')
            .select('id, full_name, email, status')
            .eq('status', 'active') // Only active clients usually? Or all? Let's show all but maybe sort active first.
            .order('status', { ascending: true }) // active vs inactive
            .order('full_name')

        if (data) setClients(data)
        setLoading(false)
    }

    const toggleClient = (id: string) => {
        setSelectedClients(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    const toggleDayForClient = (clientId: string, day: string) => {
        setSchedules(prev => {
            const currentDays = prev[clientId] || []
            const newDays = currentDays.includes(day)
                ? currentDays.filter(d => d !== day)
                : [...currentDays, day]
            return { ...prev, [clientId]: newDays }
        })
    }

    const toggleDayForAll = (day: string) => {
        setSchedules(prev => {
            const allHaveIt = selectedClients.every(id => (prev[id] || []).includes(day))
            const newSchedules = { ...prev }

            selectedClients.forEach(id => {
                const currentDays = newSchedules[id] || []
                if (allHaveIt) {
                    newSchedules[id] = currentDays.filter(d => d !== day)
                } else {
                    if (!currentDays.includes(day)) {
                        newSchedules[id] = [...currentDays, day]
                    }
                }
            })
            return newSchedules
        })
    }

    const handleAssign = async () => {
        if (selectedClients.length === 0) return
        setAssigning(true)

        const res = await assignWorkoutToClientsAction(
            workout.id,
            selectedClients,
            workout.name,
            workout.structure,
            schedules
        )

        if (res.error) {
            alert(res.error)
        } else {
            alert("Rutina asignada correctamente a los clientes seleccionados.")
            onOpenChange(false)
        }
        setAssigning(false)
    }

    if (!workout) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'clients' ? `Asignar "${workout.name}"` : 'Programar Rutina'}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {step === 'clients' ? (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Selecciona los asesorados a los que quieres asignar esta rutina.
                            </p>

                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loading03Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                                    {clients.map(client => (
                                        <div key={client.id} className="flex items-center space-x-3 p-3 hover:bg-muted/50 transition-colors">
                                            <Checkbox
                                                id={`client-${client.id}`}
                                                checked={selectedClients.includes(client.id)}
                                                onCheckedChange={() => toggleClient(client.id)}
                                            />
                                            <Label
                                                htmlFor={`client-${client.id}`}
                                                className="flex-1 flex items-center gap-3 cursor-pointer font-normal"
                                            >
                                                <ClientAvatar
                                                    name={client.full_name || 'Cliente'}
                                                    size="sm"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{client.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{client.email}</span>
                                                </div>
                                                {client.status !== 'active' && (
                                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-auto">
                                                        {client.status}
                                                    </span>
                                                )}
                                            </Label>
                                        </div>
                                    ))}
                                    {clients.length === 0 && (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            No tienes clientes registrados.
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
                            {selectedClients.length > 1 && (
                                <div className="p-4 bg-muted/30 rounded-lg border">
                                    <p className="text-sm font-medium mb-3">Aplicar a todos:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {DAYS.map(day => {
                                            const allSelected = selectedClients.every(id => (schedules[id] || []).includes(day))
                                            const someSelected = selectedClients.some(id => (schedules[id] || []).includes(day))

                                            return (
                                                <Button
                                                    key={day}
                                                    type="button"
                                                    variant={allSelected ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => toggleDayForAll(day)}
                                                    className={cn(
                                                        "h-10 sm:h-8 px-3 min-w-[40px] text-sm sm:text-xs flex-1 sm:flex-none",
                                                        allSelected ? "bg-primary text-white" : "",
                                                        !allSelected && someSelected ? "border-primary/50 text-primary" : ""
                                                    )}
                                                >
                                                    {day.substring(0, 3)}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                {clients.filter(c => selectedClients.includes(c.id)).map(client => (
                                    <div key={client.id} className="space-y-2 pb-2 border-b last:border-0">
                                        <div className="flex items-center gap-2">
                                            <ClientAvatar name={client.full_name} size="xs" />
                                            <span className="text-sm font-medium">{client.full_name}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pl-2">
                                            {DAYS.map(day => (
                                                <Button
                                                    key={day}
                                                    type="button"
                                                    variant={(schedules[client.id] || []).includes(day) ? "default" : "outline"}
                                                    size="icon"
                                                    onClick={() => toggleDayForClient(client.id, day)}
                                                    className={cn(
                                                        "h-10 w-10 text-sm sm:h-8 sm:w-8 sm:text-xs",
                                                        (schedules[client.id] || []).includes(day) ? "bg-primary hover:bg-primary/90 text-white" : "text-muted-foreground"
                                                    )}
                                                    title={day}
                                                >
                                                    {day.substring(0, 1)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-md flex gap-2 items-start">
                                <Calendar03Icon className="h-5 w-5 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">Programación semanal</p>
                                    <p className="text-xs opacity-90 mt-1">
                                        Selecciona los días específicos para cada uno de los {selectedClients.length} clientes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <div className="text-sm text-muted-foreground text-center sm:text-left h-6">
                        {selectedClients.length > 0 && <>{selectedClients.length} seleccionados</>}
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => step === 'days' ? setStep('clients') : onOpenChange(false)}
                            className="flex-1 sm:flex-none h-12 sm:h-10 text-base sm:text-sm"
                        >
                            {step === 'days' ? "Atrás" : "Cancelar"}
                        </Button>

                        {step === 'clients' ? (
                            <Button
                                onClick={() => setStep('days')}
                                disabled={selectedClients.length === 0}
                                className="flex-1 sm:flex-none h-12 sm:h-10 text-base sm:text-sm"
                            >
                                Siguiente
                            </Button>
                        ) : (
                            <Button
                                onClick={handleAssign}
                                disabled={assigning}
                                className="bg-primary hover:bg-primary/90 text-white flex-1 sm:flex-none h-12 sm:h-10 text-base sm:text-sm"
                            >
                                {assigning && <Loading03Icon className="mr-2 h-5 w-5 animate-spin" />}
                                Asignar
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
