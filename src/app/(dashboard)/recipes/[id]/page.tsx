import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecipeEditor } from '@/components/recipes/recipe-editor'

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const isAdmin = user?.email === 'lauloggia@gmail.com'

    const { data: recipe, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !recipe) {
        notFound()
    }

    return <RecipeEditor recipe={recipe} userId={user?.id} isAdmin={isAdmin} />
}
