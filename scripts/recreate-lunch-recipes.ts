/**
 * Script para eliminar y recrear las recetas de almuerzo con cantidades correctas
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=')
        envVars[key] = value
    }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// New lunch recipes with proper quantities
const lunchRecipes = [
    {
        name: "Pechuga de pollo con arroz integral y verduras",
        ingredients: "Pechuga de pollo 180g, arroz integral cocido 150g, zanahoria 80g, brócoli 100g, aceite de oliva 10g, sal 2g"
    },
    {
        name: "Pollo salteado con quinoa",
        ingredients: "Pechuga de pollo 180g, quinoa cocida 150g, cebolla 60g, morrón 60g, ajo 5g, aceite de oliva 10g"
    },
    {
        name: "Carne magra con puré de calabaza",
        ingredients: "Carne vacuna magra 180g, calabaza 250g, leche descremada 50ml, sal 2g, nuez moscada 1g"
    },
    {
        name: "Bowl de pollo",
        ingredients: "Pechuga de pollo 180g, arroz blanco cocido 160g, palta 60g, tomate 80g, lechuga 50g"
    },
    {
        name: "Bowl de atún y arroz",
        ingredients: "Atún al natural escurrido 160g, arroz blanco cocido 160g, huevo duro 60g, tomate 80g, aceite de oliva 10g"
    },
    {
        name: "Ensalada de pollo y garbanzos",
        ingredients: "Pechuga de pollo 160g, garbanzos cocidos 120g, tomate 80g, cebolla morada 40g, aceite de oliva 10g"
    },
    {
        name: "Pasta integral con pollo",
        ingredients: "Pasta integral cocida 180g, pechuga de pollo 160g, tomate triturado 120g, ajo 5g, aceite de oliva 10g"
    },
    {
        name: "Wok de pollo y vegetales",
        ingredients: "Pechuga de pollo 180g, brócoli 100g, zanahoria 80g, zucchini 100g, salsa de soja baja en sodio 15g"
    },
    {
        name: "Hamburguesas caseras de carne",
        ingredients: "Carne magra molida 180g, huevo 60g, avena arrollada 30g, sal 2g"
    },
    {
        name: "Hamburguesa de pollo",
        ingredients: "Pechuga de pollo molida 180g, avena arrollada 30g, huevo 60g, sal 2g"
    },
    {
        name: "Merluza al horno con papas",
        ingredients: "Filet de merluza 200g, papa 250g, aceite de oliva 10g, limón 20g, sal 2g"
    },
    {
        name: "Pescado a la plancha con arroz",
        ingredients: "Filet de pescado blanco 200g, arroz blanco cocido 160g, aceite de oliva 10g, sal 2g"
    },
    {
        name: "Salteado de carne y verduras",
        ingredients: "Carne vacuna magra 180g, morrón 80g, cebolla 60g, zucchini 100g, aceite de oliva 10g"
    },
    {
        name: "Bowl de lentejas y huevo",
        ingredients: "Lentejas cocidas 180g, huevo 120g, cebolla 60g, zanahoria 80g, aceite de oliva 10g"
    },
    {
        name: "Omelette de claras con arroz",
        ingredients: "Claras de huevo 200g, arroz blanco cocido 160g, queso descremado 40g"
    },
    {
        name: "Wrap integral de pollo",
        ingredients: "Tortilla integral 60g, pechuga de pollo 160g, lechuga 50g, tomate 80g"
    },
    {
        name: "Tacos de carne",
        ingredients: "Carne magra 180g, tortillas de trigo 120g, cebolla 60g, morrón 60g"
    },
    {
        name: "Arroz con pollo",
        ingredients: "Pechuga de pollo 180g, arroz blanco cocido 180g, zanahoria 80g, arvejas 80g"
    },
    {
        name: "Ensalada tibia de quinoa y pollo",
        ingredients: "Quinoa cocida 160g, pechuga de pollo 160g, zucchini 120g, aceite de oliva 10g"
    },
    {
        name: "Fideos de arroz con pollo",
        ingredients: "Fideos de arroz cocidos 180g, pechuga de pollo 160g, zanahoria 80g, cebolla 60g"
    }
]

// Parse ingredients with quantities: "Pechuga de pollo 180g, arroz integral 150g"
function parseIngredients(ingredientsStr: string) {
    const parts = ingredientsStr.split(',')

    return parts.map(part => {
        const trimmed = part.trim()
        if (!trimmed) return null

        // Match pattern: "ingredient name 123g" or "ingredient name 123ml"
        const match = trimmed.match(/^(.+?)\s+(\d+)(g|ml)$/i)

        if (match) {
            return {
                ingredient: match[1].trim(),
                grams: parseFloat(match[2]),
                unit: match[3].toLowerCase()
            }
        } else {
            // Fallback: no quantity found
            return {
                ingredient: trimmed,
                grams: 100,
                unit: 'g'
            }
        }
    }).filter(Boolean)
}

// Normalize ingredient names for matching
function normalizeIngredientName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
}

// Find best match for an ingredient
function findBestMatch(searchName: string, ingredients: any[]): any | null {
    const normalizedSearch = normalizeIngredientName(searchName)

    // Exact match
    let match = ingredients.find(ing =>
        normalizeIngredientName(ing.name) === normalizedSearch
    )
    if (match) return match

    // Partial match
    match = ingredients.find(ing =>
        normalizeIngredientName(ing.name).includes(normalizedSearch) ||
        normalizedSearch.includes(normalizeIngredientName(ing.name))
    )
    if (match) return match

    // Key words match
    const searchWords = normalizedSearch.split(' ')
    match = ingredients.find(ing => {
        const ingName = normalizeIngredientName(ing.name)
        return searchWords.some(word => word.length > 3 && ingName.includes(word))
    })

    return match
}

async function recreateLunchRecipes() {
    console.log('🗑️  Deleting existing lunch recipes (LCH-*)...\n')

    // 1. Delete existing LCH-* recipes
    const { error: deleteError, count } = await supabase
        .from('recipes')
        .delete()
        .like('recipe_code', 'LCH-%')

    if (deleteError) {
        console.error('Error deleting recipes:', deleteError)
        process.exit(1)
    }

    console.log(`✅ Deleted ${count || 'all matching'} existing lunch recipes\n`)

    // 2. Fetch all ingredients from DB for macro calculation
    const { data: allIngredients, error: ingError } = await supabase
        .from('ingredients')
        .select('*')

    if (ingError || !allIngredients) {
        console.error('Error fetching ingredients:', ingError)
        process.exit(1)
    }

    console.log(`📦 Loaded ${allIngredients.length} ingredients from database\n`)

    // 3. Get the first trainer
    const { data: trainers, error: trainersError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

    if (trainersError || !trainers || trainers.length === 0) {
        console.error('No trainers found.')
        process.exit(1)
    }

    const trainerId = trainers[0].id
    console.log(`Using trainer ID: ${trainerId}\n`)

    let imported = 0
    let errors = 0

    // 4. Create new recipes with proper quantities and calculated macros
    for (const recipe of lunchRecipes) {
        console.log(`📝 Processing: ${recipe.name}`)

        const parsedIngredients = parseIngredients(recipe.ingredients)

        // Calculate macros
        let totalCalories = 0
        let totalProtein = 0
        let totalCarbs = 0
        let totalFat = 0
        let matchedCount = 0

        for (const ing of parsedIngredients) {
            if (!ing) continue
            const dbIngredient = findBestMatch(ing.ingredient, allIngredients)

            if (dbIngredient) {
                const factor = ing.grams / 100
                totalCalories += (dbIngredient.kcal_100g || 0) * factor
                totalProtein += (dbIngredient.protein_100g || 0) * factor
                totalCarbs += (dbIngredient.carbs_100g || 0) * factor
                totalFat += (dbIngredient.fat_100g || 0) * factor
                matchedCount++

                // Enrich ingredient with DB data
                ing.ingredient_code = dbIngredient.code || dbIngredient.id
                ing.ingredient_name = dbIngredient.name
                ing.kcal_100g = dbIngredient.kcal_100g
                ing.protein_100g = dbIngredient.protein_100g
                ing.carbs_100g = dbIngredient.carbs_100g
                ing.fat_100g = dbIngredient.fat_100g
            }
        }

        console.log(`   📊 Matched ${matchedCount}/${parsedIngredients.length} ingredients`)
        console.log(`   🔢 Macros: ${Math.round(totalCalories)} kcal, ${Math.round(totalProtein)}g P, ${Math.round(totalCarbs)}g C, ${Math.round(totalFat)}g F`)

        const recipeCode = `LCH-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`

        const { error: recipeError } = await supabase.from('recipes').insert({
            trainer_id: trainerId,
            recipe_code: recipeCode,
            name: recipe.name,
            meal_type: 'almuerzo',
            servings: 1,
            prep_time_min: 30,
            instructions: 'Prepará y pesá los ingredientes. Cociná según corresponda. Armá el plato y ajustá sal/condimentos a gusto.',
            ingredients: parsedIngredients,
            macros_calories: Math.round(totalCalories),
            macros_protein_g: Math.round(totalProtein),
            macros_carbs_g: Math.round(totalCarbs),
            macros_fat_g: Math.round(totalFat),
            is_base_template: true,
        })

        if (recipeError) {
            console.error(`   ❌ Error: ${recipeError.message}`)
            errors++
        } else {
            console.log(`   ✅ Created successfully`)
            imported++
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 Complete!')
    console.log(`✅ Imported: ${imported}`)
    console.log(`❌ Errors: ${errors}`)
}

recreateLunchRecipes().catch(console.error)
