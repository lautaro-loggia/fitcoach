'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AvatarUpload } from './avatar-upload'
import { DeleteAccountDialog } from './delete-account-dialog'
import { Loader2, AlertTriangle } from 'lucide-react'

interface AccountFormProps {
    userId: string
}

export function AccountForm({ userId }: AccountFormProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    useEffect(() => {
        loadUserData()
    }, [])

    const loadUserData = async () => {
        try {
            setLoading(true)

            // Get auth user email
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email) {
                setEmail(user.email)
            }

            // Get profile data
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('full_name, phone, avatar_url')
                .eq('id', userId)
                .single()

            if (error) throw error

            if (profile) {
                setFullName(profile.full_name || '')
                setPhone(profile.phone || '')
                setAvatarUrl(profile.avatar_url || null)
            }
        } catch (error) {
            console.error('Error loading user data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone: phone || null,
                })
                .eq('id', userId)

            if (error) throw error

            alert('Cambios guardados correctamente')
        } catch (error) {
            console.error('Error saving data:', error)
            alert('Error al guardar los cambios')
        } finally {
            setSaving(false)
        }
    }

    const getUserInitials = () => {
        if (!fullName) return '?'
        const names = fullName.split(' ')
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase()
        }
        return fullName.substring(0, 2).toUpperCase()
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                    <CardDescription>
                        Actualiza tu información de perfil.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-center pb-4 border-b">
                        <AvatarUpload
                            userId={userId}
                            currentAvatarUrl={avatarUrl}
                            userInitials={getUserInitials()}
                            onUploadComplete={(url) => setAvatarUrl(url)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fullName">Nombre completo</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Juan Pérez"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            El email no puede modificarse desde aquí.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+54 9 11 1234-5678"
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Guardar cambios'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cambiar Contraseña</CardTitle>
                    <CardDescription>
                        Actualiza tu contraseña para mayor seguridad.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Contraseña actual</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Nueva contraseña</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button disabled>
                            Actualizar contraseña
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        La funcionalidad de cambio de contraseña estará disponible próximamente.
                    </p>
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                    </div>
                    <CardDescription>
                        Eliminar tu cuenta es una acción irreversible.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, asegurate de estar completamente seguro.
                        </p>
                    </div>

                    <div className="flex justify-start">
                        <Button
                            variant="destructive"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            Eliminar cuenta
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <DeleteAccountDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                userId={userId}
                avatarUrl={avatarUrl}
            />
        </div>
    )
}
