/**
 * Design Lab Utilities
 * Pure, framework-free helpers for the dev-only Design Variants Lab bar.
 */

export interface DesignLabVariant<T extends string = string> {
  id: T;
  label: string;
  shortLabel?: string;
  summary?: string;
  tradeoffs?: string[];
  recommended?: boolean;
}

export interface DesignLabScenario<S extends string = string> {
  id: S;
  label: string;
  description?: string;
}

export type DesignLabPosition = { x: number; y: number };
export type DesignLabSurface = 'dark' | 'light';

export interface DesignLabStoredState {
  pos?: DesignLabPosition;
  collapsed?: boolean;
  surface?: DesignLabSurface;
  eliminatedIds?: string[];
}

export const LAB_BAR_MARGIN = 12;
export const LAB_BAR_BOTTOM_OFFSET = 20;
export const DRAG_THRESHOLD_PX = 4;
export const KEYBOARD_MOVE_STEP_PX = 15;

const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

/**
 * True inside React's `act()` harness. Motion collapses to instant there so
 * assertions stay synchronous instead of waiting on exit animation frames.
 */
export function isActTestEnvironment(): boolean {
  return Boolean((globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT);
}

export interface LabBarMetrics {
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** Viewport-aware layout metrics; Happy-DOM returns zeros, which clamp safely. */
export function readLabBarMetrics(element: HTMLElement | null): LabBarMetrics {
  const rect = element?.getBoundingClientRect?.();
  return {
    width: rect?.width || element?.offsetWidth || 0,
    height: rect?.height || element?.offsetHeight || 0,
    viewportWidth: typeof window === 'undefined' ? 0 : window.innerWidth,
    viewportHeight: typeof window === 'undefined' ? 0 : window.innerHeight,
  };
}

/** Keeps the lab bar fully inside the viewport with a consistent breathing margin. */
export function clampLabPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = LAB_BAR_MARGIN
): DesignLabPosition {
  const safeX = finiteOr(x, margin);
  const safeY = finiteOr(y, margin);
  const safeWidth = Math.max(0, finiteOr(width, 0));
  const safeHeight = Math.max(0, finiteOr(height, 0));
  const maxX = Math.max(margin, viewportWidth - safeWidth - margin);
  const maxY = Math.max(margin, viewportHeight - safeHeight - margin);

  return {
    x: Math.min(Math.max(safeX, margin), maxX),
    y: Math.min(Math.max(safeY, margin), maxY),
  };
}

/** Horizontally centered, resting just above the bottom edge of the viewport. */
export function getDefaultLabPosition(
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = LAB_BAR_MARGIN
): DesignLabPosition {
  const x = (viewportWidth - Math.max(0, width)) / 2;
  const y = viewportHeight - Math.max(0, height) - LAB_BAR_BOTTOM_OFFSET;
  return clampLabPosition(x, y, width, height, viewportWidth, viewportHeight, margin);
}

/** Descriptive direction for screen readers. Never returns raw coordinates. */
export function getMovementAnnouncement(dx: number, dy: number, title: string): string {
  const horizontal = dx > 0 ? 'right' : dx < 0 ? 'left' : '';
  const vertical = dy > 0 ? 'down' : dy < 0 ? 'up' : '';

  if (vertical && horizontal) return `${title} moved ${vertical} and ${horizontal}`;
  if (vertical) return `${title} moved ${vertical}`;
  if (horizontal) return `${title} moved ${horizontal}`;
  return `${title} position unchanged`;
}

export function getStorageKey(labId: string): string {
  return `tracklet:design-lab:${labId}`;
}

export function readLabStoredState(labId: string): DesignLabStoredState {
  if (typeof window === 'undefined' || !window.sessionStorage) return {};

  try {
    const raw = window.sessionStorage.getItem(getStorageKey(labId));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const state = parsed as DesignLabStoredState;
    const storedPosition = state.pos;
    const pos =
      storedPosition &&
      Number.isFinite(storedPosition.x) &&
      Number.isFinite(storedPosition.y)
        ? { x: storedPosition.x, y: storedPosition.y }
        : undefined;

    const eliminatedIds = Array.isArray(state.eliminatedIds)
      ? state.eliminatedIds.filter((id): id is string => typeof id === 'string')
      : undefined;

    return {
      ...(pos ? { pos } : {}),
      ...(typeof state.collapsed === 'boolean' ? { collapsed: state.collapsed } : {}),
      ...(state.surface === 'dark' || state.surface === 'light'
        ? { surface: state.surface }
        : {}),
      ...(eliminatedIds ? { eliminatedIds } : {}),
    };
  } catch {
    return {};
  }
}

export function writeLabStoredState(
  labId: string,
  patch: Partial<DesignLabStoredState>
): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    const merged = { ...readLabStoredState(labId), ...patch };
    window.sessionStorage.setItem(getStorageKey(labId), JSON.stringify(merged));
  } catch {
    // Quota exceeded or storage blocked (private mode): the bar keeps working in-memory.
  }
}

export function readVariantFromUrl<T extends string>(
  validIds: readonly T[],
  paramName = 'variant'
): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = new URLSearchParams(window.location.search).get(paramName);
    if (!value) return null;
    return (validIds as readonly string[]).includes(value) ? (value as T) : null;
  } catch {
    return null;
  }
}

export function writeVariantToUrl(variantId: string, paramName = 'variant'): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;

  try {
    const url = new URL(window.location.href);
    url.searchParams.set(paramName, variantId);
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  } catch {
    // Sandboxed iframe or restricted history API: silently skip deep-link syncing.
  }
}

export function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;

  const element = target as HTMLElement;
  const tagName = element.tagName?.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;

  if (element.isContentEditable) return true;
  const editable = element.getAttribute?.('contenteditable');
  return Boolean(editable) && editable !== 'false';
}

/** Threshold in pixels for snap-to-anchor behavior in DesignLabBar. */
export const LAB_SNAP_THRESHOLD_PX = 20;

/**
 * Snaps the lab position to one of 6 clean resting anchors (or returns clamped
 * free-floating position) based on Euclidean distance.
 */
export function snapLabPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = LAB_BAR_MARGIN,
  threshold = LAB_SNAP_THRESHOLD_PX
): DesignLabPosition {
  const clamped = clampLabPosition(x, y, width, height, viewportWidth, viewportHeight, margin);
  const safeWidth = Math.max(0, finiteOr(width, 0));
  const safeHeight = Math.max(0, finiteOr(height, 0));
  const clamp = (ax: number, ay: number) =>
    clampLabPosition(ax, ay, safeWidth, safeHeight, viewportWidth, viewportHeight, margin);

  const centerX = (viewportWidth - safeWidth) / 2;
  const rightX = viewportWidth - safeWidth - margin;
  const bottomY = viewportHeight - safeHeight - LAB_BAR_BOTTOM_OFFSET;

  const anchors: DesignLabPosition[] = [
    getDefaultLabPosition(safeWidth, safeHeight, viewportWidth, viewportHeight, margin),
    clamp(centerX, margin),
    clamp(margin, margin),
    clamp(rightX, margin),
    clamp(margin, bottomY),
    clamp(rightX, bottomY),
  ];

  let bestAnchor = clamped;
  let bestDist = Infinity;

  for (const anchor of anchors) {
    const dist = Math.hypot(clamped.x - anchor.x, clamped.y - anchor.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestAnchor = anchor;
    }
  }

  return bestDist <= threshold ? bestAnchor : clamped;
}
