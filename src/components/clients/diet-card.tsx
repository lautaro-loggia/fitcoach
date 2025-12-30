'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Edit, Trash2, Utensils } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface DietCardProps {
    diet: any
    onEdit: () => void
    onDelete: () => void
}

export function DietCard({ diet, onEdit, onDelete }: DietCardProps) {
    const ingredients = diet.data?.ingredients || []
    const macros = diet.data?.macros || { total_calories: 0, total_proteins: 0, total_carbs: 0, total_fats: 0 }

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-primary" />
                        {diet.name}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground">
                        {ingredients.length} Ingredientes
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent>
                {/* Macros Summary */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3 bg-muted/30 p-2 rounded-md">
                    <div>
                        <div className="font-bold">{macros.total_calories}</div>
                        <div className="text-muted-foreground scale-90">Kcal</div>
                    </div>
                    <div>
                        <div className="font-bold text-blue-600">{macros.total_proteins}g</div>
                        <div className="text-muted-foreground scale-90">Prot</div>
                    </div>
                    <div>
                        <div className="font-bold text-green-600">{macros.total_carbs}g</div>
                        <div className="text-muted-foreground scale-90">Carb</div>
                    </div>
                    <div>
                        <div className="font-bold text-yellow-600">{macros.total_fats}g</div>
                        <div className="text-muted-foreground scale-90">Gras</div>
                    </div>
                </div>

                <div className="space-y-1">
                    {ingredients.slice(0, 3).map((ing: any, i: number) => (
                        <div key={i} className="text-xs flex justify-between">
                            <span>{ing.name}</span>
                            <span className="text-muted-foreground">{ing.grams || ing.quantity_grams}g</span>
                        </div>
                    ))}
                    {ingredients.length > 3 && (
                        <div className="text-xs text-muted-foreground pt-1 italic">
                            + {ingredients.length - 3} más...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
