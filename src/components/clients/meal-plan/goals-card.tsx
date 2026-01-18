'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Save, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { updateClientAction } from '@/app/(dashboard)/clients/actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface GoalsCardProps {
    client: any
    isCollapsed?: boolean
    onToggleCollapse?: () => void
}

export function GoalsCard({ client, isCollapsed = false, onToggleCollapse }: GoalsCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        target_calories: client.target_calories || 0,
        target_protein: client.target_protein || 0,
        target_carbs: client.target_carbs || 0,
        target_fats: client.target_fats || 0
    })

    const handleEdit = () => {
        setFormData({
            target_calories: client.target_calories || 0,
            target_protein: client.target_protein || 0,
            target_carbs: client.target_carbs || 0,
            target_fats: client.target_fats || 0
        })
        setIsEditing(true)
        if (isCollapsed && onToggleCollapse) {
            onToggleCollapse()
        }
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const result = await updateClientAction(client.id, {
                ...formData,
                macros_is_manual: true
            })
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Objetivos actualizados correctamente")
                setIsEditing(false)
            }
        } catch (error) {
            toast.error("Error al guardar los cambios")
        } finally {
            setIsLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }))
    }

    return (
        <Card className="overflow-hidden bg-muted/20 border-border/50">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 relative">
                <div className="flex items-center gap-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        Objetivos Nutricionales
                        <span className="text-[10px] uppercase font-normal text-muted-foreground border px-1.5 rounded-full bg-background/50">
                            {client.macros_is_manual ? 'Manual' : 'Auto'}
                        </span>
                    </CardTitle>

                    {/* Compact View when Collapsed */}
                    {isCollapsed && !isEditing && (
                        <div className="hidden sm:flex items-center gap-4 text-xs">
                            <span className="font-medium text-foreground">{client.target_calories || 0} kcal</span>
                            <span className="text-muted-foreground flex items-center gap-1">
                                P <span className="text-foreground font-medium">{client.target_protein || 0}g</span>
                            </span>
                            <span className="text-muted-foreground flex items-center gap-1">
                                C <span className="text-foreground font-medium">{client.target_carbs || 0}g</span>
                            </span>
                            <span className="text-muted-foreground flex items-center gap-1">
                                G <span className="text-foreground font-medium">{client.target_fats || 0}g</span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {!isEditing ? (
                        <>
                            <Button variant="ghost" size="sm" onClick={handleEdit} className="h-7 w-7 p-0">
                                <Pencil className="h-3 w-3" />
                            </Button>
                            {onToggleCollapse && (
                                <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="h-7 w-7 p-0">
                                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                <X className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleSave} disabled={isLoading} className="h-7 w-7 p-0 text-primary hover:text-primary">
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>

            {(!isCollapsed || isEditing) && (
                <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-4 gap-2 text-center max-w-2xl">
                        {/* Calories */}
                        <div className="flex flex-col items-center justify-center p-2 rounded-md bg-background border">
                            {isEditing ? (
                                <Input type="number" name="target_calories" value={formData.target_calories} onChange={handleChange} className="h-7 text-center font-bold px-1" />
                            ) : (
                                <div className="text-lg font-bold">{client.target_calories || 0}</div>
                            )}
                            <div className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">kcal</div>
                        </div>

                        {/* Protein */}
                        <div className="flex flex-col items-center justify-center p-2 rounded-md bg-blue-500/10 border border-blue-200/20">
                            {isEditing ? (
                                <Input type="number" name="target_protein" value={formData.target_protein} onChange={handleChange} className="h-7 text-center font-bold px-1 text-blue-600" />
                            ) : (
                                <div className="text-lg font-bold text-blue-600">{client.target_protein || 0}g</div>
                            )}
                            <div className="text-[9px] uppercase font-bold text-blue-600/70 mt-0.5">PROT</div>
                        </div>

                        {/* Carbs */}
                        <div className="flex flex-col items-center justify-center p-2 rounded-md bg-amber-500/10 border border-amber-200/20">
                            {isEditing ? (
                                <Input type="number" name="target_carbs" value={formData.target_carbs} onChange={handleChange} className="h-7 text-center font-bold px-1 text-amber-600" />
                            ) : (
                                <div className="text-lg font-bold text-amber-600">{client.target_carbs || 0}g</div>
                            )}
                            <div className="text-[9px] uppercase font-bold text-amber-600/70 mt-0.5">CARBS</div>
                        </div>

                        {/* Fats */}
                        <div className="flex flex-col items-center justify-center p-2 rounded-md bg-rose-500/10 border border-rose-200/20">
                            {isEditing ? (
                                <Input type="number" name="target_fats" value={formData.target_fats} onChange={handleChange} className="h-7 text-center font-bold px-1 text-rose-600" />
                            ) : (
                                <div className="text-lg font-bold text-rose-600">{client.target_fats || 0}g</div>
                            )}
                            <div className="text-[9px] uppercase font-bold text-rose-600/70 mt-0.5">GRASAS</div>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
