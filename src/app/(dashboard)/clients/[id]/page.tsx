
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileHeader } from '@/components/clients/profile-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Tab components
import { ProfileTab } from '@/components/clients/tabs/profile-tab'
import { CheckinTab } from '@/components/clients/tabs/checkin-tab'
import { TrainingTab } from '@/components/clients/tabs/training-tab'
import { DietTab } from '@/components/clients/tabs/diet-tab'
import { SettingsTab } from '@/components/clients/tabs/settings-tab'

export default async function ClientNotesPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ tab?: string }>
}) {
    const { id } = await params
    const { tab } = await searchParams
    const defaultTab = tab || "profile"

    const supabase = await createClient()

    const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

    const { data: allClients } = await supabase
        .from('clients')
        .select('id, full_name, status')
        .eq('status', 'active')
        .order('full_name', { ascending: true })

    if (error || !client) {
        notFound()
    }

    return (
        <Tabs defaultValue={defaultTab} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <ProfileHeader client={client} allClients={allClients || []} />

                <TabsList className="h-9">
                    <TabsTrigger value="profile">Perfil</TabsTrigger>
                    <TabsTrigger value="checkin">Check-In</TabsTrigger>
                    <TabsTrigger value="training">Entrenamiento</TabsTrigger>
                    <TabsTrigger value="diet">Comidas</TabsTrigger>
                    <TabsTrigger value="settings">Ajustes</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="profile" className="space-y-4 outline-none text-foreground">
                <ProfileTab client={client} />
            </TabsContent>
            <TabsContent value="checkin" className="outline-none text-foreground">
                <CheckinTab client={client} />
            </TabsContent>
            <TabsContent value="training" className="outline-none text-foreground">
                <TrainingTab client={client} />
            </TabsContent>
            <TabsContent value="diet" className="outline-none text-foreground">
                <DietTab client={client} />
            </TabsContent>
            <TabsContent value="settings" className="outline-none text-foreground">
                <SettingsTab client={client} />
            </TabsContent>
        </Tabs>
    )
}
