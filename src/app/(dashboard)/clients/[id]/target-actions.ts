'use server'

import { revalidatePath } from "next/cache"
import { actionError, assertCoachOwnsClient } from '@/lib/security/client-access'

export async function updateClientTargetAction(clientId: string, metricKey: string, value: number) {
    const access = await assertCoachOwnsClient(clientId)
    if (!access.ok) {
        return access.response
    }

    const supabase = access.supabase

    try {
        // Special legacy columns
        if (metricKey === 'weight') {
            const { error } = await supabase
                .from('clients')
                .update({ target_weight: value })
                .eq('id', clientId)
                .eq('trainer_id', access.user.id)
                .is('deleted_at', null)

            if (error) throw error
        }
        else if (metricKey === 'body_fat') {
            const { error } = await supabase
                .from('clients')
                .update({ target_fat: value })
                .eq('id', clientId)
                .eq('trainer_id', access.user.id)
                .is('deleted_at', null)

            if (error) throw error
        }
        else {
            // Retrieve current targets first to merge (or use jsonb_set in SQL if possible, but JS merge is safer for now)
            const { data: client, error: fetchError } = await supabase
                .from('clients')
                .select('targets')
                .eq('id', clientId)
                .eq('trainer_id', access.user.id)
                .is('deleted_at', null)
                .single()

            if (fetchError) throw fetchError

            const currentTargets = client.targets || {}
            const newTargets = { ...currentTargets, [metricKey]: value }

            const { error: updateError } = await supabase
                .from('clients')
                .update({ targets: newTargets })
                .eq('id', clientId)
                .eq('trainer_id', access.user.id)
                .is('deleted_at', null)

            if (updateError) throw updateError
        }

        revalidatePath(`/clients/${clientId}`)
        return { success: true }
    } catch (error) {
        console.error("Error updating client target:", error)
        return actionError('Error updating target', 'VALIDATION')
    }
}
