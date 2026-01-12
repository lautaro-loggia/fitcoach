import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountForm } from '@/components/settings/account-form'
import { NotificationsForm } from '@/components/settings/notifications-form'
import { WhatsAppSettingsForm } from '@/components/settings/whatsapp-settings-form'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('notifications_enabled, whatsapp_message_template')
        .eq('id', user.id)
        .single()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Ajustes</h1>
                <p className="text-muted-foreground">
                    Gestiona tu cuenta y preferencias.
                </p>
            </div>

            <Tabs defaultValue="account" className="w-full">
                <TabsList>
                    <TabsTrigger value="account">Cuenta</TabsTrigger>
                    <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-4">
                    <AccountForm userId={user.id} />
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                    <NotificationsForm userId={user.id} initialEnabled={profile?.notifications_enabled ?? false} />
                    <WhatsAppSettingsForm
                        userId={user.id}
                        initialTemplate={profile?.whatsapp_message_template || 'Hola {nombre}, recuerda que tenemos entrenamiento {hora}'}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
