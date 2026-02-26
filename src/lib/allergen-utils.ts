const normalizeValue = (value?: string | null) =>
    (value ?? '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()

const CANONICAL_ALLERGEN_MAP: Record<string, string> = {
    // Canonical IDs
    huevo: 'huevo',
    pescado: 'pescado',
    gluten: 'gluten',
    lactosa: 'lactosa',
    leche: 'leche',
    frutos_secos: 'frutos_secos',
    mani: 'mani',
    sesamo: 'sesamo',
    marisco: 'marisco',
    soja: 'soja',
    // UI labels / variants
    'gluten (tacc)': 'gluten',
    'frutos secos': 'frutos_secos',
    lacteos: 'leche',
    'lacteos (lactosa)': 'lactosa',
    'lacteos/lactosa': 'lactosa',
    huevos: 'huevo',
    mariscos: 'marisco',
}

export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
    huevo: ['huevo', 'yema', 'clara', 'tortilla', 'revuelto', 'omelette'],
    pescado: ['pescado', 'atun', 'salmon', 'merluza', 'tilapia', 'bacalao', 'sardina'],
    gluten: ['trigo', 'harina', 'pan', 'pasta', 'fideo', 'galleta', 'avena', 'cebada', 'centeno', 'gluten'],
    lactosa: ['leche', 'queso', 'yogur', 'crema', 'manteca', 'lactosa', 'suero'], // Broad match, lactosa might be specific but usually implies dairy
    leche: ['leche', 'queso', 'yogur', 'crema', 'manteca'],
    frutos_secos: ['nuez', 'almendra', 'avellana', 'pistacho', 'cajou', 'anacardo'],
    mani: ['mani', 'cacahuate', 'mantequilla de mani'],
    sesamo: ['sesamo', 'ajonjoli', 'tahini'],
    marisco: ['camaron', 'gamba', 'langostino', 'cangrejo', 'langosta', 'mejillon', 'almeja', 'calamar', 'pulpo'],
    soja: ['soja', 'tofu', 'tempeh', 'edamame', 'salsa de soja', 'soya']
}

type RecipeLike = {
    name?: string
    ingredients?: unknown[] | null
    ingredients_data?: unknown[] | null
}

type IngredientLike = {
    name?: string
    item?: string
}

function ingredientToText(ingredient: unknown): string {
    if (typeof ingredient === 'string') return ingredient
    if (typeof ingredient === 'object' && ingredient !== null) {
        const ing = ingredient as IngredientLike
        return ing.name || ing.item || JSON.stringify(ingredient)
    }
    return String(ingredient ?? '')
}

export function normalizeAllergenInput(allergen: string): string {
    const normalized = normalizeValue(allergen)
    return CANONICAL_ALLERGEN_MAP[normalized] || normalized
}

function resolveAllergenKeywords(allergen: string): string[] {
    const normalized = normalizeAllergenInput(allergen)
    return ALLERGEN_KEYWORDS[normalized] || [normalized]
}

export function checkRecipeAllergens(recipe: RecipeLike, clientAllergens: string[] = []): string | null {
    if (!clientAllergens || clientAllergens.length === 0) return null;

    for (const allergen of clientAllergens) {
        const keywords = resolveAllergenKeywords(allergen)

        // Check Recipe Name
        if (keywords.some(k => normalizeValue(recipe.name).includes(k))) {
            return allergen;
        }

        // Check Ingredients
        // Ingredients can be formatted differently, assuming array of objects or strings
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            const hasAllergen = recipe.ingredients.some((ing) => {
                const text = ingredientToText(ing)
                return keywords.some(k => normalizeValue(text).includes(k));
            });
            if (hasAllergen) return allergen;
        }

        // Also check ingredients_data if present (legacy field mentioned in migration comments)
        if (recipe.ingredients_data && Array.isArray(recipe.ingredients_data)) {
            const hasAllergen = recipe.ingredients_data.some((ing) => {
                const text = ingredientToText(ing)
                return keywords.some(k => normalizeValue(text).includes(k));
            });
            if (hasAllergen) return allergen;
        }
    }

    return null;
}

export const ANIMAL_PRODUCT_KEYWORDS = [
    'carne', 'pollo', 'res', 'cerdo', 'pescado', 'atun', 'salmon', 'merluza', 'tilapia', 'bacalao', 'sardina', // Meats
    'marisco', 'camaron', 'gamba', 'langostino', 'cangrejo', 'langosta', 'mejillon', 'almeja', 'calamar', 'pulpo',
    'jamon', 'tocino', 'salchicha', 'chorizo', 'panceta',
    'huevo', 'yema', 'clara', 'tortilla', // Eggs
    'leche', 'queso', 'yogur', 'crema', 'manteca', 'mantequilla', 'suero', 'caseina', 'lactosa', // Dairy
    'miel', 'gelatina' // Misc
]

export const MEAT_KEYWORDS = [
    'carne', 'pollo', 'res', 'cerdo', 'pescado', 'atun', 'salmon', 'merluza', 'tilapia', 'bacalao', 'sardina',
    'marisco', 'camaron', 'gamba', 'langostino', 'cangrejo', 'langosta', 'mejillon', 'almeja', 'calamar', 'pulpo',
    'jamon', 'tocino', 'salchicha', 'chorizo', 'panceta', 'steak', 'bife', 'asado'
]

function normalizeDietType(dietType?: string): 'vegetariana' | 'vegana' | null {
    if (!dietType) return null
    const normalized = normalizeValue(dietType)

    if ([
        'vegetarian',
        'vegetariana',
        'vegetariano',
    ].includes(normalized)) return 'vegetariana'

    if ([
        'vegan',
        'vegana',
        'vegano',
    ].includes(normalized)) return 'vegana'

    return null
}

export function checkDietaryCompliance(recipe: RecipeLike, dietType: string | undefined): 'vegetariano' | 'vegano' | null {
    const normalizedDiet = normalizeDietType(dietType)
    if (!normalizedDiet) return null

    const keywords = normalizedDiet === 'vegana' ? ANIMAL_PRODUCT_KEYWORDS : MEAT_KEYWORDS

    // Check Name
    if (keywords.some(k => normalizeValue(recipe.name).includes(k))) {
        return normalizedDiet === 'vegana' ? 'vegano' : 'vegetariano'
    }

    // Check Ingredients
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        const hasViolation = recipe.ingredients.some((ing) => {
            const text = ingredientToText(ing)
            return keywords.some(k => normalizeValue(text).includes(k));
        });
        if (hasViolation) return normalizedDiet === 'vegana' ? 'vegano' : 'vegetariano'
    }

    // Check Ingredients Data (Legacy)
    if (recipe.ingredients_data && Array.isArray(recipe.ingredients_data)) {
        const hasViolation = recipe.ingredients_data.some((ing) => {
            const text = ingredientToText(ing)
            return keywords.some(k => normalizeValue(text).includes(k));
        });
        if (hasViolation) return normalizedDiet === 'vegana' ? 'vegano' : 'vegetariano'
    }

    return null
}
