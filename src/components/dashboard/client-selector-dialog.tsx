'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export function ClientSelectorDialog({
    children,
    triggerClass
}: {
    children?: React.ReactNode
    triggerClass?: string
}) {
    const [open, setOpen] = useState(false)
    const [clients, setClients] = useState<any[]>([])
    const router = useRouter()

    useEffect(() => {
        if (open) {
            fetchClients()
        }
    }, [open])

    const fetchClients = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('clients')
            .select('id, full_name')
            .order('full_name')

        if (data) setClients(data)
    }

    const handleSelect = (clientId: string) => {
        setOpen(false)
        router.push(`/clients/${clientId}?tab=checkin&action=new`)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button className={triggerClass}>
                        <UserCheck className="mr-2 h-4 w-4" /> Registrar Check-in
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Seleccionar Asesorado</DialogTitle>
                </DialogHeader>
                <Command className="border rounded-md">
                    <CommandInput placeholder="Buscar asesorado..." />
                    <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {clients.map((client) => (
                            <CommandItem
                                key={client.id}
                                value={client.full_name}
                                onSelect={() => handleSelect(client.id)}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4 opacity-0"
                                    )}
                                />
                                {client.full_name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </DialogContent>
        </Dialog>
    )
}
