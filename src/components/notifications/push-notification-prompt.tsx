'use client'

import { useEffect, useState } from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Button } from '@/components/ui/button'
import { Bell, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export function PushNotificationPrompt() {
    const { isSupported, permission, subscription, subscribe, isLoading } = usePushNotifications()
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Show prompt if: supported, permission is 'default' (not prompted yet), and not loading
        if (!isLoading && isSupported && permission === 'default') {
            const timer = setTimeout(() => setIsVisible(true), 3000) // Delay 3s
            return () => clearTimeout(timer)
        }
    }, [isLoading, isSupported, permission])

    const handleEnable = async () => {
        try {
            await subscribe()
            toast.success('Notificaciones activadas correctamente')
            setIsVisible(false)
        } catch (error) {
            toast.error('No se pudieron activar las notificaciones')
        }
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-4 right-4 z-50 max-w-sm w-full md:w-auto"
            >
                <div className="bg-background-secondary border border-border rounded-xl p-4 shadow-xl flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                            <div className="p-2 bg-primary/10 rounded-full text-primary">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-semibold text-sm">Activar notificaciones</h4>
                                <p className="text-xs text-muted-foreground">
                                    Recibe alertas sobre check-ins, rutinas y mensajes importantes al instante.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsVisible(false)}
                            className="text-xs h-8"
                        >
                            Ahora no
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleEnable}
                            className="text-xs h-8"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Activando...' : 'Activar'}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
