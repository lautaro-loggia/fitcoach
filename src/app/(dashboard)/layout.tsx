import { Sidebar } from '@/components/layout/sidebar'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { BottomNav } from '@/components/layout/bottom-nav'
import { createClient } from '@/lib/supabase/server'
import { PushNotificationPrompt } from '@/components/notifications/push-notification-prompt'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Si es un cliente, no renderizamos la interfaz del coach para evitar el flash.
    // El middleware o la página se encargarán de la redirección.
    if (user?.user_metadata?.role === 'client') {
        return <div className="fixed inset-0 bg-background" />
    }

    return (
        <SidebarProvider>
            <PushNotificationPrompt />
            <div className="fixed inset-0 flex overflow-hidden bg-background">
                <Sidebar />
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
