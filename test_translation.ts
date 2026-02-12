
const BODY_PARTS_ES: Record<string, string> = {
    'back': 'Espalda',
    'cardio': 'Cardio',
    'chest': 'Pecho',
    'lower arms': 'Antebrazos',
    'lower legs': 'Pantorrillas',
    'neck': 'Cuello',
    'shoulders': 'Hombros',
    'upper arms': 'Brazos',
    'upper legs': 'Muslos',
    'waist': 'Cintura',
    'legs': 'Piernas',
    'arms': 'Brazos'
}

const EQUIPMENT_ES: Record<string, string> = {
    'assisted': 'Asistido',
    'band': 'Banda Elástica',
    'barbell': 'Barra',
    'body weight': 'Peso Corporal',
    'bosu ball': 'Bosu',
    'cable': 'Polea',
    'dumbbell': 'Mancuerna',
    'elliptical machine': 'Elíptica',
    'ez barbell': 'Barra Z',
    'hammer': 'Martillo',
    'kettlebell': 'Pesa Rusa',
    'leverage machine': 'Máquina de Palanca',
    'medicine ball': 'Balón Medicinal',
    'olympic barbell': 'Barra Olímpica',
    'resistance band': 'Banda de Resistencia',
    'roller': 'Rodillo',
    'rope': 'Cuerda',
    'skierg machine': 'Máquina de Esquí',
    'sled machine': 'Trineo',
    'smith machine': 'Máquina Smith',
    'stability ball': 'Pelota de Estabilidad',
    'stationary bike': 'Bicicleta Estática',
    'stepmill machine': 'Escaladora',
    'tire': 'Neumático',
    'trap bar': 'Barra Hexagonal',
    'upper body ergometer': 'Ergómetro',
    'weighted': 'Con Peso',
    'wheel roller': 'Rueda Abdominal'
}

function mappingTitleCase(str: string) {
    if (!str) return ''
    return str.split(/[\s-]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
}

function translateExerciseName(name: string): string {
    let translated = name.toLowerCase()

    // Initial specific replacements for weird structure from this API
    // Example: "Con Mancuernas Inclinado One Arm Hammer Press"
    // The previous logic was causing this mix because it replaced word by word but API returns complex names.

    // Better strategy: Identify key components and reconstruct or replace phrases.

    const replacements: [RegExp, string][] = [
        [/\bbarbell\b/g, 'con Barra'],
        [/\bdumbbell\b/g, 'con Mancuerna'],
        [/\bkettlebell\b/g, 'con Pesa Rusa'],
        [/\bband\b/g, 'con Banda'],
        [/\bcable\b/g, 'en Polea'],
        [/\bsmith machine\b/g, 'en Máquina Smith'],
        [/\bbodyweight\b/g, 'Peso Corporal'],
        [/\bweighted\b/g, 'con Lastre'],
        [/\bassisted\b/g, 'Asistido'],
        [/\bseated\b/g, 'Sentado'],
        [/\bstanding\b/g, 'de Pie'],
        [/\bincline\b/g, 'Inclinado'],
        [/\bdecline\b/g, 'Declinado'],
        [/\bbench press\b/g, 'Press de Banca'],
        [/\bsquat\b/g, 'Sentadilla'],
        [/\bdeadlift\b/g, 'Peso Muerto'],
        [/\bpush up\b/g, 'Flexiones'],
        [/\bpull up\b/g, 'Dominadas'],
        [/\brow\b/g, 'Remo'],
        [/\bcurl\b/g, 'Curl'],
        [/\bextension\b/g, 'Extensión'],
        [/\bpress\b/g, 'Press'],
        [/\bfly\b/g, 'Aperturas'],
        [/\braise\b/g, 'Elevación'],
        [/\blunge\b/g, 'Estocada'],
        [/\bcrunch\b/g, 'Abdominales'],
        [/\bplank\b/g, 'Plancha'],
        [/\bshrug\b/g, 'Encogimientos'],
        [/\bcalves\b/g, 'Pantorrillas'],
        [/\bglute\b/g, 'Glúteo'],
        [/\bhip thrust\b/g, 'Empuje de Cadera'],
        [/\bleg press\b/g, 'Prensa de Piernas'],
        [/\bpull down\b/g, 'Jalón'],
        [/\blat pulldown\b/g, 'Jalón al Pecho'],
        [/\btriceps dip\b/g, 'Fondos de Tríceps'],
        [/\bchin up\b/g, 'Dominadas Supinas'],
        [/\boverhead\b/g, 'sobre la cabeza'],
        [/\bfront\b/g, 'Frontal'],
        [/\brear\b/g, 'Posterior'],
        [/\bside\b/g, 'Lateral'],
        [/\bsingle arm\b/g, 'a Un Brazo'],
        [/\bone arm\b/g, 'a Un Brazo'],
        [/\bsingle leg\b/g, 'a Una Pierna'],
        [/\bone leg\b/g, 'a Una Pierna'],
        [/\balternating\b/g, 'Alternado'],
        [/\bwide grip\b/g, 'Agarre Ancho'],
        [/\bclose grip\b/g, 'Agarre Cerrado'],
        [/\breverse grip\b/g, 'Agarre Inverso'],
        [/\bneutral grip\b/g, 'Agarre Neutro'],
        [/\bhammer grip\b/g, 'Agarre Martillo'],
        [/\bjump\b/g, 'con Salto'],
        [/\bstretch\b/g, 'Estiramiento'],
        [/\bwith towel\b/g, 'con Toalla'],
        [/\bon towel\b/g, 'con Toalla'],
        [/\bsliding floor\b/g, 'Deslizante en suelo'],
        [/\bpulldown\b/g, 'Jalón'],
    ]

    replacements.forEach(([regex, replacement]) => {
        translated = translated.replace(regex, replacement)
    })

    // Clean up double spaces or weird connectors if any
    translated = translated.replace(/\s+/g, ' ').trim()

    return mappingTitleCase(translated)
}

// Test cases based on user feedback
const tests = [
    "Sliding Floor Pulldown on Towel",
    "Triceps Dip",
    "Dumbbell Incline One Arm Hammer Press",
    "Feet And Ankles Stretch",
    "Jump Squat",
    "Dumbbell Single Leg Calf Raise",
    "Peroneals Stretch",
    "Lying Double Legs Biceps Curl With Towel"
]

console.log("Translation Tests:")
tests.forEach(t => {
    console.log(`${t} -> ${translateExerciseName(t)}`)
})
