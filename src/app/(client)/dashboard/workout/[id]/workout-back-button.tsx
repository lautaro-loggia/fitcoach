'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function WorkoutBackButton() {
    const [showWarning, setShowWarning] = useState(false)
    const router = useRouter()

    const handleBackClick = () => {
        setShowWarning(true)
    }

    const handleConfirmExit = () => {
        setShowWarning(false)
        router.push('/dashboard/workout')
    }

    return (
        <>
            <Button variant="ghost" size="icon" onClick={handleBackClick}>
                <ArrowLeft className="h-5 w-5" />
            </Button>

            <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro que desea salir?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Si sales ahora, perderás el progreso no guardado de esta sesión de entrenamiento.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Continuar entrenando</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmExit} className="bg-destructive hover:bg-destructive/90 text-white">
                            Salir y descartar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
