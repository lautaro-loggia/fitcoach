import fs from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

type ExerciseRow = {
    id: string
    name: string
    english_name: string | null
    instructions: string[] | null
}

type CliArgs = {
    dryRun: boolean
    model: string
    batchSize: number
    cachePath: string
    updateChunk: number
    maxPhrases?: number
    translateNames: boolean
    translateInstructions: boolean
    allRows: boolean
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        dryRun: false,
        model: process.env.EXERCISES_TRANSLATION_MODEL || 'gpt-4.1-mini',
        batchSize: Number(process.env.EXERCISES_TRANSLATION_BATCH_SIZE || 80),
        cachePath: process.env.EXERCISES_TRANSLATION_CACHE || '/tmp/exercises-translation-cache.json',
        updateChunk: Number(process.env.EXERCISES_TRANSLATION_UPDATE_CHUNK || 120),
        maxPhrases: undefined,
        translateNames: true,
        translateInstructions: true,
        allRows: false
    }

    for (const rawArg of argv) {
        if (!rawArg.startsWith('--')) continue
        const [key, value] = rawArg.slice(2).split('=')
        switch (key) {
            case 'dry-run':
                args.dryRun = true
                break
            case 'model':
                if (value) args.model = value
                break
            case 'batch-size':
                if (value) args.batchSize = Math.max(1, Number(value))
                break
            case 'cache':
                if (value) args.cachePath = value
                break
            case 'update-chunk':
                if (value) args.updateChunk = Math.max(1, Number(value))
                break
            case 'max-phrases':
                if (value) args.maxPhrases = Math.max(1, Number(value))
                break
            case 'names-only':
                args.translateNames = true
                args.translateInstructions = false
                break
            case 'instructions-only':
                args.translateNames = false
                args.translateInstructions = true
                break
            case 'all-rows':
                args.allRows = true
                break
            default:
                break
        }
    }

    return args
}

function normalizeText(value: string | null | undefined) {
    return (value || '').replace(/\s+/g, ' ').trim()
}

function isImportedId(id: string) {
    return /^\d{4}$/.test(id)
}

async function fetchExercises(
    supabase: ReturnType<typeof createClient>,
    allRows: boolean
): Promise<ExerciseRow[]> {
    const pageSize = 1000
    const rows: ExerciseRow[] = []
    let from = 0

    while (true) {
        const to = from + pageSize - 1
        const { data, error } = await supabase
            .from('exercises_v2')
            .select('id,name,english_name,instructions')
            .range(from, to)

        if (error) throw error

        const chunk = (data || []) as ExerciseRow[]
        if (allRows) {
            rows.push(...chunk)
        } else {
            rows.push(...chunk.filter((row) => isImportedId(String(row.id))))
        }

        if (chunk.length < pageSize) break
        from += pageSize
    }

    return rows
}

async function loadCache(cachePath: string): Promise<Record<string, string>> {
    try {
        const content = await fs.readFile(cachePath, 'utf8')
        const parsed = JSON.parse(content)
        if (parsed && typeof parsed === 'object') {
            return parsed as Record<string, string>
        }
    } catch {
        // ignore, start empty
    }
    return {}
}

async function saveCache(cachePath: string, cache: Record<string, string>) {
    await fs.mkdir(path.dirname(cachePath), { recursive: true })
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8')
}

async function translateBatch(
    openai: OpenAI,
    model: string,
    phrases: string[]
): Promise<Record<string, string>> {
    if (phrases.length === 0) return {}

    const systemPrompt = [
        'You are a professional fitness translator.',
        'Translate from English to neutral Spanish used in fitness apps.',
        'If a phrase is already in Spanish, return it unchanged.',
        'Keep exercise meaning exact, keep units/symbols, and keep numbering if present.',
        'Do not add explanations.',
        'Return valid JSON object only.'
    ].join(' ')

    const userPrompt = [
        'Translate each phrase.',
        'Output format: {"original phrase":"translated phrase"}',
        'Include every phrase exactly as key.',
        `Phrases: ${JSON.stringify(phrases)}`
    ].join('\n')

    const response = await openai.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) return {}

    try {
        const parsed = JSON.parse(raw) as Record<string, string>
        const out: Record<string, string> = {}
        for (const key of Object.keys(parsed || {})) {
            const k = normalizeText(key)
            const v = normalizeText(parsed[key])
            if (!k) continue
            out[k] = v || k
        }
        return out
    } catch (error) {
        console.error('Respuesta no parseable, se preserva texto original para este batch.')
        console.error(raw.slice(0, 500))
        console.error(error)
        return {}
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2))

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    const openAiApiKey = process.env.OPENAI_API_KEY

    if (!supabaseUrl || !serviceRole) {
        throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    }
    if (!openAiApiKey) {
        throw new Error('Falta OPENAI_API_KEY para traducir ejercicios')
    }

    const supabase = createClient(supabaseUrl, serviceRole)
    const openai = new OpenAI({ apiKey: openAiApiKey })

    console.log(`Modelo traducción: ${args.model}`)
    console.log(`Cache: ${args.cachePath}`)
    console.log(`Batch size: ${args.batchSize}`)
    console.log(`Dry run: ${args.dryRun}`)
    console.log(`Traducir nombres: ${args.translateNames}`)
    console.log(`Traducir instrucciones: ${args.translateInstructions}`)
    console.log(`Todas las filas: ${args.allRows}`)

    const rows = await fetchExercises(supabase, args.allRows)
    console.log(`Ejercicios detectados: ${rows.length}`)

    const phrasesSet = new Set<string>()
    for (const row of rows) {
        const englishName = normalizeText(row.english_name || row.name)
        if (args.translateNames && englishName) phrasesSet.add(englishName)
        if (args.translateInstructions) {
            for (const step of row.instructions || []) {
                const normalizedStep = normalizeText(step)
                if (normalizedStep) phrasesSet.add(normalizedStep)
            }
        }
    }

    const phrases = Array.from(phrasesSet)
    const cache = await loadCache(args.cachePath)
    const missing = phrases.filter((phrase) => !cache[phrase])
    const missingForRun = args.maxPhrases ? missing.slice(0, args.maxPhrases) : missing

    console.log(`Frases únicas totales: ${phrases.length}`)
    console.log(`Ya en cache: ${phrases.length - missing.length}`)
    console.log(`Pendientes a traducir: ${missing.length}`)
    if (args.maxPhrases) {
        console.log(`Pendientes en esta corrida (max-phrases): ${missingForRun.length}`)
    }

    for (let i = 0; i < missingForRun.length; i += args.batchSize) {
        const batch = missingForRun.slice(i, i + args.batchSize)
        const translated = await translateBatch(openai, args.model, batch)

        for (const original of batch) {
            cache[original] = normalizeText(translated[original]) || original
        }

        await saveCache(args.cachePath, cache)
        console.log(`  progreso traducción: ${Math.min(i + args.batchSize, missingForRun.length)}/${missingForRun.length}`)
    }

    const updates = rows.map((row) => {
        const englishName = normalizeText(row.english_name || row.name)
        const translatedName = args.translateNames
            ? (cache[englishName] || englishName)
            : row.name

        const translatedInstructions = args.translateInstructions
            ? (row.instructions || []).map((step) => {
                const normalizedStep = normalizeText(step)
                return cache[normalizedStep] || normalizedStep
            }).filter(Boolean)
            : (row.instructions || [])

        return {
            id: row.id,
            name: translatedName,
            instructions: translatedInstructions
        }
    })

    console.log(`Filas a actualizar en DB: ${updates.length}`)

    if (!args.dryRun) {
        for (let i = 0; i < updates.length; i += args.updateChunk) {
            const chunk = updates.slice(i, i + args.updateChunk)
            const { error } = await supabase.from('exercises_v2').upsert(chunk, { onConflict: 'id' })
            if (error) throw error
            console.log(`  progreso DB: ${Math.min(i + args.updateChunk, updates.length)}/${updates.length}`)
        }
    }

    console.log('Traducción completada.')
}

main().catch((error) => {
    console.error('Error traduciendo ejercicios:', error)
    process.exit(1)
})
