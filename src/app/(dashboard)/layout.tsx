import { Sidebar } from '@/components/layout/sidebar'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { BottomNav } from '@/components/layout/bottom-nav'
import { createClient } from '@/lib/supabase/server'
import { PushNotificationPromptGuard } from '@/components/notifications/push-notification-prompt-guard'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (user?.user_metadata?.role === 'client') {
        redirect('/dashboard')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

    const fallbackName =
        (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
        user.email?.split('@')[0] ||
        'Coach'

    const coachProfile = {
        fullName: profile?.full_name?.trim() || fallbackName,
        avatarUrl: profile?.avatar_url || null
    }

    return (
        <SidebarProvider>
            <PushNotificationPromptGuard />
            <div className="fixed inset-0 flex overflow-hidden bg-background">
                <Sidebar coachProfile={coachProfile} />
                <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
                    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background scroll-smooth pb-16 md:pb-0">
                        {children}
                    </main>
                    <BottomNav />
                </div>
            </div>
        </SidebarProvider>
    )
}
