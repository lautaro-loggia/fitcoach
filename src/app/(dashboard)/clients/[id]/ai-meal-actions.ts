'use server'

import { GoogleGenAI } from '@google/genai'

export async function analyzeMealWithAI(base64Image: string, mimeType: string) {
    if (!process.env.GEMINI_API_KEY) {
        return { error: 'Gemini API Key no configurada' }
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    try {
        const prompt = `Analiza esta imagen de una comida. Estima los macronutrientes totales. Responde estricta y únicamente con un objeto JSON respetando este esquema:
{
  "title": "Un nombre corto y descriptivo de la comida",
  "macros": {
    "kcal": número de calorías totales estimadas,
    "protein": número de proteínas totales estimadas en gramos,
    "carbs": número de carbohidratos totales estimados en gramos,
    "fats": número de grasas totales estimadas en gramos
  }
}
No incluyas ningún texto fuera del JSON, sin bloques de markdown (\`\`\`json).`

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
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

        return { success: true, data }
    } catch (error: any) {
        console.error('Error in analyzeMealWithAI:', error)
        return { error: `Error analizando la imagen: ${error.message}` }
    }
}
