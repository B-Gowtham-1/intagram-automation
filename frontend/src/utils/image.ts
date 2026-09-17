import type { ImageItem } from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function calculateAspectRatio(width: number, height: number): { ratioStr: string; isNineSixteen: boolean } {
  if (!width || !height) {
    return { ratioStr: 'Unknown', isNineSixteen: false };
  }

  const ratio = width / height;
  const targetRatio = 9 / 16; // 0.5625

  // Check if it's 9:16 within 1.5% margin
  if (Math.abs(ratio - targetRatio) < 0.015) {
    return { ratioStr: '9:16', isNineSixteen: true };
  }

  // Check common standard ratios
  if (Math.abs(ratio - 1.0) < 0.015) {
    return { ratioStr: '1:1', isNineSixteen: false };
  }
  if (Math.abs(ratio - 4 / 5) < 0.015) {
    return { ratioStr: '4:5', isNineSixteen: false };
  }
  if (Math.abs(ratio - 16 / 9) < 0.015) {
    return { ratioStr: '16:9', isNineSixteen: false };
  }
  if (Math.abs(ratio - 4 / 3) < 0.015) {
    return { ratioStr: '4:3', isNineSixteen: false };
  }

  // Simplify ratio using greatest common divisor
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height));
  const simpleW = Math.round(width / divisor);
  const simpleH = Math.round(height / divisor);

  // If simplified numbers are reasonably small, return them, else return decimal format
  if (simpleW <= 20 && simpleH <= 20) {
    return { ratioStr: `${simpleW}:${simpleH}`, isNineSixteen: false };
  }

  return { ratioStr: `${ratio.toFixed(2)}:1`, isNineSixteen: false };
}

export async function processSelectedFile(file: File, index: number): Promise<ImageItem> {
  const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const previewUrl = URL.createObjectURL(file);

  // Basic MIME check
  const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const isMimeValid = validMimes.includes(file.type) || file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i);

  if (!isMimeValid) {
    return {
      id,
      file,
      previewUrl,
      filename: file.name,
      sizeBytes: file.size,
      width: 0,
      height: 0,
      aspectRatio: 'Unknown',
      isNineSixteen: false,
      isValid: false,
      validationError: 'Unsupported file format. Please upload JPG, PNG, or WEBP.',
      orderIndex: index,
    };
  }

  // Maximum file size check (20MB)
  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      id,
      file,
      previewUrl,
      filename: file.name,
      sizeBytes: file.size,
      width: 0,
      height: 0,
      aspectRatio: 'Unknown',
      isNineSixteen: false,
      isValid: false,
      validationError: `File size (${formatBytes(file.size)}) exceeds 20MB limit.`,
      orderIndex: index,
    };
  }

  // Inspect image readability and dimensions
  return new Promise<ImageItem>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { ratioStr, isNineSixteen } = calculateAspectRatio(img.naturalWidth, img.naturalHeight);
      resolve({
        id,
        file,
        previewUrl,
        filename: file.name,
        sizeBytes: file.size,
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: ratioStr,
        isNineSixteen,
        isValid: true,
        orderIndex: index,
      });
    };

    img.onerror = () => {
      resolve({
        id,
        file,
        previewUrl,
        filename: file.name,
        sizeBytes: file.size,
        width: 0,
        height: 0,
        aspectRatio: 'Unknown',
        isNineSixteen: false,
        isValid: false,
        validationError: 'Unable to read image. Please select another image.',
        orderIndex: index,
      });
    };

    img.src = previewUrl;
  });
}
