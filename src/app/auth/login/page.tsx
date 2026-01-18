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
        const error = searchParams.get('error')
        if (error) {
            toast.error(decodeURIComponent(error))
        }
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
