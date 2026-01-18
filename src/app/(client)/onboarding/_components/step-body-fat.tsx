'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { completeOnboarding } from '@/actions/client-onboarding' // We need to fix this export in actions too if not named correctly
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function StepBodyFat({ client, onPrev }: { client: any, onPrev: () => void }) {
    const [loading, setLoading] = useState(false)
    const [method, setMethod] = useState<'navy' | 'manual' | 'skip'>('navy')

    // Navy measurements
    const [measurements, setMeasurements] = useState({
        neck: '',
        waist: '',
        hip: ''
    })

    const [manualFat, setManualFat] = useState('')
    const [calculatedFat, setCalculatedFat] = useState<number | null>(null)

    const gender = client.gender || 'male' // Fallback if missing, but we added it to profile

    const calculateNavy = () => {
        const neck = Number(measurements.neck)
        const waist = Number(measurements.waist)
        const hip = Number(measurements.hip)
        const height = Number(client.height)

        if (!neck || !waist || !height) return

        let fat = 0
        if (gender === 'male') {
            // 495 / ( 1.0324 - 0.19077 * log10( waist - neck ) + 0.15456 * log10( height ) ) - 450
            fat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450
        } else {
            // 495 / ( 1.29579 - 0.35004 * log10( waist + hip - neck ) + 0.22100 * log10( height ) ) - 450
            if (!hip) return
            fat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450
        }
        setCalculatedFat(Math.round(fat * 10) / 10)
    }

    const handleSubmit = async () => {
        setLoading(true)

        try {
            let finalFat = undefined
            let navyData = undefined

            if (method === 'navy') {
                if (!measurements.neck || !measurements.waist) {
                    toast.error('Completá las medidas')
                    setLoading(false)
                    return
                }
                if (gender === 'female' && !measurements.hip) {
                    toast.error('Completá la cadera')
                    setLoading(false)
                    return
                }
                // Recalculate to be sure
                if (!calculatedFat) calculateNavy() // This is async state, dangerous. Best to calc directly.

                // Inline calc
                const neck = Number(measurements.neck)
                const waist = Number(measurements.waist)
                const hip = Number(measurements.hip)
                const height = Number(client.height)
                let fat = 0
                if (gender === 'male') {
                    fat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450
                } else {
                    fat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450
                }
                finalFat = Math.round(fat * 10) / 10
                navyData = { neck, waist, hip: gender === 'female' ? hip : undefined }

            } else if (method === 'manual') {
                if (!manualFat) {
                    toast.error('Ingresá tu porcentaje')
                    setLoading(false)
                    return
                }
                finalFat = Number(manualFat)
            }

            await completeOnboarding({
                method: method === 'skip' ? 'skipped' : method,
                body_fat_percentage: finalFat,
                navy_method: navyData as any
            })

            // Navigate is handled by action redirect or window location
            window.location.href = '/dashboard'

        } catch (err) {
            toast.error('Error al finalizar')
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Porcentaje de Grasa</h2>
                <p className="text-gray-500 text-sm">Opcional. Ayuda a ajustar mejor tus macros.</p>
            </div>

            <div className="space-y-4">
                <RadioGroup
                    value={method}
                    onValueChange={(val: any) => setMethod(val)}
                    className="flex flex-col space-y-2"
                >
                    <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${method === 'navy' ? 'bg-blue-50 border-blue-200' : ''}`}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="navy" id="navy" />
                            <Label htmlFor="navy" className="cursor-pointer font-semibold">Estimación por medidas (US Navy)</Label>
                        </div>
                        {method === 'navy' && (
                            <div className="mt-4 space-y-3 pl-6 animate-in fade-in">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Cuello (cm)</Label>
                                        <Input
                                            type="number"
                                            value={measurements.neck}
                                            onChange={e => setMeasurements({ ...measurements, neck: e.target.value })}
                                            onBlur={calculateNavy}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Cintura (cm)</Label>
                                        <Input
                                            type="number"
                                            value={measurements.waist}
                                            onChange={e => setMeasurements({ ...measurements, waist: e.target.value })}
                                            onBlur={calculateNavy}
                                        />
                                        <p className="text-[10px] text-gray-500">A la altura del ombligo</p>
                                    </div>
                                    {gender === 'female' && (
                                        <div className="space-y-1">
                                            <Label className="text-xs">Cadera (cm)</Label>
                                            <Input
                                                type="number"
                                                value={measurements.hip}
                                                onChange={e => setMeasurements({ ...measurements, hip: e.target.value })}
                                                onBlur={calculateNavy}
                                            />
                                        </div>
                                    )}
                                </div>
                                {calculatedFat ? (
                                    <div className="p-2 bg-white rounded border text-center font-bold text-blue-600">
                                        Estimado: {calculatedFat}%
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>

                    <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${method === 'manual' ? 'bg-blue-50 border-blue-200' : ''}`}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manual" id="manual" />
                            <Label htmlFor="manual" className="cursor-pointer font-semibold">Ya lo conozco</Label>
                        </div>
                        {method === 'manual' && (
                            <div className="mt-3 pl-6">
                                <Input
                                    placeholder="Ej: 15.5"
                                    type="number"
                                    className="w-32"
                                    value={manualFat}
                                    onChange={e => setManualFat(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${method === 'skip' ? 'bg-blue-50 border-blue-200' : ''}`}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="skip" id="skip" />
                            <Label htmlFor="skip" className="cursor-pointer font-semibold">Omitir por ahora</Label>
                        </div>
                    </div>
                </RadioGroup>
            </div>

            <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onPrev} disabled={loading} className="w-1/3">
                    Atrás
                </Button>
                <Button onClick={handleSubmit} className="w-2/3" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {method === 'skip' ? 'Finalizar' : 'Guardar y Finalizar'}
                </Button>
            </div>
        </div>
    )
}
