'use client';

/** Downscales a picked photo before it goes into localStorage. Full-size camera
 *  images blow the ~5MB quota after two or three products. */
export function fileToDataUrl(file: File, maxEdge = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('That file is not an image')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode that image'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas is unavailable')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Neutral stand-in so a product without a photo still has a card image. */
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">' +
    '<rect width="900" height="600" fill="#eef2f6"/>' +
    '<rect x="330" y="200" width="240" height="180" rx="16" fill="#cfd8e3"/>' +
    '<circle cx="396" cy="258" r="22" fill="#eef2f6"/>' +
    '<path d="M348 372l72-76 54 52 40-34 78 58z" fill="#eef2f6"/>' +
    '<text x="450" y="440" font-family="Inter,Arial,sans-serif" font-size="26" fill="#8b95a7" text-anchor="middle">No photo yet</text>' +
    '</svg>');
