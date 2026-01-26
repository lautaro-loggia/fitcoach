import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileNav } from '@/components/mobile-nav'

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
        redirect('/auth/login') // Assuming a general login page exists or we rely on invites
        // Actually if they are invited they click the link. If link content is invalid they go here.
        // We might need a public 'request access' or 'check email' page.
    }

    return (
        <div className="min-h-screen bg-neutral-50 text-slate-900 font-sans">
            <main className="w-full max-w-md mx-auto min-h-screen bg-white shadow-sm pb-20">
                {/* Mobile First Container */}
                {children}
                <MobileNav />
            </main>
        </div>
    )
}
