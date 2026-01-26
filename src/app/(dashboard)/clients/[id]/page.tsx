import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardTabs } from '@/components/clients/dashboard-tabs'
import { TabsContent } from '@/components/ui/tabs'
import { ScheduleNextCheckinDialog } from '@/components/clients/checkin/schedule-next-checkin-dialog'

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
        <DashboardTabs
            client={client}
            allClients={allClients || []}
            defaultTab={defaultTab}
            actions={{
                checkin: (
                    <ScheduleNextCheckinDialog
                        clientId={client.id}
                        currentDate={client.next_checkin_date}
                        checkinFrequency={client.checkin_frequency_days}
                    />
                )
            }}
        >
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
        </DashboardTabs>
    )
}
