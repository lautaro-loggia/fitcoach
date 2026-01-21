'use client'

import { Utensils, Clock, ChevronRight, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Diet {
    id: string
    name: string
    data: any
}

export default function ClientDietPage({ diets }: { diets: Diet[] }) {
    const router = useRouter()

    if (!diets || diets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Utensils className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900">No hay plan de alimentación</h3>
                <p className="text-gray-500 mt-2 text-sm max-w-xs">
                    Tu entrenador aún no ha cargado tu plan nutricional.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-2xl font-bold">Alimentación</h1>
                <p className="text-gray-500 text-sm">Tu guía nutricional</p>
            </div>

            <div className="space-y-3">
                {diets.map((diet) => {
                    // Calculate totals if available in data.macros
                    const macros = diet.data?.macros || { total_calories: 0, total_proteins: 0 }

                    return (
                        <Card key={diet.id} className="p-4 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg">{diet.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                        {diet.data?.description || "Plan personalizado"}
                                    </p>
                                </div>
                                <div className="bg-green-50 text-green-700 p-2 rounded-full">
                                    <Utensils className="h-5 w-5" />
                                </div>
                            </div>

                            {macros.total_calories > 0 && (
                                <div className="flex gap-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 font-medium uppercase">Calorías</span>
                                        <span className="font-bold">{macros.total_calories} kcal</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 font-medium uppercase">Proteínas</span>
                                        <span className="font-bold">{macros.total_proteins}g</span>
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => router.push(`/dashboard/diet/${diet.id}`)}
                            >
                                <FileText className="h-4 w-4 mr-2" /> Ver Detalle
                            </Button>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
