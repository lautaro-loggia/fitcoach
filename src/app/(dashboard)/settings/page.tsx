import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsContent } from '@/components/settings/settings-content'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const [profileResult, preferencesResult] = await Promise.all([
        supabase
            .from('profiles')
            .select('notifications_enabled, whatsapp_message_template')
            .eq('id', user.id)
            .single(),
        supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single()
    ])

    const profile = profileResult.data
    const preferences = preferencesResult.data || {} // Default empty if not created yet

    return <SettingsContent user={user} profile={profile} preferences={preferences} />
}
