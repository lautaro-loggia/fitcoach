'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export function StepBinding({ client, onNext, isPreview }: { client: any, onNext: () => void, isPreview?: boolean }) {
    const [accepted, setAccepted] = useState(false)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">Bienvenido/a</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                    Estás uniéndote al equipo de <span className="font-bold text-[#1A1A1A]">{client.trainer?.full_name || 'tu coach'}</span>.
                </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <p className="text-sm text-gray-500 leading-relaxed">
                    Para comenzar, necesitamos que completes tu perfil inicial. Esta información será visible solo para tu coach para crear tu plan personalizado.
                </p>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                    <Checkbox
                        id="consent"
                        checked={accepted}
                        onCheckedChange={(c) => setAccepted(!!c)}
                        className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                    />
                    <Label htmlFor="consent" className="text-xs font-medium text-gray-600 cursor-pointer">
                        Acepto compartir mis datos con mi coach
                    </Label>
                </div>
            </div>

            <Button
                onClick={onNext}
                disabled={!accepted}
                className="w-full h-14 text-base font-bold bg-[#1A1A1A] hover:bg-black shadow-lg shadow-black/10 transition-all rounded-xl"
            >
                Continuar
            </Button>
        </div>
    )
}
