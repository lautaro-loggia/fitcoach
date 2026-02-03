'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signup } from '@/app/(auth)/actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export function RegisterForm() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

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
        <div className="flex flex-col w-full">
            <div className="flex flex-col gap-1 mb-8 text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Crear cuenta</h1>
                <p className="text-[#666666] text-sm">
                    Registrate para comenzar a gestionar tus clientes
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid gap-1.5">
                    <Label htmlFor="fullName" className="text-sm font-medium text-[#666666]">
                        Nombre completo
                    </Label>
                    <Input
                        id="fullName"
                        name="fullName"
                        placeholder="Juan Pérez"
                        required
                        disabled={loading}
                        className="h-11 px-4 rounded-xl border-[#E5E5E5] bg-white text-foreground placeholder:text-[#A3A3A3]"
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-sm font-medium text-[#666666]">
                        Email
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="entrenador@ejemplo.com"
                        required
                        disabled={loading}
                        className="h-11 px-4 rounded-xl border-[#E5E5E5] bg-white text-foreground placeholder:text-[#A3A3A3]"
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="password" title="Contraseña" className="text-sm font-medium text-[#666666]">
                        Contraseña
                    </Label>
                    <div className="relative">
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            disabled={loading}
                            className="h-11 px-4 pr-11 rounded-xl border-[#E5E5E5] bg-white text-foreground placeholder:text-[#A3A3A3]"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-foreground"
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5 stroke-[1.5]" />
                            ) : (
                                <Eye className="h-5 w-5 stroke-[1.5]" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="confirmPassword" title="Confirmar contraseña" className="text-sm font-medium text-[#666666]">
                        Confirmar contraseña
                    </Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            disabled={loading}
                            className="h-11 px-4 pr-11 rounded-xl border-[#E5E5E5] bg-white text-foreground placeholder:text-[#A3A3A3]"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-foreground"
                        >
                            {showConfirmPassword ? (
                                <EyeOff className="h-5 w-5 stroke-[1.5]" />
                            ) : (
                                <Eye className="h-5 w-5 stroke-[1.5]" />
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="text-destructive text-sm font-medium">{error}</div>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-black hover:bg-black/90 text-white rounded-xl font-medium transition-all"
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Creando cuenta...' : 'Registrarse'}
                </Button>
            </form>

            <div className="mt-8 text-center text-sm text-[#666666]">
                ¿Ya tenés una cuenta?{' '}
                <Link href="/login" className="font-semibold text-black hover:underline">
                    Iniciá sesión
                </Link>
            </div>
        </div>
    )
}
