'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { KeyRound, Lock, Loader2 } from 'lucide-react'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

interface UpdatePasswordDialogProps {
    asMenuItem?: boolean
}

export function UpdatePasswordDialog({ asMenuItem }: UpdatePasswordDialogProps) {
    const [open, setOpen] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)

    // ... handleUpdate ...

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }
        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden')
            return
        }

        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password: password })

        if (error) {
            toast.error(error.message)
        } else {
            toast.success('Contraseña actualizada correctamente')
            setOpen(false)
            setPassword('')
            setConfirmPassword('')
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {asMenuItem ? (
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                        <KeyRound className="mr-2 h-4 w-4" />
                        <span>Cambiar contraseña</span>
                    </DropdownMenuItem>
                ) : (
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900" title="Cambiar contraseña">
                        <KeyRound className="h-5 w-5" />
                        <span className="sr-only">Cambiar contraseña</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Establecer contraseña</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdate} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label>Nueva contraseña</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="pl-9"
                                placeholder="******"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Repetir contraseña</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="pl-9"
                                placeholder="******"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Guardando...' : 'Actualizar contraseña'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
