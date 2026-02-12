import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { ArrowLeft, User, Target, History, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ClientLogoutButton } from '@/components/clients/client-logout-button'
import { ClientAvatarUpload } from '@/components/clients/client-avatar-upload'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const adminClient = createAdminClient()
    const { data: client } = await adminClient
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (!client) return <div>Client not found</div>

    return (
        <div className="p-4 space-y-6 pb-24">
            <div className="flex items-center gap-2">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Mi Perfil</h1>
            </div>

            {/* Main Info */}
            <div className="flex flex-col items-center">
                <ClientAvatarUpload
                    clientId={client.id}
                    userId={client.user_id}
                    clientName={client.full_name}
                    currentAvatarUrl={client.avatar_url}
                />
                <h2 className="text-xl font-bold text-gray-900">{client.full_name}</h2>
                <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                    <Mail className="h-3 w-3" />
                    <span className="text-sm">{client.email}</span>
                </div>
            </div>

            {/* Stats / Goal */}
            <Card className="p-4">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-50 p-2 rounded-full">
                        <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 text-sm">Objetivo Actual</h3>
                        <p className="text-gray-600 mt-1 text-sm">
                            {
                                {
                                    fat_loss: 'Pérdida de grasa',
                                    muscle_gain: 'Ganancia muscular',
                                    recomp: 'Recomposición corporal',
                                    performance: 'Rendimiento',
                                    health: 'Salud general'
                                }[client.main_goal as string] || client.main_goal || "Sin definir"
                            }
                        </p>
                    </div>
                </div>
            </Card >

            {/* Plan History (Placeholder for now, usually needs a table of history) */}
            < Card className="p-4" >
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-purple-50 p-2 rounded-full">
                        <History className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">Historial de Planes</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-50">
                        <span className="text-gray-600">Plan Actual</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">Activo</span>
                    </div>
                    {/* Placeholder for past plans */}
                    <p className="text-xs text-center text-gray-400 italic py-2">
                        No hay planes anteriores archivados.
                    </p>
                </div>
            </Card >

            <div className="pt-4">
                <ClientLogoutButton variant="button" />
            </div>
        </div >
    )
}
