/**
 * Client-side thumbnail generation utilities
 * Generates preview thumbnails for images, PDFs, videos, and documents
 */

import { pdfjs } from 'react-pdf';
import mammoth from 'mammoth';
import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, THUMBNAIL_QUALITY } from '@/constants';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// DOCX thumbnail constants
const DOCX_MAX_CONTENT_HEIGHT = 1000;
const DOCX_MAX_LINES = 30;
const DOCX_MAX_LINE_LENGTH = 100;
const DOCX_PADDING = 40;

export async function generateImageThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Failed to get canvas context')); return; }
      const aspectRatio = img.width / img.height;
      const targetRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;
      let width = THUMBNAIL_WIDTH, height = THUMBNAIL_HEIGHT;
      if (aspectRatio > targetRatio) { height = Math.round(THUMBNAIL_WIDTH / aspectRatio); }
      else { width = Math.round(THUMBNAIL_HEIGHT * aspectRatio); }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed')), 'image/jpeg', THUMBNAIL_QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

export async function generatePdfThumbnail(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(THUMBNAIL_WIDTH / viewport.width, THUMBNAIL_HEIGHT / viewport.height);
  const scaledViewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;
  await page.render({ canvasContext: ctx, viewport: scaledViewport } as any).promise;
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed')), 'image/jpeg', THUMBNAIL_QUALITY);
  });
}

export async function generateVideoThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration * 0.1); };
    video.onseeked = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Failed')); return; }
      const aspectRatio = video.videoWidth / video.videoHeight;
      const targetRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;
      let width = THUMBNAIL_WIDTH, height = THUMBNAIL_HEIGHT;
      if (aspectRatio > targetRatio) { height = Math.round(THUMBNAIL_WIDTH / aspectRatio); }
      else { width = Math.round(THUMBNAIL_HEIGHT * aspectRatio); }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed')), 'image/jpeg', THUMBNAIL_QUALITY);
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed')); };
    video.src = url;
    video.load();
  });
}

export async function generateDocxThumbnail(file: File): Promise<Blob> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;width:816px;padding:40px;background:white;font:14px system-ui;line-height:1.5;color:#000';
    container.innerHTML = result.value;
    document.body.appendChild(container);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { document.body.removeChild(container); throw new Error('Failed'); }
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const textContent = container.innerText || '';
    const lines = textContent.split('\n').slice(0, DOCX_MAX_LINES);
    ctx.fillStyle = '#000000';
    ctx.font = '14px system-ui';
    let y = DOCX_PADDING;
    for (const line of lines) {
      if (y > canvas.height - DOCX_PADDING) break;
      ctx.fillText(line.substring(0, DOCX_MAX_LINE_LENGTH), DOCX_PADDING, y);
      y += 20;
    }
    document.body.removeChild(container);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed')), 'image/jpeg', THUMBNAIL_QUALITY);
    });
  } catch (error) {
    console.warn('DOCX thumbnail failed:', error);
    return generateDocumentThumbnail(file, file.name);
  }
}

export async function generateDocumentThumbnail(file: File, title: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Failed')); return; }
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const iconSize = 60, iconX = (canvas.width - iconSize) / 2, iconY = canvas.height / 2 - iconSize;
    ctx.beginPath();
    ctx.moveTo(iconX, iconY);
    ctx.lineTo(iconX + iconSize * 0.7, iconY);
    ctx.lineTo(iconX + iconSize, iconY + iconSize * 0.3);
    ctx.lineTo(iconX + iconSize, iconY + iconSize);
    ctx.lineTo(iconX, iconY + iconSize);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let displayTitle = title;
    const maxWidth = canvas.width - 40;
    if (ctx.measureText(displayTitle).width > maxWidth) {
      while (ctx.measureText(displayTitle + '...').width > maxWidth && displayTitle.length > 0) displayTitle = displayTitle.slice(0, -1);
      displayTitle += '...';
    }
    ctx.fillText(displayTitle, canvas.width / 2, canvas.height / 2 + iconSize);
    const ext = file.name.split('.').pop()?.toUpperCase() || 'DOC';
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(ext, canvas.width / 2, canvas.height - 30);
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed')), 'image/jpeg', THUMBNAIL_QUALITY);
  });
}

export async function generateThumbnail(file: File, title?: string): Promise<Blob> {
  if (file.type.startsWith('image/')) return generateImageThumbnail(file);
  if (file.type === 'application/pdf') return generatePdfThumbnail(file);
  if (file.type.startsWith('video/')) return generateVideoThumbnail(file);
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) return generateDocxThumbnail(file);
  return generateDocumentThumbnail(file, title || file.name);
}
