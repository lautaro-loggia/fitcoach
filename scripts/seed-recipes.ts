/**
 * Seed Script: Import 5 base recipes from CSV data
 * 
 * Run this script to populate the recipes table with 5 base template recipes.
 * Usage: npx tsx scripts/seed-recipes.ts
 * 
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// The 5 base recipes from the CSV
const baseRecipes = [
    {
        recipe_code: 'R0001',
        name: 'Pavo con batata y brocoli',
        meal_type: 'cena',
        servings: 1,
        prep_time_min: 25,
        instructions: 'Cociná la proteína. Sumá carb y verduras. Ajustá condimentos y serví.',
        ingredients: [
            { ingredient_code: 'pavo_cocido', ingredient_name: 'pavo cocido', grams: 180 },
            { ingredient_code: 'batata_cocida', ingredient_name: 'batata cocida', grams: 200 },
            { ingredient_code: 'brocoli', ingredient_name: 'brocoli', grams: 120 },
            { ingredient_code: 'aceite_de_oliva', ingredient_name: 'aceite de oliva', grams: 15 }
        ],
        is_base_template: true
    },
    {
        recipe_code: 'R0002',
        name: 'Tostadas integrales con tempeh y cebolla',
        meal_type: 'desayuno',
        servings: 1,
        prep_time_min: 7,
        instructions: 'Pesá ingredientes. Cociná o mezclá según corresponda. Serví y listo.',
        ingredients: [
            { ingredient_code: 'pan_integral', ingredient_name: 'pan integral', grams: 80 },
            { ingredient_code: 'tempeh', ingredient_name: 'tempeh', grams: 120 },
            { ingredient_code: 'cebolla', ingredient_name: 'cebolla', grams: 60 }
        ],
        is_base_template: true
    },
    {
        recipe_code: 'R0003',
        name: 'Yogur griego con frutillas y semillas de chia',
        meal_type: 'snack',
        servings: 2,
        prep_time_min: 14,
        instructions: 'Prepará todo. Mezclá/licuá. Serví frío si aplica.',
        ingredients: [
            { ingredient_code: 'yogur_griego_descremado', ingredient_name: 'yogur griego descremado', grams: 300 },
            { ingredient_code: 'frutillas', ingredient_name: 'frutillas', grams: 150 },
            { ingredient_code: 'semillas_de_chia', ingredient_name: 'semillas de chia', grams: 20 }
        ],
        is_base_template: true
    },
    {
        recipe_code: 'R0004',
        name: 'Bowl de avena con banana y mantequilla de mani',
        meal_type: 'desayuno',
        servings: 1,
        prep_time_min: 10,
        instructions: 'Pesá ingredientes. Mezclá todo y serví.',
        ingredients: [
            { ingredient_code: 'avena', ingredient_name: 'avena', grams: 60 },
            { ingredient_code: 'banana', ingredient_name: 'banana', grams: 120 },
            { ingredient_code: 'mantequilla_de_mani', ingredient_name: 'mantequilla de mani', grams: 20 },
            { ingredient_code: 'leche_descremada', ingredient_name: 'leche descremada', grams: 200 }
        ],
        is_base_template: true
    },
    {
        recipe_code: 'R0005',
        name: 'Pollo con arroz integral y morron',
        meal_type: 'almuerzo',
        servings: 1,
        prep_time_min: 30,
        instructions: 'Cociná el pollo. Prepará el arroz. Salteá verduras y serví.',
        ingredients: [
            { ingredient_code: 'pechuga_de_pollo_cocida', ingredient_name: 'pechuga de pollo cocida', grams: 200 },
            { ingredient_code: 'arroz_integral_cocido', ingredient_name: 'arroz integral cocido', grams: 180 },
            { ingredient_code: 'morron', ingredient_name: 'morrón', grams: 100 },
            { ingredient_code: 'aceite_de_oliva', ingredient_name: 'aceite de oliva', grams: 10 }
        ],
        is_base_template: true
    }
]

async function seedRecipes() {
    console.log('🌱 Starting recipe seed...\n')

    // Get the first trainer (or create a system user)
    // For base templates, we need a trainer_id. We'll get the first one or skip if none.
    const { data: trainers, error: trainersError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

    if (trainersError || !trainers || trainers.length === 0) {
        console.error('No trainers found. Please create a user first.')
        process.exit(1)
    }

    const trainerId = trainers[0].id
    console.log(`Using trainer ID: ${trainerId}\n`)

    // First, we need to get/create ingredients with their macro data
    // For now, we'll insert recipes with placeholder macro values
    // The real macros will come from the ingredients table

    // Fetch existing ingredients to get macro data
    const { data: existingIngredients } = await supabase
        .from('ingredients')
        .select('*')

    const ingredientMap = new Map()
    existingIngredients?.forEach(ing => {
        // Try to match by name (lowercase, normalized)
        const key = ing.name.toLowerCase().replace(/\s+/g, '_')
        ingredientMap.set(key, ing)
    })

    for (const recipe of baseRecipes) {
        console.log(`📝 Processing: ${recipe.name}`)

        // Check if recipe already exists
        const { data: existing } = await supabase
            .from('recipes')
            .select('id')
            .eq('recipe_code', recipe.recipe_code)
            .single()

        if (existing) {
            console.log(`   ⏭️  Already exists, skipping`)
            continue
        }

        // Enrich ingredients with macro data from the ingredients table
        const enrichedIngredients = recipe.ingredients.map(ing => {
            const dbIngredient = ingredientMap.get(ing.ingredient_code)
            return {
                ...ing,
                kcal_100g: dbIngredient?.kcal_100g || 0,
                protein_100g: dbIngredient?.protein_100g || 0,
                carbs_100g: dbIngredient?.carbs_100g || 0,
                fat_100g: dbIngredient?.fat_100g || 0,
                fiber_100g: dbIngredient?.fiber_100g || 0,
            }
        })

        // Insert recipe
        const { error } = await supabase.from('recipes').insert({
            trainer_id: trainerId,
            recipe_code: recipe.recipe_code,
            name: recipe.name,
            meal_type: recipe.meal_type,
            servings: recipe.servings,
            prep_time_min: recipe.prep_time_min,
            instructions: recipe.instructions,
            ingredients: enrichedIngredients,
            is_base_template: recipe.is_base_template
        })

        if (error) {
            console.error(`   ❌ Error: ${error.message}`)
        } else {
            console.log(`   ✅ Created successfully`)
        }
    }

    console.log('\n🎉 Recipe seed complete!')
}

seedRecipes().catch(console.error)
