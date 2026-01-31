'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PlanesTab } from '@/components/pagos/planes-tab'
import { HistoryTab } from '@/components/pagos/history-tab'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
    Search,
    Plus,
    Loader2,
    RefreshCw,
    Eye,
    TrendingUp,
    Users,
    Clock,
    AlertCircle
} from 'lucide-react'
import { FilterHorizontalIcon, Search01Icon, Cancel01Icon, Tick01Icon } from 'hugeicons-react'
import { Label } from '@/components/ui/label'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from '@/components/ui/sheet'
import {
    getClientsWithPayments,
    getPaymentStats,
    getAllPaymentData,
    getIncomeHistory,
    updatePaymentStatuses,
    type ClientWithPayment,
    type PaymentStats,
} from './actions'
import { RegisterPaymentDialog } from '@/components/payments/register-payment-dialog'
import { ChangePlanDialog } from '@/components/payments/change-plan-dialog'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

import { DashboardTopBar } from '@/components/layout/dashboard-top-bar'

export default function PagosPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const filterFromUrl = searchParams.get('filter')

    const [clients, setClients] = useState<ClientWithPayment[]>([])
    const [stats, setStats] = useState<PaymentStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(filterFromUrl || 'all')
    const [selectedClient, setSelectedClient] = useState<ClientWithPayment | null>(null)
    const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
    const [changePlanDialogOpen, setChangePlanDialogOpen] = useState(false)
    const [clientToChangePlan, setClientToChangePlan] = useState<ClientWithPayment | null>(null)
    const [activeTab, setActiveTab] = useState('pagos')

    // Sync filter from URL params
    useEffect(() => {
        if (filterFromUrl && ['all', 'paid', 'pending', 'overdue'].includes(filterFromUrl)) {
            setStatusFilter(filterFromUrl)
        }
    }, [filterFromUrl])

    useEffect(() => {
        loadData()
    }, [])

    // Refresh data when switching back to Pagos tab
    useEffect(() => {
        if (activeTab === 'pagos') {
            loadData()
        }
    }, [activeTab])

    async function loadData() {
        console.log('[Pagos] loadData called')
        try {
            setLoading(true)

            // Trigger status update in background (non-blocking)
            updatePaymentStatuses().catch(err => console.error('Background update failed:', err))

            const [data] = await Promise.all([
                getAllPaymentData(),
                getIncomeHistory()
            ])

            setClients(data.clients)
            setStats(data.stats)
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('No se pudieron cargar los datos')
        } finally {
            setLoading(false)
        }
    }

    // Filter and sort clients
    const filteredClients = useMemo(() => {
        let filtered = clients

        // Search filter (Name or Email)
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(client =>
                client.full_name.toLowerCase().includes(query) ||
                (client.email && client.email.toLowerCase().includes(query))
            )
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(client => client.payment_status === statusFilter)
        }

        // Sort: Overdue -> Pending -> Paid, then by Date Ascending
        const statusPriority: Record<string, number> = {
            'overdue': 1,
            'pending': 2,
            'paid': 3
        }

        filtered = [...filtered].sort((a, b) => {
            // Primary Sort: Status Priority
            const statusA = statusPriority[a.payment_status] || 99
            const statusB = statusPriority[b.payment_status] || 99

            if (statusA !== statusB) {
                return statusA - statusB
            }

            // Secondary Sort: Next Due Date Ascending (Earlier dates first)
            if (!a.next_due_date) return 1
            if (!b.next_due_date) return -1
            return new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
        })

        return filtered
    }, [clients, searchQuery, statusFilter])

    function getRelativeDate(dateStr: string | null) {
        if (!dateStr) return '-'
        // Add T12:00:00 to avoid timezone issues
        const due = new Date(dateStr + 'T12:00:00')
        const today = new Date()
        // Reset time part for accurate day calculation
        today.setHours(12, 0, 0, 0)

        const diffTime = due.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Vence hoy'
        if (diffDays === 1) return 'Vence mañana'
        if (diffDays === -1) return 'Venció ayer'
        if (diffDays < 0) return `Venció hace ${Math.abs(diffDays)} días`
        return `Vence en ${diffDays} días`
    }

    // Display formatted date (keep original format for Tooltip or alternative view if needed)
    function formatDate(date: string | null) {
        if (!date) return '-'
        return new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
    }

    function isDueSoon(dueDate: string | null) {
        if (!dueDate) return false
        const due = new Date(dueDate + 'T12:00:00')
        const today = new Date()
        const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= 3
    }

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <DashboardTopBar
                    title="Pagos y Planes"
                    subtitle="Gestión de cobros y suscripciones"
                />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground animate-pulse">
                            Cargando...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const clearPaymentFilters = () => {
        setStatusFilter('all')
    }

    const hasPaymentFilters = statusFilter !== 'all'

    const PaymentFilterContent = () => (
        <div className="space-y-6 py-4">
            <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">Estado de Pago</Label>
                <div className="grid grid-cols-1 gap-2">
                    {[
                        { id: 'all', label: 'Todos los registros', color: 'text-gray-600' },
                        { id: 'overdue', label: 'Vencidos', color: 'text-red-600', description: 'Pagos atrasados' },
                        { id: 'pending', label: 'Pendientes', color: 'text-amber-600', description: 'Próximos a cobrar' },
                        { id: 'paid', label: 'Pagados', color: 'text-emerald-600', description: 'Ciclo actual al día' }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setStatusFilter(opt.id)}
                            className={cn(
                                "flex items-center gap-4 px-5 py-5 border-2 rounded-xl text-left transition-all hover:bg-muted/50",
                                statusFilter === opt.id ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30"
                            )}
                        >
                            <div className="flex-1">
                                <div className={cn("font-bold", opt.color)}>{opt.label}</div>
                                {opt.description && <div className="text-xs text-muted-foreground">{opt.description}</div>}
                            </div>
                            {statusFilter === opt.id && <Tick01Icon className="w-5 h-5 text-primary" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col min-h-screen">
            <DashboardTopBar
                title="Pagos y Planes"
                subtitle="Gestión de cobros y suscripciones"
                activeTab={activeTab}
                tabs={[
                    { id: 'pagos', label: 'Pagos', onClick: () => setActiveTab('pagos') },
                    { id: 'history', label: 'Historial', onClick: () => setActiveTab('history') },
                    { id: 'planes', label: 'Planes', onClick: () => setActiveTab('planes') },
                ]}
            >
                {activeTab === 'pagos' && (
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="relative w-48 md:w-80">
                            <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-10 h-10 border-gray-200 focus:border-primary rounded-xl"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <Cancel01Icon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="h-10 px-4 gap-2 border-gray-200 rounded-xl hover:bg-gray-50 shrink-0">
                                    <FilterHorizontalIcon className="h-4 w-4" />
                                    <span className="hidden md:inline">Filtros</span>
                                    {hasPaymentFilters && (
                                        <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-white text-[10px]">
                                            1
                                        </Badge>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-md">
                                <SheetHeader className="pb-4 border-b">
                                    <SheetTitle className="text-xl font-bold">Filtros de Pagos</SheetTitle>
                                    <p className="text-sm text-muted-foreground">Analizá tus cobranzas por estado</p>
                                </SheetHeader>

                                <PaymentFilterContent />

                                <SheetFooter className="mt-8 pt-6 border-t">
                                    <SheetClose asChild>
                                        <Button className="w-full h-11 rounded-xl font-bold">Aplicar</Button>
                                    </SheetClose>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                    </div>
                )}
            </DashboardTopBar>

            <main className="flex-1 p-4 md:p-8 pt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">

                    <TabsContent value="pagos" className="space-y-6">
                        {/* Compact Summary Bar */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground bg-accent/30 p-3 rounded-lg border border-border/50">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                <span className="font-medium text-foreground">Ingresos del mes:</span>
                                <span className="text-primary font-bold">{formatCurrency(stats?.paidMonthlyIncome || 0)}</span>
                            </div>
                            <div className="hidden md:block w-px h-4 bg-border/60"></div>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span className="font-medium text-foreground">Activos:</span>
                                <span>{stats?.activeClients || 0}</span>
                            </div>
                            <div className="hidden md:block w-px h-4 bg-border/60"></div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600" />
                                <span className="font-medium text-foreground">Pendientes:</span>
                                <span className="text-amber-600 font-bold">{stats?.pendingClients || 0}</span>
                            </div>
                            <div className="hidden md:block w-px h-4 bg-border/60"></div>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span className="font-medium text-foreground">Vencidos:</span>
                                <span className="text-red-600 font-bold">{stats?.overdueClients || 0}</span>
                            </div>
                        </div>

                        {/* Table Section */}
                        <div className="space-y-4">
                            {/* Active Filters Display */}
                            {hasPaymentFilters && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filtro activo:</span>
                                    <Badge variant="secondary" className="px-2 py-1 gap-1 text-xs border-transparent bg-primary/5 text-primary">
                                        {statusFilter === 'overdue' ? 'Vencidos' : statusFilter === 'pending' ? 'Pendientes' : 'Pagados'}
                                        <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-red-600 transition-colors"><Cancel01Icon className="h-3 w-3" /></button>
                                    </Badge>
                                </div>
                            )}

                            {/* Main Table */}
                            <div className="rounded-md border bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead>Asesorado</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Cuota</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Vencimiento</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredClients.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                    No se encontraron resultados
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredClients.map((client) => {
                                                const isOverdue = client.payment_status === 'overdue';
                                                const relativeDate = getRelativeDate(client.next_due_date);

                                                return (
                                                    <TableRow
                                                        key={client.id}
                                                        className={cn(
                                                            "transition-colors",
                                                            isOverdue && "bg-red-50/50 hover:bg-red-50"
                                                        )}
                                                    >
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium text-sm">{client.full_name}</div>
                                                                <div className="text-xs text-muted-foreground">{client.email || '-'}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {client.plan ? (
                                                                <div className="text-sm">{client.plan.name}</div>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground italic">Personalizado</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-semibold text-sm">
                                                                {formatCurrency(client.price_monthly || 0)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {/* Status Indicator: Dot + Text */}
                                                            <div className="flex items-center gap-2">
                                                                {client.payment_status === 'paid' && (
                                                                    <>
                                                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                                                        <span className="text-sm font-medium text-green-700">Pagado</span>
                                                                    </>
                                                                )}
                                                                {client.payment_status === 'pending' && (
                                                                    <>
                                                                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                                                                        <span className="text-sm font-medium text-amber-700">Pendiente</span>
                                                                    </>

                                                                )}
                                                                {client.payment_status === 'overdue' && (
                                                                    <>
                                                                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                                                        <span className="text-sm font-medium text-red-700">Vencido</span>
                                                                    </>
                                                                )}
                                                                {!['paid', 'pending', 'overdue'].includes(client.payment_status) && (
                                                                    <span className="text-sm text-muted-foreground">{client.payment_status}</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className={cn(
                                                                "text-sm font-medium",
                                                                isOverdue ? "text-red-600" :
                                                                    isDueSoon(client.next_due_date) ? "text-amber-600" : "text-foreground"
                                                            )}>
                                                                {relativeDate}
                                                                <div className="text-[10px] text-muted-foreground font-normal">
                                                                    {formatDate(client.next_due_date)}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end items-center gap-2">
                                                                {/* Register Payment Button: Only for Pending/Overdue */}
                                                                {(client.payment_status === 'pending' || client.payment_status === 'overdue') ? (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setSelectedClient(client)
                                                                            setRegisterDialogOpen(true)
                                                                        }}
                                                                        className={cn(
                                                                            "h-8 px-3 text-xs",
                                                                            isOverdue ? "bg-red-600 hover:bg-red-700 text-white" : ""
                                                                        )}
                                                                    >
                                                                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                                        Registrar pago
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 p-0"
                                                                        title="Ver detalles"
                                                                        disabled // Placeholder for "Ver pago" action
                                                                    >
                                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                                    </Button>
                                                                )}

                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={() => {
                                                                        setClientToChangePlan(client)
                                                                        setChangePlanDialogOpen(true)
                                                                    }}
                                                                    title="Cambiar plan"
                                                                >
                                                                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Register Payment Dialog */}
                        {selectedClient && (
                            <RegisterPaymentDialog
                                client={selectedClient}
                                open={registerDialogOpen}
                                onOpenChange={setRegisterDialogOpen}
                                onSuccess={loadData}
                            />
                        )}

                        {/* Change Plan Dialog */}
                        {clientToChangePlan && (
                            <ChangePlanDialog
                                client={clientToChangePlan}
                                open={changePlanDialogOpen}
                                onOpenChange={setChangePlanDialogOpen}
                                onSuccess={loadData}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="history">
                        {activeTab === 'history' && <HistoryTab />}
                    </TabsContent>

                    <TabsContent value="planes">
                        {activeTab === 'planes' && <PlanesTab />}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
