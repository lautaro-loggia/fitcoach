import { headers } from 'next/headers'

function trimTrailingSlashes(value: string): string {
    return value.replace(/\/+$/, '')
}

function toAbsoluteUrl(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimTrailingSlashes(trimmed)
    }

    return trimTrailingSlashes(`https://${trimmed}`)
}

export async function resolveBaseUrl() {
    const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim()
    if (envBaseUrl) return toAbsoluteUrl(envBaseUrl)

    const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    if (vercelProductionUrl) return toAbsoluteUrl(vercelProductionUrl)

    const vercelDeploymentUrl = process.env.VERCEL_URL?.trim()
    if (vercelDeploymentUrl) return toAbsoluteUrl(vercelDeploymentUrl)

    const headersList = await headers()
    const origin = headersList.get('origin')?.trim()
    if (origin) return toAbsoluteUrl(origin)

    const host = headersList.get('x-forwarded-host') || headersList.get('host')
    if (host) {
        const protoFromProxy = headersList.get('x-forwarded-proto')
        const proto = protoFromProxy || (host.includes('localhost') ? 'http' : 'https')
        return toAbsoluteUrl(`${proto}://${host}`)
    }

    return 'http://localhost:3000'
}

export async function buildAuthCallbackUrl(nextPath?: string) {
    const baseUrl = await resolveBaseUrl()
    const callbackUrl = new URL('/auth/callback', baseUrl)

    if (nextPath) {
        callbackUrl.searchParams.set('next', nextPath)
    }

    return callbackUrl.toString()
}
