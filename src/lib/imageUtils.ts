/**
 * Browser-side image resizing, thumbnail generation, and quality validation.
 * Ensures sellers can upload directly from their phones without uploading huge raw files.
 */

export interface ProcessedImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileSize: number;
  isCover: boolean;
}

export interface ImageValidationResult {
  valid: boolean;
  reason?: string;
  width?: number;
  height?: number;
}

/**
 * Validates image dimensions and quality before processing.
 * Rejects tiny images under 600px and checks for extreme low-resolution or corrupted files.
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      reason: 'This file is not an image. Please upload a JPG, PNG or WebP photo.'
    };
  }

  // Check file size (max 25MB before resizing)
  if (file.size > 25 * 1024 * 1024) {
    return {
      valid: false,
      reason: 'Photo is over 25MB. Please choose a slightly smaller file.'
    };
  }

  // If running in test or SSR environment without DOM Image API
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return { valid: true };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      // Check minimum dimensions (600px)
      if (width < 600 || height < 400) {
        resolve({
          valid: false,
          width,
          height,
          reason: `Photo is too small (${width}×${height}px). Buyers look for clear photos; please upload an image at least 600px wide.`
        });
        return;
      }

      // Check aspect ratio extremes (e.g. panoramic slice under 1:4)
      const ratio = width / height;
      if (ratio < 0.25 || ratio > 4.0) {
        resolve({
          valid: false,
          width,
          height,
          reason: 'This photo has an unusual panoramic ratio that will clip awkwardly in listing cards.'
        });
        return;
      }

      resolve({ valid: true, width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        reason: 'Could not read this photo. If it came from an iPhone (HEIC), choose it again from Photos so it\'s shared as a JPEG, or set Camera > Formats to "Most Compatible". JPG, PNG and WebP work everywhere.'
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Resizes an image file in the browser:
 * - Max 2000px on the longest side (high-res display)
 * - 400px thumbnail for fast list browsing
 */
export async function processAndResizeImage(
  file: File,
  isCover: boolean = false,
  onProgress?: (progress: number) => void
): Promise<ProcessedImage> {
  const id = 'img_' + Math.random().toString(36).substring(2, 9);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 40));
      }
    };

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (onProgress) onProgress(60);

        // 1. Calculate resized dimensions (max 2000px long side)
        const maxDimension = 2000;
        let targetWidth = img.naturalWidth;
        let targetHeight = img.naturalHeight;

        if (targetWidth > maxDimension || targetHeight > maxDimension) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
            targetWidth = maxDimension;
          } else {
            targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
            targetHeight = maxDimension;
          }
        }

        // 2. Render high-res optimized photo
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const fullResDataUrl = canvas.toDataURL('image/jpeg', 0.88);

        if (onProgress) onProgress(85);

        // 3. Render lightweight 400px thumbnail (4:3 aspect crop for list cards)
        const thumbCanvas = document.createElement('canvas');
        const thumbWidth = 400;
        const thumbHeight = 300;
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const thumbCtx = thumbCanvas.getContext('2d');

        if (thumbCtx) {
          thumbCtx.imageSmoothingEnabled = true;
          thumbCtx.imageSmoothingQuality = 'medium';
          
          // Center crop to 4:3
          const targetRatio = 4 / 3;
          const currentRatio = img.naturalWidth / img.naturalHeight;
          let sWidth = img.naturalWidth;
          let sHeight = img.naturalHeight;
          let sx = 0;
          let sy = 0;

          if (currentRatio > targetRatio) {
            sWidth = Math.round(sHeight * targetRatio);
            sx = Math.round((img.naturalWidth - sWidth) / 2);
          } else {
            sHeight = Math.round(sWidth / targetRatio);
            sy = Math.round((img.naturalHeight - sHeight) / 2);
          }

          thumbCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, thumbWidth, thumbHeight);
        }

        const thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.82);

        if (onProgress) onProgress(100);

        resolve({
          id,
          url: fullResDataUrl,
          thumbnailUrl: thumbDataUrl,
          width: targetWidth,
          height: targetHeight,
          fileSize: Math.round(fullResDataUrl.length * 0.75),
          isCover
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for resizing'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
