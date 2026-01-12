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

// New lunch recipes to add
const lunchRecipes = [
    {
        name: "Pechuga de pollo con arroz integral y verduras",
        ingredients: "Pechuga de pollo, arroz integral, zanahoria, brócoli, aceite de oliva, sal"
    },
    {
        name: "Pollo salteado con quinoa",
        ingredients: "Pechuga de pollo, quinoa, cebolla, morrón, ajo, aceite de oliva"
    },
    {
        name: "Carne magra con puré de calabaza",
        ingredients: "Carne vacuna magra, calabaza, leche descremada, sal, nuez moscada"
    },
    {
        name: "Bowl de pollo",
        ingredients: "Pechuga de pollo, arroz blanco, palta, tomate, lechuga"
    },
    {
        name: "Bowl de atún y arroz",
        ingredients: "Atún al natural, arroz blanco, huevo duro, tomate, aceite de oliva"
    },
    {
        name: "Ensalada de pollo y garbanzos",
        ingredients: "Pechuga de pollo, garbanzos cocidos, tomate, cebolla morada, aceite de oliva"
    },
    {
        name: "Pasta integral con pollo",
        ingredients: "Pasta integral, pechuga de pollo, tomate triturado, ajo, aceite de oliva"
    },
    {
        name: "Wok de pollo y vegetales",
        ingredients: "Pechuga de pollo, brócoli, zanahoria, zucchini, salsa de soja baja en sodio"
    },
    {
        name: "Hamburguesas caseras de carne",
        ingredients: "Carne magra molida, huevo, avena arrollada, sal"
    },
    {
        name: "Hamburguesa de pollo",
        ingredients: "Pechuga de pollo molida, avena arrollada, huevo, sal"
    },
    {
        name: "Merluza al horno con papas",
        ingredients: "Filet de merluza, papa, aceite de oliva, limón, sal"
    },
    {
        name: "Pescado a la plancha con arroz",
        ingredients: "Filet de pescado blanco, arroz blanco, aceite de oliva, sal"
    },
    {
        name: "Salteado de carne y verduras",
        ingredients: "Carne vacuna magra, morrón, cebolla, zucchini, aceite de oliva"
    },
    {
        name: "Bowl de lentejas y huevo",
        ingredients: "Lentejas cocidas, huevo, cebolla, zanahoria, aceite de oliva"
    },
    {
        name: "Omelette de claras con arroz",
        ingredients: "Claras de huevo, arroz blanco, queso descremado"
    },
    {
        name: "Wrap integral de pollo",
        ingredients: "Tortilla integral, pechuga de pollo, lechuga, tomate"
    },
    {
        name: "Tacos de carne",
        ingredients: "Carne magra, tortillas de trigo, cebolla, morrón"
    },
    {
        name: "Arroz con pollo",
        ingredients: "Pechuga de pollo, arroz blanco, zanahoria, arvejas"
    },
    {
        name: "Ensalada tibia de quinoa y pollo",
        ingredients: "Quinoa, pechuga de pollo, zucchini, aceite de oliva"
    },
    {
        name: "Fideos de arroz con pollo",
        ingredients: "Fideos de arroz, pechuga de pollo, zanahoria, cebolla"
    }
]

// Parse simple comma-separated ingredients into structured format
function parseIngredients(ingredientsStr: string) {
    const parts = ingredientsStr.split(',')

    return parts.map(part => {
        const trimmed = part.trim()
        if (!trimmed) return null

        return {
            ingredient: trimmed,
            grams: 100, // Default placeholder
            unit: 'g'
        }
    }).filter(Boolean)
}

async function seedLunchRecipes() {
    console.log('🍽️  Starting import of NEW lunch recipes...\n')

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

    let imported = 0
    let errors = 0

    for (const recipe of lunchRecipes) {
        try {
            console.log(`📝 Processing: ${recipe.name}`)

            // Generate recipe code
            const recipeCode = `LCH-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`

            const parsedIngredients = parseIngredients(recipe.ingredients)

            // Insert recipe
            const { error: recipeError } = await supabase.from('recipes').insert({
                trainer_id: trainerId,
                recipe_code: recipeCode,
                name: recipe.name,
                meal_type: 'almuerzo',
                servings: 1,
                prep_time_min: 30, // Default for lunch recipes
                instructions: 'Prepará y pesá los ingredientes. Cociná según corresponda. Armá el plato y ajustá sal/condimentos a gusto.',
                ingredients: parsedIngredients,
                macros_calories: 0,
                macros_protein_g: 0,
                macros_carbs_g: 0,
                macros_fat_g: 0,
                is_base_template: true,
            })

            if (recipeError) {
                console.error(`   ❌ Error: ${recipeError.message}`)
                errors++
            } else {
                console.log(`   ✅ Created successfully`)
                imported++
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error: any) {
            console.error(`   ❌ Error: ${error.message}`)
            errors++
        }
    }

    console.log('\n🎉 Import complete!')
    console.log(`✅ Imported: ${imported}`)
    console.log(`❌ Errors: ${errors}`)
}

seedLunchRecipes().catch(console.error)
