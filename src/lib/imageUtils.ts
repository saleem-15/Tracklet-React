export const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export interface CompressedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  fileName: string;
  mediaType: string;
}

/**
 * Validates whether an attached file is an accepted image within size limits.
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return { 
      isValid: false, 
      error: 'Unsupported format. Please attach a PNG, JPEG, or WebP image.' 
    };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { 
      isValid: false, 
      error: `File is too large (${formatFileSize(file.size)}). Maximum allowed size is 2MB.` 
    };
  }

  return { isValid: true };
}

/**
 * Human-readable byte formatting.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extracts the first image file found in a clipboard event.
 */
export function extractImageFromClipboard(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        // Normalize filename if nameless from OS snippet
        const fileName = file.name && file.name !== 'image.png' 
          ? file.name 
          : `screenshot-${Date.now()}.png`;
        return new File([file], fileName, { type: file.type });
      }
    }
  }

  return null;
}

/**
 * Extracts the first image file found in a drag/drop DataTransfer event.
 */
export function extractImageFromDataTransfer(dataTransfer: DataTransfer): File | null {
  if (!dataTransfer.files || dataTransfer.files.length === 0) return null;

  for (let i = 0; i < dataTransfer.files.length; i++) {
    const file = dataTransfer.files[i];
    if (file.type.startsWith('image/')) {
      return file;
    }
  }

  return null;
}

/**
 * Scales an image down to maxWidth and compresses it to WebP or JPEG.
 */
export function compressImageToDataUrl(
  file: File, 
  maxWidth = 1280, 
  quality = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    // If running in an environment without DOM/Image, fallback to FileReader
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
          width: 0,
          height: 0,
          sizeBytes: file.size,
          fileName: file.name,
          mediaType: file.type,
        });
      };
      reader.onerror = () => reject(new Error('Failed reading file data.'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Downscale proportionally if wider than maxWidth
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Canvas 2d context unavailable, fallback to raw dataUrl
          resolve({
            dataUrl: e.target?.result as string,
            width: img.width,
            height: img.height,
            sizeBytes: file.size,
            fileName: file.name,
            mediaType: file.type,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try webp compression first, fallback to jpeg if unsupported
        let targetType = 'image/webp';
        let dataUrl = canvas.toDataURL(targetType, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          targetType = 'image/jpeg';
          dataUrl = canvas.toDataURL(targetType, quality);
        }

        // Approximate byte size of base64
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const sizeBytes = Math.round((base64Length * 3) / 4);

        resolve({
          dataUrl,
          width,
          height,
          sizeBytes,
          fileName: file.name.replace(/\.[^.]+$/, '') + (targetType === 'image/webp' ? '.webp' : '.jpg'),
          mediaType: targetType,
        });
      };

      img.onerror = () => reject(new Error('Failed decoding image data.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed reading file data.'));
    reader.readAsDataURL(file);
  });
}
