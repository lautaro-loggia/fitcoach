'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Loader2, ChevronRight, ChevronLeft, Calendar, Clock } from 'lucide-react'
import { bulkAssignRecipeAction } from '@/app/(dashboard)/recipes/actions'
import { toast } from 'sonner'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface Client {
    id: string
    full_name: string
    email: string
}

interface AssignRecipeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    recipeId: string
    recipeName: string
}

interface Assignment {
    clientId: string
    dayOfWeek: string
    mealTime: string
}

export function AssignRecipeDialog({ open, onOpenChange, recipeId, recipeName }: AssignRecipeDialogProps) {
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [assigning, setAssigning] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Step Logic
    // 0 = Select Clients
    // 1..N = Configure Client N
    const [step, setStep] = useState(0)
    const [assignments, setAssignments] = useState<Assignment[]>([])

    // Determine which client is being configured based on step-1
    const currentClientIndex = step - 1
    const currentClientId = selectedClientIds[currentClientIndex]
    const currentClient = clients.find(c => c.id === currentClientId)

    // Temporary state for the current step's selection
    const [currentDay, setCurrentDay] = useState<string>('')
    const [currentMealTime, setCurrentMealTime] = useState<string>('')

    useEffect(() => {
        if (open) {
            fetchClients()
            resetFlow()
        }
    }, [open, recipeName])

    const resetFlow = () => {
        setStep(0)
        setSelectedClientIds([])
        setAssignments([])
        setCurrentDay('')
        setCurrentMealTime('')
        setSearchQuery('')
    }

    const fetchClients = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('clients')
            .select('id, full_name, email')
            .eq('status', 'active')
            .order('full_name')

        if (data) {
            setClients(data)
        }
        setLoading(false)
    }

    const handleToggleClient = (clientId: string) => {
        setSelectedClientIds(prev => {
            if (prev.includes(clientId)) {
                return prev.filter(id => id !== clientId)
            } else {
                return [...prev, clientId]
            }
        })
    }

    const handleNext = () => {
        if (step === 0) {
            if (selectedClientIds.length === 0) return
            setStep(1)
            // Initialize or clear current selections for the first client
            setCurrentDay('')
            setCurrentMealTime('')
        } else {
            // Save current configuration
            const newAssignment: Assignment = {
                clientId: currentClientId,
                dayOfWeek: currentDay,
                mealTime: currentMealTime
            }

            // Update assignments array
            // If we go back and forth, we might need to update existing index
            const updated = [...assignments]
            updated[currentClientIndex] = newAssignment
            setAssignments(updated)

            if (step < selectedClientIds.length) {
                // Move to next client
                setStep(step + 1)
                setCurrentDay('')
                setCurrentMealTime('')
            } else {
                // Submit!
                handleSubmit(updated)
            }
        }
    }

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1)
            // Restore previous selection if needed? 
            // For simplicity, we just clear or let user re-select.
        }
    }

    const handleSubmit = async (finalAssignments: Assignment[]) => {
        setAssigning(true)

        const payload = finalAssignments.map(a => ({
            clientId: a.clientId,
            dayOfWeek: parseInt(a.dayOfWeek),
            mealTime: a.mealTime
        }))

        const result = await bulkAssignRecipeAction({
            recipeId,
            assignments: payload
        })

        if (result.error) {
            toast.error(result.error)
            // Don't close so user can try again? Or close?
        } else {
            onOpenChange(false)
            resetFlow()
            toast.success(`Receta asignada correctamente.`)
        }
        setAssigning(false)
    }

    const filteredClients = clients.filter(client =>
        client.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Asignar receta</DialogTitle>
                </DialogHeader>

                <div className="py-2 min-h-[300px] flex flex-col">
                    {step === 0 && (
                        <div className="space-y-4 flex-1">
                            <Label>Seleccionar asesorados ({selectedClientIds.length})</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar asesorado..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>

                            <ScrollArea className="h-[200px] border rounded-md p-2">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filteredClients.length > 0 ? (
                                    <div className="space-y-2">
                                        {filteredClients.map(client => (
                                            <div key={client.id} className="flex items-center space-x-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-900 rounded">
                                                <Checkbox
                                                    id={`client-${client.id}`}
                                                    checked={selectedClientIds.includes(client.id)}
                                                    onCheckedChange={() => handleToggleClient(client.id)}
                                                />
                                                <label
                                                    htmlFor={`client-${client.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                                >
                                                    {client.full_name}
                                                    {client.email && <span className="ml-1 text-xs text-muted-foreground truncate">({client.email})</span>}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-center text-muted-foreground py-8">
                                        No se encontraron asesorados activos.
                                    </p>
                                )}
                            </ScrollArea>
                        </div>
                    )}

                    {step > 0 && currentClient && (
                        <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                                    Configurando para
                                </p>
                                <p className="text-lg font-bold">
                                    {currentClient.full_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Paso {step} de {selectedClientIds.length}
                                </p>
                            </div>

                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" /> Día de la semana
                                    </Label>
                                    <Select value={currentDay} onValueChange={setCurrentDay}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar día" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Lunes</SelectItem>
                                            <SelectItem value="2">Martes</SelectItem>
                                            <SelectItem value="3">Miércoles</SelectItem>
                                            <SelectItem value="4">Jueves</SelectItem>
                                            <SelectItem value="5">Viernes</SelectItem>
                                            <SelectItem value="6">Sábado</SelectItem>
                                            <SelectItem value="7">Domingo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" /> Momento del día
                                    </Label>
                                    <Select value={currentMealTime} onValueChange={setCurrentMealTime}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Ej: Almuerzo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Desayuno">Desayuno</SelectItem>
                                            <SelectItem value="Almuerzo">Almuerzo</SelectItem>
                                            <SelectItem value="Merienda">Merienda</SelectItem>
                                            <SelectItem value="Cena">Cena</SelectItem>
                                            <SelectItem value="Snack">Snack</SelectItem>
                                            <SelectItem value="Postre">Postre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
                    {step === 0 ? (
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                    ) : (
                        <Button variant="ghost" onClick={handleBack} disabled={assigning}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Atrás
                        </Button>
                    )}

                    <Button
                        onClick={handleNext}
                        disabled={
                            assigning ||
                            (step === 0 && selectedClientIds.length === 0) ||
                            (step > 0 && (!currentDay || !currentMealTime))
                        }
                        className="bg-primary hover:bg-primary/90 min-w-[120px]"
                    >
                        {assigning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : step === selectedClientIds.length && step > 0 ? (
                            "Asignar"
                        ) : (
                            <>
                                Siguiente
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
