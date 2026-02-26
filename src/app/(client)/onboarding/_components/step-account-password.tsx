'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setOnboardingPassword } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from 'lucide-react'

type StepAccountPasswordClient = {
    email?: string | null
    registered_email?: string | null
    [key: string]: unknown
}

export function StepAccountPassword({
    client,
    onNext,
    isPreview,
}: {
    client: StepAccountPasswordClient
    onNext: () => void
    isPreview?: boolean
}) {
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const registeredEmail = client.registered_email || client.email || 'No disponible'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!password || !confirmPassword) {
            toast.error('Por favor completá ambos campos.')
            return
        }

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres.')
            return
        }

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden.')
            return
        }

        setLoading(true)

        if (isPreview) {
            await new Promise(resolve => setTimeout(resolve, 500))
            onNext()
            setLoading(false)
            return
        }

        try {
            const res = await setOnboardingPassword({ password, confirmPassword })

            if (res?.error) {
                toast.error(res.error)
                return
            }

            onNext()
        } catch {
            toast.error('No se pudo guardar la contraseña.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">Protegé tu cuenta</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                    Antes de empezar, elegí una contraseña para ingresar a Orbit.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-1">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        <Mail className="h-3.5 w-3.5" />
                        Correo registrado
                    </div>
                    <p className="text-sm font-semibold text-[#1A1A1A] break-all">{registeredEmail}</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="onboarding-password" className="text-sm font-bold text-[#1A1A1A]">
                        Contraseña
                    </Label>
                    <div className="relative">
                        <Input
                            id="onboarding-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="h-12 pr-12 border-gray-200 focus:ring-black"
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(prev => !prev)}
                            className="absolute inset-y-0 right-3 my-auto h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-[#1A1A1A]"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="onboarding-confirm-password" className="text-sm font-bold text-[#1A1A1A]">
                        Repetir contraseña
                    </Label>
                    <div className="relative">
                        <Input
                            id="onboarding-confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Repetí tu contraseña"
                            className="h-12 pr-12 border-gray-200 focus:ring-black"
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(prev => !prev)}
                            className="absolute inset-y-0 right-3 my-auto h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-[#1A1A1A]"
                            aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-14 text-base font-bold bg-[#1A1A1A] hover:bg-black shadow-lg shadow-black/10 transition-all rounded-xl group"
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            Guardar y continuar
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </Button>
            </form>
        </div>
    )
}
