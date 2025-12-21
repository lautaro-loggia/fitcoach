import { createClient } from '@/lib/supabase/server'
import { AddRecipeDialog } from '@/components/recipes/add-recipe-dialog'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { Plus } from 'lucide-react'

export default async function RecipesPage() {
    const supabase = await createClient()

    // Fetch recipes (templates)
    const { data: recipes } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Recetas</h2>
                    <p className="text-muted-foreground">
                        Creá plantillas de comidas para reutilizar en las dietas de tus asesorados
                    </p>
                </div>
                <AddRecipeDialog />
            </div>

            {recipes && recipes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recipes.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg">
                    <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No hay recetas aún</h3>
                    <p className="text-muted-foreground">Creá tu primera receta para empezar</p>
                </div>
            )}
        </div>
    )
}
