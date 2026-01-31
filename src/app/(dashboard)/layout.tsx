import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { Toaster } from '@/components/ui/sonner'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <div className="flex h-screen overflow-hidden bg-background">
                <Sidebar />
                <MobileHeader />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
            <Toaster />
        </SidebarProvider>
    )
}

