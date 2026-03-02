type LinkedClient = {
    id: string
    onboarding_status: string | null
}

type LinkResult = {
    error: unknown | null
}

type LookupResult = {
    data: LinkedClient[] | null
    count: number | null
    error: unknown | null
}

type GuardDeps = {
    linkClientByEmail: () => Promise<LinkResult>
    lookupLinkedClients: () => Promise<LookupResult>
    signOut: () => Promise<void>
    logError?: (context: string, error: unknown) => void
}

export const CLIENT_OAUTH_GUARD_MESSAGES = {
    lookupError: 'No pudimos validar tu cuenta de asesorado. Intentá de nuevo.',
    missingClient: 'No encontramos una cuenta de asesorado para este correo. Pedile a tu coach que te invite por email.',
    duplicatedClient: 'Detectamos más de una cuenta asociada. Contactá a soporte para continuar.',
} as const

type GuardAllowedResult = {
    allowed: true
    onboardingStatus: string | null
}

type GuardBlockedResult = {
    allowed: false
    message: string
}

export type ClientOAuthGuardResult = GuardAllowedResult | GuardBlockedResult

export async function validateClientOAuthAccess(deps: GuardDeps): Promise<ClientOAuthGuardResult> {
    const { linkClientByEmail, lookupLinkedClients, signOut, logError } = deps

    const linkResult = await linkClientByEmail()
    if (linkResult.error) {
        logError?.('Account Linking Error', linkResult.error)
    }

    const lookupResult = await lookupLinkedClients()

    if (lookupResult.error) {
        logError?.('Client Lookup Error', lookupResult.error)
        await signOut()
        return { allowed: false, message: CLIENT_OAUTH_GUARD_MESSAGES.lookupError }
    }

    const linkedCount = lookupResult.count ?? lookupResult.data?.length ?? 0

    if (linkedCount === 0) {
        await signOut()
        return { allowed: false, message: CLIENT_OAUTH_GUARD_MESSAGES.missingClient }
    }

    if (linkedCount > 1) {
        await signOut()
        return { allowed: false, message: CLIENT_OAUTH_GUARD_MESSAGES.duplicatedClient }
    }

    return {
        allowed: true,
        onboardingStatus: lookupResult.data?.[0]?.onboarding_status ?? null,
    }
}
