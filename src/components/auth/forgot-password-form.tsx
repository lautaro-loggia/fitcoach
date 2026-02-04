'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/app/(auth)/actions'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

export function ForgotPasswordForm() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = await requestPasswordReset(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        } else if (result?.success) {
            setSuccess(true)
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex flex-col w-full text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">¡Email enviado!</h1>
                <p className="text-[#666666] text-sm mb-8">
                    Te enviamos las instrucciones para recuperar tu cuenta a tu correo electrónico.
                </p>
                <Link href="/login">
                    <Button className="w-full h-11 bg-black hover:bg-black/90 text-white rounded-xl font-medium transition-all">
                        Volver al inicio
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col w-full">
            <Link
                href="/login"
                className="flex items-center gap-2 text-sm text-[#666666] hover:text-black mb-8 transition-colors w-fit"
            >
                <ArrowLeft className="h-4 w-4" />
                Volver
            </Link>

            <div className="flex flex-col gap-1 mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Recuperar contraseña</h1>
                <p className="text-[#666666] text-sm">
                    Ingresá tu correo electrónico para recibir un enlace de recuperación
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-sm font-medium text-[#666666]">
                        Correo electrónico
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="tu@email.com"
                        required
                        disabled={loading}
                        className="h-11 px-4 rounded-xl border-[#E5E5E5] bg-white text-foreground placeholder:text-[#A3A3A3]"
                    />
                </div>

                {error && (
                    <div className="text-destructive text-sm font-medium">{error}</div>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-black hover:bg-black/90 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando enlace...
                        </>
                    ) : (
                        'Enviar enlace'
                    )}
                </Button>
            </form>
        </div>
    )
}
