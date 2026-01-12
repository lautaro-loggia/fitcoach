'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState, useMemo } from 'react'
import { MoreHorizontal, FileText, Trash, UserCog, Loader2, Search, X, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
import { ClientAvatar } from '@/components/clients/client-avatar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// We define a type for the client data we expect
export interface Client {
    id: string
    full_name: string
    email?: string | null
    status: 'active' | 'inactive'
    goal_specific: string | null
    next_checkin_date?: string | null
    payment_status?: 'paid' | 'pending' | 'overdue' | null
    plan_id?: string | null
    plan?: { name: string } | null
    avatar_url?: string | null
    // For check-in calculation
    checkins?: { date: string }[]
}

type StatusFilter = 'all' | 'active' | 'inactive'
type PaymentFilter = 'all' | 'paid' | 'pending' | 'overdue'
type PlanFilter = 'all' | 'with_plan' | 'without_plan'

interface ClientTableProps {
    clients: Client[]
}

function getGoalLabel(goal: string | null) {
    if (goal === 'lose_fat') return 'Bajar grasa'
    if (goal === 'gain_muscle') return 'Ganar músculo'
    if (goal === 'recomp') return 'Recomposición'
    return '-'
}

export function ClientTable({ clients }: ClientTableProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [navigatingId, setNavigatingId] = useState<string | null>(null)

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
    const [planFilter, setPlanFilter] = useState<PlanFilter>('all')

    // Filtered clients
    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            // Search filter (name or email)
            const searchLower = searchQuery.toLowerCase().trim()
            if (searchLower) {
                const nameMatch = client.full_name.toLowerCase().includes(searchLower)
                const emailMatch = client.email?.toLowerCase().includes(searchLower) || false
                if (!nameMatch && !emailMatch) return false
            }

            // Status filter
            if (statusFilter !== 'all' && client.status !== statusFilter) return false

            // Payment filter
            if (paymentFilter !== 'all') {
                if (paymentFilter === 'paid' && client.payment_status !== 'paid') return false
                if (paymentFilter === 'pending' && client.payment_status !== 'pending') return false
                if (paymentFilter === 'overdue' && client.payment_status !== 'overdue') return false
            }

            // Plan filter
            if (planFilter !== 'all') {
                if (planFilter === 'with_plan' && !client.plan_id) return false
                if (planFilter === 'without_plan' && client.plan_id) return false
            }

            return true
        })
    }, [clients, searchQuery, statusFilter, paymentFilter, planFilter])

    // Check if any filter is active
    const hasActiveFilters = statusFilter !== 'all' || paymentFilter !== 'all' || planFilter !== 'all'

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('')
        setStatusFilter('all')
        setPaymentFilter('all')
        setPlanFilter('all')
    }

    // Helper to calculate next check-in
    const getNextCheckin = (client: Client) => {
        // 1. If we have a manually set next_checkin_date, use it.
        if (client.next_checkin_date) {
            return format(new Date(client.next_checkin_date), 'dd/MM/yyyy', { locale: es })
        }

        // 2. Fallback to automatic calculation if no check-ins.
        if (!client.checkins || client.checkins.length === 0) {
            return "Pendiente (Inicio)"
        }

        // 3. Fallback to last check-in + 7 days.
        const lastCheckin = new Date(client.checkins[0].date)
        const nextCheckin = new Date(lastCheckin)
        nextCheckin.setDate(nextCheckin.getDate() + 7)

        return format(nextCheckin, 'dd/MM/yyyy', { locale: es })
    }

    const handleRowClick = (id: string) => {
        setNavigatingId(id)
        startTransition(() => {
            router.push(`/clients/${id}`)
        })
    }

    const handleEditProfile = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setNavigatingId(id)
        startTransition(() => {
            router.push(`/clients/${id}?tab=settings`)
        })
    }

    const ActionMenu = ({ client }: { client: Client }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleRowClick(client.id)}>
                    <FileText className="mr-2 h-4 w-4" /> Ver perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleEditProfile(e, client.id)}>
                    <UserCog className="mr-2 h-4 w-4" /> Editar perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Add delete logic call here if exists
                    }}
                >
                    <Trash className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )

    if (clients.length === 0) {
        return (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                No hay asesorados cargados.
            </div>
        )
    }

    // Filter dropdown component
    const FilterDropdown = ({
        label,
        value,
        onChange,
        options
    }: {
        label: string
        value: string
        onChange: (value: any) => void
        options: { value: string; label: string }[]
    }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={value !== 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 gap-1"
                >
                    {options.find(o => o.value === value)?.label || label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuLabel>{label}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {options.map(option => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={value === option.value ? 'bg-accent' : ''}
                    >
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )

    return (
        <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                    <FilterDropdown
                        label="Estado"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                            { value: 'all', label: 'Todos' },
                            { value: 'active', label: 'Activos' },
                            { value: 'inactive', label: 'Inactivos' },
                        ]}
                    />

                    <FilterDropdown
                        label="Pago"
                        value={paymentFilter}
                        onChange={setPaymentFilter}
                        options={[
                            { value: 'all', label: 'Todos' },
                            { value: 'paid', label: 'Al día' },
                            { value: 'pending', label: 'Pendiente' },
                            { value: 'overdue', label: 'Vencido' },
                        ]}
                    />

                    <FilterDropdown
                        label="Plan"
                        value={planFilter}
                        onChange={setPlanFilter}
                        options={[
                            { value: 'all', label: 'Todos' },
                            { value: 'with_plan', label: 'Con plan' },
                            { value: 'without_plan', label: 'Sin plan' },
                        ]}
                    />

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="h-9 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4 mr-1" />
                            Limpiar
                        </Button>
                    )}
                </div>
            </div>

            {/* Results count */}
            {(searchQuery || hasActiveFilters) && (
                <p className="text-sm text-muted-foreground">
                    {filteredClients.length === 0
                        ? 'No se encontraron resultados'
                        : `${filteredClients.length} de ${clients.length} asesorados`
                    }
                </p>
            )}

            {/* Empty state when no results */}
            {filteredClients.length === 0 && (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    <p>No se encontraron asesorados con los filtros actuales.</p>
                    <Button variant="link" onClick={clearFilters} className="mt-2">
                        Limpiar filtros
                    </Button>
                </div>
            )}

            {filteredClients.length > 0 && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block rounded-md border relative">
                        {isPending && !navigatingId && (
                            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-md">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent cursor-default">
                                    <TableHead className="w-[80px]">Avatar</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Objetivo</TableHead>
                                    <TableHead>Próximo Check-in</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredClients.map((client) => (
                                    <TableRow
                                        key={client.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => handleRowClick(client.id)}
                                    >
                                        <TableCell>
                                            <ClientAvatar
                                                name={client.full_name}
                                                avatarUrl={client.avatar_url}
                                                size="md"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {client.full_name}
                                                {isPending && navigatingId === client.id && (
                                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={client.status === 'active' ? 'default' : 'secondary'}
                                                className={client.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                                            >
                                                {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getGoalLabel(client.goal_specific)}</TableCell>
                                        <TableCell>{getNextCheckin(client)}</TableCell>
                                        <TableCell className="text-right">
                                            <ActionMenu client={client} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredClients.map((client) => (
                            <div
                                key={client.id}
                                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleRowClick(client.id)}
                            >
                                <ClientAvatar
                                    name={client.full_name}
                                    avatarUrl={client.avatar_url}
                                    size="md"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium truncate">{client.full_name}</p>
                                        {isPending && navigatingId === client.id && (
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                            variant={client.status === 'active' ? 'default' : 'secondary'}
                                            className={client.status === 'active' ? 'text-xs bg-green-100 text-green-700 hover:bg-green-100' : 'text-xs'}
                                        >
                                            {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {getGoalLabel(client.goal_specific)}
                                        </span>
                                    </div>
                                </div>
                                <ActionMenu client={client} />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
