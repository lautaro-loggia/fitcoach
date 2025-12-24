'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface DeleteAccountDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userId: string
    avatarUrl?: string | null
}

export function DeleteAccountDialog({ open, onOpenChange, userId, avatarUrl }: DeleteAccountDialogProps) {
    const router = useRouter()
    const supabase = createClient()
    const [confirmText, setConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (confirmText !== 'ELIMINAR') {
            alert('Debes escribir "ELIMINAR" para confirmar')
            return
        }

        try {
            setIsDeleting(true)

            // Delete avatar from storage if exists
            if (avatarUrl) {
                const path = avatarUrl.split('/').slice(-2).join('/')
                await supabase.storage.from('avatars').remove([path])
            }

            // Delete user from auth (this will cascade delete from profiles and all related tables)
            const { error } = await supabase.rpc('delete_user')

            if (error) {
                // If RPC doesn't exist, we need to use admin API or let the user know
                console.error('Error deleting user:', error)
                alert('Error al eliminar la cuenta. Por favor, contacta al soporte.')
                return
            }

            // Sign out
            await supabase.auth.signOut()

            // Redirect to login
            router.push('/login')
        } catch (error) {
            console.error('Error during account deletion:', error)
            alert('Ocurrió un error al eliminar la cuenta')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleOpenChange = (open: boolean) => {
        if (!isDeleting) {
            setConfirmText('')
            onOpenChange(open)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            Esta acción <span className="font-semibold text-destructive">no se puede deshacer</span>.
                            Esto eliminará permanentemente tu cuenta y todos los datos asociados:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Todos tus asesorados</li>
                            <li>Planes de entrenamiento y dietas</li>
                            <li>Recetas e ingredientes</li>
                            <li>Historial de pagos</li>
                            <li>Check-ins y seguimientos</li>
                        </ul>
                        <p className="font-medium pt-2">
                            Para confirmar, escribe <span className="font-mono bg-muted px-1 rounded">ELIMINAR</span> a continuación:
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-4">
                    <Label htmlFor="confirm" className="sr-only">
                        Confirmar eliminación
                    </Label>
                    <Input
                        id="confirm"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Escribe ELIMINAR"
                        disabled={isDeleting}
                        autoComplete="off"
                    />
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={confirmText !== 'ELIMINAR' || isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            'Eliminar cuenta permanentemente'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
