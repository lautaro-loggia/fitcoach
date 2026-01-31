'use client'

import { ArrowLeft, Utensils, PieChart, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from "@/components/ui/progress"

interface Ingredient {
    uuid: string
    name: string
    grams?: number
    quantity_grams?: number
    unit?: string
    kcal_100g?: number
    protein_100g?: number
    carbs_100g?: number
    fat_100g?: number
}

interface Diet {
    id: string
    name: string
    data: {
        description?: string
        ingredients: Ingredient[]
        macros?: {
            total_calories: number
            total_proteins: number
            total_carbs: number
            total_fats: number
        }
    }
}

export default function ClientDietDetail({ diet }: { diet: Diet }) {
    const router = useRouter()
    const macros = diet.data.macros || { total_calories: 0, total_proteins: 0, total_carbs: 0, total_fats: 0 }
    const ingredients = diet.data.ingredients || []

    return (
        <div className="space-y-6 pb-24">
            {/* Header with Back Button */}
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 overflow-hidden">
                    <h1 className="text-xl font-bold truncate">{diet.name}</h1>
                    {diet.data.description && (
                        <p className="text-sm text-gray-500 truncate">{diet.data.description}</p>
                    )}
                </div>
            </div>

            {/* Macros Summary Card */}
            {macros.total_calories > 0 && (
                <Card className="p-4 bg-white">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <PieChart className="h-4 w-4" /> Resumen Nutricional
                    </h2>

                    <div className="flex justify-between items-end mb-2">
                        <span className="text-2xl font-bold text-gray-900">{macros.total_calories}</span>
                        <span className="text-xs text-gray-500 font-medium pb-1">KCAL TOTALES</span>
                    </div>

                    <div className="space-y-3 mt-4">
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Proteínas</span>
                                <span className="font-bold">{macros.total_proteins}g</span>
                            </div>
                            <Progress value={30} className="h-1.5 bg-gray-100 [&>div]:bg-blue-500" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Carbohidratos</span>
                                <span className="font-bold">{macros.total_carbs}g</span>
                            </div>
                            <Progress value={40} className="h-1.5 bg-gray-100 [&>div]:bg-amber-500" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Grasas</span>
                                <span className="font-bold">{macros.total_fats}g</span>
                            </div>
                            <Progress value={30} className="h-1.5 bg-gray-100 [&>div]:bg-rose-500" />
                        </div>
                    </div>
                </Card>
            )}

            {/* Ingredients List */}
            <div className="space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-gray-400" /> Alimentos / Ingredientes
                </h2>

                <div className="divide-y divide-gray-100 bg-white rounded-lg border">
                    {ingredients.map((item, idx) => (
                        <div key={item.uuid || idx} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <span className="font-medium text-gray-900">{item.name}</span>
                            <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                {item.grams || item.quantity_grams || '-'} g
                            </span>
                        </div>
                    ))}
                    {ingredients.length === 0 && (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No hay ingredientes detallados.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
