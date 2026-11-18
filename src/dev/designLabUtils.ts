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
}

export const LAB_BAR_MARGIN = 12;
export const LAB_BAR_BOTTOM_OFFSET = 20;
export const DRAG_THRESHOLD_PX = 4;
export const KEYBOARD_MOVE_STEP_PX = 15;

const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

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

    return {
      ...(pos ? { pos } : {}),
      ...(typeof state.collapsed === 'boolean' ? { collapsed: state.collapsed } : {}),
      ...(state.surface === 'dark' || state.surface === 'light'
        ? { surface: state.surface }
        : {}),
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
