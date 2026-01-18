'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils, AlertCircle } from 'lucide-react'

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
        <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <Utensils className="h-4 w-4" /> Nutrición
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
                {!hasInfo && <p className="text-sm text-gray-400">Sin información nutricional</p>}

                {diet.preference && (
                    <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Preferencia</span>
                        <p className="text-sm font-medium">{dietTranslations[diet.preference] || diet.preference}</p>
                    </div>
                )}

                {diet.meals_count && (
                    <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Comidas diarias</span>
                        <p className="text-sm font-medium">{diet.meals_count} comidas</p>
                    </div>
                )}

                {allergens.length > 0 && (
                    <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-red-500" /> Restricciones
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {allergens.map((alg: string) => (
                                <Badge key={alg} variant="secondary" className="text-xs bg-red-50 text-red-700 hover:bg-red-100 border-red-100">
                                    {alg}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {diet.other && (
                    <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 italic">
                        "{diet.other}"
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
