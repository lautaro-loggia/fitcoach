'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

const dietTranslations: Record<string, string> = {
    no_preference: "Sin preferencia",
    sin_restricciones: "Sin preferencia",
    high_protein: "Alta en proteínas",
    vegetarian: "Vegetariana",
    vegetariana: "Vegetariana",
    vegan: "Vegana",
    vegana: "Vegana",
    keto: "Keto / Low Carb",
    other: "Otra"
}

const experienceTranslations: Record<string, string> = {
    none: "Ninguna",
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzado",
}

export function DietaryCard({ client }: { client: unknown }) {
    type DietaryInfo = {
        preference?: string
        meals_count?: number
        experience?: string
        other?: string
        allergens?: string[]
    }

    type DietaryClient = {
        allergens?: string[] | null
        dietary_preference?: string | null
        dietary_info?: DietaryInfo | null
    }

    const safeClient = client as DietaryClient
    const diet = safeClient.dietary_info || {}

    const normalizedLegacyPreference =
        safeClient.dietary_preference === 'sin_restricciones'
            ? 'no_preference'
            : safeClient.dietary_preference === 'vegetariana'
                ? 'vegetarian'
                : safeClient.dietary_preference === 'vegana'
                    ? 'vegan'
                    : null

    const resolvedPreference = normalizedLegacyPreference || diet.preference
    const allergens = Array.isArray(safeClient.allergens) && safeClient.allergens.length > 0
        ? safeClient.allergens
        : (Array.isArray(diet.allergens) ? diet.allergens : [])
    const hasInfo = resolvedPreference || diet.meals_count || diet.experience || diet.other || allergens.length > 0

    return (
        <Card className="flex flex-col justify-center min-h-[96px]">
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    {resolvedPreference && (
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">Preferencia</span>
                            <p className="text-sm font-bold text-gray-900 leading-none">{dietTranslations[resolvedPreference] || resolvedPreference}</p>
                        </div>
                    )}

                    {diet.meals_count && (
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">Comidas</span>
                            <p className="text-sm font-bold text-gray-900 leading-none">{diet.meals_count} diarias</p>
                        </div>
                    )}

                    {diet.experience && (
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">Macros</span>
                            <p className="text-sm font-bold text-gray-900 leading-none">
                                {experienceTranslations[diet.experience] || diet.experience}
                            </p>
                        </div>
                    )}

                    {allergens.length > 0 && (
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider leading-none mb-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Alergias
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {allergens.slice(0, 2).map((alg: string) => (
                                    <span key={alg} className="text-[10px] font-bold bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap">
                                        {alg}
                                    </span>
                                ))}
                                {allergens.length > 2 && <span className="text-[10px] text-gray-400">+{allergens.length - 2}</span>}
                            </div>
                        </div>
                    )}

                    {!hasInfo && <p className="text-xs text-gray-400">Sin info nutricional</p>}
                </div>
                {diet.other && (
                    <p className="text-[11px] text-gray-500 mt-3 line-clamp-2">
                        Restricción adicional: {diet.other}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
