'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { updatePayment, type PaymentWithClient } from '@/app/(dashboard)/pagos/actions'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface EditPaymentDialogProps {
    payment: PaymentWithClient
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditPaymentDialog({
    payment,
    open,
    onOpenChange,
    onSuccess,
}: EditPaymentDialogProps) {
    const [loading, setLoading] = useState(false)
    const [paidAt, setPaidAt] = useState('')
    const [amount, setAmount] = useState('')
    const [method, setMethod] = useState('')
    const [note, setNote] = useState('')

    useEffect(() => {
        if (open) {
            setPaidAt(payment.paid_at)
            setAmount(payment.amount.toString())
            setMethod(payment.method)
            setNote(payment.note || '')
        }
    }, [open, payment])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!paidAt || !amount || !method) {
            toast.error('Por favor completa todos los campos requeridos')
            return
        }

        try {
            setLoading(true)
            const result = await updatePayment(payment.id, {
                paidAt,
                amount: parseFloat(amount),
                method,
                note: note || undefined,
            })

            if (result.error) {
                toast.error(result.error)
                return
            }

            toast.success('Pago actualizado exitosamente')
            onOpenChange(false)
            onSuccess()
        } catch (error) {
            console.error('Unexpected error:', error)
            toast.error('Error al actualizar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Pago</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles del pago de {payment.client?.full_name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Fecha</Label>
                        <Input
                            id="date"
                            type="date"
                            value={paidAt}
                            onChange={(e) => setPaidAt(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="method">Método de pago</Label>
                        <Select value={method} onValueChange={setMethod} disabled={loading}>
                            <SelectTrigger id="method">
                                <SelectValue placeholder="Selecciona un método" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Efectivo</SelectItem>
                                <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                                <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
                                <SelectItem value="other">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="note">Nota</Label>
                        <Textarea
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Nota opcional..."
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
