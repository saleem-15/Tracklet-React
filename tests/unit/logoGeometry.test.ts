import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  analyzeCanvasPixels,
  detectLogoGeometry,
  getWrapperPadding,
  getImageClasses,
  isPixelEmpty,
  isPixelFilled,
  logoGeometryCache,
  CIRCLE_BREATHING_PADDING,
  UNKNOWN_SAFE_PADDING,
  GHOST_GLYPH_PADDING,
  GHOST_SQUARE_PADDING,
  GLYPH_SCALE_CLASS,
} from '../../src/lib/logoGeometry';

const SIZE = 32;

type Rgba = [number, number, number, number];

function makePixels(fill: Rgba | null): Uint8ClampedArray {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  if (!fill) return data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return data;
}

function setPixel(data: Uint8ClampedArray, x: number, y: number, rgba: Rgba): void {
  const i = (y * SIZE + x) * 4;
  data[i] = rgba[0];
  data[i + 1] = rgba[1];
  data[i + 2] = rgba[2];
  data[i + 3] = rgba[3];
}

function paintMidpoints(data: Uint8ClampedArray, rgba: Rgba): void {
  const midpoints: Array<[number, number]> = [
    [16, 1],
    [30, 16],
    [16, 30],
    [1, 16],
  ];
  midpoints.forEach(([x, y]) => setPixel(data, x, y, rgba));
}

const INK: Rgba = [25, 90, 200, 255];
const WHITE: Rgba = [255, 255, 255, 255];

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin: string | null = null;
  referrerPolicy = '';
  private source = '';

  set src(value: string) {
    this.source = value;
    if (value.includes('broken')) {
      this.onerror?.();
    } else {
      this.onload?.();
    }
  }

  get src(): string {
    return this.source;
  }
}

function stubImage(): void {
  vi.stubGlobal('Image', FakeImage);
}

describe('logoGeometry pixel helpers', () => {
  it('treats transparent and near-white pixels as empty', () => {
    expect(isPixelEmpty(0, 0, 0, 0)).toBe(true);
    expect(isPixelEmpty(12, 34, 56, 39)).toBe(true);
    expect(isPixelEmpty(245, 250, 255, 255)).toBe(true);
    expect(isPixelEmpty(239, 239, 239, 255)).toBe(true);
  });

  it('treats colored opaque pixels as filled', () => {
    expect(isPixelFilled(25, 90, 200, 255)).toBe(true);
    expect(isPixelFilled(25, 90, 200, 100)).toBe(true);
  });

  it('does not treat white, transparent, or translucent ink as filled', () => {
    expect(isPixelFilled(255, 255, 255, 255)).toBe(false);
    expect(isPixelFilled(0, 0, 0, 0)).toBe(false);
    expect(isPixelFilled(25, 90, 200, 50)).toBe(false);
  });
});

describe('analyzeCanvasPixels', () => {
  it('detects a circle: empty corners, filled edge midpoints', () => {
    const pixels = makePixels(WHITE);
    paintMidpoints(pixels, INK);
    expect(analyzeCanvasPixels(pixels, SIZE, SIZE)).toBe('circle');
  });

  it('detects a square tile: filled corners and filled midpoints', () => {
    expect(analyzeCanvasPixels(makePixels(INK), SIZE, SIZE)).toBe('square');
  });

  it('detects a floating glyph: empty corners and empty midpoints', () => {
    const pixels = makePixels(null);
    setPixel(pixels, 16, 16, INK);
    expect(analyzeCanvasPixels(pixels, SIZE, SIZE)).toBe('glyph');
  });

  it('returns unknown for ambiguous geometry', () => {
    const pixels = makePixels(WHITE);
    setPixel(pixels, 2, 2, INK);
    setPixel(pixels, 16, 1, INK);
    setPixel(pixels, 30, 16, INK);
    expect(analyzeCanvasPixels(pixels, SIZE, SIZE)).toBe('unknown');
  });
});

describe('detectLogoGeometry and 100% client-side sampling', () => {
  const url = 'https://cdn.example.com/mark.png';
  const googleUrl = 'https://www.google.com/s2/favicons?domain=postman.com&sz=128';

  afterEach(() => {
    logoGeometryCache.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('short-circuits CORS-restricted Google favicons directly to unknown with zero network proxy', async () => {
    const callback = vi.fn();
    await expect(detectLogoGeometry(googleUrl, callback)).resolves.toBe('unknown');
    expect(callback).toHaveBeenCalledWith('unknown');
    expect(logoGeometryCache.get(googleUrl)).toBe('unknown');
  });

  it('returns a cached classification synchronously without loading an image', async () => {
    logoGeometryCache.set(url, 'circle');
    const callback = vi.fn();

    await expect(detectLogoGeometry(url, callback)).resolves.toBe('circle');
    expect(callback).toHaveBeenCalledWith('circle');
  });

  it('returns unknown for empty URLs without caching', async () => {
    await expect(detectLogoGeometry('   ')).resolves.toBe('unknown');
    expect(logoGeometryCache.size).toBe(0);
  });

  it('classifies a loaded image with native CORS on client-side canvas and notifies callback', async () => {
    stubImage();
    const pixels = makePixels(WHITE);
    paintMidpoints(pixels, INK);

    const original = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') return original(tagName);
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: vi.fn(),
          getImageData: () => ({ data: pixels }),
        }),
      } as unknown as HTMLElement;
    }) as typeof document.createElement);

    const callback = vi.fn();
    await expect(detectLogoGeometry(url, callback)).resolves.toBe('circle');
    expect(callback).toHaveBeenCalledWith('circle');
    expect(logoGeometryCache.get(url)).toBe('circle');
  });

  it('recovers gracefully from a tainted-canvas SecurityError', async () => {
    stubImage();
    const original = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') return original(tagName);
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: vi.fn(),
          getImageData: () => {
            throw new DOMException('Tainted canvas', 'SecurityError');
          },
        }),
      } as unknown as HTMLElement;
    }) as typeof document.createElement);

    const callback = vi.fn();
    await expect(detectLogoGeometry(url, callback)).resolves.toBe('unknown');
    expect(callback).toHaveBeenCalledWith('unknown');
    expect(logoGeometryCache.get(url)).toBe('unknown');
  });

  it('resolves unknown when the image fails to load', async () => {
    stubImage();
    const callback = vi.fn();

    await expect(
      detectLogoGeometry('https://cdn.example.com/broken.png', callback)
    ).resolves.toBe('unknown');
    expect(callback).toHaveBeenCalledWith('unknown');
    expect(logoGeometryCache.get('https://cdn.example.com/broken.png')).toBe('unknown');
  });

  it('resolves unknown when the canvas context is unavailable', async () => {
    stubImage();
    const original = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') return original(tagName);
      return {
        width: 0,
        height: 0,
        getContext: () => null,
      } as unknown as HTMLElement;
    }) as typeof document.createElement);

    await expect(detectLogoGeometry(url)).resolves.toBe('unknown');
    expect(logoGeometryCache.get(url)).toBe('unknown');
  });
});

describe('Optical padding and scale tokens (Edge Cases 1 & 2)', () => {
  it('applies UNKNOWN_SAFE_PADDING in smart-keyline mode so unclassified circular marks never clip the keyline', () => {
    expect(getWrapperPadding('smart-keyline', 'xs', 'square', 'unknown')).toBe('p-[1.5px]');
    expect(getWrapperPadding('smart-keyline', 'sm', 'square', 'unknown')).toBe('p-0.5');
    expect(getWrapperPadding('smart-keyline', 'md', 'square', 'unknown')).toBe('p-1');
    expect(UNKNOWN_SAFE_PADDING.xs).toBe('p-[1.5px]');
  });

  it('applies CIRCLE_BREATHING_PADDING in smart-keyline mode for classified circles', () => {
    expect(getWrapperPadding('smart-keyline', 'xs', 'square', 'circle')).toBe('p-0.5');
    expect(getWrapperPadding('smart-keyline', 'md', 'square', 'circle')).toBe('p-1');
    expect(CIRCLE_BREATHING_PADDING.xs).toBe('p-0.5');
  });

  it('keeps square tiles and floating glyphs flush in smart-keyline mode', () => {
    expect(getWrapperPadding('smart-keyline', 'xs', 'square', 'square')).toBe('');
    expect(getWrapperPadding('smart-keyline', 'xs', 'square', 'glyph')).toBe('');
  });

  it('applies optical de-padding (GHOST_GLYPH_PADDING) for glyph marks in ghost-squircle mode', () => {
    expect(getWrapperPadding('ghost-squircle', 'xs', 'square', 'glyph')).toBe('p-0.5');
    expect(getWrapperPadding('ghost-squircle', 'md', 'square', 'glyph')).toBe('p-1');
    expect(GHOST_GLYPH_PADDING.xs).toBe('p-0.5');
    // Non-glyph squares keep full ghost squircle padding
    expect(getWrapperPadding('ghost-squircle', 'xs', 'square', 'square')).toBe('p-1');
    expect(GHOST_SQUARE_PADDING.xs).toBe('p-1');
  });

  it('applies GLYPH_SCALE_CLASS (scale-[1.14]) for glyph marks across modern display modes', () => {
    expect(getImageClasses('smart-keyline', 'xs', 'square', 'glyph')).toContain('scale-[1.14]');
    expect(getImageClasses('ghost-squircle', 'sm', 'square', 'glyph')).toContain('scale-[1.14]');
    expect(getImageClasses('pure-borderless', 'md', 'square', 'glyph')).toContain('scale-[1.14]');
    expect(GLYPH_SCALE_CLASS).toContain('scale-[1.14]');

    // Circles and squares do NOT receive glyph scale boost
    expect(getImageClasses('smart-keyline', 'xs', 'square', 'circle')).not.toContain('scale-[1.14]');
    expect(getImageClasses('smart-keyline', 'xs', 'square', 'square')).not.toContain('scale-[1.14]');

    // Original baseline mode never applies glyph scale boost
    expect(getImageClasses('original', 'xs', 'square', 'glyph')).not.toContain('scale-[1.14]');
  });
});
