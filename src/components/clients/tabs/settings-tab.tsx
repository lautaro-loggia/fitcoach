'use client'

import { useState } from 'react'
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateClientAction, deleteClientAction } from "@/app/(dashboard)/clients/actions"
import { Loader2, Save, Trash2, AlertTriangle } from "lucide-react"
import { AllergenSelector } from "../allergen-selector"

export function SettingsTab({ client }: { client: any }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const [formData, setFormData] = useState({
        full_name: client.full_name || '',
        email: client.email || '',
        phone: client.phone || '',
        birth_date: client.birth_date || '',
        gender: client.gender || '',
        height: client.height || '',
        initial_weight: client.initial_weight || '',
        initial_body_fat: client.initial_body_fat || '',
        status: client.status || 'active',
        goal_text: client.goal_text || '',
        goal_specific: client.goal_specific || '',
        activity_level: client.activity_level || '',
        target_weight: client.target_weight || '',
        target_fat: client.target_fat || ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSave = async () => {
        setLoading(true)
        setMessage(null)

        // Prepare data types
        const dataToUpdate = {
            ...formData,
            height: formData.height ? parseFloat(formData.height) : null,
            initial_weight: formData.initial_weight ? parseFloat(formData.initial_weight) : null,
            initial_body_fat: formData.initial_body_fat ? parseFloat(formData.initial_body_fat) : null,
            target_weight: formData.target_weight ? parseFloat(formData.target_weight) : null,
            target_fat: formData.target_fat ? parseFloat(formData.target_fat) : null,
        }

        const result = await updateClientAction(client.id, dataToUpdate)

        if (result?.error) {
            setMessage({ type: 'error', text: result.error })
        } else {
            setMessage({ type: 'success', text: "Información actualizada correctamente." })
        }
        setLoading(false)
    }

    const handleDelete = async () => {
        if (confirm("¿Estás seguro de que querés eliminar este asesorado? Esta acción no se puede deshacer y borrará todos sus datos, rutinas y chequeos.")) {
            setLoading(true)
            const result = await deleteClientAction(client.id)
            if (result?.error) {
                setMessage({ type: 'error', text: result.error })
                setLoading(false)
            } else {
                router.push('/clients')
            }
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Mensaje de estado */}
            {message && (
                <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-destructive/15 text-destructive'} flex items-center`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div className="grid gap-6">

                    {/* Información Personal */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Personal</CardTitle>
                            <CardDescription>Datos básicos del asesorado.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="full_name">Nombre Completo</Label>
                                <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                                <Input id="birth_date" name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="gender">Sexo</Label>
                                <Select value={formData.gender} onValueChange={(val) => handleSelectChange('gender', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Masculino</SelectItem>
                                        <SelectItem value="female">Femenino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="height">Altura (cm)</Label>
                                <Input id="height" name="height" type="number" step="0.1" value={formData.height} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="status">Estado</Label>
                                <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Activo</SelectItem>
                                        <SelectItem value="inactive">Inactivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Objetivos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Objetivos y Perfil</CardTitle>
                            <CardDescription>Definición del plan y nivel del asesorado.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="goal_text">Objetivo General (Texto)</Label>
                                <Textarea id="goal_text" name="goal_text" value={formData.goal_text} onChange={handleChange} placeholder="Describir el objetivo..." />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="goal_specific">Objetivo Específico</Label>
                                    <Select value={formData.goal_specific} onValueChange={(val) => handleSelectChange('goal_specific', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gain_muscle">Ganar Músculo</SelectItem>
                                            <SelectItem value="lose_weight">Perder Peso</SelectItem>
                                            <SelectItem value="maintenance">Mantenimiento</SelectItem>
                                            <SelectItem value="improve_endurance">Mejorar Resistencia</SelectItem>
                                            <SelectItem value="increase_strength">Aumentar Fuerza</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="activity_level">Nivel de Actividad</Label>
                                    <Select value={formData.activity_level} onValueChange={(val) => handleSelectChange('activity_level', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sedentary">Sedentario</SelectItem>
                                            <SelectItem value="light">Ligero</SelectItem>
                                            <SelectItem value="moderate">Moderado</SelectItem>
                                            <SelectItem value="active">Activo</SelectItem>
                                            <SelectItem value="very_active">Muy Activo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Metas Numéricas (Targets) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Metas Numéricas</CardTitle>
                            <CardDescription>Valores objetivo para el seguimiento.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-4">
                            <div className="grid gap-2">
                                <Label htmlFor="initial_weight">Peso Inicial (kg)</Label>
                                <Input id="initial_weight" name="initial_weight" type="number" step="0.1" value={formData.initial_weight} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="initial_body_fat">Grasa Inicial (%)</Label>
                                <Input id="initial_body_fat" name="initial_body_fat" type="number" step="0.1" value={formData.initial_body_fat} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="target_weight">Peso Objetivo (kg)</Label>
                                <Input id="target_weight" name="target_weight" type="number" step="0.1" value={formData.target_weight} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="target_fat">% Grasa Objetivo</Label>
                                <Input id="target_fat" name="target_fat" type="number" step="0.1" value={formData.target_fat} onChange={handleChange} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Botón Guardar */}
                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading} className="w-full md:w-auto">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </form>

            <div className="mt-8 border-t pt-8">
                <AllergenSelector
                    initialAllergens={client.allergens || []}
                    initialPreference={client.dietary_preference || 'sin_restricciones'}
                    onSave={async (allergens, preference) => {
                        const result = await updateClientAction(client.id, {
                            allergens,
                            dietary_preference: preference
                        })
                        if (result?.error) {
                            setMessage({ type: 'error', text: result.error })
                        } else {
                            setMessage({ type: 'success', text: "Restricciones alimentarias actualizadas." })
                        }
                    }}
                />
            </div>

            <div className="border-t pt-6 mt-8">
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5" /> Zona de Peligro
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Si eliminás este asesorado, se perderán todos sus datos, incluyendo historial de check-ins, rutinas asignadas y dietas. Esta acción no se puede deshacer.
                        </p>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar Asesorado
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
