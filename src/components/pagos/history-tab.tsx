'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2, AlertCircle, Pencil } from 'lucide-react'
import { getAllPayments, deletePayment, type PaymentWithClient } from '@/app/(dashboard)/pagos/actions'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { EditPaymentDialog } from '@/components/payments/edit-payment-dialog'

export function HistoryTab() {
    const [payments, setPayments] = useState<PaymentWithClient[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [editingPayment, setEditingPayment] = useState<PaymentWithClient | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)

    useEffect(() => {
        loadPayments()
    }, [])

    async function loadPayments() {
        try {
            setLoading(true)
            const data = await getAllPayments()
            setPayments(data)
        } catch (error) {
            console.error(error)
            toast.error('Error al cargar historial')
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string) {
        try {
            setDeletingId(id)
            const result = await deletePayment(id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Pago eliminado correctamente')
                // Remove from local state
                setPayments(prev => prev.filter(p => p.id !== id))
            }
        } catch (error) {
            toast.error('Error al eliminar')
        } finally {
            setDeletingId(null)
        }
    }

    function getMethodLabel(method: string) {
        switch (method) {
            case 'mercado_pago': return 'Mercado Pago'
            case 'bank_transfer': return 'Transferencia'
            case 'cash': return 'Efectivo'
            default: return method
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Registros</CardTitle>
                <CardDescription>
                    Visualiza y gestiona todos los pagos registrados manualmente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No hay pagos registrados.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Asesorado</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead className="hidden md:table-cell">Nota</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">
                                                {format(new Date(payment.paid_at + 'T12:00:00'), 'd MMM, yyyy', { locale: es })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {payment.client?.full_name || 'Desconocido'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal">
                                            {payment.client?.plan?.name || 'Personalizado'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-green-600">
                                            {formatCurrency(payment.amount)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {getMethodLabel(payment.method)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground text-xs">
                                        {payment.note || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                onClick={() => {
                                                    setEditingPayment(payment)
                                                    setEditDialogOpen(true)
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                                        disabled={deletingId === payment.id}
                                                    >
                                                        {deletingId === payment.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción eliminará el registro de pago por {formatCurrency(payment.amount)} de fecha {format(new Date(payment.paid_at), 'd/MM/yyyy')}.
                                                            Esto afectará tus métricas de ingresos.
                                                            <br /><br />
                                                            <span className="font-medium text-amber-600 flex items-center gap-2">
                                                                <AlertCircle className="h-4 w-4" />
                                                                Importante: El estado del cliente no cambiará automáticamente.
                                                            </span>
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(payment.id)}
                                                            className="bg-red-600 hover:bg-red-700"
                                                        >
                                                            Eliminar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            {editingPayment && (
                <EditPaymentDialog
                    payment={editingPayment}
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    onSuccess={loadPayments}
                />
            )}
        </Card>
    )
}
