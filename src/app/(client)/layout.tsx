import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileNav } from '@/components/mobile-nav'
import { ClientMainShell } from '@/components/client-main-shell'

export default async function ClientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    return (
        <div className="min-h-screen bg-neutral-50 text-slate-900 font-sans">
            <ClientMainShell>
                {/* Mobile First Container */}
                {children}
                <MobileNav />
            </ClientMainShell>
        </div>
    )
}
