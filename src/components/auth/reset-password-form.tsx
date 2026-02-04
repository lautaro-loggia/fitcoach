'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from '@/app/(auth)/actions'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export function ResetPasswordForm() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = await updatePassword(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col w-full">
            <div className="flex flex-col gap-1 mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nueva contraseña</h1>
                <p className="text-[#666666] text-sm">
                    Ingresá tu nueva contraseña para acceder a tu cuenta
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid gap-1.5">
                    <Label htmlFor="password" title="Nueva contraseña" className="text-sm font-medium text-[#666666]">
                        Nueva contraseña
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

                <div className="grid gap-1.5">
                    <Label htmlFor="confirmPassword" title="Confirmar contraseña" className="text-sm font-medium text-[#666666]">
                        Confirmar contraseña
                    </Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="************"
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
                    className="w-full h-11 bg-black hover:bg-black/90 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Actualizando contraseña...
                        </>
                    ) : (
                        'Actualizar contraseña'
                    )}
                </Button>
            </form>
        </div>
    )
}
