import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, useState } from 'react';
import { DesignLabBar, useDesignLabState } from '../../src/dev';
import type { DesignLabScenario, DesignLabVariant } from '../../src/dev';
import * as lab from '../../src/dev/designLabUtils';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const VARIANTS: readonly DesignLabVariant[] = [
  { id: 'compact', label: 'Compact Timeline', shortLabel: 'Compact', summary: 'Dense spine with only the essential milestones.', tradeoffs: ['Less context per step', 'Faster to scan'], recommended: true },
  { id: 'journal', label: 'Lifecycle Journal', shortLabel: 'Journal', summary: 'Rich audit trail with notes and timestamps.', tradeoffs: ['Higher visual weight'] },
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
  const grip = () => document.querySelector('[data-testid="design-lab-drag-handle"]') as HTMLElement;
  const byLabel = (label: string) => document.querySelector(`[aria-label="${label}"]`) as HTMLElement | null;
  const variantButtons = () =>
    Array.from(document.querySelectorAll('[role="group"][aria-label="Design variants"] button')) as HTMLElement[];
  const notes = () => document.querySelector('[data-testid="design-lab-notes"]');
  const px = (value: string) => Number.parseFloat(value);
  const click = (target: Element | null) => act(() => target!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = window) =>
    act(() => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })));
  const pointer = (type: string, init: PointerEventInit = {}) =>
    act(() => grip().dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, ...init })));

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

  it('portals above modals with zero AI slop', () => {
    render(<Harness />);
    const element = bar();
    expect(element.parentElement).toBe(document.body);
    expect(host.contains(element)).toBe(false);
    expect(element.className).toContain('z-[9990]');
    expect(element.className).toContain('bg-slate-950/92');
    expect(element.getAttribute('role')).toBe('toolbar');
    expect(element.getAttribute('aria-label')).toBe('Timeline design lab');
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
    act(() => grip().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
    click(byLabel('Collapse design lab bar (Alt+L)'));
    expect(onMouseDown).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('switches variants by click, Alt digits and bracket cycling', () => {
    render(<Harness />);
    expect(variantButtons()[0].getAttribute('aria-pressed')).toBe('true');
    click(variantButtons()[1]);
    expect(variantButtons()[1].getAttribute('aria-pressed')).toBe('true');
    press('1', { altKey: true, code: 'Digit1' });
    expect(variantButtons()[0].getAttribute('aria-pressed')).toBe('true');
    press('2', { altKey: true, code: 'Digit2' });
    expect(variantButtons()[1].getAttribute('aria-pressed')).toBe('true');
    press(']', { altKey: true, code: 'BracketRight' });
    expect(variantButtons()[2].getAttribute('aria-pressed')).toBe('true');
    press(']', { altKey: true, code: 'BracketRight' });
    expect(variantButtons()[0].getAttribute('aria-pressed')).toBe('true');
    press('[', { altKey: true, code: 'BracketLeft' });
    expect(variantButtons()[2].getAttribute('aria-pressed')).toBe('true');
    const input = document.createElement('input');
    host.appendChild(input);
    press('2', { altKey: true, code: 'Digit2' }, input);
    expect(variantButtons()[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('collapses, expands and persists chrome state across remounts', () => {
    render(<Harness />);
    click(byLabel('Switch to light surface'));
    expect(bar().className).toContain('bg-white/95');
    expect(lab.readLabStoredState('timeline').surface).toBe('light');
    click(byLabel('Collapse design lab bar (Alt+L)'));
    expect(byLabel('Expand design lab bar (Alt+L)')).not.toBeNull();
    expect(lab.readLabStoredState('timeline').collapsed).toBe(true);
    press('l', { altKey: true, code: 'KeyL' });
    expect(byLabel('Collapse design lab bar (Alt+L)')).not.toBeNull();
    press('l', { altKey: true, code: 'KeyL' });
    expect(byLabel('Expand design lab bar (Alt+L)')).not.toBeNull();
    act(() => root.unmount());
    root = createRoot(host);
    render(<Harness />);
    expect(byLabel('Expand design lab bar (Alt+L)')).not.toBeNull();
    expect(bar().className).toContain('bg-white/95');
  });

  it('moves and resets with the keyboard drag handle', () => {
    render(<Harness />);
    const handle = grip();
    const startX = px(bar().style.left);
    const startY = px(bar().style.top);
    const live = document.querySelector('[aria-live="polite"]') as HTMLElement;
    act(() => handle.focus());
    press('ArrowRight', {}, handle);
    expect(px(bar().style.left)).toBe(startX + 15);
    expect(live.textContent).toBe('Timeline moved right');
    press('ArrowUp', {}, handle);
    expect(px(bar().style.top)).toBe(startY - 15);
    expect(live.textContent).toBe('Timeline moved up');
    press('Home', {}, handle);
    expect(px(bar().style.left)).toBe(startX);
    expect(px(bar().style.top)).toBe(startY);
    expect(live.textContent).toBe('Timeline reset to default position');
    press('ArrowLeft', {}, handle);
    act(() => handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    expect(px(bar().style.left)).toBe(startX);
  });

  it('drags with a 4px threshold, uses GPU transform, and commits on release', () => {
    render(<Harness />);
    const startX = px(bar().style.left);
    const startY = px(bar().style.top);
    pointer('pointerdown', { clientX: 100, clientY: 100 });
    pointer('pointermove', { clientX: 102, clientY: 101 });
    expect(bar().style.transform).toBe('');
    pointer('pointermove', { clientX: 140, clientY: 70 });
    expect(bar().style.transform).toBe('translate3d(40px, -30px, 0)');
    expect(px(bar().style.left)).toBe(startX);
    pointer('pointerup', { clientX: 140, clientY: 70 });
    expect(bar().style.transform).toBe('');
    expect(px(bar().style.left)).toBe(startX + 40);
    expect(px(bar().style.top)).toBe(startY - 30);
    expect(lab.readLabStoredState('timeline').pos).toEqual({ x: startX + 40, y: startY - 30 });
  });

  it('opens variant notes with summary, tradeoffs and shortcuts, closing on Escape', () => {
    render(<Harness />);
    click(byLabel('Show variant notes and shortcuts'));
    const card = notes() as HTMLElement;
    expect(card.textContent).toContain('Compact Timeline');
    expect(card.textContent).toContain('Dense spine');
    expect(card.textContent).toContain('Recommended');
    expect(card.textContent).toContain('Faster to scan');
    expect(card.textContent).toContain('Alt+L');
    press('Escape');
    expect(notes()).toBeNull();
  });

  it('switches scenario presets through a custom menu', () => {
    render(<Harness />);
    click(document.querySelector('[data-testid="design-lab-scenario-trigger"]'));
    const menu = document.querySelector('[data-testid="design-lab-scenario-menu"]') as HTMLElement;
    expect(menu).not.toBeNull();
    expect(document.querySelector('select')).toBeNull();
    const items = Array.from(menu.querySelectorAll('[role="menuitemradio"]')) as HTMLElement[];
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('aria-checked')).toBe('true');
    click(items[1]);
    expect(onScenarioChange).toHaveBeenCalledWith('ghosted');
    expect(document.querySelector('[data-testid="design-lab-scenario-menu"]')).toBeNull();
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
    expect(document.querySelector('[data-testid="probe-variant"]')!.textContent).toBe('journal');
    expect(document.querySelector('[data-testid="probe-label"]')!.textContent).toBe('Lifecycle Journal');
    expect(window.location.search).toBe('?variant=journal');
    click(document.getElementById('probe-set'));
    expect(window.location.search).toBe('?variant=compact');
    click(document.getElementById('probe-cycle'));
    expect(document.querySelector('[data-testid="probe-variant"]')!.textContent).toBe('journal');
    expect(window.location.search).toBe('?variant=journal');
  });
});
