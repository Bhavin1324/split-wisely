/**
 * Utility for compressing images on the client side using HTML5 Canvas.
 * Compresses images into efficient WebP (or JPEG fallback) Base64 Data URLs.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  mimeType?: 'image/webp' | 'image/jpeg';
}

/**
 * Compresses an image File or Blob and returns a Base64 data URL string.
 */
export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.82,
    mimeType = 'image/webp',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio scaling
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not create canvas 2D context'));
          return;
        }

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first, with fallback to jpeg
        let dataUrl: string;
        try {
          dataUrl = canvas.toDataURL(mimeType, quality);
          // If browser doesn't support webp, toDataURL falls back to png which can be large,
          // so check if requested webp but got png, switch to jpeg
          if (mimeType === 'image/webp' && dataUrl.startsWith('data:image/png')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };

      img.onerror = (err) => {
        reject(new Error('Failed to load image file: ' + String(err)));
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = (err) => {
      reject(new Error('Failed to read file: ' + String(err)));
    };

    reader.readAsDataURL(file);
  });
}
