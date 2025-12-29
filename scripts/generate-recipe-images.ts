
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables manually
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        envVars[key] = valueParts.join('=')
    }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY
const openaiApiKey = envVars.OPENAI_API_KEY

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
    console.error('Missing required environment variables.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const openai = new OpenAI({ apiKey: openaiApiKey })

async function generateImage(prompt: string): Promise<Buffer | null> {
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
            quality: "standard",
            style: "vivid" // or "natural"
        })

        if (!response.data || response.data.length === 0) {
            console.error('No image data returned from OpenAI')
            return null
        }
        const b64 = response.data[0].b64_json
        if (b64) {
            return Buffer.from(b64, 'base64')
        }
        return null

    } catch (e: any) {
        console.error('Exception calling OpenAI API:', e.message)
        return null
    }
}

async function run() {
    console.log('Starting image generation with OpenAI DALL-E 3...')

    // Fetch recipes without images
    const { data: recipes, error } = await supabase
        .from('recipes')
        .select('id, name')
        .is('image_url', null)
    // .limit(5) // SAFETY LIMIT for testing, remove later if user confirms

    if (error) {
        console.error('Error fetching recipes:', error)
        return
    }

    console.log(`Found ${recipes.length} recipes without images.`)

    let successCount = 0
    let failureCount = 0

    // Process sequentially
    for (const recipe of recipes) {
        console.log(`\n🎨 Generating for: "${recipe.name}"`)

        // Construct prompt
        const prompt = `Professional food photography of ${recipe.name}. Placed on a simple white round plate, isolated on a clean white background. High-key lighting, soft shadows, vibrant colors, appetizing, realistic, top-down view. 8k resolution, highly detailed texture.`

        const imageBuffer = await generateImage(prompt)

        if (imageBuffer) {
            // Upload to Supabase
            const fileName = `recipes/${recipe.id}/generated-${Date.now()}.png`
            const { error: uploadError } = await supabase.storage
                .from('recipe-images')
                .upload(fileName, imageBuffer, {
                    contentType: 'image/png',
                    upsert: true
                })

            if (uploadError) {
                console.error(`   ❌ Upload failed: ${uploadError.message}`)
                failureCount++
                continue
            }

            // Get Public URL
            const { data: urlData } = supabase.storage
                .from('recipe-images')
                .getPublicUrl(fileName)

            const publicUrl = urlData.publicUrl

            // Update recipe
            const { error: updateError } = await supabase
                .from('recipes')
                .update({ image_url: publicUrl })
                .eq('id', recipe.id)

            if (updateError) {
                console.error(`   ❌ DB Update failed: ${updateError.message}`)
                failureCount++
            } else {
                console.log(`   ✅ Success! URL: ${publicUrl}`)
                successCount++
            }
        } else {
            console.error('   ❌ Generation failed')
            failureCount++
        }

        // Delay to respect rate limits (DALL-E has RPM limits depending on tier)
        // 10s delay is safe for Tier 1 usually
        console.log('   ⏳ Waiting 5s...')
        await new Promise(r => setTimeout(r, 5000))
    }

    console.log(`\nDone. Success: ${successCount}, Failures: ${failureCount}`)
}

run().catch(console.error)
