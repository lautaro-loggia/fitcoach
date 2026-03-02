import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileNav } from '@/components/mobile-nav'
import { ClientMainShell } from '@/components/client-main-shell'
import { PushNotificationPromptGuard } from '@/components/notifications/push-notification-prompt-guard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

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
        redirect('/login')
    }

    if (user.user_metadata?.role !== 'client') {
        return (
            <div className="min-h-screen bg-background text-slate-900 font-sans flex items-center justify-center p-6">
                <Card className="w-full max-w-md border-amber-200 bg-amber-50/50">
                    <CardHeader>
                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <CardTitle>Este módulo es solo para asesorados</CardTitle>
                        <CardDescription>
                            Ingresaste con una cuenta de coach. Para continuar, cambiá al modo coach.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/">Cambiar a modo coach</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-slate-900 font-sans flex flex-col">
            <PushNotificationPromptGuard />
            <ClientMainShell>
                {children}
            </ClientMainShell>
            <MobileNav />
        </div>
    )
}
