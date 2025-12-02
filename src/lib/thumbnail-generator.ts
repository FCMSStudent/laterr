/**
 * Client-side thumbnail generation utilities
 * Generates preview thumbnails for images, PDFs, videos, and documents
 */

import { pdfjs, Document, Page } from 'react-pdf';
import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, THUMBNAIL_QUALITY } from '@/constants';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * Generates a thumbnail from an image file
 * @param file - Image file to generate thumbnail from
 * @returns Blob containing the thumbnail image (JPEG format)
 */
export async function generateImageThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate dimensions maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      const targetRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;

      let width = THUMBNAIL_WIDTH;
      let height = THUMBNAIL_HEIGHT;

      if (aspectRatio > targetRatio) {
        // Image is wider than target
        height = Math.round(THUMBNAIL_WIDTH / aspectRatio);
      } else {
        // Image is taller than target
        width = Math.round(THUMBNAIL_HEIGHT * aspectRatio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image scaled to fit
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail blob'));
          }
        },
        'image/jpeg',
        THUMBNAIL_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Generates a thumbnail from the first page of a PDF file
 * @param file - PDF file to generate thumbnail from
 * @returns Blob containing the thumbnail image (JPEG format)
 */
export async function generatePdfThumbnail(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(
    THUMBNAIL_WIDTH / viewport.width,
    THUMBNAIL_HEIGHT / viewport.height
  );
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  await page.render({
    canvasContext: ctx,
    viewport: scaledViewport,
    canvas: canvas,
  }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate PDF thumbnail blob'));
        }
      },
      'image/jpeg',
      THUMBNAIL_QUALITY
    );
  });
}

/**
 * Generates a thumbnail from a video file by capturing a frame
 * @param file - Video file to generate thumbnail from
 * @returns Blob containing the thumbnail image (JPEG format)
 */
export async function generateVideoThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% of video duration, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate dimensions maintaining aspect ratio
      const aspectRatio = video.videoWidth / video.videoHeight;
      const targetRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;

      let width = THUMBNAIL_WIDTH;
      let height = THUMBNAIL_HEIGHT;

      if (aspectRatio > targetRatio) {
        height = Math.round(THUMBNAIL_WIDTH / aspectRatio);
      } else {
        width = Math.round(THUMBNAIL_HEIGHT * aspectRatio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw video frame
      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate video thumbnail blob'));
          }
        },
        'image/jpeg',
        THUMBNAIL_QUALITY
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };

    video.src = url;
    video.load();
  });
}

/**
 * Generates a styled placeholder thumbnail for document files
 * @param file - Document file to generate thumbnail for
 * @param title - Title of the document
 * @returns Blob containing the thumbnail image (JPEG format)
 */
export async function generateDocumentThumbnail(
  file: File,
  title: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Document icon (simplified)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const iconSize = 60;
    const iconX = (canvas.width - iconSize) / 2;
    const iconY = canvas.height / 2 - iconSize;

    // Draw simple document icon shape
    ctx.beginPath();
    ctx.moveTo(iconX, iconY);
    ctx.lineTo(iconX + iconSize * 0.7, iconY);
    ctx.lineTo(iconX + iconSize, iconY + iconSize * 0.3);
    ctx.lineTo(iconX + iconSize, iconY + iconSize);
    ctx.lineTo(iconX, iconY + iconSize);
    ctx.closePath();
    ctx.fill();

    // Title text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate title if too long
    const maxWidth = canvas.width - 40;
    let displayTitle = title;
    if (ctx.measureText(displayTitle).width > maxWidth) {
      while (
        ctx.measureText(displayTitle + '...').width > maxWidth &&
        displayTitle.length > 0
      ) {
        displayTitle = displayTitle.slice(0, -1);
      }
      displayTitle += '...';
    }

    ctx.fillText(displayTitle, canvas.width / 2, canvas.height / 2 + iconSize);

    // File extension
    const ext = file.name.split('.').pop()?.toUpperCase() || 'DOC';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(ext, canvas.width / 2, canvas.height - 30);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate document thumbnail blob'));
        }
      },
      'image/jpeg',
      THUMBNAIL_QUALITY
    );
  });
}

/**
 * Main function to generate appropriate thumbnail based on file type
 * @param file - File to generate thumbnail from
 * @param title - Optional title for document placeholders
 * @returns Blob containing the thumbnail image
 */
export async function generateThumbnail(
  file: File,
  title?: string
): Promise<Blob> {
  if (file.type.startsWith('image/')) {
    return generateImageThumbnail(file);
  } else if (file.type === 'application/pdf') {
    return generatePdfThumbnail(file);
  } else if (file.type.startsWith('video/')) {
    return generateVideoThumbnail(file);
  } else {
    // For documents and other files, generate placeholder
    return generateDocumentThumbnail(file, title || file.name);
  }
}
