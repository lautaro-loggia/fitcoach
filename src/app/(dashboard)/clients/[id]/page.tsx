import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdvisedProfileLayout } from '@/components/clients/advised-profile-layout'
import { ScheduleNextCheckinDialog } from '@/components/clients/checkin/schedule-next-checkin-dialog'

// Tab components
import { ProfileTab } from '@/components/clients/tabs/profile-tab'
import { CheckinTab } from '@/components/clients/tabs/checkin-tab'
import { TrainingTab } from '@/components/clients/tabs/training-tab'
import { DietTab } from '@/components/clients/tabs/diet-tab'
import { SettingsTab } from '@/components/clients/tabs/settings-tab'
import { TrainingActionsWrapper } from '@/components/clients/training-actions-wrapper'
import { MealPlanActionsWrapper } from '@/components/clients/meal-plan-actions-wrapper'

const sectionHeaders: Record<string, { title: string, subtitle: string }> = {
    profile: {
        title: "Resumen del asesorado",
        subtitle: "Progreso general, métricas clave y estado actual"
    },
    checkin: {
        title: "Check-in corporal",
        subtitle: "Medidas, peso y evolución en el tiempo"
    },
    training: {
        title: "Plan de entrenamiento",
        subtitle: "Rutinas asignadas y registro de entrenamientos"
    },
    diet: {
        title: "Nutrición",
        subtitle: "Objetivos diarios y distribución semanal de comidas"
    },
    settings: {
        title: "Datos del asesorado",
        subtitle: "Información personal y configuraciones del perfil"
    }
}

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

    const currentHeader = sectionHeaders[defaultTab] || sectionHeaders.profile

    return (
        <AdvisedProfileLayout
            client={client}
            allClients={allClients || []}
            activeTab={defaultTab}
        >
            {/* Cabecera de la sección actual (Título y Acciones) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 px-1 mb-2 md:mb-8 overflow-hidden">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{currentHeader.title}</h1>
                    <p className="text-gray-500 font-medium leading-none">{currentHeader.subtitle}</p>
                </div>

                {(defaultTab === 'checkin' || defaultTab === 'training' || defaultTab === 'diet') && (
                    <div className="flex items-center gap-2 min-h-[44px]">
                        {defaultTab === 'checkin' && (
                            <ScheduleNextCheckinDialog
                                clientId={client.id}
                                currentDate={client.next_checkin_date}
                                checkinFrequency={client.checkin_frequency_days}
                            />
                        )}
                        {defaultTab === 'training' && (
                            <TrainingActionsWrapper
                                clientId={client.id}
                                clientName={client.full_name}
                            />
                        )}
                        {defaultTab === 'diet' && (
                            <MealPlanActionsWrapper
                                clientId={client.id}
                                clientName={client.full_name}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Contenido dinámico según el tab activo */}
            <div className="mt-2 md:mt-6">
                {defaultTab === 'profile' && <ProfileTab client={client} />}
                {defaultTab === 'checkin' && <CheckinTab client={client} />}
                {defaultTab === 'training' && <TrainingTab client={client} />}
                {defaultTab === 'diet' && <DietTab client={client} />}
                {defaultTab === 'settings' && <SettingsTab client={client} />}
            </div>
        </AdvisedProfileLayout>
    )
}
