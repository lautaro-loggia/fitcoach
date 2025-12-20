'use client'

import Link from 'next/link'
import { MoreHorizontal, FileText, Trash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// We define a type for the client data we expect
interface Client {
    id: string
    full_name: string
    status: 'active' | 'inactive'
    goal_specific: string | null
    // For check-in calculation
    checkins?: { date: string }[]
}

interface ClientTableProps {
    clients: Client[]
}

export function ClientTable({ clients }: ClientTableProps) {

    // Helper to calculate next check-in
    // Spec: "Check-in se calcula automáticamente."
    // Usually based on frequency (default weekly) + last check-in date.
    // If no check-in, maybe "Start date"? Or "Pending"?
    // For MVP: Last check-in + 7 days.
    const getNextCheckin = (client: Client) => {
        // Stub logic. Real logic needs frequency setting.
        // If no check-ins, show "Pendiente".
        if (!client.checkins || client.checkins.length === 0) {
            return "Pendiente (Inicio)"
        }
        // Accessing the last one (assuming ordered or we find max)
        // Supabase query should order them.
        const lastCheckin = new Date(client.checkins[0].date)
        const nextCheckin = new Date(lastCheckin)
        nextCheckin.setDate(nextCheckin.getDate() + 7)

        return nextCheckin.toLocaleDateString()
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Avatar</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Objetivo</TableHead>
                        <TableHead>Próximo Check-in</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No hay asesorados cargados.
                            </TableCell>
                        </TableRow>
                    ) : (
                        clients.map((client) => (
                            <TableRow key={client.id}>
                                <TableCell>
                                    <Avatar>
                                        <AvatarImage src={`https://avatar.vercel.sh/${client.id}.png`} alt={client.full_name} />
                                        <AvatarFallback>{client.full_name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell className="font-medium">
                                    <Link href={`/clients/${client.id}`} className="hover:underline">
                                        {client.full_name}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                        {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {/* Translate goal codes to readable text */}
                                    {client.goal_specific === 'lose_fat' && 'Bajar grasa'}
                                    {client.goal_specific === 'gain_muscle' && 'Ganar musculo'}
                                    {client.goal_specific === 'recomp' && 'Recomposición'}
                                    {!client.goal_specific && '-'}
                                </TableCell>
                                <TableCell>{getNextCheckin(client)}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Abrir menú</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/clients/${client.id}`}>
                                                    <FileText className="mr-2 h-4 w-4" /> Ver perfil
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive">
                                                <Trash className="mr-2 h-4 w-4" /> Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
