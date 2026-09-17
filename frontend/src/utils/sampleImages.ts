import type { ImageItem } from '../types';
import { processSelectedFile } from './image';

/**
 * Creates a canvas-drawn test image with explicit dimensions and label.
 */
function createTestImageBlob(width: number, height: number, label: string, color: string): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, color);
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative frame
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = Math.max(4, width * 0.015);
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Text Label
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.max(24, Math.floor(width / 12))}px sans-serif`;
    ctx.fillText(label, width / 2, height / 2 - 30);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `${Math.max(16, Math.floor(width / 20))}px monospace`;
    ctx.fillText(`${width} × ${height}`, width / 2, height / 2 + 20);

    canvas.toBlob(
      (blob) => {
        resolve(blob || new Blob());
      },
      'image/jpeg',
      0.9
    );
  });
}

/**
 * Generates sample images representing various aspect ratios and conditions for testing.
 */
export async function generateTestImages(): Promise<ImageItem[]> {
  const configs = [
    { name: 'photo1_9x16.jpg', w: 1080, h: 1920, label: 'Slide 1 (9:16)', color: '#ec4899' },
    { name: 'photo2_square.jpg', w: 1080, h: 1080, label: 'Slide 2 (1:1)', color: '#8b5cf6' },
    { name: 'photo3_portrait.jpg', w: 1080, h: 1350, label: 'Slide 3 (4:5)', color: '#3b82f6' },
    { name: 'photo4_landscape.jpg', w: 1920, h: 1080, label: 'Slide 4 (16:9)', color: '#10b981' },
  ];

  const results: ImageItem[] = [];

  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    const blob = await createTestImageBlob(cfg.w, cfg.h, cfg.label, cfg.color);
    const file = new File([blob], cfg.name, { type: 'image/jpeg' });
    const item = await processSelectedFile(file, i);
    results.push(item);
  }

  return results;
}

/**
 * Generates a corrupt dummy file to verify error handling.
 */
export async function generateCorruptImage(): Promise<ImageItem> {
  const badContent = new Blob(['this-is-not-a-valid-image-file-header'], { type: 'image/jpeg' });
  const badFile = new File([badContent], 'corrupted_image.jpg', { type: 'image/jpeg' });
  return processSelectedFile(badFile, 999);
}
