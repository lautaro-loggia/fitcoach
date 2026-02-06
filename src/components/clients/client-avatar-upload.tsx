'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Upload, Loader2, Camera, User } from 'lucide-react'
import Cropper from 'react-easy-crop'
import imageCompression from 'browser-image-compression'
import { Area } from 'react-easy-crop'

interface ClientAvatarUploadProps {
    clientId: string
    userId?: string
    currentAvatarUrl?: string | null
    clientName: string
    onUploadComplete?: (url: string) => void
}

export function ClientAvatarUpload({ clientId, userId, currentAvatarUrl, clientName, onUploadComplete }: ClientAvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null)

    // Crop state
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [isCropDialogOpen, setIsCropDialogOpen] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const imageDataUrl = await readFile(file)
            setImageSrc(imageDataUrl)
            setIsCropDialogOpen(true)
            // Reset input value so same file can be selected again if needed
            e.target.value = ''
        }
    }

    const readFile = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.addEventListener('load', () => resolve(reader.result as string))
            reader.readAsDataURL(file)
        })
    }

    const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image()
            image.addEventListener('load', () => resolve(image))
            image.addEventListener('error', (error) => reject(error))
            image.setAttribute('crossOrigin', 'anonymous')
            image.src = url
        })

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: Area
    ): Promise<Blob> => {
        const image = await createImage(imageSrc)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
            throw new Error('No 2d context')
        }

        canvas.width = pixelCrop.width
        canvas.height = pixelCrop.height

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        )

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'))
                    return
                }
                resolve(blob)
            }, 'image/jpeg', 1)
        })
    }

    const handleSaveCrop = async () => {
        if (!imageSrc || !croppedAreaPixels) return

        try {
            setUploading(true)
            setIsCropDialogOpen(false)

            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)

            // Create a File from Blob to satisfy imageCompression
            const fileToCompress = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })

            // Compress image
            const compressedFile = await imageCompression(fileToCompress, {
                maxSizeMB: 0.5, // 500KB max
                maxWidthOrHeight: 800, // Reasonable size for avatar
                useWebWorker: true,
                fileType: 'image/jpeg'
            })

            // Upload to Supabase
            const fileName = `${clientId}/avatar_${Date.now()}.jpg`

            // First delete old avatar if we know the path? 
            // Better to just upload new one. 
            // Note: If we use a predictable name like "avatar.jpg", browser caching might be an issue unless we use cache busting.
            // Using timestamp in name or cache busting param in URL is better.

            // For now, let's keep it simple with timestamp.

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, compressedFile, { upsert: true })

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            const publicUrl = data.publicUrl

            // Update client profile in database
            const { error: updateError } = await supabase
                .from('clients')
                .update({ avatar_url: publicUrl })
                .eq('id', clientId)

            if (updateError) throw updateError

            if (userId) {
                await supabase
                    .from('profiles')
                    .update({ avatar_url: publicUrl })
                    .eq('id', userId)
                    .select()
            }

            setAvatarUrl(publicUrl)
            onUploadComplete?.(publicUrl)

            // Clean up
            setImageSrc(null)

        } catch (error) {
            console.error('Error uploading avatar:', error)
            alert('Error al actualizar la foto. Intenta nuevamente.')
        } finally {
            setUploading(false)
        }
    }

    const getInitials = () => {
        if (!clientName) return '??'
        const names = clientName.split(' ')
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase()
        }
        return clientName.substring(0, 2).toUpperCase()
    }

    return (
        <>
            <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg cursor-pointer transition-opacity group-hover:opacity-90" onClick={() => !uploading && fileInputRef.current?.click()}>
                    <AvatarImage src={avatarUrl || ""} className="object-cover" />
                    <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
                        {getInitials()}
                    </AvatarFallback>
                </Avatar>

                <div
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                >
                    {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                        <Camera className="h-4 w-4 text-blue-600" />
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                    disabled={uploading}
                />
            </div>

            <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ajustar foto</DialogTitle>
                        <DialogDescription>
                            Arrastra y haz zoom para ajustar tu foto de perfil.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden mt-4">
                        {imageSrc && (
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                showGrid={false}
                                cropShape="round"
                            />
                        )}
                    </div>

                    <div className="py-4 flex items-center gap-2">
                        <span className="text-sm text-gray-500">-</span>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(value: number[]) => setZoom(value[0])}
                            className="flex-1"
                        />
                        <span className="text-sm text-gray-500">+</span>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCropDialogOpen(false)}> Cancelar </Button>
                        <Button onClick={handleSaveCrop} disabled={uploading}>
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Guardar foto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
