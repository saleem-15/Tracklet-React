// @vitest-environment happy-dom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DesignLabBar,
  formatDesignLabDecision,
  getVariableUrlParamName,
  getVariablesStorageKey,
  readVariablesFromUrl,
  snapLabPosition,
  useDesignLabVariables,
  writeLabStoredState,
  writeVariablesToUrl,
  type DesignLabVariant,
} from '../../src/dev';

type V = 'compact' | 'card' | 'ledger';

const VARIANTS: readonly DesignLabVariant<V>[] = [
  { id: 'compact', label: 'Compact Strip', shortLabel: 'Compact', summary: 'Dense layout', recommended: true },
  { id: 'card', label: 'Executive Card', shortLabel: 'Card', summary: 'Two-tier card' },
  { id: 'ledger', label: 'Mono Ledger', shortLabel: 'Ledger', summary: 'Tabular ledger' },
];

const SCHEMA = {
  density: {
    type: 'choice',
    label: 'Density',
    options: [
      { id: 'compact', label: 'Compact' },
      { id: 'default', label: 'Default' },
      { id: 'airy', label: 'Airy' },
    ],
    default: 'default',
    pinned: true,
  },
  showMeta: { type: 'boolean', label: 'Show meta', default: true },
  radius: { type: 'range', label: 'Radius', min: 8, max: 24, step: 4, unit: 'px', default: 16 },
  accent: {
    type: 'color',
    label: 'Accent',
    options: [
      { id: 'none', label: 'Neutral', swatchClass: 'bg-slate-300' },
      { id: 'blue', label: 'Blue', swatchClass: 'bg-blue-600' },
    ],
    default: 'none',
  },
} as const;

let host: HTMLDivElement;
let root: Root;

const render = (node: React.ReactNode) => act(() => { root.render(node); });
const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const click = (el: Element | null) => act(() => { el?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

function FullHarness({ initialVariant = 'card' }: { initialVariant?: V }) {
  const [variant, setVariant] = useState<V>(initialVariant);
  const vars = useDesignLabVariables('v2-lab', SCHEMA);
  return (
    <>
      <div data-testid="probe-state">
        {variant}|{vars.values.density}|{String(vars.values.showMeta)}|{vars.values.radius}|{vars.values.accent}
      </div>
      <DesignLabBar
        labId="v2-lab"
        title="Card Lab"
        variants={VARIANTS}
        activeVariant={variant}
        onVariantChange={setVariant}
        baselineVariant="compact"
        variables={vars}
        forceRender
      />
    </>
  );
}

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const originalExecCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');

const setInputValue = (input: HTMLInputElement, value: string) => {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const remount = (node: React.ReactNode) => {
  act(() => root.unmount());
  root = createRoot(host);
  render(node);
};

describe('DesignLabBar v2 features', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    sessionStorage.clear();
    window.history.replaceState({}, '', '/?lab=demo&variant=card');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalClipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
    if (originalExecCommandDescriptor) {
      Object.defineProperty(document, 'execCommand', originalExecCommandDescriptor);
    } else {
      delete (document as { execCommand?: unknown }).execCommand;
    }
  });

  it('snaps near viewport corners and top/bottom centers within 20px and leaves mid-canvas free', () => {
    const snappedCorner = snapLabPosition(20, 18, 200, 44, 1280, 800);
    expect(snappedCorner).toEqual({ x: 12, y: 12 });

    const snappedBottomCenter = snapLabPosition(548, 732, 200, 44, 1280, 800);
    expect(snappedBottomCenter).toEqual({ x: 540, y: 736 });

    const freeMid = snapLabPosition(310, 410, 200, 44, 1280, 800);
    expect(freeMid).toEqual({ x: 310, y: 410 });
  });

  it('supports choice, boolean, range double-click reset, color, pin-to-bar, URL sync, and snapshots', () => {
    render(<FullHarness />);

    // Pinned density chip renders directly on capsule bar and cycles on click.
    const pinnedDensity = byTestId('design-lab-pinned-density')!;
    expect(pinnedDensity).not.toBeNull();
    click(pinnedDensity);
    expect(byTestId('probe-state')!.textContent).toContain('|airy|');
    expect(window.location.search).toContain('lab=demo');
    expect(window.location.search).toContain('variant=card');
    expect(window.location.search).toContain('density=airy');

    // Open variables popover, verify active tint and modified badge.
    const trigger = byTestId('design-lab-variables-trigger')!;
    expect(byTestId('design-lab-variables-trigger-badge')!.textContent).toBe('1');
    click(trigger);
    expect(trigger.getAttribute('data-active')).toBe('true');
    expect(byTestId('design-lab-variables')).not.toBeNull();

    // Toggle boolean, change color, change range then double-click readout to reset.
    click(byTestId('design-lab-var-showMeta'));
    click(byTestId('design-lab-var-accent-blue'));
    expect(byTestId('probe-state')!.textContent).toBe('card|airy|false|16|blue');

    const range = byTestId('design-lab-var-radius') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(range, '24');
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(byTestId('probe-state')!.textContent).toBe('card|airy|false|24|blue');

    // Save snapshot, reset all, then apply snapshot back.
    const input = byTestId('design-lab-snapshot-input') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'Airy Blue');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    click(byTestId('design-lab-snapshot-save'));
    expect(byTestId('design-lab-variables')!.textContent).toContain('Airy Blue');

    click(byTestId('design-lab-vars-reset'));
    expect(byTestId('probe-state')!.textContent).toBe('card|default|true|16|none');

    const applyBtn = document.querySelector('[data-testid^="design-lab-snapshot-apply-"]') as HTMLElement;
    click(applyBtn);
    expect(byTestId('probe-state')!.textContent).toBe('card|airy|false|24|blue');

    // Double-click range readout resets only radius to 16.
    act(() => {
      byTestId('design-lab-var-readout-radius')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(byTestId('probe-state')!.textContent).toBe('card|airy|false|16|blue');
  });

  it('supports Hold-to-Peek baseline via pointer and Alt+0, and ignores excluded Alt+[ / Alt+]', () => {
    render(<FullHarness initialVariant="card" />);
    const peekBtn = byTestId('design-lab-peek-baseline')!;
    expect(peekBtn).not.toBeNull();

    // Pointer hold peeks compact, release restores card.
    act(() => { peekBtn.dispatchEvent(new Event('pointerdown', { bubbles: true })); });
    expect(byTestId('probe-state')!.textContent?.startsWith('compact|')).toBe(true);
    expect(peekBtn.getAttribute('data-active')).toBe('true');

    act(() => { peekBtn.dispatchEvent(new Event('pointerup', { bubbles: true })); });
    expect(byTestId('probe-state')!.textContent?.startsWith('card|')).toBe(true);

    // Alt+0 hold peeks compact, keyup restores card.
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', code: 'Digit0', altKey: true, bubbles: true })); });
    expect(byTestId('probe-state')!.textContent?.startsWith('compact|')).toBe(true);
    act(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: '0', code: 'Digit0', altKey: true, bubbles: true })); });
    expect(byTestId('probe-state')!.textContent?.startsWith('card|')).toBe(true);

    // Excluded Collapsed Stepping shortcuts do nothing.
    click(byTestId('design-lab-collapse'));
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: ']', altKey: true, bubbles: true })); });
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: '[', altKey: true, bubbles: true })); });
    expect(byTestId('probe-state')!.textContent?.startsWith('card|')).toBe(true);
  });

  it('shortlists/eliminates variants and exports a 1-click decision prompt to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<FullHarness initialVariant="card" />);
    const buttons = Array.from(document.querySelectorAll('[aria-label="Design variants"] button'));
    act(() => { buttons[2].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); });
    expect(buttons[2].getAttribute('data-eliminated')).toBe('true');

    await act(async () => {
      byTestId('design-lab-copy-decision')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('Executive Card');
    expect(copied).toContain('Mono Ledger');
    expect(copied).toContain('Density');

    const formatted = formatDesignLabDecision({
      labId: 'v2-lab',
      title: 'Card Lab',
      variants: VARIANTS,
      activeVariant: 'card',
      eliminatedIds: ['ledger'],
    });
    expect(formatted).toContain('Ruled Out');
  });

  it('renders custom Agentation session tooltips without native title attributes', () => {
    vi.useFakeTimers();
    render(<FullHarness />);

    const bar = byTestId('design-lab-bar')!;
    expect(bar.querySelector('[title]')).toBeNull();

    const notesBtn = byTestId('design-lab-notes-trigger')!;
    const settingsBtn = byTestId('design-lab-settings-trigger')!;

    // First hover warms up after 350ms.
    act(() => { notesBtn.parentElement!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(byTestId('design-lab-tooltip')).toBeNull();
    act(() => { vi.advanceTimersByTime(360); });
    expect(byTestId('design-lab-tooltip')!.textContent).toContain('Variant notes');

    // Moving immediately to a sibling shows tooltip in 0ms (active session).
    act(() => { notesBtn.parentElement!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })); });
    act(() => { settingsBtn.parentElement!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(byTestId('design-lab-tooltip')!.textContent).toContain('Settings');

    // Opening a popover immediately suppresses tooltips.
    click(settingsBtn);
    expect(byTestId('design-lab-tooltip')).toBeNull();
  });

  it('safely clamps malformed/out-of-range URL params and prefixes reserved URL keys', () => {
    window.history.replaceState(
      {},
      '',
      '/?lab=demo&variant=card&radius=999&density=invalid&showMeta=notabool&accent=unknown'
    );
    render(<FullHarness />);
    expect(byTestId('probe-state')!.textContent).toBe('card|default|true|24|none');
    expect(window.location.search).toContain('lab=demo');
    expect(window.location.search).toContain('variant=card');
    expect(window.location.search).toContain('radius=24');
    expect(window.location.search).not.toContain('density=invalid');
    expect(window.location.search).not.toContain('showMeta=notabool');

    // Negative, stepped, and non-numeric range values clamp/fall back cleanly.
    window.history.replaceState({}, '', '/?radius=-50');
    expect(readVariablesFromUrl(SCHEMA).radius).toBe(8);
    window.history.replaceState({}, '', '/?radius=15');
    expect(readVariablesFromUrl(SCHEMA).radius).toBe(16);
    window.history.replaceState({}, '', '/?radius=notanumber');
    expect(readVariablesFromUrl(SCHEMA).radius).toBe(16);

    // Reserved URL params prefix with var_ so they never collide with lab/variant/scenario.
    expect(getVariableUrlParamName('lab')).toBe('var_lab');
    expect(getVariableUrlParamName('variant')).toBe('var_variant');
    expect(getVariableUrlParamName('scenario')).toBe('var_scenario');
    expect(getVariableUrlParamName('density')).toBe('density');

    const reservedSchema = {
      lab: { type: 'choice', label: 'Lab mode', options: ['a', 'b'], default: 'a' },
      variant: { type: 'boolean', label: 'Variant flag', default: false },
      scenario: { type: 'range', label: 'Scenario count', min: 1, max: 5, default: 2 },
    } as const;

    window.history.replaceState(
      {},
      '',
      '/?lab=demo&variant=card&scenario=happy&var_lab=b&var_variant=true&var_scenario=4'
    );
    expect(readVariablesFromUrl(reservedSchema)).toEqual({
      lab: 'b',
      variant: true,
      scenario: 4,
    });

    writeVariablesToUrl(reservedSchema, { lab: 'b', variant: true, scenario: 5 });
    const params = new URLSearchParams(window.location.search);
    expect(params.get('lab')).toBe('demo');
    expect(params.get('variant')).toBe('card');
    expect(params.get('scenario')).toBe('happy');
    expect(params.get('var_lab')).toBe('b');
    expect(params.get('var_variant')).toBe('true');
    expect(params.get('var_scenario')).toBe('5');
  });

  it('persists pin/unpin overrides across remounts and caps visible pinned chips on the bar at 2', () => {
    render(<FullHarness />);
    const pinnedGroup = () => document.querySelector('[role="group"][aria-label="Pinned variables"]');

    // Default schema pins only density.
    expect(pinnedGroup()!.querySelectorAll('button')).toHaveLength(1);
    expect(byTestId('design-lab-pinned-density')).not.toBeNull();

    // Open variables popover and pin showMeta + radius (3 pinned total, capped at 2 on capsule bar).
    click(byTestId('design-lab-variables-trigger'));
    click(byTestId('design-lab-pin-showMeta'));
    click(byTestId('design-lab-pin-radius'));
    expect(pinnedGroup()!.querySelectorAll('button')).toHaveLength(2);
    expect(byTestId('design-lab-pinned-density')).not.toBeNull();
    expect(byTestId('design-lab-pinned-showMeta')).not.toBeNull();
    expect(byTestId('design-lab-pinned-radius')).toBeNull();

    // Unpinning density reveals radius as the second visible pinned chip.
    click(byTestId('design-lab-pin-density'));
    expect(pinnedGroup()!.querySelectorAll('button')).toHaveLength(2);
    expect(byTestId('design-lab-pinned-density')).toBeNull();
    expect(byTestId('design-lab-pinned-showMeta')).not.toBeNull();
    expect(byTestId('design-lab-pinned-radius')).not.toBeNull();

    // Pin overrides persist across remounts in sessionStorage.
    remount(<FullHarness />);
    expect(pinnedGroup()!.querySelectorAll('button')).toHaveLength(2);
    expect(byTestId('design-lab-pinned-density')).toBeNull();
    expect(byTestId('design-lab-pinned-showMeta')).not.toBeNull();
    expect(byTestId('design-lab-pinned-radius')).not.toBeNull();
  });

  it('uses Combo 1 blank-name fallback, persists snapshot deletions across remounts, and recovers from corrupted sessionStorage', () => {
    sessionStorage.setItem(getVariablesStorageKey('v2-lab'), '{corrupted-json');
    render(<FullHarness />);
    expect(byTestId('probe-state')!.textContent).toBe('card|default|true|16|none');

    click(byTestId('design-lab-variables-trigger'));
    click(byTestId('design-lab-var-density-airy'));

    // Submitting a blank/whitespace name falls back to "Combo 1".
    const input = byTestId('design-lab-snapshot-input') as HTMLInputElement;
    setInputValue(input, '   ');
    click(byTestId('design-lab-snapshot-save'));
    expect(byTestId('design-lab-variables')!.textContent).toContain('Combo 1');

    // Save a second named snapshot, then delete "Combo 1".
    setInputValue(input, 'Kept Preset');
    click(byTestId('design-lab-snapshot-save'));
    expect(byTestId('design-lab-variables')!.textContent).toContain('Kept Preset');

    const deleteCombo1 = document.querySelector('[aria-label="Delete snapshot Combo 1"]') as HTMLElement;
    expect(deleteCombo1).not.toBeNull();
    click(deleteCombo1);
    expect(byTestId('design-lab-variables')!.textContent).not.toContain('Combo 1');
    expect(byTestId('design-lab-variables')!.textContent).toContain('Kept Preset');

    // Remounting proves corrupted JSON was healed and snapshot deletion + remaining snapshot persisted.
    remount(<FullHarness />);
    click(byTestId('design-lab-variables-trigger'));
    expect(byTestId('design-lab-variables')!.textContent).not.toContain('Combo 1');
    expect(byTestId('design-lab-variables')!.textContent).toContain('Kept Preset');
  });

  it('handles Hold-to-Peek visibility, editable target guard, Copy Decision while peeking, and window blur restore', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    // Hidden when activeVariant === baselineVariant.
    render(<FullHarness initialVariant="compact" />);
    expect(byTestId('design-lab-peek-baseline')).toBeNull();

    // Appears when switching to a non-baseline variant.
    const variantButtons = Array.from(document.querySelectorAll('[aria-label="Design variants"] button'));
    click(variantButtons[1]);
    expect(byTestId('probe-state')!.textContent?.startsWith('card|')).toBe(true);
    expect(byTestId('design-lab-peek-baseline')).not.toBeNull();

    // Alt+0 inside an <input> or <textarea> is ignored.
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    host.append(input, textarea);
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '0', code: 'Digit0', altKey: true, bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: '0', code: 'Digit0', altKey: true, bubbles: true }));
    });
    expect(byTestId('probe-state')!.textContent?.startsWith('card|')).toBe(true);

    // Hold Alt+0 to peek baseline, then copy decision while peeking -> exports inspected variant ("Executive Card").
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', code: 'Digit0', altKey: true, bubbles: true }));
    });
    expect(byTestId('probe-state')!.textContent?.startsWith('compact|')).toBe(true);

    await act(async () => {
      byTestId('design-lab-copy-decision')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('**Selected Variant**: Executive Card (`card`)');
    expect(copied).not.toContain('**Selected Variant**: Compact Strip (`compact`)');

    // window.blur while peeking cleanly restores the inspected variant.
    act(() => { window.dispatchEvent(new Event('blur')); });
    expect(byTestId('probe-state')!.textContent?.startsWith('card|')).toBe(true);
    expect(byTestId('design-lab-peek-baseline')!.getAttribute('data-active')).toBeNull();
  });

  it('eliminates/restores via Notes popover with persistence and falls back to execCommand copy with aria-live announcement', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });

    render(<FullHarness initialVariant="card" />);
    click(byTestId('design-lab-notes-trigger'));
    expect(byTestId('design-lab-notes')!.textContent).not.toContain('Ruled out');

    // Eliminate via Notes popover toggle.
    click(byTestId('design-lab-eliminate-toggle'));
    expect(byTestId('design-lab-notes')!.textContent).toContain('Ruled out');
    expect(byTestId('design-lab-eliminate-toggle')!.textContent).toContain('Restore');

    // Persists across remounts.
    remount(<FullHarness initialVariant="card" />);
    const variantButtons = Array.from(document.querySelectorAll('[aria-label="Design variants"] button'));
    expect(variantButtons[1].getAttribute('data-eliminated')).toBe('true');

    click(byTestId('design-lab-notes-trigger'));
    expect(byTestId('design-lab-notes')!.textContent).toContain('Ruled out');

    // Copy via Notes popover falls back to document.execCommand('copy') and announces politely.
    await act(async () => {
      byTestId('design-lab-notes-copy-decision')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(byTestId('design-lab-notes-copy-decision')!.textContent).toContain('Copied');
    const liveRegion = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(liveRegion.textContent).toBe('Copied design lab decision prompt');

    // Restore via Notes popover toggle and verify persistence across remount.
    click(byTestId('design-lab-eliminate-toggle'));
    expect(byTestId('design-lab-notes')!.textContent).not.toContain('Ruled out');
    remount(<FullHarness initialVariant="card" />);
    const remountedButtons = Array.from(document.querySelectorAll('[aria-label="Design variants"] button'));
    expect(remountedButtons[1].getAttribute('data-eliminated')).toBeNull();
  });

  it('flips tooltips below when barTop < 100, has zero native title attributes in both states, and omits excluded features', () => {
    vi.useFakeTimers();
    writeLabStoredState('v2-lab', { pos: { x: 200, y: 24 } });
    render(<FullHarness initialVariant="card" />);

    const bar = byTestId('design-lab-bar')!;
    expect(bar.querySelector('[title]')).toBeNull();

    // Tooltip flips below (top-full) when barTop < 100.
    const notesBtn = byTestId('design-lab-notes-trigger')!;
    act(() => { notesBtn.parentElement!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    act(() => { vi.advanceTimersByTime(360); });
    const tooltip = byTestId('design-lab-tooltip')!;
    expect(tooltip).not.toBeNull();
    expect(tooltip.className).toContain('top-full');
    expect(tooltip.className).not.toContain('bottom-full');

    // Settings popover does NOT contain Animation Slow-Mo controls.
    click(byTestId('design-lab-settings-trigger'));
    const settings = byTestId('design-lab-settings')!;
    expect(settings.textContent).toContain('Appearance');
    expect(settings.textContent).not.toMatch(/slow|speed|0\.25x|0\.5x|playback/i);

    // Collapsed state also has zero native title attributes and ignores Alt+[ / Alt+].
    click(byTestId('design-lab-collapse'));
    const orb = byTestId('design-lab-expand')!;
    expect(orb).not.toBeNull();
    expect(bar.querySelector('[title]')).toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ']', code: 'BracketRight', altKey: true, bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '[', code: 'BracketLeft', altKey: true, bubbles: true }));
    });
    expect(byTestId('probe-state')!.textContent?.startsWith('card|')).toBe(true);
  });
});
