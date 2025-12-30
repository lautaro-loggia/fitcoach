import Image from 'next/image'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
    return (
        <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
            {/* Columna Izquierda (Formulario) */}
            <div className="flex flex-col items-center justify-center p-8 bg-background">
                <div className="w-full max-w-sm mb-10">
                    <div className="flex items-center justify-center mb-8">
                        <Image src="/orbit_logo_black.png" alt="Orbit" width={180} height={60} className="h-12 w-auto object-contain" priority />
                    </div>
                    <LoginForm />
                </div>
            </div>

            {/* Columna Derecha (Branding) */}
            <div className="hidden md:flex flex-col justify-center items-start p-12 bg-gray-900 text-white relative overflow-hidden">
                {/* Background gradient from instructions: "Bloque visual con fondo degradado" */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#000000] z-0" />
                {/* Maybe using the brand colors in a subtle gradient? 
            Instructions say "fondo degradado". The secondary orange is nice but maybe too light for white text?
            Let's keep it dark/professional or use the primary orange?
            "Columna derecha (branding)... Título: Organizá tus asesorados..."
            Usually these are dark or vibrant. Let's try a vibrant Primary to Dark.
        */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-black opacity-90 z-0" />

                <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl font-extrabold mb-6 tracking-tight text-white leading-tight">
                        Organizá tus asesorados sin complicaciones.
                    </h2>
                    <p className="text-lg text-white/80 leading-relaxed">
                        Ingresá para hacerle seguimiento a tus asesorados día a día desde una plataforma simple y ordenada.
                    </p>
                </div>
            </div>
        </div>
    )
}
