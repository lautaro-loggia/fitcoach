'use client'

import { useState } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { AccountForm } from '@/components/settings/account-form'
import { NotificationsForm } from '@/components/settings/notifications-form'
import { WhatsAppSettingsForm } from '@/components/settings/whatsapp-settings-form'
import { DashboardTopBar } from '@/components/layout/dashboard-top-bar'
import { Button } from '@/components/ui/button'
import { Logout01Icon } from 'hugeicons-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'

interface SettingsContentProps {
    user: any
    profile: any
}

export function SettingsContent({ user, profile }: SettingsContentProps) {
    const [activeTab, setActiveTab] = useState('account')
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="flex flex-col">
            <DashboardTopBar
                title="Ajustes"
                subtitle="Gestiona tu cuenta y preferencias"
                activeTab={activeTab}
                tabs={[
                    { id: 'account', label: 'Cuenta', onClick: () => setActiveTab('account') },
                    { id: 'notifications', label: 'Notificaciones', onClick: () => setActiveTab('notifications') },
                ]}
            />

            <div className="flex-1 p-4 md:p-8 pt-6">
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

                {/* Mobile Logout Option */}
                <div className="mt-8 md:hidden">
                    <Card className="border-muted bg-white/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <Button
                                variant="ghost"
                                className="w-full justify-between text-destructive hover:text-destructive hover:bg-destructive/10 h-12"
                                onClick={handleSignOut}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-destructive/10">
                                        <Logout01Icon className="h-5 w-5" />
                                    </div>
                                    <span className="font-medium">Cerrar sesión</span>
                                </div>
                            </Button>
                        </CardContent>
                    </Card>
                    <p className="text-center text-xs text-muted-foreground mt-4">
                        Orbit v1.0.0
                    </p>
                </div>
            </div>
        </div>
    )
}
