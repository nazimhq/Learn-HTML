'use client';

/* ----------------------------------------------------------------------------
   Perceptual image hashing — "find this product by its photo".

   Uses a difference hash (dHash): shrink the picture to 9×8 greyscale, then
   record whether each pixel is brighter than the one to its right. That gives
   64 bits which survive resizing, re-compression and moderate brightness
   changes, but change a lot between different products.

   It runs entirely in the browser on a canvas — no API, no key, no upload.
   It compares pictures, so it can be confidently wrong about two items that
   photograph alike; the match list is a shortlist for a person, never an
   answer (spec §18).
---------------------------------------------------------------------------- */

const W = 9;
const H = 8;

/** 64-bit dHash as 16 hex characters. */
export function hashFromImage(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if (!ctx) throw new Error('Canvas is unavailable in this browser');

  // a white ground, so transparent PNGs and SVGs hash consistently
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  const {data} = ctx.getImageData(0, 0, W, H);
  const grey: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    grey.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  let bits = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W - 1; x++) {
      bits += grey[y * W + x] > grey[y * W + x + 1] ? '1' : '0';
    }
  }

  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

export function hashFromSrc(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try { resolve(hashFromImage(img)); } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = src;
  });
}

/** Bits that differ between two hashes, 0..64. */
export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { diff += x & 1; x >>= 1; }
  }
  return diff;
}

/** 0..100. Identical pictures score 100. */
export function similarity(a: string, b: string): number {
  return Math.round(((64 - hamming(a, b)) / 64) * 100);
}

/* --------------------------- cache, so a repeat search is instant ---------- */

const cache = new Map<string, string>();

export async function hashCached(src: string): Promise<string> {
  const key = src.length > 256 ? src.slice(0, 128) + src.length : src;
  const hit = cache.get(key);
  if (hit) return hit;
  const hash = await hashFromSrc(src);
  cache.set(key, hash);
  return hash;
}

export type PhotoMatch<T> = {item: T; score: number};

/** Ranks candidates against one photo. Anything under `floor` is dropped. */
export async function findByPhoto<T extends {image: string}>(
  photo: string,
  candidates: T[],
  floor = 55
): Promise<Array<PhotoMatch<T>>> {
  const target = await hashCached(photo);
  const scored: Array<PhotoMatch<T>> = [];
  for (const item of candidates) {
    try {
      const score = similarity(target, await hashCached(item.image));
      if (score >= floor) scored.push({item, score});
    } catch {
      // an image that will not load simply cannot be matched
    }
  }
  return scored.sort((a, b) => b.score - a.score);
}

export function matchBand(score: number): {label: string; tone: 'good' | 'warn' | 'low'} {
  if (score >= 88) return {label: 'Very close', tone: 'good'};
  if (score >= 72) return {label: 'Possible match', tone: 'warn'};
  return {label: 'Weak — check carefully', tone: 'low'};
}
