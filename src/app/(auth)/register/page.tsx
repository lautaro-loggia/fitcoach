import Image from 'next/image'
import { RegisterForm } from '@/components/auth/register-form'

export default function RegisterPage() {
    return (
        <main className="min-h-screen flex bg-white">
            {/* Columna Izquierda (Formulario) */}
            <div className="flex-1 flex flex-col p-8 md:p-12 lg:p-16">
                <div className="flex-1 flex flex-col justify-center mx-auto max-w-[400px] w-full">
                    <div className="md:hidden flex justify-center mb-8">
                        <Image
                            src="/orbit_logo_black.png"
                            alt="Orbit"
                            width={120}
                            height={40}
                            className="h-10 w-auto object-contain"
                            priority
                        />
                    </div>
                    <div className="w-full">
                        <RegisterForm />
                    </div>
                </div>
            </div>

            {/* Columna Derecha (Panel visual) */}
            <div className="hidden md:flex flex-1 p-3 h-screen max-h-screen sticky top-0">
                <div className="relative w-full h-full rounded-[30px] bg-black overflow-hidden flex flex-col justify-between p-12 lg:p-16">
                    {/* Gradient Blur Effect */}
                    <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-zinc-700/60 rounded-full blur-[120px] pointer-events-none" />

                    {/* Logo Panel superior derecha */}
                    <div className="flex justify-end relative z-10">
                        <Image
                            src="/orbit_logo_white.svg"
                            alt="Orbit"
                            width={140}
                            height={45}
                            className="h-10 w-auto object-contain opacity-100"
                            priority
                        />
                    </div>

                    {/* Texto Inferior izquierda */}
                    <div className="max-w-lg pb-8 relative z-10">
                        <h2 className="text-[40px] font-semibold leading-[1.15] text-white mb-5 tracking-tight">
                            Comenzá a potenciar tu trabajo hoy.
                        </h2>
                        <p className="text-lg text-[#888888] leading-[25px] max-w-sm font-normal">
                            Unite a Orbit y llevá la gestión de tus clientes al siguiente nivel.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    )
}
