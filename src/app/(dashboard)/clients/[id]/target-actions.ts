'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateClientTargetAction(clientId: string, metricKey: string, value: number) {
    const supabase = await createClient()

    try {
        // Special legacy columns
        if (metricKey === 'weight') {
            const { error } = await supabase
                .from('clients')
                .update({ target_weight: value })
                .eq('id', clientId)

            if (error) throw error
        }
        else if (metricKey === 'body_fat') {
            const { error } = await supabase
                .from('clients')
                .update({ target_fat: value })
                .eq('id', clientId)

            if (error) throw error
        }
        else {
            // Retrieve current targets first to merge (or use jsonb_set in SQL if possible, but JS merge is safer for now)
            const { data: client, error: fetchError } = await supabase
                .from('clients')
                .select('targets')
                .eq('id', clientId)
                .single()

            if (fetchError) throw fetchError

            const currentTargets = client.targets || {}
            const newTargets = { ...currentTargets, [metricKey]: value }

            const { error: updateError } = await supabase
                .from('clients')
                .update({ targets: newTargets })
                .eq('id', clientId)

            if (updateError) throw updateError
        }

        revalidatePath(`/clients/${clientId}`)
        return { success: true }
    } catch (error) {
        console.error("Error updating client target:", error)
        return { success: false, error: "Error updating target" }
    }
}
