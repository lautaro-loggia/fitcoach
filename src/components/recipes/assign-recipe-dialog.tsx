'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Loader2 } from 'lucide-react'
import { bulkAssignRecipeAction } from '@/app/(dashboard)/recipes/actions'
import { toast } from 'sonner' // Assuming sonner or use alert

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

export function AssignRecipeDialog({ open, onOpenChange, recipeId, recipeName }: AssignRecipeDialogProps) {
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
    const [mealName, setMealName] = useState('')
    const [loading, setLoading] = useState(false)
    const [assigning, setAssigning] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (open) {
            fetchClients()
            setMealName(recipeName) // Default meal name to recipe name
        }
    }, [open, recipeName])

    const fetchClients = async () => {
        setLoading(true)
        const supabase = createClient()
        // Assuming 'status' column exists based on create action. 
        // Order by name
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

    const handleAssign = async () => {
        if (selectedClientIds.length === 0) return

        setAssigning(true)
        const result = await bulkAssignRecipeAction({
            recipeId,
            clientIds: selectedClientIds,
            mealName: mealName || recipeName
        })

        if (result.error) {
            alert(result.error)
        } else {
            // Success
            onOpenChange(false)
            setSelectedClientIds([])
            alert(`Receta asignada a ${selectedClientIds.length} alumno(s) correctamente.`)
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
                    <DialogTitle>Asignar receta a alumnos</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Nombre de la comida (opcional)</Label>
                        <Input
                            value={mealName}
                            onChange={(e) => setMealName(e.target.value)}
                            placeholder="Ej: Almuerzo lunes"
                        />
                        <p className="text-xs text-muted-foreground">
                            Este nombre aparecerá en el plan del alumno.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Seleccionar alumnos ({selectedClientIds.length})</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar alumno..."
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
                                    No se encontraron alumnos activos.
                                </p>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assigning}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={selectedClientIds.length === 0 || assigning}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Asignar ({selectedClientIds.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
