
/**
 * Compresses an image file client-side using HTML5 Canvas.
 * - Max dimension: 1600px
 * - Format: WebP (fallback to JPEG handled by browser usually, or specified)
 * - Quality: 0.8
 */
export async function compressImage(file: File, quality = 0.8, maxWidth = 1600): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Draw image
                ctx.drawImage(img, 0, 0, width, height);

                // Compress
                // Try webp first
                const format = 'image/webp';

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Compression failed'));
                        return;
                    }

                    // Create new File object
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                        type: format,
                        lastModified: Date.now(),
                    });

                    resolve(newFile);
                }, format, quality);
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
}
