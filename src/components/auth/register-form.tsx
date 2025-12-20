'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signup } from '@/app/(auth)/actions'

export function RegisterForm() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Simple client-side validation for passwords matching
        const form = e.currentTarget
        const password = (form.elements.namedItem('password') as HTMLInputElement).value
        const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            setLoading(false)
            return
        }

        const formData = new FormData(form)
        const result = await signup(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-sm">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Crear cuenta</h1>
                <p className="text-muted-foreground text-sm">
                    Registrate para comenzar a gestionar tus clientes
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="fullName">Nombre completo</Label>
                    <Input
                        id="fullName"
                        name="fullName"
                        placeholder="Juan Pérez"
                        required
                        disabled={loading}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="entrenador@ejemplo.com"
                        required
                        disabled={loading}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        disabled={loading}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        disabled={loading}
                    />
                </div>

                {error && (
                    <div className="text-destructive text-sm font-medium">{error}</div>
                )}

                <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white">
                    {loading ? 'Creando cuenta...' : 'Registrarse'}
                </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
                ¿Ya tenés una cuenta?{' '}
                <Link href="/login" className="text-primary hover:underline">
                    Iniciá sesión
                </Link>
            </div>
        </div>
    )
}
