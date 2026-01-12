'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateProfileWhatsAppTemplate } from '@/app/(dashboard)/settings/actions'
import { Loader2 } from 'lucide-react'

interface WhatsAppSettingsFormProps {
    initialTemplate: string
    userId: string
}

export function WhatsAppSettingsForm({ initialTemplate, userId }: WhatsAppSettingsFormProps) {
    const [template, setTemplate] = useState(initialTemplate || 'Hola {nombre}, recuerda que tenemos entrenamiento {hora}')
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await updateProfileWhatsAppTemplate(userId, template)
            if (result.error) {
                toast.error("Error", {
                    description: result.error,
                })
            } else {
                toast.success("Guardado", {
                    description: "La plantilla del mensaje se ha actualizado correctamente.",
                })
            }
        } catch (error) {
            toast.error("Error", {
                description: "Ocurrió un error al guardar.",
            })
        } finally {
            setLoading(false)
        }
    }

    const resetTemplate = () => {
        setTemplate('Hola {nombre}, recuerda que tenemos entrenamiento {hora}')
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mensaje de WhatsApp</CardTitle>
                <CardDescription>
                    Personaliza el mensaje predeterminado que se envía a tus clientes.
                    Usa <strong>{'{nombre}'}</strong> para el nombre del cliente y <strong>{'{hora}'}</strong> para la hora del entrenamiento (ej. "a las 10:00" o "hoy").
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="whatsapp-template">Plantilla del mensaje</Label>
                    <Textarea
                        id="whatsapp-template"
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        rows={3}
                        placeholder="Hola {nombre}..."
                    />
                </div>
                <div className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={resetTemplate}>
                        Restablecer por defecto
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar cambios
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
