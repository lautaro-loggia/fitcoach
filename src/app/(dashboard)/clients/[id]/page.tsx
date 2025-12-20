
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

export default async function ClientNotesPage({ params }: { params: { id: string } }) {
    // Await params as required in newer Next.js versions (though in 13/14 it might be synchronous, awaiting is safer for 15+)
    const { id } = await params

    const supabase = await createClient()

    const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !client) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <ProfileHeader client={client} />

            <Tabs defaultValue="profile" className="w-full space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">Perfil</TabsTrigger>
                    <TabsTrigger value="checkin">Check-in</TabsTrigger>
                    <TabsTrigger value="training">Entrenamiento</TabsTrigger>
                    <TabsTrigger value="diet">Plan de comidas</TabsTrigger>
                    <TabsTrigger value="settings">Ajustes</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                    <ProfileTab client={client} />
                </TabsContent>
                <TabsContent value="checkin">
                    <CheckinTab client={client} />
                </TabsContent>
                <TabsContent value="training">
                    <TrainingTab client={client} />
                </TabsContent>
                <TabsContent value="diet">
                    <DietTab client={client} />
                </TabsContent>
                <TabsContent value="settings">
                    <SettingsTab client={client} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
