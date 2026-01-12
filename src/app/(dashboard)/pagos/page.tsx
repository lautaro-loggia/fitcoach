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
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-32" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="flex items-center justify-center py-16">
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

    return (
        <div className="space-y-6">
            <Tabs defaultValue="pagos" className="w-full space-y-6" onValueChange={setActiveTab}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pagos y Planes</h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Gestión de cobros y suscripciones
                        </p>
                    </div>
                    <TabsList>
                        <TabsTrigger value="pagos">Pagos</TabsTrigger>
                        <TabsTrigger value="history">Historial de pagos</TabsTrigger>
                        <TabsTrigger value="planes">Planes</TabsTrigger>
                    </TabsList>
                </div>

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
                        {/* Filters & Search */}
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            {/* Quick Chips */}
                            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                                <Button
                                    variant={statusFilter === 'all' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter('all')}
                                    className="rounded-full h-8"
                                >
                                    Todos
                                </Button>
                                <Button
                                    variant={statusFilter === 'overdue' ? "destructive" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter('overdue')}
                                    className={cn("rounded-full h-8", statusFilter === 'overdue' ? "" : "text-red-600 border-red-200 hover:bg-red-50")}
                                >
                                    Vencidos
                                </Button>
                                <Button
                                    variant={statusFilter === 'pending' ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter('pending')}
                                    className={cn("rounded-full h-8", statusFilter === 'pending' ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "text-amber-600 border-amber-200 hover:bg-amber-50")}
                                >
                                    Pendientes
                                </Button>
                                <Button
                                    variant={statusFilter === 'paid' ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter('paid')}
                                    className={cn("rounded-full h-8", statusFilter === 'paid' ? "bg-green-100 text-green-800 hover:bg-green-200" : "text-green-600 border-green-200 hover:bg-green-50")}
                                >
                                    Pagados
                                </Button>
                            </div>

                            {/* Search */}
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre o email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </div>

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
        </div>
    )
}
