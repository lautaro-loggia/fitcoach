'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/app/(auth)/actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LoginForm() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [userType, setUserType] = useState<'coach' | 'client'>('coach')
    const router = useRouter()

    const searchParams = useSearchParams()

    useEffect(() => {
        // Load preference from localStorage
        const savedType = localStorage.getItem('orbit_login_user_type')
        if (savedType === 'coach' || savedType === 'client') {
            setUserType(savedType)
        }

        // Check for error in URL
        const errorParam = searchParams.get('error')
        if (errorParam) {
            setError(decodeURIComponent(errorParam))
        }
    }, [searchParams])

    const handleUserTypeChange = (value: string) => {
        const type = value as 'coach' | 'client'
        setUserType(type)
        localStorage.setItem('orbit_login_user_type', type)
    }

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

        // Helper logic for role validation can be added here
        // For now, standard login
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
        <div className="flex flex-col w-full">
            <div className="flex flex-col gap-1 mb-6 text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inicia sesión</h1>
                <p className="text-[#666666] text-sm">
                    Accedé a tu cuenta para continuar
                </p>
            </div>

            <Tabs
                defaultValue="coach"
                value={userType}
                onValueChange={handleUserTypeChange}
                className="w-full mb-6"
            >
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="coach">Soy Coach</TabsTrigger>
                    <TabsTrigger value="client">Soy Asesorado</TabsTrigger>
                </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-sm font-medium text-[#666666]">
                        Nombre de usuario o correo
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="text"
                        placeholder="tu@email.com"
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
                            placeholder="************"
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

                {error && (
                    <div className="text-destructive text-sm font-medium">{error}</div>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-black hover:bg-black/90 text-white rounded-xl font-medium transition-all"
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Iniciando...' : 'Iniciar sesión'}
                </Button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-[#666666]">
                    ¿Olvidaste tu contraseña?{' '}
                    <Link href="/forgot-password" title="Click aquí" className="font-semibold text-black hover:underline">
                        Hace click acá
                    </Link>
                </p>
            </div>

            {userType === 'coach' && (
                <>
                    <div className="mt-6">
                        <Button
                            variant="outline"
                            type="button"
                            disabled={loading}
                            className="w-full h-11 rounded-xl border-[#E5E5E5] font-medium bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
                            onClick={handleGoogleLogin}
                        >
                            Inicia sesión con Google
                            {loading ? (
                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            ) : (
                                <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                        </Button>
                    </div>

                    <div className="mt-8 text-center text-sm text-[#666666]">
                        ¿No tenés una cuenta?{' '}
                        <Link href="/register" className="font-semibold text-black hover:underline">
                            Registrate
                        </Link>
                    </div>
                </>
            )}

            {userType === 'client' && (
                <div className="mt-8 text-center bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-[#666666] leading-relaxed">
                        ¿No tenés cuenta? Los asesorados no pueden registrarse por su cuenta.
                        Solo tu coach puede invitarte a Orbit.
                    </p>
                </div>
            )}
        </div>
    )

}
