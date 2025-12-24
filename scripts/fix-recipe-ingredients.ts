/**
 * Script para re-importar solo los ingredientes desde el CSV
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
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

function normalizeIngredientName(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, '_')
}

async function updateRecipeIngredients() {
    console.log('🔧 Updating recipe ingredients from CSV...\n')

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'orbit_recetas_500.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n').filter(line => line.trim())

    let updated = 0
    let errors = 0

    for (const line of lines.slice(1)) { // Skip header
        const fields = parseCSVLine(line)

        if (fields.length < 6) {
            continue
        }

        const recipe_id = fields[0]
        const name = fields[1].replace(/"/g, '')
        const ingredients_str = fields[5]

        try {
            // Parse Python-like dict to JSON
            const cleanJSON = ingredients_str
                .replace(/^\[|\ $]/g, '')
                .replace(/{/g, '{"')
                .replace(/ingredient:/g, 'ingredient":')
                .replace(/grams:/g, '"grams":')
                .replace(/:\s*/g, '":"')
                .replace(/,\s*{/g, '"},{"')
                .replace(/}]/g, '"}]')
                .replace(/"(\d+)"/g, '$1')

            const ingredientsArray = JSON.parse(`[${cleanJSON}]`).map((ing: any) => ({
                ingredient_code: normalizeIngredientName(ing.ingredient || ''),
                ingredient_name: ing.ingredient || '',
                grams: ing.grams || 0,
                kcal_100g: 0,
                protein_100g: 0,
                carbs_100g: 0,
                fat_100g: 0,
                fiber_100g: 0,
            }))

            // Update recipe
            const { error: updateError } = await supabase
                .from('recipes')
                .update({ ingredients: ingredientsArray })
                .eq('recipe_code', recipe_id)

            if (updateError) {
                console.error(`❌ ${name}: ${updateError.message}`)
                errors++
            } else {
                updated++
                if (updated % 50 === 0) {
                    console.log(`   ✅ Updated ${updated} recipes...`)
                }
            }
        } catch (error: any) {
            errors++
        }
    }

    console.log('\n🎉 Update complete!')
    console.log(`✅ Updated: ${updated}`)
    console.log(`❌ Errors: ${errors}`)
}

updateRecipeIngredients().catch(console.error)
