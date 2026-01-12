'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { Search, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ClientSelectorDialog({
    children,
    triggerClass,
    mode = 'checkin'
}: {
    children?: React.ReactNode
    triggerClass?: string
    mode?: 'checkin' | 'training'
}) {
    const [open, setOpen] = useState(false)
    const [clients, setClients] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
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
            .select('id, full_name, avatar_url')
            .order('full_name')

        if (data) setClients(data)
    }

    const handleSelect = (clientId: string) => {
        setOpen(false)
        if (mode === 'training') {
            router.push(`/clients/${clientId}?tab=training`)
        } else {
            router.push(`/clients/${clientId}?tab=checkin&action=new`)
        }
    }

    const filteredClients = clients.filter(client =>
        client.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button className={triggerClass}>
                        <UserCheck className="mr-2 h-4 w-4" /> Registrar Check-in
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Seleccionar Asesorado</DialogTitle>
                </DialogHeader>

                <div className="relative my-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar asesorado..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
                    {filteredClients.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No se encontraron resultados
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredClients.map((client) => (
                                <Card
                                    key={client.id}
                                    className="cursor-pointer hover:border-primary hover:bg-muted/50 transition-all p-4 flex flex-col items-center gap-3 text-center group"
                                    onClick={() => handleSelect(client.id)}
                                >
                                    <ClientAvatar
                                        name={client.full_name}
                                        avatarUrl={client.avatar_url}
                                        size="xl"
                                        className="border-2 border-transparent group-hover:border-primary/20 transition-all"
                                    />
                                    <div className="space-y-1">
                                        <p className="font-medium leading-none group-hover:text-primary transition-colors">
                                            {client.full_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Ver plan
                                        </p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
