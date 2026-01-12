/**
 * Script para sincronizar los macros de las recetas de almuerzo
 * con la tabla de ingredientes de Supabase
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

// Normalize ingredient names for matching
function normalizeIngredientName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, ' ')
}

// Find best match for an ingredient
function findBestMatch(searchName: string, ingredients: any[]): any | null {
    const normalizedSearch = normalizeIngredientName(searchName)

    // First try exact match
    let match = ingredients.find(ing =>
        normalizeIngredientName(ing.name) === normalizedSearch
    )
    if (match) return match

    // Try partial match (ingredient name contains search term)
    match = ingredients.find(ing =>
        normalizeIngredientName(ing.name).includes(normalizedSearch) ||
        normalizedSearch.includes(normalizeIngredientName(ing.name))
    )
    if (match) return match

    // Try matching key words
    const searchWords = normalizedSearch.split(' ')
    match = ingredients.find(ing => {
        const ingName = normalizeIngredientName(ing.name)
        return searchWords.some(word => word.length > 3 && ingName.includes(word))
    })

    return match
}

async function syncMacros() {
    console.log('📊 Syncing macros for lunch recipes...\n')

    // 1. Fetch all ingredients from DB
    const { data: allIngredients, error: ingError } = await supabase
        .from('ingredients')
        .select('*')

    if (ingError || !allIngredients) {
        console.error('Error fetching ingredients:', ingError)
        process.exit(1)
    }

    console.log(`📦 Loaded ${allIngredients.length} ingredients from database\n`)

    // 2. Fetch recipes that start with LCH- (our new lunch recipes)
    const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .like('recipe_code', 'LCH-%')

    if (recipesError || !recipes) {
        console.error('Error fetching recipes:', recipesError)
        process.exit(1)
    }

    console.log(`🍽️  Found ${recipes.length} lunch recipes to sync\n`)

    let updated = 0
    let errors = 0

    for (const recipe of recipes) {
        console.log(`\n📝 Processing: ${recipe.name}`)

        const ingredients = recipe.ingredients || []
        if (!ingredients.length) {
            console.log('   ⏭️  No ingredients found, skipping')
            continue
        }

        let totalCalories = 0
        let totalProtein = 0
        let totalCarbs = 0
        let totalFat = 0
        let matchedCount = 0
        let unmatchedIngredients: string[] = []

        // Calculate macros for each ingredient
        for (const ing of ingredients) {
            const ingredientName = ing.ingredient || ing.name || ''
            const grams = ing.grams || 100

            const dbIngredient = findBestMatch(ingredientName, allIngredients)

            if (dbIngredient) {
                const factor = grams / 100
                totalCalories += (dbIngredient.kcal_100g || 0) * factor
                totalProtein += (dbIngredient.protein_100g || 0) * factor
                totalCarbs += (dbIngredient.carbs_100g || 0) * factor
                totalFat += (dbIngredient.fat_100g || 0) * factor
                matchedCount++

                // Update the ingredient in the recipe with the matched data
                ing.ingredient_code = dbIngredient.code || dbIngredient.id
                ing.ingredient_name = dbIngredient.name
                ing.kcal_100g = dbIngredient.kcal_100g
                ing.protein_100g = dbIngredient.protein_100g
                ing.carbs_100g = dbIngredient.carbs_100g
                ing.fat_100g = dbIngredient.fat_100g
            } else {
                unmatchedIngredients.push(ingredientName)
            }
        }

        if (unmatchedIngredients.length > 0) {
            console.log(`   ⚠️  Unmatched ingredients: ${unmatchedIngredients.join(', ')}`)
        }

        console.log(`   📊 Matched ${matchedCount}/${ingredients.length} ingredients`)
        console.log(`   🔢 Calculated macros: ${Math.round(totalCalories)} kcal, ${Math.round(totalProtein)}g protein, ${Math.round(totalCarbs)}g carbs, ${Math.round(totalFat)}g fat`)

        // Update the recipe with calculated macros and enriched ingredients
        const { error: updateError } = await supabase
            .from('recipes')
            .update({
                macros_calories: Math.round(totalCalories),
                macros_protein_g: Math.round(totalProtein),
                macros_carbs_g: Math.round(totalCarbs),
                macros_fat_g: Math.round(totalFat),
                ingredients: ingredients
            })
            .eq('id', recipe.id)

        if (updateError) {
            console.error(`   ❌ Error updating: ${updateError.message}`)
            errors++
        } else {
            console.log(`   ✅ Updated successfully`)
            updated++
        }
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 Sync complete!')
    console.log(`✅ Updated: ${updated}`)
    console.log(`❌ Errors: ${errors}`)
}

syncMacros().catch(console.error)
