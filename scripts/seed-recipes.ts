/**
 * Seed Script: Import recipes from orbit_recetas_500.csv
 * 
 * Run this script to populate the recipes table from the CSV file.
 * Usage: npx tsx scripts/seed-recipes-from-csv.ts
 * 
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
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

interface CSVRecipe {
    recipe_id: string
    name: string
    meal_type: string
    servings: number
    prep_time_min: number
    ingredients: string // JSON string
    kcal_per_serving: number
    protein_g_per_serving: number
    carbs_g_per_serving: number
    fat_g_per_serving: number
    fiber_g_per_serving: number
    instructions: string
}

function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }

    result.push(current.trim())
    return result
}

async function seedRecipesFromCSV() {
    console.log('🌱 Starting recipe import from CSV...\n')

    // Get the first trainer
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

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'orbit_recetas_500.csv')

    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found at: ${csvPath}`)
        process.exit(1)
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n').filter(line => line.trim())

    // Skip header
    const dataLines = lines.slice(1)

    console.log(`Found ${dataLines.length} lines in CSV. Parsing and deduplicating...`)

    // Deduplicate in memory, keeping highest protein
    const distinctRecipes = new Map<string, any>()
    let parsedCount = 0

    for (const line of dataLines) {
        const fields = parseCSVLine(line)
        if (fields.length < 12) continue

        const [
            recipe_id,
            name,
            meal_type,
            servings,
            prep_time_min,
            ingredients,
            kcal_per_serving,
            protein_g_per_serving,
            carbs_g_per_serving,
            fat_g_per_serving,
            fiber_g_per_serving,
            instructions,
        ] = fields

        const cleanName = name.replace(/^"|"$/g, '').trim()
        const protein = parseFloat(protein_g_per_serving) || 0
        const calories = parseFloat(kcal_per_serving) || 0

        const recipeData = {
            recipe_id,
            name: cleanName,
            meal_type,
            servings,
            prep_time_min,
            ingredients,
            kcal_per_serving,
            protein_g_per_serving,
            carbs_g_per_serving,
            fat_g_per_serving,
            fiber_g_per_serving,
            instructions,
            protein,    // for comparison
            calories    // for comparison
        }

        if (distinctRecipes.has(cleanName)) {
            const existing = distinctRecipes.get(cleanName)
            // Keep the one with HIGHER protein. If tie, LOWER calories.
            if (protein > existing.protein || (protein === existing.protein && calories < existing.calories)) {
                distinctRecipes.set(cleanName, recipeData)
            }
        } else {
            distinctRecipes.set(cleanName, recipeData)
        }
        parsedCount++
    }

    console.log(`Parsed ${parsedCount} entries.`)
    console.log(`Unique recipes to import: ${distinctRecipes.size} (Filtered duplicates favoring high protein)\n`)

    let imported = 0
    let skipped = 0
    let errors = 0

    // Process the deduplicated list
    for (const recipe of distinctRecipes.values()) {
        try {
            console.log(`📝 Processing: ${recipe.name}`)

            // Check if already exists (by NAME now, to be safe)
            const { data: existing } = await supabase
                .from('recipes')
                .select('id')
                .eq('name', recipe.name)
                .limit(1)
                .maybeSingle()

            if (existing) {
                console.log('   ⏭️  Already exists (by name), skipping')
                skipped++
                continue
            }

            // Parse ingredients JSON
            let ingredientsArray = []
            try {
                ingredientsArray = JSON.parse(recipe.ingredients.replace(/^"|"$/g, ''))
            } catch (e) {
                console.log('   ⚠️  Warning: Could not parse ingredients JSON')
            }

            // Insert recipe
            const { error: recipeError } = await supabase.from('recipes').insert({
                trainer_id: trainerId,
                recipe_code: recipe.recipe_id, // Keeping the ID of the winner version
                name: recipe.name,
                meal_type: recipe.meal_type,
                servings: parseInt(recipe.servings) || 1,
                prep_time_min: parseInt(recipe.prep_time_min) || 0,
                instructions: recipe.instructions.replace(/^"|"$/g, ''),
                ingredients: ingredientsArray,
                macros_calories: parseFloat(recipe.kcal_per_serving) || 0,
                macros_protein_g: parseFloat(recipe.protein_g_per_serving) || 0,
                macros_carbs_g: parseFloat(recipe.carbs_g_per_serving) || 0,
                macros_fat_g: parseFloat(recipe.fat_g_per_serving) || 0,
                is_base_template: true,
            })

            if (recipeError) {
                console.error(`   ❌ Error: ${recipeError.message}`)
                errors++
            } else {
                console.log(`   ✅ Created successfully`)
                imported++
            }
        } catch (error: any) {
            console.error(`   ❌ Error: ${error.message}`)
            errors++
        }
    }

    console.log('\n🎉 Import complete!')
    console.log(`✅ Imported: ${imported}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Errors: ${errors}`)
}

seedRecipesFromCSV().catch(console.error)
