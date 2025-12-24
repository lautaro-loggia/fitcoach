'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
    userId: string
    currentAvatarUrl?: string | null
    userInitials: string
    onUploadComplete?: (url: string) => void
}

export function AvatarUpload({ userId, currentAvatarUrl, userInitials, onUploadComplete }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

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
            if (avatarUrl) {
                const oldPath = avatarUrl.split('/').slice(-2).join('/')
                await supabase.storage.from('avatars').remove([oldPath])
            }

            // Upload new avatar
            const fileExt = file.name.split('.').pop()
            const fileName = `${userId}/avatar.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true })

            if (uploadError) throw uploadError

            // Get public URL
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            const publicUrl = data.publicUrl

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId)

            if (updateError) throw updateError

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
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
            </Avatar>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
            />

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
                        Cambiar foto
                    </>
                )}
            </Button>
            <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP o GIF. Máx 5MB.
            </p>
        </div>
    )
}
