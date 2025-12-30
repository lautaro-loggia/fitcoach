import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default function SessionLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            {/* Mobile view */}
            <div className="md:hidden min-h-screen bg-background">
                {children}
            </div>

            {/* Desktop message */}
            <div className="hidden md:flex items-center justify-center min-h-screen bg-muted/30">
                <div className="text-center space-y-4 p-8">
                    <div className="text-6xl">📱</div>
                    <h1 className="text-2xl font-bold">Funcionalidad Mobile</h1>
                    <p className="text-muted-foreground max-w-md">
                        El check-in de ejercicios solo está disponible en dispositivos móviles.
                        Abrí esta página desde tu celular para continuar.
                    </p>
                </div>
            </div>
        </>
    )
}
