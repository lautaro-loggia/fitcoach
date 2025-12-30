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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Timer, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'

interface RestTimerProps {
    enabled: boolean
    seconds: number
    onSettingsChange: (enabled: boolean, seconds: number) => void
    autoStart?: boolean
    onTimerEnd?: () => void
}

export function RestTimer({
    enabled,
    seconds,
    onSettingsChange,
    autoStart = false,
    onTimerEnd
}: RestTimerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [timeLeft, setTimeLeft] = useState(seconds)
    const [localEnabled, setLocalEnabled] = useState(enabled)
    const [localSeconds, setLocalSeconds] = useState(seconds)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)

    // Auto-start timer when autoStart changes to true
    useEffect(() => {
        if (autoStart && enabled && !isRunning) {
            startTimer()
        }
    }, [autoStart])

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [])

    const playTimerEndSound = useCallback(() => {
        try {
            // Create audio context if not exists
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }

            const ctx = audioContextRef.current

            // Create oscillator for beep sound
            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)

            oscillator.type = 'sine'
            oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5 note

            gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + 0.5)

            // Play two more beeps
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
                osc3.frequency.setValueAtTime(1046.5, ctx.currentTime) // C6 note (higher)
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
        setTimeLeft(seconds)
        setIsRunning(true)

        intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // Timer ended
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
    }, [seconds, playTimerEndSound, onTimerEnd])

    const pauseTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        setIsRunning(false)
    }

    const resumeTimer = () => {
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
        onSettingsChange(localEnabled, localSeconds)
        setIsOpen(false)
    }

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60)
        const remainingSecs = secs % 60
        return `${mins}:${remainingSecs.toString().padStart(2, '0')}`
    }

    return (
        <div className="space-y-2">
            {/* Rest toggle row */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <button className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors">
                        <Timer className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            Descanso: {enabled ? `${seconds}s` : 'APAGADO'}
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
                            <div className="space-y-2">
                                <Label>Segundos de descanso</Label>
                                <Input
                                    type="number"
                                    value={localSeconds}
                                    onChange={(e) => setLocalSeconds(parseInt(e.target.value) || 60)}
                                    min={10}
                                    max={300}
                                    step={5}
                                />
                            </div>
                        )}

                        <Button onClick={handleSaveSettings} className="w-full">
                            Guardar
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Timer display when running or has time */}
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

            {/* Start button when not running */}
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
