
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

// Helper to parse ingredients string: "Tofu firme 200g; Espinaca 80g"
function parseIngredients(ingredientsStr: string) {
    // Remove surrounding quotes if any
    const cleanStr = ingredientsStr.replace(/^"|"$/g, '')
    const parts = cleanStr.split(';')

    return parts.map(part => {
        const trimmed = part.trim()
        if (!trimmed) return null

        // Try to extract grams at the end
        // Regex looks for numbers followed by g, ml, or just numbers at the end
        const match = trimmed.match(/^(.+?)\s*(\d+)\s*(g|ml|rodajas|u|cda|cdta)?$/i)

        if (match) {
            const name = match[1].trim()
            const qty = parseFloat(match[2])
            // const unit = match[3] || 'g' 

            // For the JSON structure, we usually use { ingredient_name, grams } or similar
            // The existing schema seems to use a flexible JSON structure.
            // Let's use { name, quantity_label, grams } to be safe, 
            // or just { ingredient: name, grams: qty } matching the previous logical structure

            return {
                ingredient: name,
                grams: qty, // This might be "2" for rodajas, but usually we alias 'grams' to numeric quantity
                unit: match[3] || 'g'
            }
        } else {
            // If no number found, just return the whole string as name with default qty
            return {
                ingredient: trimmed,
                grams: 0,
                unit: ''
            }
        }
    }).filter(Boolean)
}

async function seedRecipes() {
    console.log('🌱 Starting import of NEW breakfast recipes...\n')

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
    const csvPath = path.join(process.cwd(), 'breakfast_recipes.csv')

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
    let errors = 0

    for (const line of dataLines) {
        const fields = parseCSVLine(line)

        if (fields.length < 7) {
            console.log(`⏭️  Skipping invalid line (not enough fields): ${line.substring(0, 50)}...`)
            errors++
            continue
        }

        const [
            nombre_receta,
            calorias_kcal,
            proteinas_g,
            carbohidratos_g,
            grasas_g,
            ingredientes,
            preparacion
        ] = fields

        try {
            const recipeName = nombre_receta.replace(/^"|"$/g, '')
            console.log(`📝 Processing: ${recipeName}`)

            // Generate recipe code (e.g. BREAKFAST-TIMESTAMP-RANDOM)
            const recipeCode = `BKF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`

            const parsedIngredients = parseIngredients(ingredientes)

            // Insert recipe
            const { error: recipeError } = await supabase.from('recipes').insert({
                trainer_id: trainerId,
                recipe_code: recipeCode,
                name: recipeName,
                meal_type: 'desayuno', // Fixed as requested
                servings: 1, // Default
                prep_time_min: 15, // Estimate default
                instructions: preparacion.replace(/^"|"$/g, ''),
                ingredients: parsedIngredients,
                macros_calories: parseFloat(calorias_kcal) || 0,
                macros_protein_g: parseFloat(proteinas_g) || 0,
                macros_carbs_g: parseFloat(carbohidratos_g) || 0,
                macros_fat_g: parseFloat(grasas_g) || 0,
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
    console.log(`❌ Errors: ${errors}`)
}

seedRecipes().catch(console.error)
