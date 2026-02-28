
const WEBP_MIME = 'image/webp'
const MIN_QUALITY = 0.45
const QUALITY_STEP = 0.08
const MAX_ATTEMPTS = 6
const MIN_LONGEST_SIDE = 640

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            resolve(img)
        }

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl)
            reject(err)
        }

        img.src = objectUrl
    })
}

function getResizedDimensions(width: number, height: number, maxDimension: number) {
    const largestSide = Math.max(width, height)
    if (largestSide <= maxDimension) {
        return { width, height }
    }

    const scale = maxDimension / largestSide
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Compression failed'))
                return
            }
            resolve(blob)
        }, mimeType, quality)
    })
}

/**
 * Compresses an image file client-side using HTML5 Canvas.
 *
 * @param file Original file
 * @param quality Initial quality (0..1)
 * @param maxWidth Max width/height for the longest side
 * @param targetSizeBytes Optional target size in bytes. If provided, quality/dimensions are iteratively reduced.
 */
export async function compressImage(
    file: File,
    quality = 0.8,
    maxWidth = 1600,
    targetSizeBytes = 0
): Promise<File> {
    if (!file.type.startsWith('image/')) {
        return file
    }

    const img = await loadImage(file)
    let { width, height } = getResizedDimensions(img.width, img.height, maxWidth)

    let bestBlob: Blob | null = null
    let bestSize = Number.POSITIVE_INFINITY
    const initialQuality = Math.min(0.92, Math.max(quality, MIN_QUALITY))

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
            throw new Error('Could not get canvas context')
        }

        ctx.drawImage(img, 0, 0, width, height)

        let currentQuality = Math.max(MIN_QUALITY, initialQuality - attempt * 0.04)
        while (currentQuality >= MIN_QUALITY) {
            const blob = await canvasToBlob(canvas, WEBP_MIME, currentQuality)

            if (blob.size < bestSize) {
                bestBlob = blob
                bestSize = blob.size
            }

            if (!targetSizeBytes || blob.size <= targetSizeBytes) {
                bestBlob = blob
                bestSize = blob.size
                break
            }

            currentQuality = Number((currentQuality - QUALITY_STEP).toFixed(2))
        }

        if (!targetSizeBytes || (bestBlob && bestBlob.size <= targetSizeBytes)) {
            break
        }

        const longestSide = Math.max(width, height)
        if (longestSide <= MIN_LONGEST_SIDE) {
            break
        }

        width = Math.max(1, Math.round(width * 0.85))
        height = Math.max(1, Math.round(height * 0.85))
    }

    if (!bestBlob) {
        throw new Error('Compression failed')
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '')
    return new File([bestBlob], `${baseName}.webp`, {
        type: WEBP_MIME,
        lastModified: Date.now(),
    })
}
