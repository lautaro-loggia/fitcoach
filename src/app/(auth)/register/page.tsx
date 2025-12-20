
import { RegisterForm } from '@/components/auth/register-form'

export default function RegisterPage() {
    return (
        <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
            {/* Columna Izquierda (Formulario) */}
            <div className="flex flex-col items-center justify-center p-8 bg-background">
                <div className="w-full max-w-sm mb-10">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">F</div>
                        <span className="font-bold text-xl tracking-tight text-foreground">FITCOACH</span>
                    </div>
                    <RegisterForm />
                </div>
            </div>

            {/* Branding column reused for consistency? 
          The requirement for Register 0.2 doesn't specify layout "dividido", 
          but usually it mirrors Login.
          "Pantalla de registro conectada a Supabase."
          I'll assume it looks similar to login for consistency.
      */}
            <div className="hidden md:flex flex-col justify-center items-start p-12 bg-gray-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-black opacity-90 z-0" />

                <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl font-extrabold mb-6 tracking-tight text-white leading-tight">
                        Comenzá a potenciar tu trabajo hoy.
                    </h2>
                    <p className="text-lg text-white/80 leading-relaxed">
                        Unite a Fitcoach y llevá la gestión de tus clientes al siguiente nivel.
                    </p>
                </div>
            </div>
        </div>
    )
}
