import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateSession } from '../actions'

interface StartPageProps {
    searchParams: Promise<{ workoutId?: string; clientId?: string }>
}

export default async function StartSessionPage({ searchParams }: StartPageProps) {
    const params = await searchParams
    const { workoutId, clientId } = params

    if (!workoutId || !clientId) {
        redirect('/')
    }

    // Get or create session
    const { session, error } = await getOrCreateSession(clientId, workoutId)

    if (error || !session) {
        redirect('/')
    }

    // Redirect to session page
    redirect(`/session/${session.id}`)
}
