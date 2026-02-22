'use server'

import { GoogleGenAI } from '@google/genai'

export async function analyzeMealWithAI(base64Image: string, mimeType: string) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
        return { error: 'Gemini API Key no configurada en Vercel' }
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
