import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CompanyLogo } from '../../src/components/CompanyLogo';
import { useCompanyLogoDesignLab, LOGO_LAB_VARIANTS } from '../../src/dev/useCompanyLogoDesignLab';
import { getActiveDesignLab } from '../../src/dev/designLabRegistry';
import {
  BRANDFETCH_CLIENT_ID_STORAGE_KEY,
  LOGO_SOURCE_STORAGE_KEY,
  getCompanyCacheKey,
  getSavedLogoPattern,
  getSavedLogoSource,
  setBrandfetchClientId,
  setSavedLogoPattern,
  setSavedLogoSource,
  LOGO_PATTERN_MODES,
  LOGO_PATTERN_STORAGE_KEY,
  verifiedLogoCache,
  type LogoPatternMode,
} from '../../src/lib/logoUtils';
import { logoGeometryCache } from '../../src/lib/logoGeometry';

// Fixture logos are supplied explicitly so no network URLs need to resolve in happy-dom.
const LOGO_URL = 'https://cdn.example.com/acme-logo.png';

// React 19 needs this flag for act() to flush updates synchronously in tests.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** happy-dom reports 0x0 / incomplete images; pretend the fixture decoded at 128x128. */
function stubDecodedImage(): void {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(128);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(128);
}

describe('CompanyLogo display modes (Design Variants Lab)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    verifiedLogoCache.clear();
    logoGeometryCache.clear();
    stubDecodedImage();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
    verifiedLogoCache.clear();
    logoGeometryCache.clear();
    vi.restoreAllMocks();
  });

  const render = (ui: React.ReactElement) => {
    act(() => {
      root.render(ui);
    });
  };

  const outerBox = () => container.firstElementChild as HTMLElement;

  describe('persistence and defaults', () => {
    it('defaults to "ghost-squircle" when nothing is stored', () => {
      expect(getSavedLogoPattern()).toBe('ghost-squircle');
    });

    it('accepts all four supported modes from localStorage', () => {
      LOGO_PATTERN_MODES.forEach((mode) => {
        localStorage.setItem(LOGO_PATTERN_STORAGE_KEY, mode);
        expect(getSavedLogoPattern()).toBe(mode);
      });
    });

    it('falls back to "ghost-squircle" for legacy or unknown stored values', () => {
      ['combined', 'island', 'blend', 'nonsense', ''].forEach((value) => {
        localStorage.setItem(LOGO_PATTERN_STORAGE_KEY, value);
        expect(getSavedLogoPattern()).toBe('ghost-squircle');
      });
    });

    it('persists the selected mode and dispatches a detail-carrying custom event', () => {
      const listener = vi.fn();
      window.addEventListener('tracklet:logo-pattern-changed', listener);

      setSavedLogoPattern('smart-keyline');

      expect(localStorage.getItem(LOGO_PATTERN_STORAGE_KEY)).toBe('smart-keyline');
      expect(getSavedLogoPattern()).toBe('smart-keyline');
      expect(listener).toHaveBeenCalledTimes(1);
      expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('smart-keyline');

      window.removeEventListener('tracklet:logo-pattern-changed', listener);
    });
  });

  describe('ghost-squircle (default)', () => {
    it('renders the quiet tinted squircle with multiply blend by default', () => {
      render(<CompanyLogo company="Acme" logoUrl={LOGO_URL} size="md" />);

      const box = outerBox();
      expect(box.className).toContain('bg-slate-500/[0.04]');
      expect(box.className).toContain('ring-1');
      expect(box.className).toContain('ring-inset');
      expect(box.className).toContain('ring-slate-900/[0.05]');
      expect(box.className).toContain('select-none');
      expect(box.className).toContain('w-12');
      expect(box.className).toContain('h-12');
      expect(box.className).toContain('rounded-xl');
      expect(box.className).toContain('p-2');
      expect(box.className).not.toContain('bg-white');
      expect(box.className).not.toContain('border border-slate-200');

      const img = container.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.className).toContain('w-full');
      expect(img?.className).toContain('h-full');
      expect(img?.className).toContain('object-contain');
      expect(img?.className).toContain('rounded-md');
      expect(img?.className).not.toContain('rounded-[inherit]');
      expect(img?.style.mixBlendMode).toBe('multiply');
      expect(container.querySelector('[data-testid="logo-smart-keyline"]')).toBeNull();
    });

    it('uses the calibrated size box and padding for every size', () => {
      const expectations: {
        size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
        box: string[];
        padding: string;
      }[] = [
        { size: 'xs', box: ['w-7', 'h-7', 'rounded-md'], padding: 'p-1' },
        { size: 'sm', box: ['w-[38px]', 'h-[38px]', 'rounded-lg'], padding: 'p-1.5' },
        { size: 'md', box: ['w-12', 'h-12', 'rounded-xl'], padding: 'p-2' },
        { size: 'lg', box: ['w-14', 'h-14', 'rounded-2xl'], padding: 'p-2.5' },
        { size: 'xl', box: ['w-[76px]', 'h-[76px]', 'rounded-2xl'], padding: 'p-3' },
      ];

      expectations.forEach(({ size, box, padding }) => {
        render(<CompanyLogo company="Acme" logoUrl={LOGO_URL} size={size} pattern="ghost-squircle" />);
        expect(outerBox().className).toEqual(expect.stringContaining(box.join(' ')));
        expect(outerBox().className).toContain(padding);
        expect(container.querySelector('img')?.className).toContain('w-full h-full object-contain');
      });
    });

    it('applies tighter optical padding and aspect-locked fit for wide logos on load', () => {
      render(<CompanyLogo company="WideCo" logoUrl={LOGO_URL} size="md" pattern="ghost-squircle" />);
      const img = container.querySelector('img') as HTMLImageElement;
      Object.defineProperty(img, 'naturalWidth', { value: 240, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 100, configurable: true });

      act(() => {
        img.dispatchEvent(new Event('load'));
      });

      expect(outerBox().className).toContain('p-1.5');
      expect(img.className).toContain('w-full h-auto max-h-full object-contain');
    });

    it('passes the title through to the outer element', () => {
      render(<CompanyLogo company="Acme" logoUrl={LOGO_URL} title="Acme Inc." />);
      expect(outerBox().getAttribute('title')).toBe('Acme Inc.');
    });
  });

  describe('pure-borderless', () => {
    it('renders a full-bleed transparent squircle with rounded-[inherit] and multiply blend', () => {
      render(<CompanyLogo company="Anthropic" logoUrl={LOGO_URL} size="md" pattern="pure-borderless" />);

      const box = outerBox();
      expect(box.className).toContain('bg-transparent');
      expect(box.className).toContain('border-0');
      expect(box.className).toContain('shadow-none');
      expect(box.className).toContain('select-none');
      expect(box.className).toContain('rounded-xl');
      expect(box.className).not.toContain('p-1');

      const img = container.querySelector('img');
      expect(img?.className).toContain('w-full h-full object-contain');
      expect(img?.className).toContain('rounded-[inherit]');
      expect(img?.style.mixBlendMode).toBe('multiply');
      expect(container.querySelector('[data-testid="logo-smart-keyline"]')).toBeNull();
    });
  });

  describe('smart-keyline', () => {
    it('renders the transparent container plus a subtle inner keyline overlay', () => {
      render(<CompanyLogo company="Linear" logoUrl={LOGO_URL} size="lg" pattern="smart-keyline" />);

      const box = outerBox();
      expect(box.className).toContain('bg-transparent');
      expect(box.className).toContain('border-0');
      expect(box.className).toContain('shadow-none');
      expect(box.className).toContain('rounded-2xl');

      const img = container.querySelector('img');
      expect(img?.className).toContain('w-full h-full object-contain');
      expect(img?.className).toContain('rounded-[inherit]');
      expect(img?.style.mixBlendMode).toBe('multiply');

      const keyline = container.querySelector('[data-testid="logo-smart-keyline"]');
      expect(keyline).toBeTruthy();
      expect(keyline?.getAttribute('aria-hidden')).toBe('true');
      expect(keyline?.className).toContain('pointer-events-none');
      expect(keyline?.className).toContain('absolute');
      expect(keyline?.className).toContain('inset-0');
      expect(keyline?.className).toContain('rounded-[inherit]');
      expect(keyline?.className).toContain('ring-1');
      expect(keyline?.className).toContain('ring-inset');
      expect(keyline?.className).toContain('ring-slate-900/[0.07]');
    });

    it('does not render the keyline when the fallback icon is shown', () => {
      render(<CompanyLogo company="" size="md" pattern="smart-keyline" />);

      expect(container.querySelector('svg')).toBeTruthy();
      expect(container.querySelector('[data-testid="logo-smart-keyline"]')).toBeNull();
    });
  });

  describe('smart-keyline geometric breathing room', () => {
    it('applies circle breathing padding for xs (p-0.5) from cached geometry', () => {
      logoGeometryCache.set(LOGO_URL, 'circle');
      render(<CompanyLogo company="Postman" logoUrl={LOGO_URL} size="xs" pattern="smart-keyline" />);

      const box = outerBox();
      expect(box.className).toContain('p-0.5');
      expect(box.className).toContain('w-7');
      expect(box.className).toContain('h-7');
      expect(container.querySelector('img')).toBeTruthy();
    });

    it('applies circle breathing padding for sm and md (p-1) from cached geometry', () => {
      (['sm', 'md'] as const).forEach((size) => {
        logoGeometryCache.set(LOGO_URL, 'circle');
        render(<CompanyLogo company="Spotify" logoUrl={LOGO_URL} size={size} pattern="smart-keyline" />);
        expect(outerBox().className).toContain('p-1');
      });
    });

    it('does not pad square tiles in smart-keyline mode', () => {
      logoGeometryCache.set(LOGO_URL, 'square');
      render(<CompanyLogo company="Ramp" logoUrl={LOGO_URL} size="xs" pattern="smart-keyline" />);

      const box = outerBox();
      expect(box.className).not.toMatch(/\bp-[0-9.]+\b/);
      expect(box.className).toContain('w-7');
      expect(box.className).toContain('h-7');
    });

    it('keeps glyph marks unboxed in smart-keyline mode', () => {
      logoGeometryCache.set(LOGO_URL, 'glyph');
      render(<CompanyLogo company="Notion" logoUrl={LOGO_URL} size="md" pattern="smart-keyline" />);

      expect(outerBox().className).not.toMatch(/\bp-[0-9.]+\b/);
    });

    it('renders cached geometry immediately on Frame 0 with zero layout shift', () => {
      logoGeometryCache.set(LOGO_URL, 'circle');
      render(<CompanyLogo company="Postman" logoUrl={LOGO_URL} size="xs" pattern="smart-keyline" />);

      // The very first paint (before any async detection) already owns the padded frame.
      const box = outerBox();
      expect(box.className).toContain('p-0.5');
      expect(container.querySelector('[data-testid="logo-smart-keyline"]')).toBeTruthy();
      expect(logoGeometryCache.get(LOGO_URL)).toBe('circle');
    });

    it('Edge Case 2: applies UNKNOWN_SAFE_PADDING (p-[1.5px] on xs) for unclassified marks in smart-keyline so circular favicons never clip', () => {
      // Unclassified logo (geometry === 'unknown')
      render(<CompanyLogo company="Postman" logoUrl={LOGO_URL} size="xs" pattern="smart-keyline" />);

      const box = outerBox();
      expect(box.className).toContain('p-[1.5px]');
      expect(container.querySelector('[data-testid="logo-smart-keyline"]')).toBeTruthy();
    });

    it('Edge Case 1: applies optical scale boost (scale-[1.14]) for glyph logos (Apple, Jahez)', () => {
      logoGeometryCache.set(LOGO_URL, 'glyph');
      render(<CompanyLogo company="Apple" logoUrl={LOGO_URL} size="xs" pattern="smart-keyline" />);

      const img = container.querySelector('img');
      expect(img?.className).toContain('scale-[1.14]');
      expect(img?.className).toContain('transition-transform');
      expect(outerBox().className).not.toMatch(/\bp-[0-9.]+\b/);
    });

    it('Edge Case 1: de-pads glyph logos in ghost-squircle mode (p-0.5) to avoid double-shrinkage', () => {
      logoGeometryCache.set(LOGO_URL, 'glyph');
      render(<CompanyLogo company="Jahez" logoUrl={LOGO_URL} size="xs" pattern="ghost-squircle" />);

      const box = outerBox();
      expect(box.className).toContain('p-0.5');
      expect(box.className).not.toContain('p-1');
      const img = container.querySelector('img');
      expect(img?.className).toContain('scale-[1.14]');
    });
  });

  describe('original (baseline)', () => {
    it('preserves the exact xs baseline tile', () => {
      render(<CompanyLogo company="Raycast" logoUrl={LOGO_URL} size="xs" pattern="original" />);

      const box = outerBox();
      expect(box.className).toContain('bg-slate-50');
      expect(box.className).toContain('border border-slate-200/70');
      expect(box.className).toContain('p-0.5');
      expect(box.className).toContain('w-7');
      expect(box.className).toContain('h-7');
      expect(box.className).toContain('rounded-md');
      expect(box.className).not.toContain('ring-slate-900/[0.05]');

      const img = container.querySelector('img');
      expect(img?.style.mixBlendMode).toBe('');
      expect(img?.className).not.toContain('p-');
      expect(img?.className).not.toContain('rounded-[inherit]');
    });

    it('preserves the white tiled baseline for sm-xl with unblended images', () => {
      const expectations: { size: 'sm' | 'md' | 'lg' | 'xl'; padding: string; radius: string }[] = [
        { size: 'sm', padding: 'p-1', radius: 'rounded-lg' },
        { size: 'md', padding: 'p-1.5', radius: 'rounded-xl' },
        { size: 'lg', padding: 'p-2', radius: 'rounded-2xl' },
        { size: 'xl', padding: 'p-2.5', radius: 'rounded-2xl' },
      ];

      expectations.forEach(({ size, padding, radius }) => {
        render(<CompanyLogo company="Raycast" logoUrl={LOGO_URL} size={size} pattern="original" />);

        const box = outerBox();
        expect(box.className).toContain('bg-white');
        expect(box.className).toContain('border border-slate-200/90');
        expect(box.className).toContain('shadow-2xs');
        expect(box.className).toContain(radius);

        const img = container.querySelector('img');
        expect(img?.className).toContain(padding);
        expect(img?.style.mixBlendMode).toBe('');
      });
    });
  });

  describe('pattern resolution and live sync', () => {
    it('lets an explicit pattern prop override the persisted global mode', () => {
      setSavedLogoPattern('original');
      render(<CompanyLogo company="Acme" logoUrl={LOGO_URL} pattern="pure-borderless" size="sm" />);

      expect(outerBox().className).toContain('bg-transparent');
      expect(outerBox().className).not.toContain('bg-white');
    });

    it('applies the persisted global mode when no pattern prop is given', () => {
      setSavedLogoPattern('smart-keyline');
      render(<CompanyLogo company="Acme" logoUrl={LOGO_URL} size="sm" />);

      expect(outerBox().className).toContain('bg-transparent');
      expect(container.querySelector('[data-testid="logo-smart-keyline"]')).toBeTruthy();
    });

    it('re-renders when another component changes the pattern', () => {
      render(<CompanyLogo company="Acme" logoUrl={LOGO_URL} size="sm" />);
      expect(outerBox().className).toContain('bg-slate-500/[0.04]');

      act(() => {
        setSavedLogoPattern('original');
      });

      expect(outerBox().className).toContain('bg-white');
      expect(outerBox().className).not.toContain('bg-slate-500/[0.04]');
    });

    it('syncs from the native storage event (cross-tab updates)', () => {
      render(<CompanyLogo company="Acme" logoUrl={LOGO_URL} size="sm" />);
      expect(outerBox().className).toContain('bg-slate-500/[0.04]');

      localStorage.setItem(LOGO_PATTERN_STORAGE_KEY, 'pure-borderless');
      act(() => {
        window.dispatchEvent(new Event('storage'));
      });

      expect(outerBox().className).toContain('bg-transparent');
    });
  });

  describe('Building2 fallback', () => {
    it('renders the fallback icon when the company has no resolvable logo', () => {
      render(<CompanyLogo company="" size="md" pattern="ghost-squircle" />);

      const fallback = container.querySelector('svg');
      expect(fallback).toBeTruthy();

      const fallbackBox = container.querySelector('svg')?.parentElement as HTMLElement;
      expect(fallbackBox.className).toContain('bg-slate-100');
      expect(fallbackBox.className).toContain('text-slate-500');
      expect(fallbackBox.className).toContain('rounded-[inherit]');
      expect(fallbackBox.className).toContain('transition-colors');
      expect(fallbackBox.className).toContain('duration-150');
    });

    it('falls back after the final image error and remembers the failure', () => {
      render(<CompanyLogo company="Acme" logoUrl={LOGO_URL} size="md" pattern="smart-keyline" />);

      const img = container.querySelector('img') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(container.querySelector('[data-testid="logo-smart-keyline"]')).toBeTruthy();

      act(() => {
        img.dispatchEvent(new Event('error'));
      });

      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('svg')).toBeTruthy();
      expect(container.querySelector('[data-testid="logo-smart-keyline"]')).toBeNull();
      expect(verifiedLogoCache.get('acme::')).toBeNull();
    });
  });
});

describe('CompanyLogo logo sources (Design Variants Lab)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    verifiedLogoCache.clear();
    logoGeometryCache.clear();
    stubDecodedImage();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
    verifiedLogoCache.clear();
    logoGeometryCache.clear();
    vi.restoreAllMocks();
  });

  const render = (ui: React.ReactElement) => {
    act(() => {
      root.render(ui);
    });
  };

  const image = () => container.querySelector('img') as HTMLImageElement;

  it('defaults to the production Google source and keeps the production cache key intact', () => {
    expect(getSavedLogoSource()).toBe('google');
    render(<CompanyLogo company="Figma" size="sm" />);

    expect(image().src).toContain('https://www.google.com/s2/favicons?domain=figma.com');

    act(() => {
      image().dispatchEvent(new Event('load'));
    });

    expect(verifiedLogoCache.get(getCompanyCacheKey('Figma'))).toContain('google.com/s2/favicons');
  });

  it('isolates verifiedLogoCache between google and brandfetch-symbol and live-updates src when switching source', () => {
    setBrandfetchClientId('lab-client-123');
    setSavedLogoSource('google');
    render(<CompanyLogo company="Figma" size="sm" />);

    const baseKey = getCompanyCacheKey('Figma');
    const brandfetchKey = `${baseKey}::brandfetch-symbol::lab-client-123`;

    expect(image().src).toContain('google.com/s2/favicons');
    act(() => {
      image().dispatchEvent(new Event('load'));
    });
    expect(verifiedLogoCache.get(baseKey)).toContain('google.com/s2/favicons');

    act(() => {
      setSavedLogoSource('brandfetch-symbol');
    });

    expect(image().src).toContain(
      'https://cdn.brandfetch.io/figma.com/theme/dark/fallback/404/h/128/w/128/symbol?c=lab-client-123'
    );

    act(() => {
      image().dispatchEvent(new Event('load'));
    });

    expect(verifiedLogoCache.get(baseKey)).toContain('google.com/s2/favicons');
    expect(verifiedLogoCache.get(brandfetchKey)).toContain('cdn.brandfetch.io');
    expect(verifiedLogoCache.get(brandfetchKey)).not.toBe(verifiedLogoCache.get(baseKey));
  });

  it('honors an explicit source prop over the persisted global source', () => {
    setBrandfetchClientId('prop-client');
    setSavedLogoSource('google');
    render(<CompanyLogo company="Figma" size="sm" source="brandfetch-icon" />);

    expect(image().src).toContain(
      'https://cdn.brandfetch.io/figma.com/theme/dark/fallback/404/h/128/w/128/icon?c=prop-client'
    );
  });

  it('falls back to Google URLs (with an isolated cache key) when Brandfetch has no Client ID', () => {
    render(<CompanyLogo company="Figma" size="sm" source="brandfetch-symbol" />);

    expect(image().src).toContain('google.com/s2/favicons');

    act(() => {
      image().dispatchEvent(new Event('load'));
    });

    expect(verifiedLogoCache.get(getCompanyCacheKey('Figma'))).toBeUndefined();
    expect(
      verifiedLogoCache.get(`${getCompanyCacheKey('Figma')}::brandfetch-symbol::none`)
    ).toContain('google.com/s2/favicons');
  });

  it('syncs source changes from the native storage event (cross-tab updates)', () => {
    setBrandfetchClientId('event-client');
    render(<CompanyLogo company="Figma" size="sm" />);
    expect(image().src).toContain('google.com/s2/favicons');

    localStorage.setItem(LOGO_SOURCE_STORAGE_KEY, 'brandfetch-icon');
    act(() => {
      window.dispatchEvent(new Event('storage'));
    });

    expect(image().src).toContain('cdn.brandfetch.io/figma.com');
    expect(image().src).toContain('/icon?c=event-client');
  });
});

describe('useCompanyLogoDesignLab (Design Lab Registration)', () => {
  let container: HTMLDivElement;
  let root: Root;

  function TestLogoLabHost({ enabled = true }: { enabled?: boolean }) {
    useCompanyLogoDesignLab(enabled);
    return <div data-testid="lab-host" />;
  }

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
  });

  it('exposes the 4 canonical logo variants with smart-keyline as recommended', () => {
    expect(LOGO_LAB_VARIANTS).toHaveLength(4);
    expect(LOGO_LAB_VARIANTS.map((v) => v.id)).toEqual([
      'smart-keyline',
      'ghost-squircle',
      'pure-borderless',
      'original',
    ]);
    const smartKeyline = LOGO_LAB_VARIANTS.find((v) => v.id === 'smart-keyline');
    expect(smartKeyline?.recommended).toBe(true);
  });

  it('registers company-logo-lab with the design lab registry and binds activeVariant', () => {
    act(() => {
      root.render(<TestLogoLabHost enabled />);
    });

    const activeLab = getActiveDesignLab();
    expect(activeLab).not.toBeNull();
    expect(activeLab?.labId).toBe('company-logo-lab');
    expect(activeLab?.title).toBe('Company Logos');
    expect(activeLab?.baselineVariant).toBe('original');
    expect(activeLab?.activeVariant).toBe('ghost-squircle');

    act(() => {
      activeLab?.onVariantChange('smart-keyline');
    });

    expect(getSavedLogoPattern()).toBe('smart-keyline');
  });

  it('binds the source variable and supports switching between sources', () => {
    act(() => {
      root.render(<TestLogoLabHost enabled />);
    });

    const activeLab = getActiveDesignLab();
    expect(activeLab?.variables).toBeDefined();
    expect(activeLab?.variables?.values.source).toBe('google');

    act(() => {
      activeLab?.variables?.setValue('source', 'brandfetch-icon');
    });

    expect(getSavedLogoSource()).toBe('brandfetch-icon');
  });

  it('unregisters when unmounted or disabled', () => {
    act(() => {
      root.render(<TestLogoLabHost enabled />);
    });
    expect(getActiveDesignLab()?.labId).toBe('company-logo-lab');

    act(() => {
      root.render(<TestLogoLabHost enabled={false} />);
    });
    expect(getActiveDesignLab()).toBeNull();
  });
});
