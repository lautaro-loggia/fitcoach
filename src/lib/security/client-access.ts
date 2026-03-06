import { type User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type ActionErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION'

export type ActionErrorResponse = {
    success?: false
    error: string
    code: ActionErrorCode
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

type ClientOwnershipRow = {
    id: string
    trainer_id: string
    user_id: string | null
    deleted_at?: string | null
}

type AuthenticatedActionContext = {
    supabase: ServerSupabaseClient
    user: User
}

type CoachClientAccessResult =
    | ({ ok: true } & AuthenticatedActionContext & { client: ClientOwnershipRow })
    | { ok: false; response: ActionErrorResponse }

type ClientSelfAccessResult =
    | ({ ok: true } & AuthenticatedActionContext & { client: ClientOwnershipRow })
    | { ok: false; response: ActionErrorResponse }

export function actionError(error: string, code: ActionErrorCode): ActionErrorResponse {
    return { success: false, error, code }
}

export async function requireAuthenticatedActionContext(): Promise<AuthenticatedActionContext | ActionErrorResponse> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return actionError('No autorizado', 'UNAUTHORIZED')
    }

    return { supabase, user }
}

export async function assertCoachOwnsClient(
    clientId: string,
    options?: { allowDeleted?: boolean }
): Promise<CoachClientAccessResult> {
    const auth = await requireAuthenticatedActionContext()
    if ('error' in auth) {
        return { ok: false, response: auth }
    }

    let query = auth.supabase
        .from('clients')
        .select('id, trainer_id, user_id, deleted_at')
        .eq('id', clientId)
        .eq('trainer_id', auth.user.id)

    if (!options?.allowDeleted) {
        query = query.is('deleted_at', null)
    }

    const { data: client } = await query.maybeSingle()

    if (!client) {
        return {
            ok: false,
            response: actionError('No autorizado para este cliente', 'FORBIDDEN'),
        }
    }

    return {
        ok: true,
        ...auth,
        client: client as ClientOwnershipRow,
    }
}

export async function assertClientSelfOwnsClient(clientId: string): Promise<ClientSelfAccessResult> {
    const auth = await requireAuthenticatedActionContext()
    if ('error' in auth) {
        return { ok: false, response: auth }
    }

    const { data: client } = await auth.supabase
        .from('clients')
        .select('id, trainer_id, user_id, deleted_at')
        .eq('id', clientId)
        .eq('user_id', auth.user.id)
        .is('deleted_at', null)
        .maybeSingle()

    if (!client) {
        return {
            ok: false,
            response: actionError('No autorizado para este cliente', 'FORBIDDEN'),
        }
    }

    return {
        ok: true,
        ...auth,
        client: client as ClientOwnershipRow,
    }
}
