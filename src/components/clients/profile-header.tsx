'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProfileHeaderProps {
    client: {
        full_name: string
        status: 'active' | 'inactive'
        email: string | null
    }
}

export function ProfileHeader({ client }: ProfileHeaderProps) {
    return (
        <div className="flex items-center gap-4 border-b pb-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/clients">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{client.full_name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{client.email || 'Sin email'}</span>
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                        {client.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                </div>
            </div>
        </div>
    )
}
