'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PagosLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()

    // Determine current tab based on pathname
    const currentTab = pathname === '/pagos/planes' ? 'planes' : 'pagos'

    const handleTabChange = (value: string) => {
        if (value === 'pagos') {
            router.push('/pagos')
        } else if (value === 'planes') {
            router.push('/pagos/planes')
        }
    }

    return (
        <div className="space-y-6">
            {children}
        </div>
    )
}
