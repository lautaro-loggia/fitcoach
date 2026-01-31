'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState, useMemo } from 'react'
import { MoreHorizontalIcon, File01Icon, Delete02Icon, UserSettings01Icon, Loading03Icon, Search01Icon, Cancel01Icon, ArrowDown01Icon, Calendar03Icon, FilterHorizontalIcon, Tick01Icon } from 'hugeicons-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PresentialCalendarDialog, Workout } from '@/components/clients/presential-calendar-dialog'
import { AddClientDialog } from '@/components/clients/add-client-dialog'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounce } from "@/hooks/use-debounce"
import { DashboardTopBar } from '@/components/layout/dashboard-top-bar'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet"
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
import { deleteClientAction } from '@/app/(dashboard)/clients/actions'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { cn } from '@/lib/utils'

// We define a type for the client data we expect
export interface Client {
    id: string
    full_name: string
    email?: string | null
    status: 'active' | 'inactive'
    goal_specific: string | null
    main_goal: string | null
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

type CheckinStatus = 'all' | 'overdue' | 'due_soon' | 'future' | 'none'
type GoalFilter = 'all' | 'fat_loss' | 'muscle_gain' | 'recomp' | 'performance' | 'health'

interface ClientTableProps {
    clients: Client[]
    presentialWorkouts: Workout[]
    defaultOpenNew?: boolean
    hideHeader?: boolean
}

function getGoalLabel(goal: string | null) {
    if (goal === 'fat_loss') return 'Pérdida de grasa'
    if (goal === 'muscle_gain') return 'Ganancia muscular'
    if (goal === 'recomp') return 'Recomposición'
    if (goal === 'performance') return 'Rendimiento'
    if (goal === 'health') return 'Salud'
    return '-'
}


function parseLocalDate(dateStr: string) {
    if (!dateStr) return new Date()
    const parts = dateStr.split('-')
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    }
    return new Date(dateStr)
}

function getCheckinStatus(client: Client): { status: CheckinStatus | 'pending_review', date: Date | null, labels: string, color: string } {
    const lastCheckin = client.checkins && client.checkins.length > 0 ? client.checkins[0] : null
    let lastCheckinDate: Date | null = null

    if (lastCheckin) {
        // Assuming checkin.date is YYYY-MM-DD from DB or ISO string. 
        // If it's pure date string from postgres 'date' column, it might come as YYYY-MM-DD.
        // Convert strict to avoid timezone shift.
        if (lastCheckin.date.includes('T')) {
            lastCheckinDate = new Date(lastCheckin.date)
        } else {
            lastCheckinDate = parseLocalDate(lastCheckin.date)
        }
        // Normalize time
        lastCheckinDate.setHours(0, 0, 0, 0)
    }

    if (!client.next_checkin_date) {
        // No scheduled date.
        // If they have recent checkins, coach needs to define next.
        if (lastCheckinDate) {
            return { status: 'pending_review', date: null, labels: 'Definir Próximo', color: 'text-orange-600 font-bold' }
        }
        // If no checkins ever
        return { status: 'none', date: new Date(8640000000000000), labels: 'Pendiente (Inicio)', color: 'text-yellow-600' }
    }

    const scheduledDate = parseLocalDate(client.next_checkin_date)
    scheduledDate.setHours(0, 0, 0, 0)

    // Check if the scheduled date was ALREADY completed
    // Logic: If last checkin was done ON or AFTER the scheduled date (or very close to it), then this date is "done".
    // However, if the coach manually set a future date, it should be fine.
    // Issue: If client checks in, next_checkin_date might remain as today's date (if not auto-updated).
    if (lastCheckinDate && lastCheckinDate.getTime() >= scheduledDate.getTime()) {
        return { status: 'pending_review', date: scheduledDate, labels: 'Definir Próximo', color: 'text-orange-600 font-bold' }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const diffTime = scheduledDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    let status: CheckinStatus = 'future'
    let color = 'text-green-600'

    if (diffDays < 0) {
        status = 'overdue'
        color = 'text-red-600'
    } else if (diffDays <= 2) {
        status = 'due_soon'
        color = 'text-yellow-600'
    } else {
        status = 'future'
        color = 'text-green-600'
    }

    return {
        status,
        date: scheduledDate,
        labels: format(scheduledDate, 'dd/MM/yyyy', { locale: es }),
        color
    }
}

export function ClientTable({ clients, presentialWorkouts, defaultOpenNew, hideHeader }: ClientTableProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [navigatingId, setNavigatingId] = useState<string | null>(null)

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 300)

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [goalFilter, setGoalFilter] = useState<GoalFilter>('all')
    const [checkinFilter, setCheckinFilter] = useState<CheckinStatus>('all')

    // Filtered clients
    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            // Search filter (name or email or goal)
            const searchLower = debouncedSearch.toLowerCase().trim()
            if (searchLower) {
                const nameMatch = client.full_name.toLowerCase().includes(searchLower)
                const emailMatch = client.email?.toLowerCase().includes(searchLower) || false
                const goalMatch = getGoalLabel(client.main_goal).toLowerCase().includes(searchLower)
                if (!nameMatch && !emailMatch && !goalMatch) return false
            }

            // Status filter
            if (statusFilter !== 'all' && client.status !== statusFilter) return false

            // Goal filter
            if (goalFilter !== 'all' && client.main_goal !== goalFilter) return false

            const checkinInfo = getCheckinStatus(client);

            // Checkin Status filter
            if (checkinFilter !== 'all') {
                if (checkinFilter === 'overdue' && checkinInfo.status !== 'overdue') return false;
                if (checkinFilter === 'due_soon' && checkinInfo.status !== 'due_soon') return false;
                if (checkinFilter === 'future' && checkinInfo.status !== 'future') return false;
                // 'none' usually means pending first checkin, often treated as warning/due_soon visually but let's keep robust logic
            }



            return true
        }).sort((a, b) => {
            // Default sort: Next Check-in (asc)
            const checkinA = getCheckinStatus(a);
            const checkinB = getCheckinStatus(b);
            // Sort: pending review (null/urgent) first -> overdue -> soon -> future
            // If date is null (pending definition), treat as very small (urgent)
            const timeA = checkinA.date ? checkinA.date.getTime() : 0;
            const timeB = checkinB.date ? checkinB.date.getTime() : 0;
            return timeA - timeB;
        })
    }, [clients, debouncedSearch, statusFilter, goalFilter, checkinFilter])

    const hasActiveFilters = statusFilter !== 'all' || goalFilter !== 'all' || checkinFilter !== 'all'

    const clearFilters = () => {
        setStatusFilter('all')
        setGoalFilter('all')
        setCheckinFilter('all')
        setSearchQuery('')
    }

    const removeFilter = (type: 'status' | 'goal' | 'checkin') => {
        if (type === 'status') setStatusFilter('all')
        if (type === 'goal') setGoalFilter('all')
        if (type === 'checkin') setCheckinFilter('all')
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

    // Action Menu Component (Re-use existing logic)
    const ActionMenu = ({ client }: { client: Client }) => {
        const [showDeleteDialog, setShowDeleteDialog] = useState(false)
        const handleDelete = async () => {
            const result = await deleteClientAction(client.id)
            if (result?.error) toast.error(result.error)
            else { toast.success("Cliente eliminado correctamente"); setShowDeleteDialog(false) }
        }
        return (
            <>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleRowClick(client.id)}>
                            <File01Icon className="mr-2 h-4 w-4" /> Ver perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleEditProfile(e, client.id)}>
                            <UserSettings01Icon className="mr-2 h-4 w-4" /> Editar perfil
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true) }}>
                            <Delete02Icon className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente <strong>{client.full_name}</strong>.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={async (e) => { e.stopPropagation(); await handleDelete() }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        )
    }

    if (clients.length === 0 && !searchQuery && !hasActiveFilters) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center border rounded-md bg-muted/10 h-64">
                <div className="p-3 bg-primary/10 rounded-full">
                    <UserSettings01Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">No tienes asesorados aún</h3>
                    <p className="text-muted-foreground max-w-sm">Comenzá agregando a tu primer cliente para gestionar sus entrenamientos.</p>
                </div>
                <AddClientDialog defaultOpen={defaultOpenNew} />
            </div>
        )
    }



    const FilterContent = () => (
        <div className="space-y-6 py-4">
            <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">Estado del Cliente</Label>
                <RadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="grid grid-cols-1 gap-2">
                    {[
                        { id: 'all', label: 'Todos los estados' },
                        { id: 'active', label: 'Activos' },
                        { id: 'inactive', label: 'Inactivos' }
                    ].map((opt) => (
                        <Label
                            key={opt.id}
                            htmlFor={`status-${opt.id}`}
                            className={cn(
                                "flex items-center justify-between px-5 py-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-muted/50",
                                statusFilter === opt.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
                            )}
                        >
                            <span className="font-medium">{opt.label}</span>
                            <RadioGroupItem value={opt.id} id={`status-${opt.id}`} className="sr-only" />
                            {statusFilter === opt.id && <Tick01Icon className="w-5 h-5 text-primary" />}
                        </Label>
                    ))}
                </RadioGroup>
            </div>

            <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">Objetivo Principal</Label>
                <div className="grid grid-cols-1 gap-2">
                    {[
                        { id: 'all', label: 'Todos los objetivos' },
                        { id: 'fat_loss', label: 'Pérdida de grasa' },
                        { id: 'muscle_gain', label: 'Ganancia muscular' },
                        { id: 'recomp', label: 'Recomposición' },
                        { id: 'performance', label: 'Rendimiento' },
                        { id: 'health', label: 'Salud' }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setGoalFilter(opt.id as GoalFilter)}
                            className={cn(
                                "flex items-center justify-between px-5 py-4 border-2 rounded-xl text-left transition-all hover:bg-muted/50 text-sm",
                                goalFilter === opt.id ? "border-primary bg-primary/5 font-semibold" : "border-transparent bg-muted/30"
                            )}
                        >
                            {opt.label}
                            {goalFilter === opt.id && <Tick01Icon className="w-5 h-5 text-primary" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">Próximo Check-in</Label>
                <RadioGroup value={checkinFilter} onValueChange={(v) => setCheckinFilter(v as CheckinStatus)} className="grid grid-cols-1 gap-2">
                    {[
                        { id: 'all', label: 'Cualquier fecha' },
                        { id: 'overdue', label: 'Vencidos', color: 'text-red-600' },
                        { id: 'due_soon', label: 'Hoy o mañana', color: 'text-amber-600' },
                        { id: 'future', label: 'A tiempo', color: 'text-emerald-600' }
                    ].map((opt) => (
                        <Label
                            key={opt.id}
                            htmlFor={`check-${opt.id}`}
                            className={cn(
                                "flex items-center justify-between px-5 py-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-muted/50",
                                checkinFilter === opt.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
                            )}
                        >
                            <span className={cn("font-medium", (opt as any).color)}>{opt.label}</span>
                            <RadioGroupItem value={opt.id} id={`check-${opt.id}`} className="sr-only" />
                            {checkinFilter === opt.id && <Tick01Icon className="w-5 h-5 text-primary" />}
                        </Label>
                    ))}
                </RadioGroup>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col">
            {!hideHeader && (
                <DashboardTopBar
                    title="Mis Asesorados"
                    subtitle="Gestioná tus clientes, sus planes y seguimiento"
                >
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Search in Header */}
                        <div className="relative w-48 md:w-80">
                            <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-10 h-10 text-sm border-gray-200 focus:border-primary rounded-xl"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <Cancel01Icon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filter Sheet Trigger */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="h-10 px-4 gap-2 border-gray-200 rounded-xl hover:bg-gray-50 shrink-0">
                                    <FilterHorizontalIcon className="h-4 w-4" />
                                    <span className="hidden md:inline">Filtros</span>
                                    {hasActiveFilters && (
                                        <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-white text-[10px]">
                                            {(statusFilter !== 'all' ? 1 : 0) + (goalFilter !== 'all' ? 1 : 0) + (checkinFilter !== 'all' ? 1 : 0)}
                                        </Badge>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                                <SheetHeader className="pb-4 border-b">
                                    <SheetTitle className="text-xl font-bold">Filtros Avanzados</SheetTitle>
                                    <p className="text-sm text-muted-foreground">Personalizá tu vista de clientes</p>
                                </SheetHeader>

                                <FilterContent />

                                <SheetFooter className="mt-8 flex-col gap-2 pt-6 border-t sm:flex-col">
                                    <SheetClose asChild>
                                        <Button className="w-full h-11 rounded-xl font-bold">Aplicar Filtros</Button>
                                    </SheetClose>
                                    {hasActiveFilters && (
                                        <Button
                                            variant="ghost"
                                            onClick={clearFilters}
                                            className="w-full h-11 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl"
                                        >
                                            Limpiar todos los filtros
                                        </Button>
                                    )}
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>

                        <PresentialCalendarDialog workouts={presentialWorkouts} />
                        <AddClientDialog defaultOpen={defaultOpenNew} />
                    </div>
                </DashboardTopBar>
            )}

            <div className={cn("p-4 md:p-8 space-y-6 md:space-y-8", hideHeader && "mt-0")}>
                {/* Active Filters Chips Layout - Cleaner */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 items-center -mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Activos:</span>
                        {statusFilter !== 'all' && (
                            <Badge variant="secondary" className="px-2 py-1 gap-1 text-xs border-transparent bg-primary/5 text-primary hover:bg-primary/10">
                                {statusFilter === 'active' ? 'Activos' : 'Inactivos'}
                                <button onClick={() => removeFilter('status')} className="ml-1 hover:text-red-600 transition-colors"><Cancel01Icon className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {goalFilter !== 'all' && (
                            <Badge variant="secondary" className="px-2 py-1 gap-1 text-xs border-transparent bg-primary/5 text-primary hover:bg-primary/10">
                                {getGoalLabel(goalFilter)}
                                <button onClick={() => removeFilter('goal')} className="ml-1 hover:text-red-600 transition-colors"><Cancel01Icon className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {checkinFilter !== 'all' && (
                            <Badge variant="secondary" className="px-2 py-1 gap-1 text-xs border-transparent bg-primary/5 text-primary hover:bg-primary/10">
                                {checkinFilter === 'overdue' ? 'Vencidos' : checkinFilter === 'due_soon' ? 'Próximos' : 'A tiempo'}
                                <button onClick={() => removeFilter('checkin')} className="ml-1 hover:text-red-600 transition-colors"><Cancel01Icon className="h-3 w-3" /></button>
                            </Badge>
                        )}
                    </div>
                )}

                {/* Active Filters Chips */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 items-center">
                        {statusFilter !== 'all' && (
                            <Badge variant="secondary" className="gap-1 pr-1">
                                Estado: {statusFilter === 'active' ? 'Activo' : 'Inactivo'}
                                <button onClick={() => removeFilter('status')} className="ml-1 hover:text-foreground"><Cancel01Icon className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {goalFilter !== 'all' && (
                            <Badge variant="secondary" className="gap-1 pr-1">
                                Objetivo: {getGoalLabel(goalFilter)}
                                <button onClick={() => removeFilter('goal')} className="ml-1 hover:text-foreground"><Cancel01Icon className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {checkinFilter !== 'all' && (
                            <Badge variant="secondary" className="gap-1 pr-1">
                                Check-in: {checkinFilter === 'overdue' ? 'Vencido' : checkinFilter === 'due_soon' ? 'Próximo' : 'Futuro'}
                                <button onClick={() => removeFilter('checkin')} className="ml-1 hover:text-foreground"><Cancel01Icon className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground">
                            Limpiar todo
                        </Button>
                    </div>
                )}





                {filteredClients.length === 0 ? (
                    <div className="rounded-md border p-8 text-center text-muted-foreground">
                        <p className="text-lg font-medium text-foreground">No se encontraron resultados</p>
                        <p className="mb-4">Intenta ajustar los filtros o la búsqueda.</p>
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>
                            <AddClientDialog />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block rounded-xl border bg-white shadow-sm relative overflow-hidden">
                            {isPending && !navigatingId && (
                                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-md">
                                    <Loading03Icon className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent cursor-default">
                                        <TableHead className="w-[300px]">Asesorado</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Objetivo</TableHead>
                                        <TableHead>Próximo Check-in</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClients.map((client) => {
                                        const checkinInfo = getCheckinStatus(client);
                                        return (
                                            <TableRow
                                                key={client.id}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => handleRowClick(client.id)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <ClientAvatar name={client.full_name} avatarUrl={client.avatar_url} size="md" />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{client.full_name}</span>
                                                            <span className="text-xs text-muted-foreground">{client.email || '-'}</span>
                                                        </div>
                                                        {isPending && navigatingId === client.id && (
                                                            <Loading03Icon className="h-3 w-3 animate-spin text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-2.5 w-2.5 rounded-full ${client.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        <span className="text-sm">{client.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="font-normal border-transparent bg-muted text-muted-foreground hover:bg-muted">
                                                        {getGoalLabel(client.main_goal)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`font-medium ${checkinInfo.color}`}>
                                                        {checkinInfo.labels}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <ActionMenu client={client} />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Cards (Simplified for consistency, though user asked for Table improvements, Mobile usually falls back to cards) */}
                        <div className="md:hidden space-y-3">
                            {filteredClients.map((client) => {
                                const checkinInfo = getCheckinStatus(client);
                                return (
                                    <div key={client.id} className="flex flex-col gap-3 p-4 border rounded-xl bg-white shadow-sm cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleRowClick(client.id)}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <ClientAvatar name={client.full_name} avatarUrl={client.avatar_url} size="md" />
                                                <div>
                                                    <p className="font-medium">{client.full_name}</p>
                                                    <p className="text-sm text-muted-foreground">{getGoalLabel(client.main_goal)}</p>
                                                </div>
                                            </div>
                                            <ActionMenu client={client} />
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2.5 w-2.5 rounded-full ${client.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                <span>{client.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                                            </div>
                                            <span className={`${checkinInfo.color}`}>
                                                Check-in: {checkinInfo.labels}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
