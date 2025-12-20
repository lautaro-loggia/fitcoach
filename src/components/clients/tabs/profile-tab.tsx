
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ProfileTab({ client }: { client: any }) {
    // Goals logic translation
    const goalSpecificText = {
        lose_fat: 'Bajar grasa',
        gain_muscle: 'Ganar masa muscular',
        recomp: 'Recomposición'
    }[client.goal_specific as string] || client.goal_specific

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Objetivos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase">Objetivo personal</h4>
                        <p>{client.goal_text || 'No definido'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase">Meta</h4>
                            <p>{goalSpecificText || '-'}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase">Nivel de actividad</h4>
                            <p className="capitalize">{client.activity_level || '-'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Métricas Iniciales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between">
                        <span>Peso Inicial</span>
                        <span className="font-bold">{client.initial_weight} kg</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Altura</span>
                        <span className="font-bold">{client.height} cm</span>
                    </div>
                    {/* IMC calculation if weight/height exist */}
                    {client.initial_weight && client.height && (
                        <div className="flex justify-between">
                            <span>IMC Inicial</span>
                            <span className="font-bold">
                                {(client.initial_weight / ((client.height / 100) ** 2)).toFixed(1)}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Placeholder for Progression Charts or Photos link */}
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle>Fotos de Progreso</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">No hay fotos cargadas aún.</p>
                </CardContent>
            </Card>
        </div>
    )
}
