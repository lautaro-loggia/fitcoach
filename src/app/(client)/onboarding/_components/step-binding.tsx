'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export function StepBinding({ client, onNext }: { client: any, onNext: () => void }) {
    const [accepted, setAccepted] = useState(false)

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Bienvenido/a</h2>
                <p className="text-gray-500">
                    Estás uniéndote al equipo de <span className="font-semibold text-gray-900">{client.trainer?.full_name || 'tu coach'}</span>.
                </p>
            </div>

            <div className="bg-white p-6 rounded-xl border space-y-4">
                <p className="text-sm text-gray-600">
                    Para comenzar, necesitamos que completes tu perfil inicial. Esta información será visible solo para tu coach para crear tu plan personalizado.
                </p>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="consent"
                        checked={accepted}
                        onCheckedChange={(c) => setAccepted(!!c)}
                    />
                    <Label htmlFor="consent" className="text-sm cursor-pointer">
                        Acepto compartir mis datos con mi coach
                    </Label>
                </div>
            </div>

            <Button onClick={onNext} disabled={!accepted} className="w-full" size="lg">
                Continuar
            </Button>
        </div>
    )
}
