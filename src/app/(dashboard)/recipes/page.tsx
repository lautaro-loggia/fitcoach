'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { isAdminUser } from '@/lib/auth'
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
import { FilterHorizontalIcon, Search01Icon, Cancel01Icon, Tick01Icon } from 'hugeicons-react'

import { DashboardTopBar } from '@/components/layout/dashboard-top-bar'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

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
            if (isAdminUser(user?.email)) {
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

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setLoading(false)
            return
        }

        // Calculate offset
        const from = (currentPage - 1) * RECIPES_PER_PAGE
        const to = from + RECIPES_PER_PAGE - 1

        // Build query
        let query = supabase
            .from('recipes')
            .select('*', { count: 'exact' })
            .eq('trainer_id', user.id)

        // Apply search filter
        if (debouncedSearch) {
            query = query.ilike('name', `%${debouncedSearch}%`)
        }

        // Apply meal type filter
        if (mealTypeFilter !== 'all') {
            query = query.eq('meal_type', mealTypeFilter)
        }

        // Filtro de calorías máximas
        if (maxCalories) {
            const max = parseFloat(maxCalories)
            query = query.lte('macros_calories', max)
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

    const FilterContent = () => (
        <div className="space-y-6 py-4">
            <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">Tipo de Comida</Label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'all', label: 'Todas' },
                        { id: 'desayuno', label: 'Desayuno' },
                        { id: 'almuerzo', label: 'Almuerzo' },
                        { id: 'cena', label: 'Cena' },
                        { id: 'snack', label: 'Snack' },
                        { id: 'postre', label: 'Postre' }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setMealTypeFilter(opt.id)}
                            className={cn(
                                "flex items-center justify-between px-5 py-4 border-2 rounded-xl text-left transition-all hover:bg-muted/50 text-sm",
                                mealTypeFilter === opt.id ? "border-primary bg-primary/5 font-semibold" : "border-transparent bg-muted/30"
                            )}
                        >
                            {opt.label}
                            {mealTypeFilter === opt.id && <Tick01Icon className="w-4 h-4 text-primary" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">Nutrición (Máx/Mín)</Label>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="maxCal" className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Calorías Máx</Label>
                        <Input
                            id="maxCal"
                            type="number"
                            placeholder="Ej: 500"
                            value={maxCalories}
                            onChange={(e) => setMaxCalories(e.target.value)}
                            className="rounded-xl h-11 px-5 border-transparent bg-muted/30 focus:border-primary transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minProt" className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Proteínas Mín (g)</Label>
                        <Input
                            id="minProt"
                            type="number"
                            placeholder="Ej: 20"
                            value={minProtein}
                            onChange={(e) => setMinProtein(e.target.value)}
                            className="rounded-xl h-11 px-5 border-transparent bg-muted/30 focus:border-primary transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">Ordenar por</Label>
                <div className="grid grid-cols-1 gap-2">
                    {[
                        { id: 'recent', label: 'Más recientes' },
                        { id: 'name', label: 'Nombre (A-Z)' },
                        { id: 'calories-asc', label: 'Menos calorías' },
                        { id: 'calories-desc', label: 'Más calorías' },
                        { id: 'protein', label: 'Mayor proteína' }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setSortBy(opt.id)}
                            className={cn(
                                "flex items-center justify-between px-5 py-4 border-2 rounded-xl text-left transition-all hover:bg-muted/50 text-sm",
                                sortBy === opt.id ? "border-primary bg-primary/5 font-semibold" : "border-transparent bg-muted/30"
                            )}
                        >
                            {opt.label}
                            {sortBy === opt.id && <Tick01Icon className="w-4 h-4 text-primary" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )

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
        <div className="flex flex-col min-h-screen">
            <DashboardTopBar
                title="Recetas"
                subtitle="Creá plantillas de comidas para reutilizar en las dietas de tus asesorados"
            >
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="relative w-40 md:w-64">
                        <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-10 h-10 border-gray-200 focus:border-primary rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <Cancel01Icon className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="h-10 px-4 gap-2 border-gray-200 rounded-xl hover:bg-gray-50 shrink-0">
                                <FilterHorizontalIcon className="h-4 w-4" />
                                <span className="hidden md:inline">Filtros</span>
                                {hasActiveFilters && (
                                    <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-white text-[10px]">
                                        {(mealTypeFilter !== 'all' ? 1 : 0) + (sortBy !== 'recent' ? 1 : 0) + (maxCalories !== '' ? 1 : 0) + (minProtein !== '' ? 1 : 0)}
                                    </Badge>
                                )}
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                            <SheetHeader className="pb-4 border-b">
                                <SheetTitle className="text-xl font-bold">Filtros de Recetas</SheetTitle>
                                <p className="text-sm text-muted-foreground">Buscá la receta perfecta para el plan</p>
                            </SheetHeader>

                            <FilterContent />

                            <SheetFooter className="mt-8 flex-col gap-2 pt-6 border-t sm:flex-col">
                                <SheetClose asChild>
                                    <Button className="w-full h-11 rounded-xl font-bold">Ver {totalCount} recetas</Button>
                                </SheetClose>
                                {hasActiveFilters && (
                                    <Button
                                        variant="ghost"
                                        onClick={clearFilters}
                                        className="w-full h-11 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl"
                                    >
                                        Limpiar filtros
                                    </Button>
                                )}
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>

                    <AddRecipeDialog />
                </div>
            </DashboardTopBar>

            <main className="flex-1 p-4 md:p-8 pt-6 space-y-6">
                <div className="space-y-4">
                    {/* Active Filters Bar */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Filtros:</span>
                            {mealTypeFilter !== 'all' && (
                                <Badge variant="secondary" className="px-2 py-1 gap-1 text-xs border-transparent bg-primary/5 text-primary">
                                    {mealTypeFilter}
                                    <button onClick={() => setMealTypeFilter('all')} className="ml-1 hover:text-red-600 transition-colors"><Cancel01Icon className="h-3 w-3" /></button>
                                </Badge>
                            )}
                            {maxCalories !== '' && (
                                <Badge variant="secondary" className="px-2 py-1 gap-1 text-xs border-transparent bg-primary/5 text-primary">
                                    Máx {maxCalories} kcal
                                    <button onClick={() => setMaxCalories('')} className="ml-1 hover:text-red-600 transition-colors"><Cancel01Icon className="h-3 w-3" /></button>
                                </Badge>
                            )}
                            {minProtein !== '' && (
                                <Badge variant="secondary" className="px-2 py-1 gap-1 text-xs border-transparent bg-primary/5 text-primary">
                                    Mín {minProtein}g Prot
                                    <button onClick={() => setMinProtein('')} className="ml-1 hover:text-red-600 transition-colors"><Cancel01Icon className="h-3 w-3" /></button>
                                </Badge>
                            )}
                        </div>
                    )}

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
                        <div className="relative w-48 h-48 mb-4">
                            <Image
                                src="/images/recipe-empty-state.png"
                                alt="No hay recetas"
                                fill
                                className="object-contain"
                            />
                        </div>
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
            </main>
        </div>
    )
}
