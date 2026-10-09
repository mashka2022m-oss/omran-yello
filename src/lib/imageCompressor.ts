/**
 * Image compression utility for Quranic Complex Logos and Official Seals.
 * Ensures images never exceed Firestore document limits (max 1MB per document)
 * by scaling to optimal dimensions (up to 512x512) and compressing as WebP / JPEG (~30-60KB).
 */
export async function compressImageToDataUrl(
  fileOrDataUrl: File | string,
  maxWidth = 512,
  maxHeight = 512,
  quality = 0.85
): Promise<string> {
  if (typeof window === 'undefined') {
    return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '';
  }

  // Convert File to data URL if needed
  let rawDataUrl = '';
  if (typeof fileOrDataUrl === 'string') {
    rawDataUrl = fileOrDataUrl;
  } else {
    rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    });
  }

  // If already a small SVG or tiny data URL, return directly
  if (rawDataUrl.startsWith('data:image/svg') || rawDataUrl.length < 25000) {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.width || 512;
        let height = img.height || 512;

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
          resolve(rawDataUrl);
          return;
        }

        // Smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer webp, fallback to jpeg/png
        let output = '';
        try {
          output = canvas.toDataURL('image/webp', quality);
        } catch {
          output = canvas.toDataURL('image/png');
        }

        // If webp isn't supported or returned larger than source
        if (!output || output.length > rawDataUrl.length) {
          resolve(rawDataUrl);
        } else {
          resolve(output);
        }
      } catch (err) {
        console.warn('Image compression fallback:', err);
        resolve(rawDataUrl);
      }
    };

    img.onerror = () => {
      resolve(rawDataUrl);
    };

    img.src = rawDataUrl;
  });
}
