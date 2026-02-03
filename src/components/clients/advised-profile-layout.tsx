'use client'

import { AdvisedTopBar } from './advised-top-bar'

interface AdvisedProfileLayoutProps {
    client: {
        id: string
        full_name: string
        status: 'active' | 'inactive'
        avatar_url?: string | null
    }
    allClients?: {
        id: string
        full_name: string
    }[]
    activeTab: string
    children: React.ReactNode
}

/**
 * AdvisedProfileLayout
 * Layout base para el perfil del asesorado con header sticky y navegación superior.
 */
export function AdvisedProfileLayout({ client, allClients, activeTab, children }: AdvisedProfileLayoutProps) {
    return (
        <div className="flex flex-col bg-background">
            <AdvisedTopBar client={client} allClients={allClients} activeTab={activeTab} />
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {children}
                </div>
            </div>
        </div>
    )
}
