'use server'

import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { consumeRateLimit } from '@/lib/security/rate-limit'

export async function analyzeMealWithAI(base64Image: string, mimeType: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (!allowedMimeTypes.has(mimeType)) {
        return { error: 'Formato de imagen no soportado' }
    }

    // ~8MB payload cap in base64 to reduce abuse/cost and avoid oversized requests.
    if (!base64Image || base64Image.length > 8 * 1024 * 1024) {
        return { error: 'La imagen es demasiado grande' }
    }

    const rate = consumeRateLimit({
        scope: 'ai-meal-analysis',
        key: user.id,
        maxRequests: 20,
        windowMs: 60 * 60 * 1000,
    })
    if (!rate.allowed) {
        const retryMinutes = Math.max(1, Math.ceil(rate.retryAfterMs / 60000))
        return { error: `Demasiadas solicitudes. Reintenta en ${retryMinutes} min.` }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        return { error: 'Gemini API Key no configurada' }
    }

    const ai = new GoogleGenAI({ apiKey })

    try {
        const prompt = `Analiza esta foto. IMPORTANTE: Primero que nada, determina si esta imagen muestra ALIMENTOS / COMIDA.
Si la imagen NO parece ser comida (ej: es una foto tuya, una persona, una captura de pantalla de un chat, un teclado, un perro, o cualquier cosa que no se coma), debes responder única y estrictamente con:
{
  "is_food": false
}

Si la imagen SÍ muestra comida, estima los macronutrientes totales. Responde estricta y únicamente con un objeto JSON respetando este esquema:
{
  "is_food": true,
  "title": "Un nombre corto y descriptivo de la comida",
  "macros": {
    "kcal": número de calorías totales estimadas,
    "protein": número de proteínas totales estimadas en gramos,
    "carbs": número de carbohidratos totales estimados en gramos,
    "fats": número de grasas totales estimadas en gramos
  },
  "ingredients": [
    {
      "name": "Nombre descriptivo del ingrediente",
      "category": "Categoría descriptiva corta (ej: Proteína magra, Carbohidrato complejo, Vegetal / Fibra, Grasas saludables)",
      "grams": cantidad estimada en gramos (número)
    }
  ]
}
No incluyas ningún texto fuera del JSON, sin bloques de markdown (\`\`\`json).`

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Image
                            }
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
            }
        })

        const textResponse = response.text
        if (!textResponse) throw new Error("Respuesta vacía de Gemini")

        const data = JSON.parse(textResponse)

        if (data.is_food === false) {
            return { error: 'La imagen no parece ser comida. Por favor, sube una foto de tu plato.' }
        }

        return { success: true, data }
    } catch (error: any) {
        console.error('Error in analyzeMealWithAI:', error)
        return { error: `Error analizando la imagen: ${error.message}` }
    }
}
