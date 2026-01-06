'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PlanesTab } from '@/components/pagos/planes-tab'
import { HistoryTab } from '@/components/pagos/history-tab'
import { StatsTab } from '@/components/pagos/stats-tab'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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
    DollarSign,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    Search,
    Mail,
    Plus,
    Loader2,
    RefreshCw,
} from 'lucide-react'
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    LabelList
} from "recharts"
import {
    getClientsWithPayments,
    getPaymentStats,
    getAllPaymentData,
    updatePaymentStatuses,
    sendPaymentReminder,
    sendBulkReminders,
    getIncomeHistory,
    type ClientWithPayment,
    type PaymentStats,
    type IncomeData,
} from './actions'
import { RegisterPaymentDialog } from '@/components/payments/register-payment-dialog'
import { ChangePlanDialog } from '@/components/payments/change-plan-dialog'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

export default function PagosPage() {
    const router = useRouter()
    const [clients, setClients] = useState<ClientWithPayment[]>([])
    const [stats, setStats] = useState<PaymentStats | null>(null)
    const [history, setHistory] = useState<IncomeData[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<string>('due_date')
    const [selectedClient, setSelectedClient] = useState<ClientWithPayment | null>(null)
    const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
    const [changePlanDialogOpen, setChangePlanDialogOpen] = useState(false)
    const [clientToChangePlan, setClientToChangePlan] = useState<ClientWithPayment | null>(null)
    const [sendingReminder, setSendingReminder] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('pagos')

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
            // This ensures UI loads fast while statuses update eventually
            updatePaymentStatuses().catch(err => console.error('Background update failed:', err))

            // Load only data needed for initial view
            const [data, historyData] = await Promise.all([
                getAllPaymentData(),
                getIncomeHistory()
            ])

            setClients(data.clients)
            setStats(data.stats)
            setHistory(historyData)
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

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(client =>
                client.full_name.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(client => client.payment_status === statusFilter)
        }

        // Sort
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'due_date':
                    if (!a.next_due_date) return 1
                    if (!b.next_due_date) return -1
                    return new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
                case 'most_overdue':
                    if (!a.next_due_date) return 1
                    if (!b.next_due_date) return -1
                    return new Date(b.next_due_date).getTime() - new Date(a.next_due_date).getTime()
                case 'name':
                    return a.full_name.localeCompare(b.full_name)
                default:
                    return 0
            }
        })

        return filtered
    }, [clients, searchQuery, statusFilter, sortBy])

    async function handleSendReminder(clientId: string) {
        try {
            setSendingReminder(clientId)
            const result = await sendPaymentReminder(clientId)
            toast.success(result.message)
        } catch (error) {
            toast.error('No se pudo enviar el recordatorio')
        } finally {
            setSendingReminder(null)
        }
    }

    async function handleBulkReminders() {
        const clientsToRemind = clients
            .filter(c => c.payment_status === 'pending' || c.payment_status === 'overdue')
            .map(c => c.id)

        if (clientsToRemind.length === 0) {
            toast.info('No hay clientes con pagos pendientes o vencidos')
            return
        }

        try {
            const result = await sendBulkReminders(clientsToRemind)
            toast.success(result.message)
        } catch (error) {
            toast.error('No se pudieron enviar los recordatorios')
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'paid':
                return <Badge variant="default" className="bg-green-500">Pagado</Badge>
            case 'pending':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pendiente</Badge>
            case 'overdue':
                return <Badge variant="destructive">Vencido</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    function formatDate(date: string | null) {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
    }

    function isDueSoon(dueDate: string | null) {
        if (!dueDate) return false
        const due = new Date(dueDate)
        const today = new Date()
        const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= 3
    }

    if (loading) {
        return (
            <div className="space-y-8">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-32" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                {/* Loading indicator */}
                <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="h-12 w-12 rounded-full border-4 border-primary/20 flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-primary/40" />
                            </div>
                            <Loader2 className="absolute -top-0.5 -left-0.5 h-[52px] w-[52px] animate-spin text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground animate-pulse">
                            Cargando tus pagos y planes...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const statusChartData = [
        { name: 'Al día', value: stats?.paidClients || 0, color: '#22c55e' },
        { name: 'Pendientes', value: stats?.pendingClients || 0, color: '#f59e0b' },
        { name: 'Vencidos', value: stats?.overdueClients || 0, color: '#ef4444' }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tus Pagos y Planes</h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Gestiona los pagos y planes de tus asesorados
                    </p>
                </div>
            </div>

            <Tabs defaultValue="pagos" className="w-full space-y-6" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="pagos">Pagos</TabsTrigger>
                    <TabsTrigger value="planes">Planes</TabsTrigger>
                    <TabsTrigger value="history">Historial de Registros</TabsTrigger>
                    <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                </TabsList>

                <TabsContent value="stats">
                    {activeTab === 'stats' && <StatsTab history={history} />}
                </TabsContent>

                <TabsContent value="pagos" className="space-y-6">

                    {/* KPI Cards */}
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                        {/* Resumen General */}
                        <Card className="col-span-2 md:col-span-2 lg:col-span-2 flex flex-col justify-between">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Resumen General</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Ingresos */}
                                <div className="flex items-center justify-between border-b pb-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Ingresos Cobrados</p>
                                        <div className="text-2xl font-bold text-primary">
                                            {formatCurrency(stats?.paidMonthlyIncome || 0)}
                                        </div>
                                    </div>
                                </div>

                                {/* Contadores de Clientes */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Total Asesorados</p>
                                        <div className="text-xl font-bold">{clients.length}</div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Activos</p>
                                        <div className="text-xl font-bold text-green-600">{stats?.activeClients || 0}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Gráfico de Estado de Pagos */}
                        <Card className="col-span-2 md:col-span-4 lg:col-span-3">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Estado de Pagos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[120px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={statusChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                            <XAxis
                                                dataKey="name"
                                                stroke="#888888"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                                <LabelList
                                                    dataKey="value"
                                                    position="center"
                                                    fill="white"
                                                    fontSize={14}
                                                    fontWeight="bold"
                                                    formatter={(value: any) => value > 0 ? value : ''}
                                                />
                                                {statusChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>




                    {/* Clients Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-4">


                                {/* Search + Filters */}
                                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar por nombre..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full md:w-[180px]">
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="paid">Pagado</SelectItem>
                                            <SelectItem value="pending">Pendiente</SelectItem>
                                            <SelectItem value="overdue">Vencido</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleBulkReminders} variant="outline" className="w-full md:w-auto">
                                        <Mail className="mr-2 h-4 w-4" />
                                        Enviar recordatorios
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredClients.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    No se encontraron asesorados
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Asesorado</TableHead>
                                                    <TableHead>Plan</TableHead>
                                                    <TableHead>Monto Mensual</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                    <TableHead>Próximo Vencimiento</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredClients.map((client) => (
                                                    <TableRow
                                                        key={client.id}
                                                        className={cn(
                                                            client.payment_status === 'overdue' &&
                                                            'bg-red-50 border-l-4 border-l-red-500',
                                                            client.payment_status === 'pending' &&
                                                            isDueSoon(client.next_due_date) &&
                                                            'bg-yellow-50 border-l-4 border-l-yellow-500'
                                                        )}
                                                    >
                                                        <TableCell>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-medium">{client.full_name}</div>
                                                                    {client.status === 'active' ? (
                                                                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Activo</Badge>
                                                                    ) : (
                                                                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-gray-100 text-gray-500 hover:bg-gray-100 border-gray-200">Inactivo</Badge>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {client.email || '-'}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {client.plan ? (
                                                                <div className="font-medium text-sm">{client.plan.name}</div>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">Personalizado</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">
                                                                {formatCurrency(client.price_monthly || 0)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusBadge(client.payment_status)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">
                                                                {formatDate(client.next_due_date)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex gap-2 justify-end">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedClient(client)
                                                                        setRegisterDialogOpen(true)
                                                                    }}
                                                                >
                                                                    <Plus className="mr-2 h-4 w-4" />
                                                                    Registrar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setClientToChangePlan(client)
                                                                        setChangePlanDialogOpen(true)
                                                                    }}
                                                                >
                                                                    <RefreshCw className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleSendReminder(client.id)}
                                                                    disabled={sendingReminder === client.id}
                                                                >
                                                                    {sendingReminder === client.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Mail className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden space-y-4">
                                        {filteredClients.map((client) => (
                                            <div
                                                key={client.id}
                                                className={cn(
                                                    "flex flex-col gap-4 p-4 border rounded-lg",
                                                    client.payment_status === 'overdue' &&
                                                    'bg-red-50 border-l-4 border-l-red-500',
                                                    client.payment_status === 'pending' &&
                                                    isDueSoon(client.next_due_date) &&
                                                    'bg-yellow-50 border-l-4 border-l-yellow-500'
                                                )}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="font-medium truncate">{client.full_name}</div>
                                                        {client.status === 'active' ? (
                                                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Activo</Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-gray-100 text-gray-500 hover:bg-gray-100 border-gray-200">Inactivo</Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {client.plan?.name || 'Personalizado'}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm font-medium">
                                                        {formatCurrency(client.price_monthly || 0)}
                                                    </div>
                                                    {getStatusBadge(client.payment_status)}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    Vence: {formatDate(client.next_due_date)}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => {
                                                            setSelectedClient(client)
                                                            setRegisterDialogOpen(true)
                                                        }}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Registrar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setClientToChangePlan(client)
                                                            setChangePlanDialogOpen(true)
                                                        }}
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleSendReminder(client.id)}
                                                        disabled={sendingReminder === client.id}
                                                    >
                                                        {sendingReminder === client.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Mail className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

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

                <TabsContent value="planes">
                    {activeTab === 'planes' && <PlanesTab />}
                </TabsContent>

                <TabsContent value="history">
                    {activeTab === 'history' && <HistoryTab />}
                </TabsContent>
            </Tabs>
        </div >
    )
}
