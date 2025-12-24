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

    console.log(`Found ${dataLines.length} recipes in CSV\n`)

    let imported = 0
    let skipped = 0
    let errors = 0

    for (const line of dataLines) {
        const fields = parseCSVLine(line)

        if (fields.length < 12) {
            console.log(`⏭️  Skipping invalid line (not enough fields)`)
            errors++
            continue
        }

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

        try {
            console.log(`📝 Processing: ${name}`)

            // Check if already exists
            const { data: existing } = await supabase
                .from('recipes')
                .select('id')
                .eq('recipe_code', recipe_id)
                .single()

            if (existing) {
                console.log('   ⏭️  Already exists, skipping')
                skipped++
                continue
            }

            // Parse ingredients JSON
            let ingredientsArray = []
            try {
                ingredientsArray = JSON.parse(ingredients.replace(/^"|"$/g, ''))
            } catch (e) {
                console.log('   ⚠️  Warning: Could not parse ingredients JSON')
            }

            // Insert recipe
            const { error: recipeError } = await supabase.from('recipes').insert({
                trainer_id: trainerId,
                recipe_code: recipe_id,
                name: name.replace(/^"|"$/g, ''),
                meal_type: meal_type,
                servings: parseInt(servings) || 1,
                prep_time_min: parseInt(prep_time_min) || 0,
                instructions: instructions.replace(/^"|"$/g, ''),
                ingredients: ingredientsArray,
                macros_calories: parseFloat(kcal_per_serving) || 0,
                macros_protein_g: parseFloat(protein_g_per_serving) || 0,
                macros_carbs_g: parseFloat(carbs_g_per_serving) || 0,
                macros_fat_g: parseFloat(fat_g_per_serving) || 0,
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
