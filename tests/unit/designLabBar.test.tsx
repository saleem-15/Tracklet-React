import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, useState } from 'react';
import { DesignLabBar, useDesignLabState } from '../../src/dev';
import type { DesignLabScenario, DesignLabVariant } from '../../src/dev';
import * as lab from '../../src/dev/designLabUtils';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VARIANTS: readonly DesignLabVariant[] = [
  {
    id: 'compact',
    label: 'Compact Timeline',
    shortLabel: 'Compact',
    summary: 'Dense spine with only the essential milestones.',
    tradeoffs: ['Less context per step', 'Faster to scan'],
    recommended: true,
  },
  {
    id: 'journal',
    label: 'Lifecycle Journal',
    shortLabel: 'Journal',
    summary: 'Rich audit trail with notes and timestamps.',
    tradeoffs: ['Higher visual weight'],
  },
  { id: 'stepper', label: 'Process Stepper', shortLabel: 'Stepper' },
];

const SCENARIOS: readonly DesignLabScenario[] = [
  { id: 'happy', label: 'Happy Path', description: 'Offer accepted' },
  { id: 'ghosted', label: '40-Day Ghost', description: 'Silent rejection' },
];

describe('designLabUtils', () => {
  it('clamps positions and centers the default placement', () => {
    expect(lab.clampLabPosition(-50, -50, 200, 40, 1000, 800)).toEqual({ x: 12, y: 12 });
    expect(lab.clampLabPosition(2000, 2000, 200, 40, 1000, 800)).toEqual({ x: 788, y: 748 });
    expect(lab.getDefaultLabPosition(200, 40, 1000, 800)).toEqual({ x: 400, y: 740 });
  });

  it('describes movement and detects editable targets', () => {
    expect(lab.getMovementAnnouncement(-15, 0, 'Timeline')).toBe('Timeline moved left');
    expect(lab.getMovementAnnouncement(0, -15, 'Timeline')).toBe('Timeline moved up');
    expect(lab.getMovementAnnouncement(15, -15, 'Timeline')).toBe('Timeline moved up and right');
    expect(lab.getMovementAnnouncement(0, 0, 'Timeline')).toBe('Timeline position unchanged');
    expect(lab.isEditableEventTarget(document.createElement('input'))).toBe(true);
    expect(lab.isEditableEventTarget(document.createElement('textarea'))).toBe(true);
    expect(lab.isEditableEventTarget(document.createElement('select'))).toBe(true);
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    expect(lab.isEditableEventTarget(editable)).toBe(true);
    expect(lab.isEditableEventTarget(document.createElement('button'))).toBe(false);
    expect(lab.isEditableEventTarget(null)).toBe(false);
  });

  it('round-trips URL variants and session state', () => {
    window.history.replaceState({}, '', '/?variant=journal');
    expect(lab.readVariantFromUrl(['compact', 'journal'])).toBe('journal');
    expect(lab.readVariantFromUrl(['compact'])).toBeNull();
    lab.writeVariantToUrl('compact');
    expect(window.location.search).toBe('?variant=compact');
    lab.writeLabStoredState('utils-lab', { collapsed: true });
    lab.writeLabStoredState('utils-lab', { surface: 'light' });
    expect(lab.readLabStoredState('utils-lab')).toEqual({ collapsed: true, surface: 'light' });
    window.sessionStorage.setItem(lab.getStorageKey('broken'), '{oops');
    expect(lab.readLabStoredState('broken')).toEqual({});
  });
});

describe('DesignLabBar', () => {
  let host: HTMLDivElement;
  let root: Root;
  let onScenarioChange = vi.fn();

  const render = (ui: React.ReactNode) => act(() => root.render(ui));

  function Harness({ collapsed }: { collapsed?: boolean } = {}) {
    const [variant, setVariant] = useState('compact');
    const [scenario, setScenario] = useState('happy');
    return (
      <DesignLabBar
        labId="timeline"
        title="Timeline"
        variants={VARIANTS}
        activeVariant={variant}
        onVariantChange={setVariant}
        scenarios={SCENARIOS}
        activeScenario={scenario}
        onScenarioChange={(next) => {
          setScenario(next);
          onScenarioChange(next);
        }}
        defaultCollapsed={collapsed}
        forceRender
      />
    );
  }

  const bar = () => document.querySelector('[data-testid="design-lab-bar"]') as HTMLElement;
  const expandBtn = () => document.querySelector('[data-testid="design-lab-expand"]') as HTMLElement | null;
  const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const variantButtons = () =>
    Array.from(document.querySelectorAll('[role="group"][aria-label="Design variants"] button')) as HTMLElement[];
  const px = (value: string) => Number.parseFloat(value);
  const click = (target: Element | null) =>
    act(() => target!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = window) =>
    act(() => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })));
  const pointer = (target: EventTarget, type: string, init: PointerEventInit = {}) =>
    act(() => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, ...init })));

  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
    onScenarioChange = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  it('portals above modals with zero AI slop, no drag handle, and no LAB/title text', () => {
    render(<Harness />);
    const element = bar();
    expect(element.parentElement).toBe(document.body);
    expect(host.contains(element)).toBe(false);
    expect(element.className).toContain('z-[9990]');
    expect(element.className).toContain('bg-neutral-900');
    expect(element.getAttribute('role')).toBe('toolbar');
    expect(element.getAttribute('aria-label')).toBe('Timeline design lab');
    expect(element.textContent).not.toContain('LAB');
    expect(element.textContent).not.toContain('Timeline');
    expect(byTestId('design-lab-drag-handle')).toBeNull();
    expect(byTestId('design-lab-active-indicator')).not.toBeNull();
    expect(byTestId('design-lab-collapse')!.querySelector('svg.lucide-x')).not.toBeNull();
    const markup = document.body.innerHTML;
    expect(markup).not.toContain('\u2728');
    expect(markup).not.toContain('Sparkles');
    expect(markup).not.toContain('animate-pulse');
    expect(markup).not.toContain('transition-all');
    expect(markup).not.toContain('<select');
  });

  it('isolates clicks and pointer presses from an enclosing backdrop', () => {
    const onClick = vi.fn();
    const onMouseDown = vi.fn();
    act(() =>
      root.render(
        <div onClick={onClick} onMouseDown={onMouseDown}>
          <Harness />
        </div>
      )
    );
    act(() => bar().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
    click(byTestId('design-lab-collapse'));
    expect(onMouseDown).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('switches variants by click and Alt+digit only, ignoring inputs and removed shortcuts', () => {
    render(<Harness />);
    expect(variantButtons()[0].getAttribute('aria-pressed')).toBe('true');
    click(variantButtons()[1]);
    expect(variantButtons()[1].getAttribute('aria-pressed')).toBe('true');
    press('1', { altKey: true, code: 'Digit1' });
    expect(variantButtons()[0].getAttribute('aria-pressed')).toBe('true');
    press('3', { altKey: true, code: 'Digit3' });
    expect(variantButtons()[2].getAttribute('aria-pressed')).toBe('true');
    // Removed shortcuts no longer cycle or collapse.
    press(']', { altKey: true, code: 'BracketRight' });
    press('[', { altKey: true, code: 'BracketLeft' });
    press('l', { altKey: true, code: 'KeyL' });
    expect(variantButtons()[2].getAttribute('aria-pressed')).toBe('true');
    expect(expandBtn()).toBeNull();
    // Typing inside an input ignores Alt+digit.
    const input = document.createElement('input');
    host.appendChild(input);
    press('1', { altKey: true, code: 'Digit1' }, input);
    expect(variantButtons()[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('toggles Dark/Light appearance with sliding indicator in Settings and persists across remounts', () => {
    render(<Harness />);
    click(byTestId('design-lab-settings-trigger'));
    const settings = byTestId('design-lab-settings')!;
    expect(settings).not.toBeNull();
    const settingsTrigger = byTestId('design-lab-settings-trigger')!;
    expect(settingsTrigger.closest('[data-lab-anchor="settings"]')?.contains(settings)).toBe(true);
    expect(settings.className).toContain('bottom-full');
    expect(settings.className).toContain('right-0');
    expect(settings.textContent).not.toContain('Alt+L');
    expect(settings.textContent).not.toContain('Reset position');
    expect(byTestId('design-lab-theme-indicator')).not.toBeNull();

    const lightRadio = Array.from(settings.querySelectorAll('[role="radio"]')).find(
      (btn) => btn.textContent?.includes('Light')
    ) as HTMLElement;
    click(lightRadio);
    expect(bar().className).toContain('bg-white');
    expect(lab.readLabStoredState('timeline').surface).toBe('light');

    // First Escape closes Settings; second Escape collapses the bar into the circular orb.
    press('Escape');
    expect(byTestId('design-lab-settings')).toBeNull();
    press('Escape');
    expect(expandBtn()).not.toBeNull();
    expect(expandBtn()!.className).toContain('h-11 w-11');
    expect(expandBtn()!.className).toContain('rounded-full');
    expect(expandBtn()!.textContent).toContain('1/3');

    act(() => root.unmount());
    root = createRoot(host);
    render(<Harness />);
    expect(expandBtn()).not.toBeNull();
    expect(bar().className).toContain('bg-white');
  });

  it('drags anywhere with deferred pointer capture and moves the collapsed circle without expanding', () => {
    render(<Harness />);
    const startX = px(bar().style.left);
    const startY = px(bar().style.top);
    const setPointerCapture = vi.fn();
    bar().setPointerCapture = setPointerCapture;

    const secondBtn = variantButtons()[1];
    pointer(secondBtn, 'pointerdown', { clientX: 100, clientY: 100 });
    expect(setPointerCapture).not.toHaveBeenCalled();
    pointer(window, 'pointermove', { clientX: 102, clientY: 101 });
    expect(bar().style.transform).toBe('');
    expect(setPointerCapture).not.toHaveBeenCalled();
    pointer(window, 'pointermove', { clientX: 140, clientY: 70 });
    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(bar().style.transform).toBe('translate3d(40px, -30px, 0)');
    pointer(window, 'pointerup', { clientX: 140, clientY: 70 });
    click(secondBtn);
    expect(bar().style.transform).toBe('');
    expect(px(bar().style.left)).toBe(startX + 40);
    expect(px(bar().style.top)).toBe(startY - 30);
    expect(variantButtons()[0].getAttribute('aria-pressed')).toBe('true');

    // Collapse into circular orb and drag it without triggering expand.
    click(byTestId('design-lab-collapse'));
    const orb = expandBtn()!;
    const orbX = px(bar().style.left);
    pointer(orb, 'pointerdown', { clientX: 200, clientY: 200 });
    pointer(window, 'pointermove', { clientX: 230, clientY: 200 });
    pointer(window, 'pointerup', { clientX: 230, clientY: 200 });
    click(orb);
    expect(px(bar().style.left)).toBe(orbX + 30);
    expect(expandBtn()).not.toBeNull();

    // Keyboard movement & Home reset on focused circular orb.
    const live = document.querySelector('[aria-live="polite"]') as HTMLElement;
    act(() => orb.focus());
    press('ArrowRight', {}, orb);
    expect(px(bar().style.left)).toBe(orbX + 45);
    expect(live.textContent).toBe('Timeline moved right');
    press('Home', {}, orb);
    expect(live.textContent).toBe('Timeline reset to default position');
  });

  it('closes open popovers on first Escape and collapses the bar on second Escape', () => {
    render(<Harness />);
    click(byTestId('design-lab-notes-trigger'));
    const card = byTestId('design-lab-notes')!;
    expect(card.textContent).toContain('Compact Timeline');
    expect(card.textContent).toContain('Dense spine');
    expect(card.textContent).toContain('Recommended');
    expect(card.textContent).toContain('Faster to scan');
    expect(card.className).toContain('whitespace-normal');
    expect(card.className).toContain('break-words');

    // First Escape closes only the notes popover; bar remains expanded.
    press('Escape');
    expect(byTestId('design-lab-notes')).toBeNull();
    expect(expandBtn()).toBeNull();

    // Scenario menu opens and selects cleanly.
    click(byTestId('design-lab-scenario-trigger'));
    const menu = byTestId('design-lab-scenario-menu')!;
    const items = Array.from(menu.querySelectorAll('[role="menuitemradio"]')) as HTMLElement[];
    expect(items).toHaveLength(2);
    click(items[1]);
    expect(onScenarioChange).toHaveBeenCalledWith('ghosted');
    expect(byTestId('design-lab-scenario-menu')).toBeNull();

    // Second Escape (no popover open) collapses the bar into the circular orb.
    press('Escape');
    expect(expandBtn()).not.toBeNull();
  });

  it('initializes the state hook from the URL, writes changes and cycles', () => {
    window.history.replaceState({}, '', '/?variant=journal');
    function Probe() {
      const { variant, setVariant, cycleVariant, activeVariant } = useDesignLabState({
        labId: 'probe',
        variants: VARIANTS,
      });
      return (
        <div>
          <span data-testid="probe-variant">{variant}</span>
          <span data-testid="probe-label">{activeVariant?.label}</span>
          <button type="button" id="probe-set" onClick={() => setVariant('compact')}>
            set compact
          </button>
          <button type="button" id="probe-cycle" onClick={() => cycleVariant(1)}>
            cycle
          </button>
        </div>
      );
    }
    render(<Probe />);
    expect(byTestId('probe-variant')!.textContent).toBe('journal');
    expect(byTestId('probe-label')!.textContent).toBe('Lifecycle Journal');
    click(document.getElementById('probe-set'));
    expect(window.location.search).toBe('?variant=compact');
    click(document.getElementById('probe-cycle'));
    expect(byTestId('probe-variant')!.textContent).toBe('journal');
  });
});
