'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

function LoginForm() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info', text: string } | null>(null)

    const searchParams = useSearchParams()

    useEffect(() => {
        const supabase = createClient()

        // 1. Native Auth Listener (Best for Magic Links)
        // Detects when the session is established (whether by cookie, hash fragment, or code exchange)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth State Change:", event, session?.user?.email)
            if (event === 'SIGNED_IN' && session) {
                setStatusMessage({ type: 'success', text: 'Sesión iniciada. Redirigiendo...' })
                toast.success('Sesión iniciada correctamente')

                // Allow a slight delay for user to see success message
                setTimeout(() => {
                    window.location.href = '/dashboard'
                }, 500)
            }
        })

        // 2. Check for ERRORS in URL (Hash or Query)
        const checkErrors = () => {
            const hash = window.location.hash
            const params = new URLSearchParams(searchParams) // Start with query params

            // Merge hash params if present (Supabase implicit error returns)
            if (hash && hash.includes('error=')) {
                // Remove the # directly
                const hashParams = new URLSearchParams(hash.substring(1))
                hashParams.forEach((val, key) => params.set(key, val))
            }

            const error = params.get('error')
            const errorCode = params.get('error_code')
            const errorDesc = params.get('error_description')

            if (errorCode === 'otp_expired' || (errorDesc && errorDesc.includes('expired'))) {
                setStatusMessage({
                    type: 'error',
                    text: 'El enlace de invitación ha expirado o ya fue utilizado. Por favor solicitá uno nuevo a tu entrenador.'
                })
            } else if (error) {
                // Ignore the generic 'no_code_or_user' if we are potentially in a hash flow
                // unless we are sure no hash tokens exist (which native listener handles)
                if (error !== 'no_code_or_user') {
                    setStatusMessage({
                        type: 'error',
                        // Fix generic URL encoding + spacing
                        text: decodeURIComponent(errorDesc || error).replace(/\+/g, ' ')
                    })
                }
            }
        }

        checkErrors()

        // 3. Manual Hash Recovery (Fallback/Accelerator)
        // While onAuthStateChange usually catches this, sometimes manual detection is faster or helpful for UI feedback
        const checkHashToken = async () => {
            const hash = window.location.hash
            if (hash && hash.includes('access_token=')) {
                setStatusMessage({ type: 'info', text: 'Verificando credenciales...' })
                setLoading(true)
            }
        }
        checkHashToken()

        return () => {
            subscription.unsubscribe()
        }
    }, [searchParams])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setStatusMessage(null)

        const supabase = createClient()

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        if (error) {
            toast.error(error.message)
            setStatusMessage({ type: 'error', text: error.message })
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
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
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

                {/* Visible Status Alert */}
                {statusMessage && (
                    <Alert variant={statusMessage.type === 'error' ? 'destructive' : 'default'} className={statusMessage.type === 'success' ? 'border-green-500 text-green-700 bg-green-50' : ''}>
                        {statusMessage.type === 'error' ? <AlertCircle className="h-4 w-4" /> : null}
                        {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
                        {statusMessage.type === 'info' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        <AlertTitle>
                            {statusMessage.type === 'error' ? 'Error' : statusMessage.type === 'success' ? 'Éxito' : 'Estado'}
                        </AlertTitle>
                        <AlertDescription>
                            {statusMessage.text}
                        </AlertDescription>
                    </Alert>
                )}

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
