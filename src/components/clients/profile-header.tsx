'use client'

import Link from 'next/link'
import { ArrowLeft02Icon } from 'hugeicons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from 'next/navigation'
import { ClientAvatarUpload } from './client-avatar-upload'

interface ProfileHeaderProps {
    client: {
        id: string
        full_name: string
        status: 'active' | 'inactive'
        email: string | null
        avatar_url?: string | null
    },
    allClients?: {
        id: string
        full_name: string
        status: string
    }[],
    isCompact?: boolean,
    className?: string
}

export function ProfileHeader({ client, allClients = [], isCompact = false, className }: ProfileHeaderProps) {
    const router = useRouter()

    return (
        <div className={cn("flex items-center gap-3 md:gap-4", className)}>
            {!isCompact && (
                <Button variant="ghost" size="icon" className="-ml-2" asChild>
                    <Link href="/clients">
                        <ArrowLeft02Icon className="h-5 w-5" />
                    </Link>
                </Button>
            )}

            {/* Avatar del cliente */}
            <ClientAvatarUpload
                clientId={client.id}
                clientName={client.full_name}
                currentAvatarUrl={client.avatar_url}
                size={isCompact ? "sm" : "md"}
                showButton={false}
            />

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    {allClients.length > 0 ? (
                        <Select
                            defaultValue={client.id}
                            onValueChange={(value) => router.push(`/clients/${value}`)}
                        >
                            <SelectTrigger className={cn(
                                "w-auto h-auto p-0 border-0 font-bold tracking-tight bg-transparent shadow-none hover:bg-transparent focus:ring-0 gap-2 px-1",
                                isCompact ? "text-lg md:text-xl" : "text-xl md:text-2xl"
                            )}>
                                <SelectValue placeholder={client.full_name} />
                            </SelectTrigger>
                            <SelectContent>
                                {allClients.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <h2 className={cn(
                            "font-bold tracking-tight truncate",
                            isCompact ? "text-lg md:text-xl" : "text-xl md:text-2xl"
                        )}>{client.full_name}</h2>
                    )}
                    <Badge variant={client.status === 'active' ? 'secondary' : 'outline'} className={cn(
                        "text-[10px] px-1.5 h-5",
                        client.status === 'active' ? "bg-green-100 text-green-700 hover:bg-green-100" : ""
                    )}>
                        {client.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                    </Badge>
                </div>
                {!isCompact && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Perfil completo del asesorado
                    </p>
                )}
            </div>
        </div>
    )
}
