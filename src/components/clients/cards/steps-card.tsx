'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Orbit01Icon, Edit01Icon } from 'hugeicons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateClientAction } from '@/app/(dashboard)/clients/actions'
import { toast } from 'sonner'

interface StepsCardProps {
    client: any
}

export function StepsCard({ client }: StepsCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [steps, setSteps] = useState(client.daily_steps_target || 10000)
    const [tempSteps, setTempSteps] = useState(steps.toString())

    const handleSave = async () => {
        const value = parseInt(tempSteps)
        if (isNaN(value)) {
            toast.error('Por favor ingresá un número válido')
            return
        }

        try {
            const res = await updateClientAction(client.id, {
                daily_steps_target: value
            })

            if (res?.error) {
                toast.error(res.error)
            } else {
                setSteps(value)
                setIsEditing(false)
                toast.success('Objetivo de pasos actualizado')
            }
        } catch (err) {
            toast.error('Error al actualizar')
        }
    }

    return (
        <Card className="bg-white overflow-hidden py-0">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded-xl">
                            <Orbit01Icon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 leading-tight">Objetivo de Pasos</h3>
                            <p className="text-xs text-gray-400">Referencia diaria (NEAT)</p>
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs px-2"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs px-3 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                onClick={handleSave}
                            >
                                Guardar
                            </Button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                        >
                            Editar
                        </button>
                    )}
                </div>

                <div className="flex items-baseline gap-2">
                    {isEditing ? (
                        <div className="flex items-baseline gap-2">
                            <Input
                                type="number"
                                value={tempSteps}
                                onChange={(e) => setTempSteps(e.target.value)}
                                className="h-12 w-28 text-2xl font-bold p-2 text-indigo-600 border-indigo-100 focus-visible:ring-indigo-200"
                                autoFocus
                            />
                            <span className="text-sm text-gray-400 font-medium">pasos / día</span>
                        </div>
                    ) : (
                        <>
                            <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                {steps.toLocaleString('es-ES')}
                            </span>
                            <span className="text-sm text-gray-400 font-medium whitespace-nowrap">pasos / día</span>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
