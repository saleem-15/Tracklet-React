# DDR 0003: Company Logo Display Modes and Geometric Silhouette Adaptation

## Status
Accepted

---

## Context

Company logos serve as the primary visual anchor in Tracklet across dense data tables (`AllApplicationsTable.tsx`), spatial Kanban columns (`ActivePipelineBoard.tsx`), and detail drawers (`ApplicationDetailPanel.tsx`). Because Tracklet is a high-density, executive command center for job seekers, scanning company names and logos is a high-frequency micro-interaction performed dozens of times per session.

Historically, company logos were rendered inside a standard legacy tile:
```tsx
// Legacy production tile:
<div className="w-7 h-7 rounded-md bg-white border border-slate-200/90 shadow-2xs p-0.5 select-none">
  <img src={currentUrl} className="w-full h-full object-contain" />
</div>
```

While functional, this legacy treatment introduced severe visual defects when benchmarked against modern tier-1 SaaS interfaces (Attio, Linear, Raycast, Clay):
1. **The "1990s App Icon Box" Aesthetic**: Placing every brand mark inside a bright white square box created heavy visual clutter and boxiness down dense table columns.
2. **Double-Border Collisions on Brand Tiles**: Modern companies like Figma, Retool, Linear, Ramp, and Monzo ship official icons that already have solid, branded squircle backgrounds. Enclosing a branded squircle inside another white squircle box created an awkward "box-inside-a-box" double border.
3. **Multi-Region Asset Chaos**: Real-world job hunters apply to a diverse mix of employers—not just Silicon Valley giants with pristine SVG marks, but mid-market SaaS, European scale-ups (Adyen, Personio, Qonto, Mollie), and MENA enterprises (Careem, Noon, Jahez). These real-world assets arrive in unpredictable formats: opaque JPEGs on white boxes, full-bleed circular emblems without margins, transparent vector glyphs, and irregular aspect ratios.

Over three distinct design iterations and extensive AI prototyping sessions, multiple rendering modes and logo providers were evaluated. This document records every technical constraint, failed rendering hypothesis, and the final 8-point geometric classification engine that solved the problem.

---

## The 4 Evaluated Visual Variants (Comparative Matrix)

Four visual display modes were implemented and tested side-by-side in the Design Variants Lab across a stress-test suite of 40 multi-region companies:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             COMPANY LOGO VISUAL DISPLAY MODES                                    │
├────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┤
│ Variant            │ Visual Mechanics & CSS Tokens        │ Strengths & Trade-offs               │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ 0. Baseline        │ `bg-white border-slate-200/90`       │ Safe fallback, but creates heavy     │
│    (Legacy)        │ `shadow-2xs p-0.5`                   │ boxiness and double-border artifacts │
│                    │ No blend mode                        │ on already-boxed brand tiles.        │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ 1. Ghost Squircle  │ `bg-slate-500/[0.04]`                │ High calm. Excellent for mixed marks │
│    (Linear/Raycast)│ `ring-1 ring-inset slate-900/[0.05]` │ by giving all logos equal visual     │
│                    │ `mix-blend-mode: multiply`           │ weight. However, softens full-bleed  │
│                    │ Universal `p-1` padding              │ brand tiles (e.g. Ramp, Figma).      │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ 2. Borderless      │ `bg-transparent border-0`            │ Extremely modern on vector glyphs    │
│    Squircle        │ `rounded-md overflow-hidden`         │ (OpenAI, Stripe). However, creates   │
│                    │ `mix-blend-mode: multiply`           │ massive perceptual mass imbalance    │
│                    │ `p-0` full bleed                     │ in tables (784px² tiles vs 350px²).  │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ 3. Smart Keyline   │ `bg-transparent relative`            │ **WINNER**: Anchors vertical grid    │
│    (The Winner)    │ `ring-1 ring-inset slate-900/[0.07]` │ rhythm, prevents white-on-white card │
│                    │ `mix-blend-mode: multiply`           │ bleed, and adapts dynamically to     │
│                    │ Dynamic geometric padding            │ circular vs square-tile marks.       │
└────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┘
```

### Detailed Evaluation of Each Variant

#### Variant 0: Baseline (Legacy Production)
- **Mechanics**: Static white tile with slate border and subtle shadow.
- **Why Rejected**: Creates visual noise down the company column. When a brand asset has its own dark background (e.g. Linear's purple tile or Retool's black tile), nesting it inside a white padded box destroys brand integrity and makes the UI feel templated.

#### Variant 1: Ghost Squircle
- **Mechanics**: Soft $4\%$ slate tint (`bg-slate-500/[0.04]`), microscopic hairline ring (`ring-slate-900/[0.05]`), multiply blending, and optical padding (`p-1` on squares, `p-0.5` on rectangles).
- **Evaluation**: The battle-tested pattern used by Raycast and Linear. It treats every logo as an equal-weight badge on a quiet podium. While highly resilient, it reduces the visual punch of crisp, full-bleed app icons like Figma, Slack, or Retool.

#### Variant 2: Borderless Squircle
- **Mechanics**: Completely borderless container with squircle corner clipping (`rounded-md overflow-hidden`) and `mix-blend-mode: multiply`.
- **Evaluation**: Sleek in marketing screenshots, but creates a "ragged edge" in dense data tables. A filled square tile (Figma) occupies $784\text{px}^2$ of solid color, while a delicate glyph (Stripe, Google) occupies $\approx 350\text{px}^2$. Without a consistent container perimeter, square tiles visually shout and pull the user's eye away from table data. Furthermore, logos with white or light backgrounds bleed invisibly into the white table rows.

#### Variant 3: Smart Keyline (The Winner)
- **Mechanics**: A transparent container framed with an inner hairline keyline overlay (`span.absolute.inset-0.rounded-[inherit].ring-1.ring-inset.ring-slate-900/[0.07]`) paired with `mix-blend-mode: multiply`.
- **Why It Won**:
  1. **Maintains Column Rhythm**: Provides an invariant $28\times28\text{px}$ architectural anchor down table rows and Kanban cards.
  2. **Solves White-on-White Contrast**: When an icon has a white or light background, the hairline keyline prevents it from bleeding indistinctly into the white card canvas.
  3. **Preserves Full-Bleed Tiles**: Branded square tiles (Linear, Retool, Ramp) fill the container edge-to-edge, sitting flush against the hairline ring like native iOS app icons.

---

## Failed Hypotheses & CSS Rendering Physics (The "Gotchas")

During development, resolving the edge case where circular marks (Postman, Spotify) touch the keyline border uncovered three fundamental rendering and browser constraints:

### 1. The `drop-shadow` Paint Order Trap
- **The Hypothesis**: Replace the square `ring-1` container border with a dynamic CSS alpha-contour filter (`filter: drop-shadow(0 0 0.75px rgba(15,23,42,0.22))`) so the border hugs the true alpha silhouette of the logo (drawing a circle around circular marks and a square around square tiles).
- **The Physical Failure**: In the browser's paint pipeline, **`filter: drop-shadow()` executes BEFORE `mix-blend-mode: multiply`**.
- Brandfetch's icon endpoint often serves JPEGs with solid white corner pixels ($R=255, G=255, B=255, \alpha=1.0$).
- Because `drop-shadow` runs first, it sees four opaque corners, treats the JPEG as a solid square, and draws a square shadow box. *Then* `mix-blend-mode: multiply` runs and dissolves the white corners, leaving an orphaned square shadow box visibly touching the circular logo at four tangent points.

### 2. The Browser CORS Barrier on Third-Party Favicons
- **The Problem**: To detect whether an image is a circle (empty corners) vs a filled square (opaque corners) in client-side JavaScript, the browser must sample pixels on an offscreen `<canvas>`.
- **The Barrier**:
  - Google Favicons (`t1.gstatic.com` / `google.com/s2/favicons`) does **not** send `Access-Control-Allow-Origin: *` headers. Attempting to call `ctx.getImageData()` on an image loaded from Google taints the canvas and throws a fatal browser exception:
    `DOMException: Failed to execute 'getImageData' on 'CanvasRenderingContext2D': The canvas has been tainted by cross-origin data.`
  - Brandfetch (`cdn.brandfetch.io`) and Unavatar (`unavatar.io`), however, **do** send `Access-Control-Allow-Origin: *`.
- **The Invariant**: Visible `<img referrerPolicy="no-referrer">` tags must **never** include `crossOrigin="anonymous"`. Adding `crossOrigin` to visible images causes Google Favicons to fail loading entirely. Canvas inspection must be decoupled into an offscreen sampler safely wrapped in `try...catch`.

### 3. The Static Domain Dictionary Anti-Pattern
- **The Hypothesis**: Maintain a hardcoded set of circular domains (`CIRCULAR_BRAND_DOMAINS = new Set(['postman.com', 'spotify.com'])`) and manually apply padding.
- **Why Rejected**: Tracklet is an open B2C SaaS product. Users apply to tens of thousands of companies worldwide (e.g. Target, Pinterest, Reddit, Vodafone, BMW, WordPress). A static dictionary requires perpetual maintenance and breaks on every uncataloged circular logo. The classification must be dynamic, autonomous, and algorithmic.

---

## Decision: The 8-Point Geometric Classification Engine

We formalize the **8-Point Geometric Logo Detection & Optical Breathing Room Architecture** implemented across `src/lib/logoGeometry.ts` and `src/components/CompanyLogo.tsx`:

```
               (16, 1) [Top Midpoint]
                    ●  ●  ●
              ●                 ●
       (1,16) ●                 ● (30,16) [Right Midpoint]
   [Left Midpoint]   CIRCLE     ●
              ●                 ●
                    ●  ●  ●
              (16, 30) [Bottom Midpoint]
   
   Corner (2,2) ───────┼─────── Corner (29,2)
         │                         │
         │   [SAMPLE_SIZE = 32]    │
         │                         │
   Corner (2,29) ──────┼─────── Corner (29,29)
```

### 1. Mathematical Sampling Geometry (32×32 Canvas)
Images are drawn onto an offscreen $32\times32$ canvas (`SAMPLE_SIZE = 32`). The algorithm samples exactly 8 strategic coordinates:
1. **4 Inset Corners**: `(2, 2)`, `(29, 2)`, `(2, 29)`, `(29, 29)`
   - *Why Inset by 2px?* Squircle brand tiles (Apple, Slack, Figma, Retool) have rounded corners with $2\text{--}4\text{px}$ radii. Sampling at `(0, 0)` would falsely classify rounded-corner squares as circles. Insetting to `(2, 2)` places the sample point inside squircle corners ($r \approx 4\text{px}$), while remaining safely outside a circle of diameter 32 ($d=19.1\text{px} > 15.5\text{px}$).
2. **4 Cardinal Tangent Midpoints**: `(16, 1)`, `(30, 16)`, `(16, 30)`, `(1, 16)`
   - These are the exact 12, 3, 6, and 9 o'clock tangent points where 1:1 circular marks collide with the bounding box.

### 2. Dual Alpha & JPEG Noise Detection
To handle both transparent PNGs and Brandfetch white-background JPEGs:
```typescript
export function isPixelEmpty(r: number, g: number, b: number, a: number): boolean {
  // Transparent PNG (alpha < 40) OR white/near-white JPEG compression background
  return a < 40 || (r > 238 && g > 238 && b > 238);
}

export function isPixelFilled(r: number, g: number, b: number, a: number): boolean {
  return !isPixelEmpty(r, g, b, a) && a >= 100;
}
```

### 3. Classification Decision Table
```typescript
if (cornersEmptyCount >= 3 && midpointsFilledCount >= 3) return 'circle';
if (cornersEmptyCount <= 1 && midpointsFilledCount >= 3) return 'square';
if (cornersEmptyCount >= 3 && midpointsFilledCount <= 1) return 'glyph';
return 'unknown';
```

| Logo Type | Inset Corners | Edge Midpoints | Classified Shape | Applied Styling |
| :--- | :--- | :--- | :--- | :--- |
| **Full-Bleed Circle** (Postman, Spotify) | **Empty** ($\ge 3$) | **Filled** ($\ge 3$) | `'circle'` | Dynamic `CIRCLE_BREATHING_PADDING` (`p-0.5` / 2px on xs) |
| **Full-Bleed Square Tile** (Ramp, Figma, Linear) | **Filled** ($\ge 3$) | **Filled** ($\ge 3$) | `'square'` | `p-0` full bleed; tile sits flush inside keyline |
| **Floating Glyph** (Apple, Jahez, Notion) | **Empty** ($\ge 3$) | **Empty** ($\le 1$) | `'glyph'` | Unboxed mark with optical scale boost (`scale-[1.14]`) and de-padding |
| **Unclassified / Fallback** | N/A | N/A | `'unknown'` | Universal safe micro-inset (`UNKNOWN_SAFE_PADDING`: `p-[1.5px]` on xs) |

---

## Resolution of Edge Cases: Optical Glyphs & Fallback Provider Keyline Inset

### Edge Case 1: Optical Scale Disparity on Floating Glyphs (Apple, Jahez)
- **Root Cause**: Floating glyphs (such as Apple's apple mark or Jahez's falcon wings) arrive with large built-in transparent margins (and faint circular framing in Google favicons). When rendered inside a 28x28px container with `object-contain`, the glyph occupied only ~30% of the box width/height (~8px), appearing tiny compared to solid 28px square tiles (Figma, Linear). Furthermore, in `ghost-squircle` mode, applying standard square container padding (`p-1`) double-shrunk the already-margined glyph down to ~6px.
- **Solution**:
  1. **Optical De-Padding**: In `ghost-squircle` mode, glyphs receive `GHOST_GLYPH_PADDING` (`p-0.5` on xs) instead of `p-1`, unlocking 4px of natural canvas space.
  2. **Optical Scale Boost**: In `getImageClasses()`, glyphs receive `GLYPH_SCALE_CLASS` (`scale-[1.14] transition-transform duration-150 motion-reduce:transition-none`). The 14% scale boost expands the central glyph by ~30% in visual surface area, achieving visual parity with full-bleed tiles without clipping the container's `overflow-hidden` boundary.

### Edge Case 2: Border Collision on Google Favicons (CORS & Keyline Clipping)
- **Root Cause**: Google Favicons (`google.com/s2/favicons` / `t1.gstatic.com`) do not send CORS headers (`Access-Control-Allow-Origin: *`). Attempting direct canvas `getImageData()` throws a browser `SecurityError` (tainted canvas). Previously, all Google URLs were short-circuited to `'unknown'`. Because `'unknown'` had 0px padding, circular marks (Postman, Spotify) and edge-to-edge marks (Netflix) touched and clipped the 1px `Smart Keyline` border at the 4 cardinal tangent points.
- **Solution**:
  1. **Universal Safe Micro-Inset**: In `smart-keyline` mode, `'unknown'` marks receive `UNKNOWN_SAFE_PADDING` (`p-[1.5px]` on xs, `p-0.5` on sm, `p-1` on md). Even before classification finishes or if sampling is offline, circular and full-bleed marks float 1.5px clear of the 1px keyline with zero edge clipping.
  2. **CORS-Safe Same-Origin Proxy (`/api/logo-proxy`)**: Implemented in `api/logo-proxy.ts` and `functions/api/logo-proxy.ts` (with Vite dev middleware in `vite.config.ts`). The proxy enforces strict allowlists (`google.com/s2/favicons`, `t*.gstatic.com`, `cdn.brandfetch.io`, `unavatar.io`) to prevent SSRF, forwards upstream image data, and appends `Access-Control-Allow-Origin: *` and immutable caching headers (`max-age=604800`).
  3. **Canvas Sampling Route**: `getSamplingUrl()` routes CORS-restricted URLs through `/api/logo-proxy`, allowing offscreen 8-point canvas sampling to successfully classify Google favicons into `'circle'`, `'square'`, or `'glyph'` with zero browser security errors. If the proxy fails or times out, it gracefully resolves to `'unknown'` with `UNKNOWN_SAFE_PADDING` active.

---

## Layout Dynamics & Zero-CLS Architecture

### 1. Optical Breathing Room Tokens
In `smart-keyline` and `pure-borderless` modes, circular marks receive calibrated optical inset padding:
```typescript
const CIRCLE_BREATHING_PADDING: Record<LogoSize, string> = {
  xs: 'p-0.5', // 2px inset on 28px container -> 24px circle floats freely
  sm: 'p-1',   // 4px inset on 38px container
  md: 'p-1',   // 4px inset on 48px container
  lg: 'p-1.5', // 6px inset on 56px container
  xl: 'p-2',   // 8px inset on 76px container
};
```
Circular marks float centered inside the keyline ring with clean breathing room, eliminating collision at the four tangent points. Square tiles stay `p-0` full bleed.

### 2. Alignment with Attio Landing Page Architecture
This architecture directly mirrors Attio's production behavior:
- Brands with built-in colored backgrounds (Linear, Ramp, Cursor) are recognized as self-contained tiles and rendered full-bleed.
- Brands without backgrounds or circular marks are given breathing room and keyline framing, preventing visual bleed.

### 3. Frame-0 In-Memory Session Cache ($\text{CLS} = 0$)
To prevent layout shifts (Cumulative Layout Shift) when scrolling tables or switching tabs:
```typescript
export const logoGeometryCache = new Map<string, LogoGeometry>();

// Synchronous Frame 0 state initialization:
const [logoGeometry, setLogoGeometry] = useState<LogoGeometry>(() =>
  currentUrl ? logoGeometryCache.get(currentUrl) || 'unknown' : 'unknown'
);
```
Once classified, subsequent renders read the geometry synchronously on Frame 0 with **zero visual jump or flicker**.

---

## Modularity & Verification Standards

1. **Under-300-Line Modularity Limit**:
   All canvas mathematics, sampling coordinates, and CORS-safe detection were cleanly extracted to `src/lib/logoGeometry.ts` (141 lines), keeping `src/components/CompanyLogo.tsx` at **295 lines** (strictly below the mandatory 300-line limit in `AGENTS.md`).
2. **Quality Gates**:
   - `npx tsc --noEmit`: 0 errors.
   - `npm test`: 111 test files, 1,152 tests passing (including 14 dedicated tests in `tests/unit/logoGeometry.test.ts`).
   - `npm run build`: Production bundle succeeded cleanly in 9.95s.

---

## References
- Design Decision Record 0001: Canvas Ambient Calm and Notification Severity Hierarchy (`docs/ddr/0001-...`)
- Design Decision Record 0002: Dual-Lens Layout Dynamics & Single-Stage Table Affinity (`docs/ddr/0002-...`)
- Tracklet Canonical Component Registry: `docs/COMPONENT_REGISTRY.md` (Class 6: Media, Brand & Company Logos)
- Geometric Detection Engine: `src/lib/logoGeometry.ts`
- Logo Component Implementation: `src/components/CompanyLogo.tsx`
