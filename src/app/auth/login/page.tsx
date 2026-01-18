'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const searchParams = useSearchParams()

    useEffect(() => {
        const handleAuthCallback = async () => {
            const hash = window.location.hash

            // Check for Implicit Grant (Hash Tokens) - Rescue flow
            if (hash && hash.includes('access_token=')) {
                const params = new URLSearchParams(hash.substring(1)) // remove #
                const accessToken = params.get('access_token')
                const refreshToken = params.get('refresh_token')

                if (accessToken && refreshToken) {
                    setLoading(true)
                    const supabase = createClient()
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })

                    if (!error && data.session) {
                        toast.success('Sesión recuperada correctamente')
                        window.location.href = '/dashboard' // Force reload to sync cookies
                        return
                    } else if (error) {
                        toast.error('Error recuperando sesión: ' + error.message)
                    }
                }
            }

            // Check for hash errors (Supabase sometimes sends errors in fragment)
            if (hash && hash.includes('error=')) {
                const params = new URLSearchParams(hash.substring(1)) // remove #
                const errorCode = params.get('error_code')
                const errorDesc = params.get('error_description')

                if (errorCode === 'otp_expired' || errorDesc?.includes('expired')) {
                    toast.error("El enlace de invitación ha expirado. Por favor solicitá uno nuevo.")
                } else if (errorDesc) {
                    toast.error(decodeURIComponent(errorDesc).replace(/\+/g, ' '))
                }
                return
            }

            const code = searchParams.get('code')
            const error = searchParams.get('error')
            const errorDesc = searchParams.get('error_description')

            if (error) {
                // Ignore generic 'no_code' error if we have a specific hash error (handled above, but hash check runs first)
                // If no hash error, show the param error
                if (error === 'no_code_or_user' && !hash) {
                    // This is our generic fallback, suppress it if it's confusing or show a better message
                    // For now, allow it but maybe cleaner text
                } else {
                    toast.error(decodeURIComponent(errorDesc || error))
                }
            }

            if (code) {
                setLoading(true)
                const supabase = createClient()
                // Attempt to exchange code for session
                const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

                if (sessionError) {
                    toast.error(`Error de autenticación: ${sessionError.message}`)
                    setLoading(false)
                } else if (data.session) {
                    toast.success('Sesión iniciada correctamente')
                    // Check onboarding status or default to dashboard
                    window.location.href = '/dashboard' // Force reload to pick up session cookies
                }
            }
        }

        handleAuthCallback()
    }, [searchParams])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient()

        // We can use generic invite link logic or just magic link
        // prompt says "No self-signup". But existing users need to login.
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
            },
        })

        if (error) {
            toast.error(error.message)
            setLoading(false)
        } else {
            setSent(true)
            setLoading(false)
        }
    }

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-sm border max-w-md text-center space-y-4">
                    <h2 className="text-2xl font-bold">¡Revisá tu email!</h2>
                    <p className="text-gray-600">Te enviamos un enlace mágico para iniciar sesión.</p>
                    <Button variant="outline" onClick={() => setSent(false)}>Volver</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-sm border max-w-md w-full space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-blue-600">Orbit</h1>
                    <p className="text-gray-500 mt-2">Acceso a clientes</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            placeholder="tu@email.com"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ingresar con Email
                    </Button>
                </form>
                <p className="text-xs text-center text-gray-400">
                    Si aún no tenés cuenta, contactá a tu entrenador.
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <LoginForm />
        </Suspense>
    )
}
