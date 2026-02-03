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
            <div className="fixed inset-0 flex overflow-hidden bg-background">
                <Sidebar />
                <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
                    <MobileHeader />
                    <main className="flex-1 overflow-y-auto bg-background scroll-smooth">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}

