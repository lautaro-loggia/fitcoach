'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AddRecipeDialog } from '@/components/recipes/add-recipe-dialog'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, Filter, X, Utensils, ChevronLeft, ChevronRight } from 'lucide-react'

interface Recipe {
    id: string
    name: string
    meal_type: string | null
    servings: number | null
    prep_time_min: number | null
    image_url: string | null
    ingredients: any
    macros_calories: number | null
    macros_protein_g: number | null
    macros_carbs_g: number | null
    macros_fat_g: number | null
}

const RECIPES_PER_PAGE = 20

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<Recipe[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [mealTypeFilter, setMealTypeFilter] = useState('all')
    const [sortBy, setSortBy] = useState('recent')
    const [maxCalories, setMaxCalories] = useState('')
    const [minProtein, setMinProtein] = useState('')

    const [isAdmin, setIsAdmin] = useState(false)

    // Check admin status
    useEffect(() => {
        const checkUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email === 'lauloggia@gmail.com') {
                setIsAdmin(true)
            }
        }
        checkUser()
    }, [])

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setCurrentPage(1) // Reset to page 1 on search
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [mealTypeFilter, sortBy, maxCalories, minProtein])

    // Load recipes with pagination
    const loadRecipes = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()

        // Calculate offset
        const from = (currentPage - 1) * RECIPES_PER_PAGE
        const to = from + RECIPES_PER_PAGE - 1

        // Build query
        let query = supabase
            .from('recipes')
            .select('*', { count: 'exact' })

        // Apply search filter
        if (debouncedSearch) {
            query = query.ilike('name', `%${debouncedSearch}%`)
        }

        // Apply meal type filter
        if (mealTypeFilter !== 'all') {
            query = query.eq('meal_type', mealTypeFilter)
        }

        // Apply max calories filter (server-side approximation)
        // Note: For exact per-serving filter, we'd need a computed column or RPC
        if (maxCalories) {
            const max = parseFloat(maxCalories)
            query = query.lte('macros_calories', max * 4) // Approximate for 4 servings max
        }

        // Apply min protein filter
        if (minProtein) {
            const min = parseFloat(minProtein)
            query = query.gte('macros_protein_g', min)
        }

        // Apply sorting
        if (sortBy === 'name') {
            query = query.order('name', { ascending: true })
        } else if (sortBy === 'calories-asc') {
            query = query.order('macros_calories', { ascending: true, nullsFirst: false })
        } else if (sortBy === 'calories-desc') {
            query = query.order('macros_calories', { ascending: false, nullsFirst: false })
        } else if (sortBy === 'protein') {
            query = query.order('macros_protein_g', { ascending: false, nullsFirst: false })
        } else {
            query = query.order('created_at', { ascending: false })
        }

        // Apply pagination
        query = query.range(from, to)

        const { data, count, error } = await query

        if (error) {
            console.error('Error loading recipes:', error)
        } else {
            setRecipes(data || [])
            setTotalCount(count || 0)
        }

        setLoading(false)
    }, [currentPage, debouncedSearch, mealTypeFilter, sortBy, maxCalories, minProtein])

    useEffect(() => {
        loadRecipes()
    }, [loadRecipes])

    const totalPages = Math.ceil(totalCount / RECIPES_PER_PAGE)
    const hasActiveFilters = mealTypeFilter !== 'all' || maxCalories || minProtein || sortBy !== 'recent'

    const clearFilters = () => {
        setMealTypeFilter('all')
        setMaxCalories('')
        setMinProtein('')
        setSortBy('recent')
        setSearchQuery('')
    }

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | string)[] = []
        const maxVisible = 5

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
            }
        }

        return pages
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Recetas</h2>
                    <p className="text-muted-foreground">
                        Creá plantillas de comidas para reutilizar en las dietas de tus asesorados
                    </p>
                </div>
                <AddRecipeDialog />
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar recetas por nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-3 items-center">
                    <Filter className="h-4 w-4 text-muted-foreground" />

                    {/* Meal Type Filter */}
                    <Select value={mealTypeFilter} onValueChange={setMealTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tipo de comida" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="desayuno">Desayuno</SelectItem>
                            <SelectItem value="almuerzo">Almuerzo</SelectItem>
                            <SelectItem value="cena">Cena</SelectItem>
                            <SelectItem value="snack">Snack</SelectItem>
                            <SelectItem value="postre">Postre</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Max Calories */}
                    <Input
                        type="number"
                        placeholder="Calorías máx."
                        value={maxCalories}
                        onChange={(e) => setMaxCalories(e.target.value)}
                        className="w-[140px]"
                    />

                    {/* Min Protein */}
                    <Input
                        type="number"
                        placeholder="Proteínas mín."
                        value={minProtein}
                        onChange={(e) => setMinProtein(e.target.value)}
                        className="w-[140px]"
                    />

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="recent">Más recientes</SelectItem>
                            <SelectItem value="name">Nombre (A-Z)</SelectItem>
                            <SelectItem value="calories-asc">Menos calorías</SelectItem>
                            <SelectItem value="calories-desc">Más calorías</SelectItem>
                            <SelectItem value="protein">Mayor proteína</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Clear Filters */}
                    {(hasActiveFilters || searchQuery) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="gap-2"
                        >
                            <X className="h-4 w-4" />
                            Limpiar filtros
                        </Button>
                    )}
                </div>

                {/* Results Count */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Utensils className="h-4 w-4" />
                    <span>
                        {totalCount} {totalCount === 1 ? 'receta' : 'recetas'}
                        {searchQuery || hasActiveFilters ? ` encontrada${totalCount === 1 ? '' : 's'}` : ''}
                        {totalPages > 1 && ` · Página ${currentPage} de ${totalPages}`}
                    </span>
                </div>
            </div>

            {/* Recipes Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground">Cargando recetas...</p>
                    </div>
                </div>
            ) : recipes.length > 0 ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {recipes.map((recipe) => (
                            <RecipeCard key={recipe.id} recipe={recipe} isAdmin={isAdmin} />
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            {getPageNumbers().map((page, index) => (
                                typeof page === 'number' ? (
                                    <Button
                                        key={index}
                                        variant={currentPage === page ? 'default' : 'outline'}
                                        size="icon"
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </Button>
                                ) : (
                                    <span key={index} className="px-2 text-muted-foreground">
                                        {page}
                                    </span>
                                )
                            ))}

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </>
            ) : totalCount === 0 && !searchQuery && !hasActiveFilters ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg">
                    <Utensils className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No hay recetas aún</h3>
                    <p className="text-muted-foreground">Creá tu primera receta para empezar</p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg">
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No se encontraron recetas</h3>
                    <p className="text-muted-foreground">
                        Intentá con otros términos de búsqueda o filtros
                    </p>
                    <Button variant="outline" onClick={clearFilters} className="mt-4">
                        Limpiar filtros
                    </Button>
                </div>
            )}
        </div>
    )
}
