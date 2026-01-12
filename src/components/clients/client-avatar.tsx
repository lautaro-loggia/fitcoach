'use client'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface ClientAvatarProps {
    name: string
    avatarUrl?: string | null
    className?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    textClassName?: string
}

// Paleta de colores vibrantes y atractivos para los avatares
const AVATAR_COLORS = [
    // Gradientes vibrantes
    { from: '#ff6b6b', to: '#ee5a5a' }, // Rojo coral
    { from: '#ff8c42', to: '#e67a35' }, // Naranja
    { from: '#fcc419', to: '#e0a800' }, // Amarillo dorado
    { from: '#51cf66', to: '#40b355' }, // Verde lima
    { from: '#22b8cf', to: '#1aa2b8' }, // Turquesa
    { from: '#339af0', to: '#2280d1' }, // Azul brillante
    { from: '#7950f2', to: '#6341d1' }, // Púrpura
    { from: '#e64980', to: '#cc3d6f' }, // Rosa fuerte
    { from: '#845ef7', to: '#6e45d1' }, // Violeta
    { from: '#20c997', to: '#17a486' }, // Verde turquesa
    { from: '#fd7e14', to: '#d96a0f' }, // Naranja intenso
    { from: '#748ffc', to: '#5c73d4' }, // Azul lavanda
    { from: '#f06595', to: '#d4517e' }, // Rosa
    { from: '#38d9a9', to: '#2cc097' }, // Verde menta
    { from: '#fab005', to: '#d99a00' }, // Ámbar
    { from: '#4c6ef5', to: '#3d5ad4' }, // Azul índigo
]

const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
}

const textSizeClasses = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl'
}

/**
 * Genera un índice de color consistente basado en el nombre
 * Usa un hash simple para asegurar que el mismo nombre siempre tenga el mismo color
 */
function getColorIndex(name: string): number {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash) % AVATAR_COLORS.length
}

/**
 * Obtiene las iniciales de un nombre (máximo 2 caracteres)
 */
function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(n => n.length > 0)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

/**
 * ClientAvatar - Componente de avatar para clientes
 * Genera un avatar con colores vibrantes basados en el nombre del cliente
 * Si hay una URL de avatar, muestra la imagen en su lugar
 */
export function ClientAvatar({
    name,
    avatarUrl,
    className,
    size = 'md',
    textClassName
}: ClientAvatarProps) {
    const colorIndex = getColorIndex(name)
    const colors = AVATAR_COLORS[colorIndex]
    const initials = getInitials(name)

    return (
        <Avatar className={cn(sizeClasses[size], className)}>
            <AvatarImage src={avatarUrl || undefined} alt={name} />
            <AvatarFallback
                className={cn("font-semibold text-white", textSizeClasses[size], textClassName)}
                style={{
                    background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`
                }}
            >
                {initials}
            </AvatarFallback>
        </Avatar>
    )
}
