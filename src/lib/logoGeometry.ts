/**
 * Geometric logo classification (circle / square tile / floating glyph) and optical sizing engine.
 *
 * Brand logos that ship as 1:1 squares with zero transparent margin touch the
 * outer keyline at the cardinal tangent points. Sampling 4 corners + 4 edge
 * midpoints on a normalized 32x32 canvas reliably separates circular marks from
 * full-bleed square tiles and floating glyphs.
 */

import { LogoPatternMode } from './logoUtils';

export type LogoGeometry = 'circle' | 'square' | 'glyph' | 'unknown';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LogoShape = 'square' | 'wide' | 'tall';

/** In-memory session cache: url -> geometry. */
export const logoGeometryCache = new Map<string, LogoGeometry>();

export const SAMPLE_SIZE = 32;

/** Transparent PNGs or white/near-white JPEG backgrounds (Brandfetch compression noise). */
export function isPixelEmpty(r: number, g: number, b: number, a: number): boolean {
  return a < 40 || (r > 238 && g > 238 && b > 238);
}

/** A pixel that carries opaque, non-white ink. */
export function isPixelFilled(r: number, g: number, b: number, a: number): boolean {
  return !isPixelEmpty(r, g, b, a) && a >= 100;
}

function isPointFilled(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const i = (y * width + x) * 4;
  return isPixelFilled(data[i], data[i + 1], data[i + 2], data[i + 3]);
}

/**
 * 8-point detector:
 * - corners empty (>=3) + midpoints filled (>=3) = circle
 * - corners filled (<=1 empty) + midpoints filled (>=3) = square tile
 * - corners empty (>=3) + midpoints empty (<=2) = floating glyph (Apple, Jahez, Notion)
 */
export function analyzeCanvasPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number
): LogoGeometry {
  const corners: Array<[number, number]> = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
  ];
  const midpoints: Array<[number, number]> = [
    [Math.floor(width / 2), 1],
    [width - 2, Math.floor(height / 2)],
    [Math.floor(width / 2), height - 2],
    [1, Math.floor(height / 2)],
  ];

  let cornersEmptyCount = 0;
  for (const [x, y] of corners) {
    if (!isPointFilled(data, width, height, x, y)) cornersEmptyCount += 1;
  }

  let midpointsFilledCount = 0;
  for (const [x, y] of midpoints) {
    if (isPointFilled(data, width, height, x, y)) midpointsFilledCount += 1;
  }

  if (cornersEmptyCount >= 3 && midpointsFilledCount >= 3) return 'circle';
  if (cornersEmptyCount <= 1 && midpointsFilledCount >= 3) return 'square';
  if (cornersEmptyCount >= 3 && midpointsFilledCount <= 1) return 'glyph';
  return 'unknown';
}

/**
 * Sample a logo URL on an offscreen canvas and classify its geometry.
 * 100% pure client-side: never uses a backend proxy.
 * Providers with native CORS (Brandfetch, Unavatar) sample cleanly.
 * Providers without CORS (Google favicons) or offline contexts safely resolve to 'unknown'.
 */
export function detectLogoGeometry(
  url: string,
  callback?: (geometry: LogoGeometry) => void
): Promise<LogoGeometry> {
  if (!url || !url.trim()) return Promise.resolve('unknown');

  const cached = logoGeometryCache.get(url);
  if (cached) {
    callback?.(cached);
    return Promise.resolve(cached);
  }

  const finalize = (geometry: LogoGeometry): LogoGeometry => {
    logoGeometryCache.set(url, geometry);
    callback?.(geometry);
    return geometry;
  };

  // Google Favicons do not send CORS headers (Access-Control-Allow-Origin: *).
  // Rather than introducing an insecure server-side proxy, we short-circuit Google URLs
  // directly to 'unknown'. In Smart Keyline, 'unknown' applies UNKNOWN_SAFE_PADDING
  // (p-[1.5px] on xs), which guarantees circular and edge-to-edge marks (Postman,
  // Spotify, Netflix) never touch the keyline border while keeping all logic 100% client-side.
  if (
    url.startsWith('https://www.google.com/s2/favicons') ||
    url.startsWith('https://t1.gstatic.com/faviconV2') ||
    url.startsWith('https://t0.gstatic.com/faviconV2') ||
    url.startsWith('https://t2.gstatic.com/faviconV2') ||
    url.startsWith('https://t3.gstatic.com/faviconV2')
  ) {
    return Promise.resolve(finalize('unknown'));
  }

  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve('unknown');
  }

  return new Promise<LogoGeometry>((resolve) => {
    let settled = false;
    const safeResolve = (val: LogoGeometry) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(val);
      }
    };

    const timer = setTimeout(() => safeResolve('unknown'), 2500);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = SAMPLE_SIZE;
          canvas.height = SAMPLE_SIZE;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            safeResolve('unknown');
            return;
          }

          ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
          const imgData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
          safeResolve(analyzeCanvasPixels(imgData.data, SAMPLE_SIZE, SAMPLE_SIZE));
        } catch {
          // SecurityError from a tainted canvas or failed read: recover silently.
          safeResolve('unknown');
        }
      };

      img.onerror = () => safeResolve('unknown');

      img.src = url;
    } catch {
      safeResolve('unknown');
    }
  }).then((detected) => finalize(detected));
}

export function classifyLogoShape(naturalWidth: number, naturalHeight: number): LogoShape {
  if (!naturalWidth || !naturalHeight) return 'square';
  const ratio = naturalWidth / naturalHeight;
  if (ratio > 1.15) return 'wide';
  if (ratio < 0.85) return 'tall';
  return 'square';
}

/** Optical padding for square marks in ghost-squircle mode. */
export const GHOST_SQUARE_PADDING: Record<LogoSize, string> = {
  xs: 'p-1', sm: 'p-1.5', md: 'p-2', lg: 'p-2.5', xl: 'p-3',
};

/** Tighter optical padding for wide/tall marks. */
export const GHOST_RECT_PADDING: Record<LogoSize, string> = {
  xs: 'p-0.5', sm: 'p-1', md: 'p-1.5', lg: 'p-2', xl: 'p-2.5',
};

/**
 * Optical de-padding for floating glyphs (Apple, Jahez, Notion) in ghost-squircle mode.
 * Because glyphs arrive with built-in margins, tight container padding prevents double-shrinkage.
 */
export const GHOST_GLYPH_PADDING: Record<LogoSize, string> = {
  xs: 'p-0.5', sm: 'p-0.5', md: 'p-1', lg: 'p-1.5', xl: 'p-2',
};

/** Circular marks receive breathing room so they never clip the keyline at 12/3/6/9 o'clock. */
export const CIRCLE_BREATHING_PADDING: Record<LogoSize, string> = {
  xs: 'p-0.5', sm: 'p-1', md: 'p-1', lg: 'p-1.5', xl: 'p-2',
};

/**
 * Universal safe micro-inset on unknown geometry in Smart Keyline mode.
 * Guarantees unclassified circular marks (Postman, Spotify) and edge-to-edge marks (Netflix)
 * float 1.5px clear of the 1px keyline on Frame 0, completely preventing edge collisions.
 */
export const UNKNOWN_SAFE_PADDING: Record<LogoSize, string> = {
  xs: 'p-[1.5px]', sm: 'p-0.5', md: 'p-1', lg: 'p-1', xl: 'p-1.5',
};

/** Baseline image padding for original production mode. */
export const ORIGINAL_IMG_PADDING: Record<LogoSize, string> = {
  xs: '', sm: 'p-1', md: 'p-1.5', lg: 'p-2', xl: 'p-2.5',
};

/** Concentric inner image corner radius for shrink-wrapped square/rectangular logos. */
export const INNER_IMG_RADIUS: Record<LogoSize, string> = {
  xs: 'rounded-[3px]', sm: 'rounded-[4px]', md: 'rounded-md', lg: 'rounded-lg', xl: 'rounded-lg',
};

/**
 * Optical scale boost for floating glyph marks (Apple, Jahez, Notion, Stripe).
 * Compensates for large built-in transparent margins so glyphs match the visual presence of filled tiles.
 */
export const GLYPH_SCALE_CLASS =
  'scale-[1.14] transition-transform duration-150 motion-reduce:transition-none';

export function getWrapperPadding(
  mode: LogoPatternMode,
  size: LogoSize,
  shape: LogoShape,
  geometry?: LogoGeometry
): string {
  if (mode === 'ghost-squircle') {
    if (geometry === 'glyph') return GHOST_GLYPH_PADDING[size];
    return shape !== 'square' ? GHOST_RECT_PADDING[size] : GHOST_SQUARE_PADDING[size];
  }
  if (mode === 'smart-keyline') {
    if (geometry === 'circle') return CIRCLE_BREATHING_PADDING[size];
    if (geometry === 'unknown') return UNKNOWN_SAFE_PADDING[size];
    return '';
  }
  if (mode === 'pure-borderless') {
    if (geometry === 'circle') return CIRCLE_BREATHING_PADDING[size];
    return '';
  }
  return '';
}

export function getShapeFitClasses(shape: LogoShape): string {
  switch (shape) {
    case 'wide':
      return 'w-full h-auto max-h-full object-contain';
    case 'tall':
      return 'h-full w-auto max-w-full object-contain';
    case 'square':
    default:
      return 'w-full h-full object-contain';
  }
}

export function getImageClasses(
  mode: LogoPatternMode,
  size: LogoSize,
  shape: LogoShape,
  geometry?: LogoGeometry
): string {
  const fit = getShapeFitClasses(shape);
  const glyphScale = geometry === 'glyph' && mode !== 'original' ? GLYPH_SCALE_CLASS : '';

  switch (mode) {
    case 'ghost-squircle':
      return `${fit} ${INNER_IMG_RADIUS[size]} ${glyphScale}`.trim();
    case 'pure-borderless':
    case 'smart-keyline':
      return `${fit} rounded-[inherit] ${glyphScale}`.trim();
    case 'original':
    default:
      return `w-full h-full object-contain ${ORIGINAL_IMG_PADDING[size]}`.trim();
  }
}
