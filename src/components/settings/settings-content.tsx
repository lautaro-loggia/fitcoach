'use client'

import { useState } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { AccountForm } from '@/components/settings/account-form'
import { NotificationsForm } from '@/components/settings/notifications-form'
import { WhatsAppSettingsForm } from '@/components/settings/whatsapp-settings-form'
import { DashboardTopBar } from '@/components/layout/dashboard-top-bar'

interface SettingsContentProps {
    user: any
    profile: any
}

export function SettingsContent({ user, profile }: SettingsContentProps) {
    const [activeTab, setActiveTab] = useState('account')

    return (
        <div className="flex flex-col min-h-screen">
            <DashboardTopBar
                title="Ajustes"
                subtitle="Gestiona tu cuenta y preferencias"
                activeTab={activeTab}
                tabs={[
                    { id: 'account', label: 'Cuenta', onClick: () => setActiveTab('account') },
                    { id: 'notifications', label: 'Notificaciones', onClick: () => setActiveTab('notifications') },
                ]}
            />

            <main className="flex-1 p-4 md:p-8 pt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            </main>
        </div>
    )
}
