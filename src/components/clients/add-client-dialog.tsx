'use client'

import { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { PlusSignIcon, Mail01Icon, Loading03Icon, UserIcon, SmartPhone01Icon } from 'hugeicons-react'
import { inviteClient } from '@/actions/invite-client'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { getTodayString } from '@/lib/utils'
import { getPlans, type Plan } from '@/app/(dashboard)/pagos/actions'

interface AddClientDialogProps {
    defaultOpen?: boolean
}

type PaymentSetup = 'paid' | 'pending'

export function AddClientDialog({ defaultOpen = false }: AddClientDialogProps) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen)
    const [loading, setLoading] = useState(false)
    const [loadingPlans, setLoadingPlans] = useState(false)
    const [plans, setPlans] = useState<Plan[]>([])
    const [paymentSetup, setPaymentSetup] = useState<PaymentSetup>('pending')
    const [selectedPlanId, setSelectedPlanId] = useState('none')
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paidAt, setPaidAt] = useState(getTodayString())
    const [firstDueDate, setFirstDueDate] = useState(getTodayString())
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
    const router = useRouter()
    const searchParams = useSearchParams()
    const open = internalOpen || searchParams.get('new') === 'true'

    useEffect(() => {
        if (!open) return

        let mounted = true
        async function loadPlans() {
            try {
                setLoadingPlans(true)
                const data = await getPlans()
                if (mounted) setPlans(data)
            } catch (error) {
                console.error('Error loading plans on invite dialog:', error)
                toast.error('No se pudieron cargar los planes')
            } finally {
                if (mounted) setLoadingPlans(false)
            }
        }

        loadPlans()
        return () => {
            mounted = false
        }
    }, [open])

    function resetPaymentFields() {
        setPaymentSetup('pending')
        setSelectedPlanId('none')
        setPaymentAmount('')
        setPaidAt(getTodayString())
        setFirstDueDate(getTodayString())
        setPaymentMethod('bank_transfer')
    }

    function handlePlanChange(planId: string) {
        setSelectedPlanId(planId)
        if (planId === 'none') return

        const plan = plans.find((item) => item.id === planId)
        if (plan) {
            setPaymentAmount(plan.price_monthly.toString())
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        setInternalOpen(isOpen)
        if (!isOpen) {
            resetPaymentFields()
            // Remove onboarding trigger params when closing to keep URL clean and avoid stale resumes.
            const params = new URLSearchParams(window.location.search)
            const hadNew = params.has('new')
            const hadOnboardingStep = params.has('onboardingStep')
            if (hadNew || hadOnboardingStep) {
                params.delete('new')
                params.delete('onboardingStep')
                router.replace(`${window.location.pathname}?${params.toString()}`)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const res = await inviteClient(null, formData)

        if (res?.error) {
            toast.error(res.error)
        } else if (res?.success) {
            if (res.warning) {
                toast.warning(res.warning)
            } else {
                toast.success(res.message || 'Invitación enviada correctamente')
            }
            setInternalOpen(false)
            resetPaymentFields()
            router.refresh()
            const onboardingStep = searchParams.get('onboardingStep')
            if (onboardingStep) {
                router.push(`/?coachOnboardingStep=${encodeURIComponent(onboardingStep)}`)
                setLoading(false)
                return
            }

            // Clean URL also on success just in case
            const params = new URLSearchParams(window.location.search)
            if (params.get('new')) {
                params.delete('new')
                router.replace(`${window.location.pathname}?${params.toString()}`)
            }
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md px-3 md:px-4">
                    <PlusSignIcon className="md:mr-2 h-4 w-4" />
                    <span className="hidden md:inline">Nuevo asesorado</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Invitar Asesorado</DialogTitle>
                        <DialogDescription>
                            Enviá una invitación por email para que el asesorado cree su cuenta y complete su perfil.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <input type="hidden" name="paymentSetup" value={paymentSetup} />
                        <input type="hidden" name="planId" value={selectedPlanId === 'none' ? '' : selectedPlanId} />
                        <input type="hidden" name="paymentMethod" value={paymentMethod} />

                        <div className="grid gap-2">
                            <Label htmlFor="fullName">Nombre completo</Label>
                            <div className="relative">
                                <UserIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    placeholder="Juan Pérez"
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail01Icon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="juan@ejemplo.com"
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <div className="relative">
                                <SmartPhone01Icon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    placeholder="+54 9 11 1234 5678"
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-border" />

                        <div className="grid gap-2">
                            <Label>Estado inicial de pago</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={paymentSetup === 'pending' ? 'default' : 'outline'}
                                    onClick={() => setPaymentSetup('pending')}
                                    disabled={loading}
                                >
                                    No pagó aún
                                </Button>
                                <Button
                                    type="button"
                                    variant={paymentSetup === 'paid' ? 'default' : 'outline'}
                                    onClick={() => setPaymentSetup('paid')}
                                    disabled={loading}
                                >
                                    Ya pagó
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="plan">Plan inicial (opcional)</Label>
                            <Select
                                value={selectedPlanId}
                                onValueChange={handlePlanChange}
                                disabled={loading || loadingPlans}
                            >
                                <SelectTrigger id="plan">
                                    <SelectValue placeholder={loadingPlans ? 'Cargando planes...' : 'Seleccioná un plan'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Personalizado</SelectItem>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id}>
                                            {plan.name} - ${plan.price_monthly.toLocaleString('es-AR')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="paymentAmount">
                                {paymentSetup === 'paid' ? 'Monto pagado' : 'Monto a cobrar'} *
                            </Label>
                            <Input
                                id="paymentAmount"
                                name="paymentAmount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="0"
                                required
                                disabled={loading}
                            />
                        </div>

                        {paymentSetup === 'paid' ? (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="paidAt">Fecha de pago *</Label>
                                    <Input
                                        id="paidAt"
                                        name="paidAt"
                                        type="date"
                                        value={paidAt}
                                        onChange={(e) => setPaidAt(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="paymentMethod">Método de pago *</Label>
                                    <Select
                                        value={paymentMethod}
                                        onValueChange={setPaymentMethod}
                                        disabled={loading}
                                    >
                                        <SelectTrigger id="paymentMethod">
                                            <SelectValue placeholder="Seleccioná método" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Efectivo</SelectItem>
                                            <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                                            <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
                                            <SelectItem value="other">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="firstDueDate">Primer vencimiento *</Label>
                                <Input
                                    id="firstDueDate"
                                    name="firstDueDate"
                                    type="date"
                                    value={firstDueDate}
                                    onChange={(e) => setFirstDueDate(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loading03Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Enviar Invitación
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
