import type { ImageItem } from '../types';
import heic2any from 'heic2any';

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

export async function processSelectedFile(initialFile: File, index: number): Promise<ImageItem> {
  const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  let file = initialFile;
  let previewUrl = URL.createObjectURL(file);

  const isVideo = file.type.startsWith('video/') || Boolean(file.name.match(/\.(mp4|mov|webm)$/i));

  // 1. VIDEO HANDLING
  if (isVideo) {
    // 50MB max for video slides
    const maxVideoBytes = 50 * 1024 * 1024;
    if (file.size > maxVideoBytes) {
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
        validationError: `Video size (${formatBytes(file.size)}) exceeds 50MB limit.`,
        orderIndex: index,
        mediaType: 'VIDEO',
      };
    }

    return new Promise<ImageItem>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const timer = setTimeout(() => {
        // Fallback if video metadata takes too long
        resolve({
          id,
          file,
          previewUrl,
          filename: file.name,
          sizeBytes: file.size,
          width: 1080,
          height: 1920,
          aspectRatio: '9:16',
          isNineSixteen: true,
          isValid: true,
          orderIndex: index,
          mediaType: 'VIDEO',
          duration: 15,
        });
      }, 3000);

      video.onloadeddata = () => {
        clearTimeout(timer);
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };

      video.onseeked = () => {
        const vw = video.videoWidth || 1080;
        const vh = video.videoHeight || 1920;
        const { ratioStr, isNineSixteen } = calculateAspectRatio(vw, vh);

        // Generate poster frame thumbnail from video canvas
        let thumbUrl = previewUrl;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = vw;
          canvas.height = vh;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, vw, vh);
            thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch {
          thumbUrl = previewUrl;
        }

        resolve({
          id,
          file,
          previewUrl: thumbUrl,
          filename: file.name,
          sizeBytes: file.size,
          width: vw,
          height: vh,
          aspectRatio: ratioStr,
          isNineSixteen,
          isValid: true,
          orderIndex: index,
          mediaType: 'VIDEO',
          duration: Math.round(video.duration || 0),
        });
      };

      video.onerror = () => {
        clearTimeout(timer);
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
          validationError: 'Unable to decode video. Please select another MP4/MOV file.',
          orderIndex: index,
          mediaType: 'VIDEO',
        });
      };

      video.src = previewUrl;
    });
  }

  // 2. IMAGE HANDLING
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    Boolean(file.name.match(/\.(heic|heif)$/i));

  if (isHeic) {
    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.95,
      });
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      URL.revokeObjectURL(previewUrl);
      const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      file = new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
      previewUrl = URL.createObjectURL(file);
    } catch (err) {
      console.warn('Browser HEIC to JPEG conversion failed, passing original to backend:', err);
    }
  }

  const validImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const isImageValid = validImageMimes.includes(file.type) || Boolean(file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i));

  if (!isImageValid) {
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
      validationError: 'Unsupported format. Upload JPG, PNG, WEBP, or MP4/MOV.',
      orderIndex: index,
      mediaType: 'IMAGE',
    };
  }

  // Maximum image size check (20MB)
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
      mediaType: 'IMAGE',
    };
  }

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
        mediaType: 'IMAGE',
        rotation: 0,
        fitMode: 'cover',
        alignment: 'center',
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
        mediaType: 'IMAGE',
      });
    };

    img.src = previewUrl;
  });
}

/**
 * Transforms an image on HTML5 Canvas:
 * Rotates, fits or covers onto 1080x1920 canvas, and returns updated File and preview URL.
 */
export async function transformImageCanvas(
  file: File,
  options: {
    rotation: number;
    fitMode: 'cover' | 'contain';
    alignment: 'center' | 'top' | 'bottom' | 'left' | 'right';
  }
): Promise<{ file: File; previewUrl: string }> {
  const { rotation, fitMode, alignment } = options;

  return new Promise((resolve) => {
    const img = new Image();
    const sourceUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(sourceUrl);

      // Target Instagram 9:16 canvas size
      const targetW = 1080;
      const targetH = 1920;

      // 1. First offscreen canvas to handle rotation
      const rotCanvas = document.createElement('canvas');
      const rotCtx = rotCanvas.getContext('2d')!;
      const rotRad = (rotation * Math.PI) / 180;
      const is90or270 = rotation % 180 !== 0;

      const origW = img.naturalWidth;
      const origH = img.naturalHeight;
      rotCanvas.width = is90or270 ? origH : origW;
      rotCanvas.height = is90or270 ? origW : origH;

      rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rotCtx.rotate(rotRad);
      rotCtx.drawImage(img, -origW / 2, -origH / 2);

      const rw = rotCanvas.width;
      const rh = rotCanvas.height;

      // 2. Final 9:16 composition canvas
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = targetW;
      finalCanvas.height = targetH;
      const ctx = finalCanvas.getContext('2d')!;

      if (fitMode === 'contain') {
        // Dark slate backdrop
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, targetW, targetH);

        // Proportional scale to fit inside 1080x1920
        const scale = minMaxScale(rw, rh, targetW, targetH);
        const dw = Math.round(rw * scale);
        const dh = Math.round(rh * scale);
        const dx = (targetW - dw) / 2;
        const dy = (targetH - dh) / 2;

        ctx.drawImage(rotCanvas, dx, dy, dw, dh);
      } else {
        // Cover / Fill mode: Crop to 9:16 with alignment
        const targetRatio = targetW / targetH;
        const currentRatio = rw / rh;

        let srcX = 0;
        let srcY = 0;
        let srcW = rw;
        let srcH = rh;

        if (currentRatio > targetRatio) {
          // Wider: crop left/right
          srcW = Math.round(rh * targetRatio);
          if (alignment === 'left') {
            srcX = 0;
          } else if (alignment === 'right') {
            srcX = rw - srcW;
          } else {
            srcX = (rw - srcW) / 2;
          }
        } else {
          // Taller: crop top/bottom
          srcH = Math.round(rw / targetRatio);
          if (alignment === 'top') {
            srcY = 0;
          } else if (alignment === 'bottom') {
            srcY = rh - srcH;
          } else {
            srcY = (rh - srcH) / 2;
          }
        }

        ctx.drawImage(rotCanvas, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);
      }

      finalCanvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ file, previewUrl: URL.createObjectURL(file) });
            return;
          }
          const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '_edited.jpg', {
            type: 'image/jpeg',
          });
          const previewUrl = URL.createObjectURL(newFile);
          resolve({ file: newFile, previewUrl });
        },
        'image/jpeg',
        0.95
      );
    };

    img.onerror = () => {
      resolve({ file, previewUrl: URL.createObjectURL(file) });
    };

    img.src = sourceUrl;
  });
}

function minMaxScale(w: number, h: number, maxW: number, maxH: number): number {
  return Math.min(maxW / w, maxH / h);
}
