import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Upload01Icon, Cancel01Icon, Camera01Icon, Loading03Icon } from 'hugeicons-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ClientAvatarUploadProps {
    clientId: string
    clientName: string
    currentAvatarUrl?: string | null
    className?: string
    size?: "sm" | "default" | "md" | "lg" | "xl"
    showButton?: boolean
    onUploadSuccess?: (url: string) => void
}

export function ClientAvatarUpload({
    clientId,
    clientName,
    currentAvatarUrl,
    className,
    size = "default",
    showButton = false,
    onUploadSuccess
}: ClientAvatarUploadProps) {
    const router = useRouter()
    const [uploading, setUploading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            const file = event.target.files?.[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const filePath = `${clientId}-${Math.random()}.${fileExt}`
            const supabase = createClient()

            // 1. Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // 3. Update client record
            const { error: updateError } = await supabase
                .from('clients')
                .update({ avatar_url: publicUrl })
                .eq('id', clientId)

            if (updateError) throw updateError

            setAvatarUrl(publicUrl)
            if (onUploadSuccess) onUploadSuccess(publicUrl)
            router.refresh()
            // Optional: trigger a toast here
        } catch (error) {
            console.error('Error uploading avatar:', error)
            alert('Error al subir la imagen')
        } finally {
            setUploading(false)
        }
    }

    const triggerUpload = () => fileInputRef.current?.click()

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation() // Prevent triggering upload if wrapped
        if (!avatarUrl || !confirm("¿Eliminar foto de perfil?")) return

        try {
            setUploading(true)
            const supabase = createClient()

            // Just remove reference from client, we can leave file or delete it if we want strict cleanup
            const { error } = await supabase
                .from('clients')
                .update({ avatar_url: null })
                .eq('id', clientId)

            if (error) throw error

            setAvatarUrl(null)
            if (onUploadSuccess) onUploadSuccess("") // empty string or null?
            router.refresh()
        } catch (error) {
            console.error(error)
        } finally {
            setUploading(false)
        }
    }

    const sizeClasses = {
        sm: "h-8 w-8 text-xs",
        default: "h-10 w-10 text-sm",
        md: "h-16 w-16 text-lg",
        lg: "h-24 w-24 text-xl",
        xl: "h-32 w-32 text-2xl"
    }

    return (
        <div className={cn("relative group flex flex-col items-center gap-3", className)}>
            <div className="relative">
                <Avatar className={cn(sizeClasses[size], "border-2 border-border cursor-pointer transition-opacity hover:opacity-90")} onClick={triggerUpload}>
                    <AvatarImage src={avatarUrl || ''} className="object-cover" />
                    <AvatarFallback className="bg-muted text-muted-foreground uppercase font-semibold">
                        {clientName.slice(0, 2)}
                    </AvatarFallback>

                    {/* Hover Overlay with Camera Icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                        {uploading ? (
                            <Loading03Icon className="h-6 w-6 text-white animate-spin" />
                        ) : (
                            <Camera01Icon className="h-6 w-6 text-white" />
                        )}
                    </div>
                </Avatar>

                {/* Delete Button (only if avatar exists) */}
                {avatarUrl && !uploading && (
                    <button
                        onClick={handleDelete}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                        title="Eliminar foto"
                    >
                        <Cancel01Icon className="h-3 w-3" />
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
            />

            {showButton && (
                <Button variant="outline" size="sm" onClick={triggerUpload} disabled={uploading}>
                    {uploading ? <Loading03Icon className="mr-2 h-4 w-4 animate-spin" /> : <Upload01Icon className="mr-2 h-4 w-4" />}
                    Subir Foto
                </Button>
            )}
        </div>
    )
}
