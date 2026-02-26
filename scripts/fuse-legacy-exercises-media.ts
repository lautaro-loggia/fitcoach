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
    muscle_group: string | null
    equipment: string | null
    target: string | null
    gif_url: string | null
    instructions: string[] | null
}

type MappingCandidate = {
    row: ExerciseRow
    score: number
}

type MappingDecision = {
    legacyId: string
    legacyName: string
    mappedId: string | null
    mappedName: string | null
    score: number
    source: 'manual' | 'auto' | 'ai' | 'none'
    confidence?: number
}

type CliArgs = {
    dryRun: boolean
    useAi: boolean
    model: string
    candidateLimit: number
    minAutoScore: number
    minAutoGap: number
    minAiConfidence: number
    output: string
}

const STOPWORDS = new Set([
    'de', 'del', 'la', 'las', 'el', 'los', 'con', 'en', 'a', 'al',
    'por', 'para', 'un', 'una', 'y', 'o', 'si', 'se', 'que',
    'enfoque', 'usa', 'hace', 'the', 'and', 'to'
])

const NO_SINGULARIZE = new Set([
    'press', 'crunch', 'smith', 'crossfit', 'trx', 'bosu', 'v'
])

const MANUAL_LEGACY_MAP: Record<string, string> = {
    // Pendientes sin match automático/IA (legacy UUID -> catálogo numérico)
    '3e17db33-69e3-4bc2-b862-c0faca938364': '0857', // Ab wheel
    'e279d856-fa88-4988-a637-f209844b1784': '0597', // Abductor en máquina
    'ef2d7648-a44e-44d4-8c73-1a65af9194c1': '0598', // Aductor en máquina
    'b5787a99-9034-43e4-bd5d-db17f06f1717': '0227', // Aperturas en polea
    '86b9a1e7-2d05-41ea-b843-53dbaddef1dc': '0276', // Bird dog (equivalente core)
    '759cb716-4048-4bc7-9169-784ec33a44cf': '3666', // Cinta: trotar
    '92854cae-4479-4ccb-94a8-6ef51cceaa60': '1262', // Cruce alto a bajo
    '93bb9cca-7a8b-4541-b0e9-bdb71d2dd2e8': '1270', // Cruce bajo a alto
    '4a3e72ef-5200-4e18-b2e9-64e48b969896': '0595', // Crunch en máquina
    'a92d26e3-a0da-4a04-b5ef-39a9b724f745': '0297', // Curl concentrado
    'fb82d1bc-cc42-4d84-ba52-a4cb5646396f': '0599', // Curl femoral sentado
    '0229d0c1-22d3-4934-ab18-113a2ce679a2': '0769', // Desplantes en multipower
    '8dcba701-69ea-46e1-a405-e5df6e9f6b5f': '1385', // Elevación de talones en prensa
    '8ba7e3b6-6b8d-479c-b07e-1d163521c37e': '0082', // Extensión de muñeca
    'c990d7ea-4b68-4dcb-9f9e-246575df8c87': '1738', // Extensión overhead con mancuerna
    'ee1bb743-6c47-4076-9581-e6e5c7418fed': '0818', // Jalón agarre neutro
    '18c68ed3-0232-4f8c-8478-f5d1731d92a5': '1417', // Nordic curl (equivalente femoral)
    '797c583d-62b7-4e92-8532-a91f7348abc4': '1490', // Pantorrillas en escalón
    'ab3afc49-2dda-4189-a5ce-1e19dfeb55c0': '0596', // Peck deck
    '2f94d1d2-b7de-46f1-8703-b0b9176c21e2': '0606', // Remo en T
    '7abab163-dfd6-4a6a-abe8-b5b69b78bfe8': '1318', // Remo pecho apoyado
    '94f54a10-0624-4edb-b5d1-3fec3b828778': '0410', // Sentadilla búlgara glúteo
    '30e81dc4-4fd4-4a15-bfe8-d03966f60b87': '0431', // Step-up glúteo
    'e24c71a3-f35b-438d-b4f5-f1b71a85009f': '0381', // Zancadas hacia atrás

    // Casos ambiguos que IA deja sin decidir de forma consistente
    '7486d197-602b-411a-b77a-712ba024782b': '0241', // Pushdown tríceps en polea alta
    '74deeaa3-0340-41a7-9258-45145c19070c': '1359', // Remo en Smith
    '7bd8474e-c253-4f8e-b8cf-0575b9086c85': '0085', // Peso muerto rumano

    // Últimos casos residuales
    'd5818c78-69c8-4a15-9454-1fa9111ba18d': '0180', // Remo en polea baja agarre V
    'b4982bed-a5e2-4f42-96b7-9c8fd3e338ea': '0488', // Hiperextensiones (banco romano)
    'd80a040a-ecce-4561-815b-ea002e055089': '0602', // Pájaros en peck deck invertido
    '265aa18f-6b6d-434d-a905-ecc608765a55': '0025', // Press banca con barra
    'cd3337e7-bc9e-4248-8aab-6c90331b4de7': '0375'  // Pull over con mancuerna
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        dryRun: false,
        useAi: false,
        model: process.env.EXERCISES_FUSION_MODEL || 'gpt-4.1-mini',
        candidateLimit: Number(process.env.EXERCISES_FUSION_CANDIDATE_LIMIT || 16),
        minAutoScore: Number(process.env.EXERCISES_FUSION_MIN_AUTO_SCORE || 0.62),
        minAutoGap: Number(process.env.EXERCISES_FUSION_MIN_AUTO_GAP || 0.08),
        minAiConfidence: Number(process.env.EXERCISES_FUSION_MIN_AI_CONFIDENCE || 0.7),
        output: process.env.EXERCISES_FUSION_REPORT || '/tmp/legacy-exercises-fusion-report.json'
    }

    for (const raw of argv) {
        if (!raw.startsWith('--')) continue
        const [key, value] = raw.slice(2).split('=')

        switch (key) {
            case 'dry-run':
                args.dryRun = true
                break
            case 'use-ai':
                args.useAi = true
                break
            case 'model':
                if (value) args.model = value
                break
            case 'candidate-limit':
                if (value) args.candidateLimit = Math.max(6, Number(value))
                break
            case 'min-auto-score':
                if (value) args.minAutoScore = Number(value)
                break
            case 'min-auto-gap':
                if (value) args.minAutoGap = Number(value)
                break
            case 'min-ai-confidence':
                if (value) args.minAiConfidence = Number(value)
                break
            case 'output':
                if (value) args.output = value
                break
            default:
                break
        }
    }

    return args
}

function isUuid(id: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

function isCatalogId(id: string) {
    return /^\d{4}$/.test(id)
}

function normalize(value: string | null | undefined) {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function canonicalize(text: string | null | undefined) {
    let normalized = normalize(text)

    const replacements: Array<[RegExp, string]> = [
        [/\bpoleas?\b/g, 'cable'],
        [/\bcruce de poleas?\b/g, 'cruce con cable'],
        [/\bmaquinas?\b/g, 'maquina'],
        [/\bpeck\b/g, 'pec'],
        [/\bbuenos dias?\b/g, 'good morning'],
        [/\bhip thrust\b/g, 'elevacion cadera'],
        [/\bhip hinge\b/g, 'bisagra cadera'],
        [/\bpull through\b/g, 'bisagra cadera cable'],
        [/\bdead hang\b/g, 'colgarse barra'],
        [/\bbird dog\b/g, 'birddog'],
        [/\bfarmer walk\b/g, 'caminata granjero'],
        [/\bwoodchoppers?\b/g, 'rotacion cable'],
        [/\bremo ergometro\b/g, 'remo maquina'],
        [/\bbicicleta fija\b/g, 'bicicleta estatica'],
        [/\bbicicleta reclinada\b/g, 'bicicleta estatica'],
        [/\beliptico\b/g, 'eliptica'],
        [/\bprensa de piernas?\b/g, 'prensa pierna'],
        [/\bsplit squat\b/g, 'sentadilla dividida'],
        [/\bstep ups?\b/g, 'subida banco'],
        [/\bpajaros?\b/g, 'elevacion posterior'],
        [/\bencogimientos?\b/g, 'encogimiento'],
        [/\bhiperextensiones?\b/g, 'hiperextension'],
        [/\belevaciones?\b/g, 'elevacion'],
        [/\bflexiones?\b/g, 'flexion'],
        [/\bzancadas?\b/g, 'zancada'],
        [/\bsentadillas?\b/g, 'sentadilla'],
        [/\bcurles\b/g, 'curl'],
        [/\bpress banca\b/g, 'press de banca'],
        [/\bpull over\b/g, 'pullover'],
        [/\bjalon\b/g, 'jalon'],
        [/\bmachine\b/g, 'maquina'],
        [/\bsmith\b/g, 'smith'],
        [/\bbarra z\b/g, 'barra ez'],
        [/\bchin ups\b/g, 'dominadas supinas'],
        [/\bpull ups\b/g, 'dominadas'],
        [/\bpush ups\b/g, 'flexiones'],
        [/\bfly\b/g, 'aperturas'],
        [/\bpeck deck\b/g, 'pec deck'],
        [/\bgood mornings\b/g, 'good morning'],
        [/\bromanian deadlift\b/g, 'peso muerto rumano']
    ]

    for (const [regex, target] of replacements) {
        normalized = normalized.replace(regex, target)
    }

    return normalized
}

function singularizeToken(token: string) {
    if (token.length <= 3) return token
    if (NO_SINGULARIZE.has(token)) return token
    if (token.endsWith('es') && token.length > 5 && !token.endsWith('ses') && !token.endsWith('ss')) {
        return token.slice(0, -2)
    }
    if (token.endsWith('s') && token.length > 4 && !token.endsWith('ss')) {
        return token.slice(0, -1)
    }
    return token
}

function tokenize(text: string | null | undefined) {
    return canonicalize(text)
        .split(' ')
        .map((token) => token.trim())
        .map(singularizeToken)
        .filter((token) => token.length > 1 && !STOPWORDS.has(token))
}

function jaccardScore(a: string[], b: string[]) {
    if (a.length === 0 || b.length === 0) return 0
    const setA = new Set(a)
    const setB = new Set(b)
    let intersection = 0
    for (const token of setA) {
        if (setB.has(token)) intersection += 1
    }
    const union = new Set([...setA, ...setB]).size
    return union === 0 ? 0 : intersection / union
}

function hasMedia(exercise: ExerciseRow) {
    const hasGif = !!(exercise.gif_url && exercise.gif_url.trim() !== '')
    const hasInstructions = Array.isArray(exercise.instructions) && exercise.instructions.length > 0
    return hasGif || hasInstructions
}

function similarity(legacy: ExerciseRow, candidate: ExerciseRow) {
    const legacyNameTokens = tokenize(legacy.name)
    const candidateNameTokens = tokenize(candidate.name)
    const candidateEnglishTokens = tokenize(candidate.english_name)

    const nameScore = jaccardScore(legacyNameTokens, candidateNameTokens)
    const englishScore = jaccardScore(legacyNameTokens, candidateEnglishTokens) * 0.8
    let score = Math.max(nameScore, englishScore)

    const legacyCanon = canonicalize(legacy.name)
    const candidateCanon = canonicalize(candidate.name)
    const candidateEnglishCanon = canonicalize(candidate.english_name)

    if (legacyCanon && candidateCanon && (candidateCanon.includes(legacyCanon) || legacyCanon.includes(candidateCanon))) {
        score += 0.12
    }
    if (legacyCanon && candidateEnglishCanon && (candidateEnglishCanon.includes(legacyCanon) || legacyCanon.includes(candidateEnglishCanon))) {
        score += 0.08
    }

    const legacyMuscle = normalize(legacy.muscle_group)
    const candidateMuscle = normalize(candidate.muscle_group)
    if (legacyMuscle && candidateMuscle && legacyMuscle === candidateMuscle) {
        score += 0.1
    }

    const candidateAllTokens = new Set([...candidateNameTokens, ...candidateEnglishTokens])
    const requiredTokens = legacyNameTokens.filter((token) => token.length >= 4)
    const matchedRequired = requiredTokens.filter((token) => candidateAllTokens.has(token)).length
    if (requiredTokens.length > 0) {
        const ratio = matchedRequired / requiredTokens.length
        if (ratio >= 0.8) score += 0.18
        else if (ratio >= 0.6) score += 0.12
        else if (ratio >= 0.4) score += 0.06
    }

    return Math.min(1, score)
}

function topCandidates(legacy: ExerciseRow, catalog: ExerciseRow[], limit = 8): MappingCandidate[] {
    return catalog
        .map((row) => ({ row, score: similarity(legacy, row) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
}

function toCompactExercise(row: ExerciseRow) {
    return {
        id: row.id,
        name: row.name,
        english_name: row.english_name,
        muscle_group: row.muscle_group,
        equipment: row.equipment
    }
}

async function resolveWithAi(
    openai: OpenAI,
    model: string,
    unresolved: Array<{ legacy: ExerciseRow; candidates: MappingCandidate[] }>
) {
    if (unresolved.length === 0) return []

    const payload = unresolved.map((item) => ({
        legacy_id: item.legacy.id,
        legacy_name: item.legacy.name,
        legacy_muscle_group: item.legacy.muscle_group,
        candidates: item.candidates.map((candidate) => ({
            id: candidate.row.id,
            name: candidate.row.name,
            english_name: candidate.row.english_name,
            muscle_group: candidate.row.muscle_group,
            score: Number(candidate.score.toFixed(3))
        }))
    }))

    const response = await openai.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: [
                    'You are mapping legacy fitness exercises to a new exercise catalog.',
                    'Map each legacy exercise to the closest equivalent in the new catalog.',
                    'Exact wording is not required: equivalent variants by equipment/angle are acceptable.',
                    'Prioritize movement pattern and primary muscle group.',
                    'Only choose null when there is no reasonably equivalent exercise.',
                    'Return strict JSON.'
                ].join(' ')
            },
            {
                role: 'user',
                content: [
                    'Return JSON object with key "mappings".',
                    'Each mapping item must be:',
                    '{ "legacy_id": string, "selected_id": string|null, "confidence": number, "reason": string }',
                    `Input: ${JSON.stringify(payload)}`
                ].join('\n')
            }
        ]
    })

    const raw = response.choices[0]?.message?.content || ''
    try {
        const parsed = JSON.parse(raw) as {
            mappings?: Array<{ legacy_id: string; selected_id: string | null; confidence: number; reason: string }>
        }
        return parsed.mappings || []
    } catch {
        console.error('No se pudo parsear respuesta de IA. Respuesta recortada:')
        console.error(raw.slice(0, 800))
        return []
    }
}

async function fetchAllExercises(supabase: ReturnType<typeof createClient>) {
    const rows: ExerciseRow[] = []
    const page = 1000
    let from = 0

    while (true) {
        const to = from + page - 1
        const { data, error } = await supabase
            .from('exercises_v2')
            .select('id,name,english_name,muscle_group,equipment,target,gif_url,instructions')
            .range(from, to)

        if (error) throw error
        const chunk = (data || []) as ExerciseRow[]
        rows.push(...chunk)
        if (chunk.length < page) break
        from += page
    }

    return rows
}

async function main() {
    const args = parseArgs(process.argv.slice(2))

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    }

    const rows = await fetchAllExercises(createClient(supabaseUrl, serviceRoleKey))
    const legacy = rows.filter((row) => isUuid(String(row.id)))
    const catalog = rows.filter((row) => isCatalogId(String(row.id)) && hasMedia(row))

    console.log(`Legacy UUID: ${legacy.length}`)
    console.log(`Catalogo con media: ${catalog.length}`)
    console.log(`Dry run: ${args.dryRun}`)
    console.log(`Use AI: ${args.useAi}`)
    console.log(`Candidate limit: ${args.candidateLimit}`)

    const decisions: MappingDecision[] = []
    const unresolvedForAi: Array<{ legacy: ExerciseRow; candidates: MappingCandidate[] }> = []
    const catalogById = new Map(catalog.map((row) => [row.id, row]))

    for (const legacyRow of legacy) {
        const manualMappedId = MANUAL_LEGACY_MAP[legacyRow.id]
        if (manualMappedId) {
            const manualTarget = catalogById.get(manualMappedId)
            if (manualTarget) {
                decisions.push({
                    legacyId: legacyRow.id,
                    legacyName: legacyRow.name,
                    mappedId: manualTarget.id,
                    mappedName: manualTarget.name,
                    score: 1,
                    source: 'manual'
                })
                continue
            }
        }

        const candidates = topCandidates(legacyRow, catalog, args.candidateLimit)
        const best = candidates[0]
        const second = candidates[1]
        const gap = (best?.score || 0) - (second?.score || 0)

        if (best && best.score >= args.minAutoScore && gap >= args.minAutoGap) {
            decisions.push({
                legacyId: legacyRow.id,
                legacyName: legacyRow.name,
                mappedId: best.row.id,
                mappedName: best.row.name,
                score: best.score,
                source: 'auto'
            })
        } else {
            unresolvedForAi.push({ legacy: legacyRow, candidates })
            decisions.push({
                legacyId: legacyRow.id,
                legacyName: legacyRow.name,
                mappedId: null,
                mappedName: null,
                score: best?.score || 0,
                source: 'none'
            })
        }
    }

    if (args.useAi) {
        const openAiApiKey = process.env.OPENAI_API_KEY
        if (!openAiApiKey) {
            throw new Error('OPENAI_API_KEY requerido para --use-ai')
        }

        const openai = new OpenAI({ apiKey: openAiApiKey })
        const batchSize = 20

        for (let i = 0; i < unresolvedForAi.length; i += batchSize) {
            const batch = unresolvedForAi.slice(i, i + batchSize)
            const aiMappings = await resolveWithAi(openai, args.model, batch)
            const aiByLegacyId = new Map(aiMappings.map((item) => [item.legacy_id, item]))

            for (const item of batch) {
                const ai = aiByLegacyId.get(item.legacy.id)
                if (!ai || !ai.selected_id || Number(ai.confidence || 0) < args.minAiConfidence) continue

                const selected = item.candidates.find((candidate) => candidate.row.id === ai.selected_id)
                if (!selected) continue

                const idx = decisions.findIndex((decision) => decision.legacyId === item.legacy.id)
                if (idx >= 0) {
                    decisions[idx] = {
                        legacyId: item.legacy.id,
                        legacyName: item.legacy.name,
                        mappedId: selected.row.id,
                        mappedName: selected.row.name,
                        score: selected.score,
                        source: 'ai',
                        confidence: Number(ai.confidence || 0)
                    }
                }
            }

            console.log(`AI progreso: ${Math.min(i + batchSize, unresolvedForAi.length)}/${unresolvedForAi.length}`)
        }
    }

    const mapped = decisions.filter((decision) => !!decision.mappedId)
    const unmapped = decisions.filter((decision) => !decision.mappedId)
    const manualMapped = decisions.filter((decision) => decision.source === 'manual')
    const autoMapped = decisions.filter((decision) => decision.source === 'auto')
    const aiMapped = decisions.filter((decision) => decision.source === 'ai')

    console.log(`Manual-mapped: ${manualMapped.length}`)
    console.log(`Auto-mapped: ${autoMapped.length}`)
    console.log(`AI-mapped: ${aiMapped.length}`)
    console.log(`Unmapped: ${unmapped.length}`)

    const updates = mapped
        .map((decision) => {
            const source = catalogById.get(String(decision.mappedId))
            if (!source) return null
            return {
                id: decision.legacyId,
                gif_url: source.gif_url,
                instructions: source.instructions || [],
                equipment: source.equipment,
                target: source.target
            }
        })
        .filter(Boolean) as Array<{
            id: string
            gif_url: string | null
            instructions: string[]
            equipment: string | null
            target: string | null
        }>

    if (!args.dryRun && updates.length > 0) {
        const supabase = createClient(supabaseUrl, serviceRoleKey)
        const chunkSize = 100
        for (let i = 0; i < updates.length; i += chunkSize) {
            const chunk = updates.slice(i, i + chunkSize)
            for (const row of chunk) {
                const { id, ...fields } = row
                const { error } = await supabase.from('exercises_v2').update(fields).eq('id', id)
                if (error) throw error
            }
            console.log(`DB progreso: ${Math.min(i + chunkSize, updates.length)}/${updates.length}`)
        }
    }

    const report = {
        generated_at: new Date().toISOString(),
        args,
        totals: {
            legacy: legacy.length,
            catalog_with_media: catalog.length,
            manual_mapped: manualMapped.length,
            auto_mapped: autoMapped.length,
            ai_mapped: aiMapped.length,
            unmapped: unmapped.length,
            updates: updates.length
        },
        samples: {
            manual: manualMapped.slice(0, 40),
            auto: autoMapped.slice(0, 30),
            ai: aiMapped.slice(0, 30),
            unmapped: unmapped.slice(0, 40)
        },
        compact_unmapped: unmapped.slice(0, 200).map((item) => item.legacyName)
    }

    await fs.mkdir(path.dirname(args.output), { recursive: true })
    await fs.writeFile(args.output, JSON.stringify(report, null, 2), 'utf8')
    console.log(`Reporte guardado: ${args.output}`)
}

main().catch((error) => {
    console.error('Error fusionando ejercicios legacy con catálogo nuevo:', error)
    process.exit(1)
})
