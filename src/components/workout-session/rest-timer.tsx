'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Timer, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'

type WindowWithWebkitAudio = Window & {
    webkitAudioContext?: typeof AudioContext
}

const MOTIVATIONAL_PHRASES = [
    'Respirá, recuperá y preparate para romper la próxima serie.',
    'Cada segundo de descanso también construye progreso.',
    'Enfocate en la técnica: la próxima repetición cuenta más.',
    'Mantené el ritmo: vas excelente, seguí así.',
    'Volvé más fuerte: control, foco y a levantar.',
    'Tu constancia de hoy es tu resultado de mañana.',
]

interface RestTimerProps {
    enabled: boolean
    seconds: number
    onSettingsChange: (enabled: boolean, seconds: number) => void
    autoStart?: boolean
    onTimerEnd?: () => void
    variant?: 'inline' | 'bottom-toast'
}

export function RestTimer({
    enabled,
    seconds,
    onSettingsChange,
    autoStart = false,
    onTimerEnd,
    variant = 'inline',
}: RestTimerProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [timeLeft, setTimeLeft] = useState(seconds)
    const [localEnabled, setLocalEnabled] = useState(enabled)
    const [localSeconds, setLocalSeconds] = useState(seconds)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60)
        const remainingSecs = secs % 60
        return `${mins}:${remainingSecs.toString().padStart(2, '0')}`
    }

    const playTimerEndSound = useCallback(() => {
        try {
            if (!audioContextRef.current) {
                const AudioContextCtor = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext
                if (!AudioContextCtor) return
                audioContextRef.current = new AudioContextCtor()
            }

            const ctx = audioContextRef.current

            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)

            oscillator.type = 'sine'
            oscillator.frequency.setValueAtTime(880, ctx.currentTime)

            gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + 0.5)

            setTimeout(() => {
                const osc2 = ctx.createOscillator()
                const gain2 = ctx.createGain()
                osc2.connect(gain2)
                gain2.connect(ctx.destination)
                osc2.type = 'sine'
                osc2.frequency.setValueAtTime(880, ctx.currentTime)
                gain2.gain.setValueAtTime(0.5, ctx.currentTime)
                gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
                osc2.start(ctx.currentTime)
                osc2.stop(ctx.currentTime + 0.5)
            }, 600)

            setTimeout(() => {
                const osc3 = ctx.createOscillator()
                const gain3 = ctx.createGain()
                osc3.connect(gain3)
                gain3.connect(ctx.destination)
                osc3.type = 'sine'
                osc3.frequency.setValueAtTime(1046.5, ctx.currentTime)
                gain3.gain.setValueAtTime(0.5, ctx.currentTime)
                gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7)
                osc3.start(ctx.currentTime)
                osc3.stop(ctx.currentTime + 0.7)
            }, 1200)
        } catch (error) {
            console.error('Error playing sound:', error)
        }
    }, [])

    const startTimer = useCallback(() => {
        if (!enabled) return

        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }

        setTimeLeft(seconds)
        setIsRunning(true)

        intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current)
                    }
                    setIsRunning(false)
                    playTimerEndSound()
                    onTimerEnd?.()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [enabled, seconds, playTimerEndSound, onTimerEnd])

    useEffect(() => {
        if (autoStart && enabled && !isRunning) {
            startTimer()
        }
    }, [autoStart, enabled, isRunning, startTimer])

    useEffect(() => {
        setLocalEnabled(enabled)
    }, [enabled])

    useEffect(() => {
        setLocalSeconds(seconds)
        if (!isRunning) {
            setTimeLeft(seconds)
        }
    }, [seconds, isRunning])

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (variant !== 'bottom-toast' || !isModalOpen) {
            return
        }

        setPhraseIndex(Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length))
        const phraseInterval = window.setInterval(() => {
            setPhraseIndex((prev) => (prev + 1) % MOTIVATIONAL_PHRASES.length)
        }, 4500)

        return () => {
            window.clearInterval(phraseInterval)
        }
    }, [variant, isModalOpen])

    const pauseTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        setIsRunning(false)
    }

    const resumeTimer = () => {
        if (!enabled) return

        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }

        setIsRunning(true)
        intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current)
                    }
                    setIsRunning(false)
                    playTimerEndSound()
                    onTimerEnd?.()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    const resetTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        setIsRunning(false)
        setTimeLeft(seconds)
    }

    const skipTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        setIsRunning(false)
        setTimeLeft(0)
    }

    const handleSaveSettings = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }

        setIsRunning(false)
        setTimeLeft(localSeconds)
        onSettingsChange(localEnabled, localSeconds)

        if (variant === 'inline') {
            setIsSettingsOpen(false)
        }
    }

    const visibleTimer = enabled
        ? (isRunning || (timeLeft > 0 && timeLeft !== seconds) ? timeLeft : seconds)
        : seconds

    const statusLabel = !enabled
        ? 'Apagado'
        : isRunning
            ? 'En curso'
            : (timeLeft > 0 && timeLeft < seconds)
                ? 'Pausado'
                : (timeLeft === 0 && seconds > 0)
                    ? 'Finalizado'
                    : 'Listo'

    if (variant === 'bottom-toast') {
        return (
            <>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="w-[calc(100%-1rem)] max-w-md h-[82dvh] rounded-[28px] p-0 gap-0 overflow-hidden">
                        <div className="flex h-full flex-col bg-background">
                            <DialogHeader className="border-b px-5 py-4 text-left">
                                <DialogTitle className="text-xl font-bold">Tu descanso</DialogTitle>
                                <DialogDescription>
                                    Ajustá y controlá el timer sin tocar el campo de notas.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
                                    <p className="text-sm font-semibold text-primary">
                                        {MOTIVATIONAL_PHRASES[phraseIndex]}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-muted/50 p-5 text-center space-y-2">
                                    <p className="font-mono text-[68px] leading-none font-black tabular-nums tracking-tight">
                                        {formatTime(visibleTimer)}
                                    </p>
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                        {statusLabel}
                                    </p>
                                </div>

                                {enabled ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {isRunning ? (
                                            <Button variant="outline" onClick={pauseTimer}>
                                                <Pause className="h-4 w-4 mr-1" /> Pausar
                                            </Button>
                                        ) : (
                                            <Button variant="outline" onClick={resumeTimer} disabled={timeLeft <= 0 || timeLeft === seconds}>
                                                <Play className="h-4 w-4 mr-1" /> Seguir
                                            </Button>
                                        )}
                                        <Button variant="outline" onClick={resetTimer}>
                                            <RotateCcw className="h-4 w-4 mr-1" /> Reset
                                        </Button>
                                        <Button variant="outline" onClick={skipTimer}>
                                            <SkipForward className="h-4 w-4 mr-1" /> Skip
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-center text-muted-foreground">
                                        Activá el timer para usar descansos automáticos.
                                    </p>
                                )}

                                {enabled && !isRunning && (timeLeft === seconds || timeLeft === 0) && (
                                    <Button
                                        onClick={startTimer}
                                        className="w-full h-12 rounded-xl font-bold bg-black text-white hover:bg-zinc-800"
                                    >
                                        <Play className="h-4 w-4 mr-2" />
                                        {timeLeft === 0 ? 'Reiniciar descanso' : 'Iniciar descanso'}
                                    </Button>
                                )}

                                <div className="space-y-4 rounded-2xl border bg-background p-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="rest-toggle-mobile">Activar timer de descanso</Label>
                                        <Switch
                                            id="rest-toggle-mobile"
                                            checked={localEnabled}
                                            onCheckedChange={setLocalEnabled}
                                        />
                                    </div>

                                    {localEnabled && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label>Minutos</Label>
                                                <Input
                                                    type="number"
                                                    value={Math.floor(localSeconds / 60)}
                                                    onChange={(e) => {
                                                        const mins = parseInt(e.target.value) || 0
                                                        const secs = localSeconds % 60
                                                        setLocalSeconds(Math.max(0, mins * 60 + secs))
                                                    }}
                                                    min={0}
                                                    max={20}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Segundos</Label>
                                                <Input
                                                    type="number"
                                                    value={localSeconds % 60}
                                                    onChange={(e) => {
                                                        const mins = Math.floor(localSeconds / 60)
                                                        const secs = parseInt(e.target.value) || 0
                                                        setLocalSeconds(Math.max(0, mins * 60 + secs))
                                                    }}
                                                    min={0}
                                                    max={59}
                                                    step={5}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <Button onClick={handleSaveSettings} className="w-full h-11 rounded-xl font-semibold">
                                        Guardar configuración
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className={cn(
                        'fixed inset-x-4 z-40 rounded-2xl border px-4 py-3 text-left shadow-xl backdrop-blur transition hover:scale-[1.01] active:scale-[0.99]',
                        enabled ? 'bg-background/95 border-primary/20' : 'bg-background/92 border-border',
                        'bottom-[max(1rem,env(safe-area-inset-bottom))]'
                    )}
                    aria-label="Abrir descanso"
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <span
                                className={cn(
                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                                    enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                )}
                            >
                                <Timer className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold leading-none">Descanso</p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {enabled
                                        ? isRunning
                                            ? 'Tocá para controlar el timer'
                                            : 'Tocá para iniciar o ajustar'
                                        : 'Tocá para activar el descanso'}
                                </p>
                            </div>
                        </div>
                        <span className="font-mono text-2xl font-bold tabular-nums">
                            {formatTime(visibleTimer)}
                        </span>
                    </div>
                </button>
            </>
        )
    }

    return (
        <div className="space-y-2">
            <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <SheetTrigger asChild>
                    <button className="flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: '#5254D9' }}>
                        <Timer className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            Descanso: {enabled ? formatTime(seconds) : 'APAGADO'}
                        </span>
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-auto rounded-t-2xl">
                    <SheetHeader>
                        <SheetTitle>Configurar Descanso</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 py-6">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="rest-toggle">Activar timer de descanso</Label>
                            <Switch
                                id="rest-toggle"
                                checked={localEnabled}
                                onCheckedChange={setLocalEnabled}
                            />
                        </div>

                        {localEnabled && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Minutos</Label>
                                    <Input
                                        type="number"
                                        value={Math.floor(localSeconds / 60)}
                                        onChange={(e) => {
                                            const mins = parseInt(e.target.value) || 0
                                            const secs = localSeconds % 60
                                            setLocalSeconds(Math.max(0, mins * 60 + secs))
                                        }}
                                        min={0}
                                        max={20}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Segundos</Label>
                                    <Input
                                        type="number"
                                        value={localSeconds % 60}
                                        onChange={(e) => {
                                            const mins = Math.floor(localSeconds / 60)
                                            const secs = parseInt(e.target.value) || 0
                                            setLocalSeconds(Math.max(0, mins * 60 + secs))
                                        }}
                                        min={0}
                                        max={59}
                                        step={5}
                                    />
                                </div>
                            </div>
                        )}

                        <Button onClick={handleSaveSettings} className="w-full bg-black text-white hover:bg-zinc-800 h-12 rounded-xl font-bold">
                            Guardar
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {enabled && (isRunning || timeLeft > 0) && timeLeft !== seconds && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="text-center">
                        <span className="text-4xl font-bold font-mono">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                    <div className="flex justify-center gap-2">
                        {isRunning ? (
                            <Button size="sm" variant="outline" onClick={pauseTimer}>
                                <Pause className="h-4 w-4 mr-1" /> Pausar
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" onClick={resumeTimer}>
                                <Play className="h-4 w-4 mr-1" /> Continuar
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={resetTimer}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Reset
                        </Button>
                        <Button size="sm" variant="outline" onClick={skipTimer}>
                            <SkipForward className="h-4 w-4 mr-1" /> Skip
                        </Button>
                    </div>
                </div>
            )}

            {enabled && !isRunning && timeLeft === seconds && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={startTimer}
                    className="w-full"
                >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar descanso
                </Button>
            )}
        </div>
    )
}
