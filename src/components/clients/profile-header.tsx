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
import { ClientAvatar } from './client-avatar'

interface ProfileHeaderProps {
    client: {
        id: string
        full_name: string
        status: 'pending' | 'active' | 'inactive' | 'paused' | 'archived'
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

function getStatusMeta(status: ProfileHeaderProps['client']['status']) {
    if (status === 'pending') {
        return {
            label: 'PENDIENTE',
            badgeVariant: 'outline' as const,
            className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50'
        }
    }

    if (status === 'active') {
        return {
            label: 'ACTIVO',
            badgeVariant: 'secondary' as const,
            className: 'bg-green-100 text-green-700 hover:bg-green-100'
        }
    }

    if (status === 'paused') {
        return {
            label: 'PAUSADO',
            badgeVariant: 'outline' as const,
            className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50'
        }
    }

    if (status === 'archived') {
        return {
            label: 'ARCHIVADO',
            badgeVariant: 'outline' as const,
            className: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100'
        }
    }

    return {
        label: 'INACTIVO',
        badgeVariant: 'outline' as const,
        className: ''
    }
}

export function ProfileHeader({ client, allClients = [], isCompact = false, className }: ProfileHeaderProps) {
    const router = useRouter()
    const statusMeta = getStatusMeta(client.status)

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
            <ClientAvatar
                name={client.full_name}
                avatarUrl={client.avatar_url}
                size={isCompact ? "sm" : "md"}
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
                    <Badge variant={statusMeta.badgeVariant} className={cn(
                        "text-[10px] px-1.5 h-5",
                        statusMeta.className
                    )}>
                        {statusMeta.label}
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
