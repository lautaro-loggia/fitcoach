'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

const dietTranslations: Record<string, string> = {
    no_preference: "Sin preferencia",
    high_protein: "Alta en proteínas",
    vegetarian: "Vegetariana",
    vegan: "Vegana",
    keto: "Keto / Low Carb",
    other: "Otra"
}

export function DietaryCard({ client }: { client: any }) {
    const diet = client.dietary_info || {}
    const allergens = Array.isArray(diet.allergens) ? diet.allergens : []
    const hasInfo = diet.preference || diet.meals_count || allergens.length > 0

    return (
        <Card className="flex flex-col justify-center h-[96px]">
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                    {diet.preference && (
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">Preferencia</span>
                            <p className="text-sm font-bold text-gray-900 leading-none">{dietTranslations[diet.preference] || diet.preference}</p>
                        </div>
                    )}

                    {diet.meals_count && (
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">Comidas</span>
                            <p className="text-sm font-bold text-gray-900 leading-none">{diet.meals_count} diarias</p>
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
            </CardContent>
        </Card>
    )
}
