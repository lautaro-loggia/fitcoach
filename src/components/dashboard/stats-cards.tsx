
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface StatsCardProps {
    title: string
    value: string | number
    description?: string
    icon: React.ElementType
    alert?: boolean
    href?: string
}

export function StatsCard({ title, value, description, icon: Icon, alert, href }: StatsCardProps) {
    const cardContent = (
        <Card className={`${alert ? "border-destructive/50" : ""} ${href ? "cursor-pointer transition-shadow hover:border-gray-300" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${alert ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${alert ? "text-destructive" : ""}`}>{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    )

    if (href) {
        return <Link href={href}>{cardContent}</Link>
    }

    return cardContent
}
