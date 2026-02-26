import fs from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

type CsvRow = Record<string, string>

type SeedExercise = {
    id: string
    name: string
    english_name: string
    muscle_group: string
    equipment: string | null
    target: string | null
    instructions: string[]
    hasGif: boolean
}

type CliArgs = {
    datasetDir: string
    bucket: string
    uploadConcurrency: number
    dbChunkSize: number
    skipUpload: boolean
    skipDb: boolean
    dryRun: boolean
}

const BODY_PART_ES: Record<string, string> = {
    back: 'Espalda',
    cardio: 'Cardio',
    chest: 'Pecho',
    'lower arms': 'Antebrazos',
    'lower legs': 'Pantorrillas',
    neck: 'Cuello',
    shoulders: 'Hombros',
    'upper arms': 'Brazos',
    'upper legs': 'Piernas',
    waist: 'Abdominales'
}

const TARGET_ES: Record<string, string> = {
    abductors: 'Abductores',
    abs: 'Abdominales',
    adductors: 'Aductores',
    biceps: 'Bíceps',
    calves: 'Pantorrillas',
    'cardiovascular system': 'Cardio',
    delts: 'Deltoides',
    forearms: 'Antebrazos',
    glutes: 'Glúteos',
    hamstrings: 'Isquiotibiales',
    lats: 'Dorsales',
    'levator scapulae': 'Elevador de la escápula',
    pectorals: 'Pectorales',
    quads: 'Cuádriceps',
    'serratus anterior': 'Serrato anterior',
    spine: 'Espalda baja',
    traps: 'Trapecio',
    triceps: 'Tríceps',
    'upper back': 'Espalda alta'
}

const EQUIPMENT_ES: Record<string, string> = {
    assisted: 'Asistido',
    band: 'Banda elástica',
    barbell: 'Barra',
    'body weight': 'Peso corporal',
    'bosu ball': 'Pelota BOSU',
    cable: 'Polea',
    dumbbell: 'Mancuerna',
    'elliptical machine': 'Elíptica',
    'ez barbell': 'Barra EZ',
    hammer: 'Martillo',
    kettlebell: 'Pesa rusa',
    'leverage machine': 'Máquina de palanca',
    'medicine ball': 'Balón medicinal',
    'olympic barbell': 'Barra olímpica',
    'resistance band': 'Banda de resistencia',
    roller: 'Rodillo',
    rope: 'Cuerda',
    'skierg machine': 'Máquina SkiErg',
    'sled machine': 'Trineo',
    'smith machine': 'Máquina Smith',
    'stability ball': 'Pelota de estabilidad',
    'stationary bike': 'Bicicleta fija',
    'stepmill machine': 'Escaladora',
    tire: 'Neumático',
    'trap bar': 'Barra trap',
    'upper body ergometer': 'Ergómetro de brazos',
    weighted: 'Con carga',
    'wheel roller': 'Rueda abdominal'
}

function compact(value: string | undefined | null) {
    return (value || '').replace(/\s+/g, ' ').trim()
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        datasetDir: process.env.EXERCISES_GIFS_DATASET_DIR || '/tmp/exercises-gifs',
        bucket: process.env.EXERCISES_GIFS_BUCKET || 'exercise-gifs',
        uploadConcurrency: Number(process.env.EXERCISES_GIFS_UPLOAD_CONCURRENCY || 12),
        dbChunkSize: Number(process.env.EXERCISES_GIFS_DB_CHUNK_SIZE || 200),
        skipUpload: false,
        skipDb: false,
        dryRun: false
    }

    for (const rawArg of argv) {
        if (!rawArg.startsWith('--')) continue
        const [key, value] = rawArg.slice(2).split('=')

        switch (key) {
            case 'dataset-dir':
                if (value) args.datasetDir = value
                break
            case 'bucket':
                if (value) args.bucket = value
                break
            case 'upload-concurrency':
                if (value) args.uploadConcurrency = Math.max(1, Number(value))
                break
            case 'db-chunk-size':
                if (value) args.dbChunkSize = Math.max(1, Number(value))
                break
            case 'skip-upload':
                args.skipUpload = true
                break
            case 'skip-db':
                args.skipDb = true
                break
            case 'dry-run':
                args.dryRun = true
                break
            default:
                break
        }
    }

    return args
}

function parseCsv(content: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let inQuotes = false

    const normalized = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content

    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i]
        const next = normalized[i + 1]

        if (char === '"') {
            if (inQuotes && next === '"') {
                field += '"'
                i++
            } else {
                inQuotes = !inQuotes
            }
            continue
        }

        if (char === ',' && !inQuotes) {
            row.push(field)
            field = ''
            continue
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i++
            row.push(field)
            field = ''
            if (!(row.length === 1 && row[0] === '')) {
                rows.push(row)
            }
            row = []
            continue
        }

        field += char
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field)
        if (!(row.length === 1 && row[0] === '')) {
            rows.push(row)
        }
    }

    return rows
}

function rowsToObjects(rows: string[][]): CsvRow[] {
    if (rows.length < 2) return []
    const header = rows[0].map((h) => compact(h))
    const objects: CsvRow[] = []

    for (let r = 1; r < rows.length; r++) {
        const line = rows[r]
        if (!line || line.length === 0) continue
        const obj: CsvRow = {}
        for (let c = 0; c < header.length; c++) {
            obj[header[c]] = compact(line[c] || '')
        }
        objects.push(obj)
    }

    return objects
}

function toSpanishBodyPart(bodyPart: string): string {
    return BODY_PART_ES[compact(bodyPart).toLowerCase()] || compact(bodyPart)
}

function toSpanishTarget(target: string): string {
    return TARGET_ES[compact(target).toLowerCase()] || compact(target)
}

function toSpanishEquipment(equipment: string): string {
    return EQUIPMENT_ES[compact(equipment).toLowerCase()] || compact(equipment)
}

function buildInstructions(row: CsvRow) {
    const steps: string[] = []
    for (let i = 0; i <= 10; i++) {
        const raw = compact(row[`instructions/${i}`])
        if (raw) steps.push(raw)
    }
    return steps
}

async function runWithConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<void>
) {
    let next = 0
    const runners = new Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
        while (true) {
            const current = next++
            if (current >= items.length) return
            await worker(items[current], current)
        }
    })
    await Promise.all(runners)
}

async function ensureBucketPublic(
    supabase: ReturnType<typeof createClient>,
    bucket: string,
    dryRun: boolean
) {
    if (dryRun) return

    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    if (bucketsError) throw bucketsError

    const existing = (buckets || []).find((b) => b.name === bucket || b.id === bucket)

    if (!existing) {
        const { error } = await supabase.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024,
            allowedMimeTypes: ['image/gif']
        })
        if (error) throw error
        return
    }

    if (!existing.public) {
        const { error } = await supabase.storage.updateBucket(bucket, { public: true })
        if (error) throw error
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2))
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
    }

    const datasetDir = path.resolve(args.datasetDir)
    const csvPath = path.join(datasetDir, 'exercises.csv')
    const assetsDir = path.join(datasetDir, 'assets')

    console.log(`Dataset: ${datasetDir}`)
    console.log(`Bucket: ${args.bucket}`)
    console.log(`Opciones: dryRun=${args.dryRun} skipUpload=${args.skipUpload} skipDb=${args.skipDb}`)

    const [csvContent, assetEntries] = await Promise.all([
        fs.readFile(csvPath, 'utf8'),
        fs.readdir(assetsDir)
    ])

    const gifIds = new Set(
        assetEntries
            .filter((name) => name.toLowerCase().endsWith('.gif'))
            .map((name) => path.basename(name, '.gif'))
    )

    const csvRows = rowsToObjects(parseCsv(csvContent))
    if (csvRows.length === 0) {
        throw new Error('No se encontraron filas en exercises.csv')
    }

    const seeds: SeedExercise[] = csvRows.map((row) => {
        const id = compact(row.id)
        const englishName = compact(row.name)
        return {
            id,
            name: englishName,
            english_name: englishName,
            muscle_group: toSpanishBodyPart(row.bodyPart),
            equipment: toSpanishEquipment(row.equipment) || null,
            target: toSpanishTarget(row.target) || null,
            instructions: buildInstructions(row),
            hasGif: gifIds.has(id)
        }
    })

    const invalidIds = seeds.filter((row) => !/^\d{4}$/.test(row.id))
    if (invalidIds.length > 0) {
        throw new Error(`Se encontraron IDs inválidos en CSV: ${invalidIds.slice(0, 10).map((r) => r.id).join(', ')}`)
    }

    const seen = new Set<string>()
    const duplicatedIds = new Set<string>()
    for (const row of seeds) {
        if (seen.has(row.id)) duplicatedIds.add(row.id)
        seen.add(row.id)
    }
    if (duplicatedIds.size > 0) {
        throw new Error(`Se encontraron IDs duplicados en CSV: ${Array.from(duplicatedIds).slice(0, 10).join(', ')}`)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const gifUrlById = new Map<string, string>()

    if (!args.skipUpload) {
        console.log('Asegurando bucket público...')
        await ensureBucketPublic(supabase, args.bucket, args.dryRun)

        let processed = 0
        const total = seeds.length
        console.log(`Subiendo GIFs (${total} ejercicios, concurrencia ${args.uploadConcurrency})...`)

        await runWithConcurrency(seeds, args.uploadConcurrency, async (exercise) => {
            try {
                if (!exercise.hasGif) return
                const storagePath = `${exercise.id}.gif`

                if (!args.dryRun) {
                    const buffer = await fs.readFile(path.join(assetsDir, `${exercise.id}.gif`))
                    const { error } = await supabase.storage.from(args.bucket).upload(storagePath, buffer, {
                        contentType: 'image/gif',
                        cacheControl: '31536000',
                        upsert: true
                    })
                    if (error) throw error
                }

                const { data } = supabase.storage.from(args.bucket).getPublicUrl(storagePath)
                if (data?.publicUrl) gifUrlById.set(exercise.id, data.publicUrl)
            } finally {
                processed += 1
                if (processed % 100 === 0 || processed === total) {
                    console.log(`  progreso GIFs: ${processed}/${total}`)
                }
            }
        })
    } else {
        for (const exercise of seeds) {
            if (!exercise.hasGif) continue
            const { data } = supabase.storage.from(args.bucket).getPublicUrl(`${exercise.id}.gif`)
            if (data?.publicUrl) gifUrlById.set(exercise.id, data.publicUrl)
        }
    }

    const rowsForDb = seeds.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        english_name: exercise.english_name,
        muscle_group: exercise.muscle_group,
        equipment: exercise.equipment,
        target: exercise.target,
        gif_url: gifUrlById.get(exercise.id) || null,
        instructions: exercise.instructions
    }))

    if (!args.skipDb) {
        console.log(`Upsert en exercises_v2 (${rowsForDb.length} filas, chunk ${args.dbChunkSize})...`)
        if (!args.dryRun) {
            for (let i = 0; i < rowsForDb.length; i += args.dbChunkSize) {
                const chunk = rowsForDb.slice(i, i + args.dbChunkSize)
                const { error } = await supabase.from('exercises_v2').upsert(chunk, { onConflict: 'id' })
                if (error) throw error
                console.log(`  progreso DB: ${Math.min(i + args.dbChunkSize, rowsForDb.length)}/${rowsForDb.length}`)
            }
        }
    }

    const totalWithGif = rowsForDb.filter((r) => !!r.gif_url).length
    const totalWithoutGif = rowsForDb.length - totalWithGif
    const cardio = rowsForDb.filter((r) => normalizeForCheck(r.muscle_group).includes('cardio')).length

    console.log('\nResumen importación')
    console.log(`- ejercicios procesados: ${rowsForDb.length}`)
    console.log(`- con GIF: ${totalWithGif}`)
    console.log(`- sin GIF: ${totalWithoutGif}`)
    console.log(`- cardio: ${cardio}`)
    console.log(`- bucket destino: ${args.bucket}`)
}

function normalizeForCheck(value: string | null | undefined) {
    return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

main().catch((error) => {
    console.error('Error importando ejercicios:', error)
    process.exit(1)
})
