import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

type ExerciseCatalogRow = {
    id: string
    name: string
    muscle_group: string | null
    gif_url: string | null
    instructions: string[] | null
}

type WorkoutRow = {
    id: string
    structure: unknown
}

type CliArgs = {
    dryRun: boolean
    limit?: number
    syncInstructions: boolean
}

const MANUAL_STRUCTURE_ALIAS: Record<string, string> = {
    // Alias de nombres custom detectados en estructuras existentes
    'sentadilla pendulo': '0755',
    'prensa unilateral': '1425',
    'remo con mancuernas apoyo en pecho': '1318',
    'curl inverso con mancuernas': '0429',
    'curl de martizo cruzado': '0313',
    'fondos en banco': '0129',
    'press de hombros con mancuerna': '0405'
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = { dryRun: false, syncInstructions: false }
    for (const raw of argv) {
        if (!raw.startsWith('--')) continue
        const [key, value] = raw.slice(2).split('=')
        if (key === 'dry-run') args.dryRun = true
        if (key === 'limit' && value) args.limit = Math.max(1, Number(value))
        if (key === 'sync-instructions') args.syncInstructions = true
    }
    return args
}

function normalize(value: string | null | undefined) {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function hasGif(exercise: any) {
    return !!(exercise?.gif_url && String(exercise.gif_url).trim() !== '')
}

function hasInstructions(exercise: any) {
    return Array.isArray(exercise?.instructions) && exercise.instructions.length > 0
}

function hasMedia(exercise: any) {
    return hasGif(exercise) || hasInstructions(exercise)
}

function uniqueInstructions(list: string[] | null | undefined) {
    if (!Array.isArray(list)) return []
    const cleaned = list.map((item) => String(item || '').trim()).filter(Boolean)
    return Array.from(new Set(cleaned))
}

async function fetchAll<T>(
    fetchPage: (from: number, to: number) => Promise<T[]>,
    pageSize = 1000
) {
    const out: T[] = []
    let from = 0
    while (true) {
        const to = from + pageSize - 1
        const chunk = await fetchPage(from, to)
        out.push(...chunk)
        if (chunk.length < pageSize) break
        from += pageSize
    }
    return out
}

function selectBestCandidate(candidates: ExerciseCatalogRow[], current: any) {
    if (candidates.length === 0) return null
    if (candidates.length === 1) return candidates[0]

    const currentMuscle = normalize(current?.muscle_group)
    if (currentMuscle) {
        const byMuscle = candidates.find((c) => normalize(c.muscle_group) === currentMuscle)
        if (byMuscle) return byMuscle
    }

    const withBoth = candidates.find((c) => !!c.gif_url && (c.instructions || []).length > 0)
    if (withBoth) return withBoth

    return candidates[0]
}

function enrichStructure(
    structure: unknown,
    catalogById: Map<string, ExerciseCatalogRow>,
    catalogByName: Map<string, ExerciseCatalogRow[]>,
    syncInstructions: boolean
) {
    if (!Array.isArray(structure)) {
        return { changed: false, structure, matched: 0, unmatched: 0, missingNames: [] as string[] }
    }

    let changed = false
    let matched = 0
    let unmatched = 0
    const missingNames: string[] = []

    const next = structure.map((rawEx) => {
        if (!rawEx || typeof rawEx !== 'object') return rawEx
        const ex: any = { ...(rawEx as any) }

        if (!syncInstructions && hasGif(ex) && hasInstructions(ex)) return ex

        const byId = ex.exercise_id ? catalogById.get(String(ex.exercise_id)) : null
        let candidate = byId && hasMedia(byId) ? byId : null

        if (!candidate) {
            const byNameCandidates = catalogByName.get(normalize(ex.name)) || []
            candidate = selectBestCandidate(byNameCandidates, ex)
        }

        if (!candidate) {
            const aliasId = MANUAL_STRUCTURE_ALIAS[normalize(ex.name)]
            if (aliasId) {
                const byAlias = catalogById.get(aliasId)
                if (byAlias && hasMedia(byAlias)) {
                    candidate = byAlias
                }
            }
        }

        if (!candidate || !hasMedia(candidate)) {
            unmatched += 1
            if (ex.name) missingNames.push(String(ex.name))
            return ex
        }

        if (!hasGif(ex) && candidate.gif_url) {
            ex.gif_url = candidate.gif_url
            changed = true
        }
        if (syncInstructions || !hasInstructions(ex)) {
            const cleaned = uniqueInstructions(candidate.instructions)
            const current = uniqueInstructions(ex.instructions)
            const same =
                cleaned.length === current.length &&
                cleaned.every((value, idx) => value === current[idx])
            if (cleaned.length > 0 && !same) {
                ex.instructions = cleaned
                changed = true
            }
        }
        if (!ex.muscle_group && candidate.muscle_group) {
            ex.muscle_group = candidate.muscle_group
            changed = true
        }

        matched += 1
        return ex
    })

    return { changed, structure: next, matched, unmatched, missingNames }
}

async function main() {
    const args = parseArgs(process.argv.slice(2))
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRole) {
        throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, serviceRole)
    console.log(`Dry run: ${args.dryRun}`)
    console.log(`Sync instructions: ${args.syncInstructions}`)

    const catalog = await fetchAll<ExerciseCatalogRow>(async (from, to) => {
        const { data, error } = await supabase
            .from('exercises_v2')
            .select('id,name,muscle_group,gif_url,instructions')
            .range(from, to)
        if (error) throw error
        return (data || []) as ExerciseCatalogRow[]
    })

    const catalogWithMedia = catalog.filter((row) => hasMedia(row))
    console.log(`Catalogo total: ${catalog.length}, con media: ${catalogWithMedia.length}`)

    const catalogById = new Map<string, ExerciseCatalogRow>()
    const catalogByName = new Map<string, ExerciseCatalogRow[]>()
    for (const row of catalogWithMedia) {
        catalogById.set(String(row.id), row)
        const key = normalize(row.name)
        if (!key) continue
        const arr = catalogByName.get(key) || []
        arr.push(row)
        catalogByName.set(key, arr)
    }

    const tables: Array<'workouts' | 'assigned_workouts'> = ['workouts', 'assigned_workouts']
    for (const table of tables) {
        const rows = await fetchAll<WorkoutRow>(async (from, to) => {
            const { data, error } = await supabase.from(table).select('id,structure').range(from, to)
            if (error) throw error
            return (data || []) as WorkoutRow[]
        })

        const targetRows = args.limit ? rows.slice(0, args.limit) : rows
        let changedRows = 0
        let matched = 0
        let unmatched = 0
        const missingNames = new Set<string>()

        for (const row of targetRows) {
            const result = enrichStructure(row.structure, catalogById, catalogByName, args.syncInstructions)
            matched += result.matched
            unmatched += result.unmatched
            for (const name of result.missingNames) missingNames.add(name)

            if (!result.changed) continue
            changedRows += 1

            if (!args.dryRun) {
                const { error } = await supabase
                    .from(table)
                    .update({ structure: result.structure })
                    .eq('id', row.id)
                if (error) throw error
            }
        }

        console.log(`\nTabla: ${table}`)
        console.log(`- filas procesadas: ${targetRows.length}`)
        console.log(`- filas actualizadas: ${changedRows}`)
        console.log(`- ejercicios matcheados: ${matched}`)
        console.log(`- ejercicios sin match: ${unmatched}`)
        if (missingNames.size > 0) {
            console.log(`- ejemplos sin match: ${Array.from(missingNames).slice(0, 15).join(' | ')}`)
        }
    }
}

main().catch((error) => {
    console.error('Error haciendo backfill de media en rutinas:', error)
    process.exit(1)
})
