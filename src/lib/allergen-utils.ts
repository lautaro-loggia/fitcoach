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

export function checkRecipeAllergens(recipe: any, clientAllergens: string[] = []): string | null {
    if (!clientAllergens || clientAllergens.length === 0) return null;

    for (const allergen of clientAllergens) {
        const keywords = ALLERGEN_KEYWORDS[allergen.toLowerCase()] || [allergen.toLowerCase()];

        // Check Recipe Name
        if (keywords.some(k => recipe.name.toLowerCase().includes(k))) {
            return allergen;
        }

        // Check Ingredients
        // Ingredients can be formatted differently, assuming array of objects or strings
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            const hasAllergen = recipe.ingredients.some((ing: any) => {
                const text = typeof ing === 'string' ? ing : (ing.name || ing.item || JSON.stringify(ing));
                return keywords.some(k => text.toLowerCase().includes(k));
            });
            if (hasAllergen) return allergen;
        }

        // Also check ingredients_data if present (legacy field mentioned in migration comments)
        if (recipe.ingredients_data && Array.isArray(recipe.ingredients_data)) {
            const hasAllergen = recipe.ingredients_data.some((ing: any) => {
                const text = typeof ing === 'string' ? ing : (ing.name || ing.item || JSON.stringify(ing));
                return keywords.some(k => text.toLowerCase().includes(k));
            });
            if (hasAllergen) return allergen;
        }
    }

    return null;
}
