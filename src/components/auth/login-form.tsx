'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/app/(auth)/actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const supabase = createClient()

        // Handle Implicit Flow (Hash Fragment) manually
        // because automatic detection by createBrowserClient sometimes fails in this context
        const handleHashSession = async () => {
            const hash = window.location.hash
            if (hash && hash.includes('access_token')) {
                const params = new URLSearchParams(hash.substring(1)) // remove #
                const accessToken = params.get('access_token')
                const refreshToken = params.get('refresh_token')

                if (accessToken) {
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    })

                    if (!error) {
                        router.push('/')
                        return
                    }
                }
            }

            // Fallback: Check standard session retrieval
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                router.push('/')
            }
        }

        handleHashSession()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                router.push('/')
            }
        })

        return () => subscription.unsubscribe()
    }, [router])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = await login(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (error) {
            setError(error.message)
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-sm">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Iniciá sesión</h1>
                <p className="text-muted-foreground text-sm">
                    Accedé a tu cuenta para continuar
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email o nombre de usuario</Label>
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
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Contraseña</Label>
                        <Link
                            href="/forgot-password"
                            className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            disabled={loading}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="text-destructive text-sm font-medium">{error}</div>
                )}

                <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Iniciando...' : 'Iniciar sesión'}
                </Button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">O continuá con</span>
                </div>
            </div>

            <Button
                variant="outline"
                type="button"
                disabled={loading}
                className="w-full"
                onClick={handleGoogleLogin}
            >
                {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                )}
                Iniciar sesión con Google
            </Button>

            <div className="text-center text-sm text-muted-foreground">
                ¿No tenés una cuenta?{' '}
                <Link href="/register" className="text-primary hover:underline">
                    Registrate
                </Link>
            </div>
        </div>
    )
}
