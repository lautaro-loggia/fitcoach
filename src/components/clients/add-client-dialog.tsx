'use client'

import { useState } from 'react'
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
import { PlusSignIcon, Mail01Icon, Loading03Icon, UserIcon, SmartPhone01Icon } from 'hugeicons-react'
import { inviteClient } from '@/actions/invite-client'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

interface AddClientDialogProps {
    defaultOpen?: boolean
}

export function AddClientDialog({ defaultOpen = false }: AddClientDialogProps) {
    const [open, setOpen] = useState(defaultOpen)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (searchParams.get('new') === 'true') {
            setOpen(true)
        }
    }, [searchParams])

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (!isOpen) {
            // Remove the 'new' param when closing to keep URL clean and allow re-triggering
            const params = new URLSearchParams(window.location.search)
            if (params.get('new')) {
                params.delete('new')
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
            toast.success('Invitación enviada correctamente')
            setOpen(false)
            router.refresh()
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
                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md">
                    <PlusSignIcon className="mr-2 h-4 w-4" /> Nuevo asesorado
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Invitar Asesorado</DialogTitle>
                        <DialogDescription>
                            Enviá una invitación por email para que el asesorado cree su cuenta y complete su perfil.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
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
