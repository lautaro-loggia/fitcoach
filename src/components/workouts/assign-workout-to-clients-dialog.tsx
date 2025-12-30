'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { assignWorkoutToClientsAction } from "@/app/(dashboard)/workouts/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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

    useEffect(() => {
        if (open) {
            fetchClients()
            setSelectedClients([])
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

    const handleAssign = async () => {
        if (selectedClients.length === 0) return
        setAssigning(true)

        const res = await assignWorkoutToClientsAction(
            workout.id,
            selectedClients,
            workout.name,
            workout.structure
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
                    <DialogTitle>Asignar "{workout.name}"</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Selecciona los asesorados a los que quieres asignar esta rutina.
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src="" />
                                            <AvatarFallback className="text-xs">
                                                {client.full_name?.substring(0, 2).toUpperCase() || 'CL'}
                                            </AvatarFallback>
                                        </Avatar>
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
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        {selectedClients.length} seleccionados
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button
                            onClick={handleAssign}
                            disabled={assigning || selectedClients.length === 0}
                            className="bg-primary hover:bg-primary/90 text-white"
                        >
                            {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Asignar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
