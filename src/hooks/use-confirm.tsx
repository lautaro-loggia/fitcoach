import { useState } from "react"
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

export function useConfirm() {
    const [promise, setPromise] = useState<{ resolve: (value: boolean) => void } | null>(null)
    const [config, setConfig] = useState<{ title: string; description?: string } | null>(null)

    const confirm = (title: string, description?: string) => {
        return new Promise<boolean>((resolve) => {
            setConfig({ title, description })
            setPromise({ resolve })
        })
    }

    const handleConfirm = () => {
        promise?.resolve(true)
        setPromise(null)
    }

    const handleCancel = () => {
        promise?.resolve(false)
        setPromise(null)
    }

    const ConfirmDialog = () => (
        <AlertDialog open={promise !== null} onOpenChange={(open) => {
            if (!open && promise) {
                handleCancel()
            }
        }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{config?.title}</AlertDialogTitle>
                    {config?.description && <AlertDialogDescription>{config?.description}</AlertDialogDescription>}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )

    return { confirm, ConfirmDialog }
}
