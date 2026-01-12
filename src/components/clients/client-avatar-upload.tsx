'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateClientAction } from '@/app/(dashboard)/clients/actions'

interface ClientAvatarUploadProps {
    clientId: string
    currentAvatarUrl?: string | null
    clientName: string
    size?: 'sm' | 'md' | 'lg'
    onUploadComplete?: (url: string) => void
    showButton?: boolean
}

const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24'
}

const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
}

// Paleta de colores vibrantes y atractivos para los avatares
const AVATAR_COLORS = [
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

/**
 * Genera un índice de color consistente basado en el nombre
 */
function getColorIndex(name: string): number {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return Math.abs(hash) % AVATAR_COLORS.length
}

export function ClientAvatarUpload({
    clientId,
    currentAvatarUrl,
    clientName,
    size = 'lg',
    onUploadComplete,
    showButton = true
}: ClientAvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    // Get color for this client
    const colorIndex = getColorIndex(clientName)
    const colors = AVATAR_COLORS[colorIndex]

    // Get initials from client name
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .filter(n => n.length > 0)
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const uploadAvatar = async (file: File) => {
        try {
            setUploading(true)

            // Validate file size (5MB)
            if (file.size > 5242880) {
                alert('La imagen no debe superar 5MB')
                return
            }

            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
            if (!validTypes.includes(file.type)) {
                alert('Formato de imagen no válido. Usa JPG, PNG, WEBP o GIF.')
                return
            }

            // Delete old avatar if exists
            if (avatarUrl && avatarUrl.includes('client-avatars')) {
                const oldPath = avatarUrl.split('/').slice(-2).join('/')
                await supabase.storage.from('client-avatars').remove([oldPath])
            }

            // Upload new avatar with timestamp to avoid caching issues
            const fileExt = file.name.split('.').pop()
            const timestamp = Date.now()
            const fileName = `${clientId}/avatar-${timestamp}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('client-avatars')
                .upload(fileName, file, { upsert: true })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                // If bucket doesn't exist, try with avatars bucket
                const { error: fallbackError } = await supabase.storage
                    .from('avatars')
                    .upload(`clients/${fileName}`, file, { upsert: true })

                if (fallbackError) {
                    throw fallbackError
                }

                // Get public URL from fallback bucket
                const { data: fallbackData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(`clients/${fileName}`)

                const publicUrl = fallbackData.publicUrl

                // Update client record with new avatar URL
                const result = await updateClientAction(clientId, { avatar_url: publicUrl })
                if (result?.error) throw new Error(result.error)

                setAvatarUrl(publicUrl)
                onUploadComplete?.(publicUrl)
                return
            }

            // Get public URL
            const { data } = supabase.storage
                .from('client-avatars')
                .getPublicUrl(fileName)

            const publicUrl = data.publicUrl

            // Update client record with new avatar URL
            const result = await updateClientAction(clientId, { avatar_url: publicUrl })
            if (result?.error) throw new Error(result.error)

            setAvatarUrl(publicUrl)
            onUploadComplete?.(publicUrl)

        } catch (error) {
            console.error('Error uploading avatar:', error)
            alert('Error al subir la imagen. Intenta nuevamente.')
        } finally {
            setUploading(false)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            await uploadAvatar(file)
        }
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative group">
                <Avatar className={cn(sizeClasses[size], "ring-2 ring-background shadow-md")}>
                    <AvatarImage src={avatarUrl || undefined} alt={clientName} />
                    <AvatarFallback
                        className={cn(
                            "font-semibold text-white",
                            size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm'
                        )}
                        style={{
                            background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`
                        }}
                    >
                        {getInitials(clientName)}
                    </AvatarFallback>
                </Avatar>

                {/* Overlay button for quick upload */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={cn(
                        "absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer",
                        uploading && "opacity-100 cursor-wait"
                    )}
                >
                    {uploading ? (
                        <Loader2 className={cn(iconSizeClasses[size], "text-white animate-spin")} />
                    ) : (
                        <Camera className={cn(iconSizeClasses[size], "text-white")} />
                    )}
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
            />

            {showButton && (
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Subiendo...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP o GIF. Máx 5MB.
                    </p>
                </>
            )}
        </div>
    )
}
