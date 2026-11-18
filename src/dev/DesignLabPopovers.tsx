import { Check } from 'lucide-react';
import type { DesignLabScenario, DesignLabSurface, DesignLabVariant } from './designLabUtils';

const SHORTCUTS = [
  { keys: 'Alt+1..9', label: 'Switch' },
  { keys: 'Alt+[ / ]', label: 'Cycle' },
  { keys: 'Alt+L', label: 'Collapse' },
  { keys: 'Arrows', label: 'Move grip' },
  { keys: 'Dbl-click', label: 'Reset grip' },
] as const;

/** Flips vertical and horizontal anchors when viewport headroom is tight. */
const resolveVerticalAnchor = (barTop: number) =>
  barTop < 260 ? 'top-full mt-2' : 'bottom-full mb-2';
const resolveHorizontalAnchor = (barLeft: number) =>
  barLeft < 300 ? 'left-0' : 'right-0';

interface SurfaceSkin {
  panel: string;
  heading: string;
  body: string;
  meta: string;
  divider: string;
  pill: string;
  bullet: string;
  kbd: string;
  itemHover: string;
}

const SKINS: Record<DesignLabSurface, SurfaceSkin> = {
  dark: {
    panel:
      'bg-slate-950/97 text-slate-100 border-slate-800/90 ring-white/10 shadow-[0_18px_44px_rgba(2,6,23,0.55),0_2px_8px_rgba(2,6,23,0.35)]',
    heading: 'text-slate-50',
    body: 'text-slate-300',
    meta: 'text-slate-300',
    divider: 'border-slate-800/80',
    pill: 'bg-white/10 text-slate-200 ring-1 ring-inset ring-white/10',
    bullet: 'bg-slate-500',
    kbd: 'bg-white/10 text-slate-200 ring-1 ring-inset ring-white/10',
    itemHover: 'hover:bg-white/10',
  },
  light: {
    panel:
      'bg-white/97 text-slate-900 border-slate-200/90 ring-slate-900/5 shadow-[0_18px_44px_rgba(15,23,42,0.16),0_2px_8px_rgba(15,23,42,0.08)]',
    heading: 'text-slate-900',
    body: 'text-slate-600',
    meta: 'text-slate-600',
    divider: 'border-slate-200',
    pill: 'bg-slate-900/5 text-slate-700 ring-1 ring-inset ring-slate-900/10',
    bullet: 'bg-slate-400',
    kbd: 'bg-slate-900/5 text-slate-700 ring-1 ring-inset ring-slate-900/10',
    itemHover: 'hover:bg-slate-900/5',
  },
};

export interface DesignLabNotesPopoverProps {
  variant?: DesignLabVariant;
  surface: DesignLabSurface;
  /** Pixel top/left of the bar, used to flip the card when headroom is tight. */
  barTop: number;
  barLeft: number;
}

export function DesignLabNotesPopover({
  variant,
  surface,
  barTop,
  barLeft,
}: DesignLabNotesPopoverProps) {
  const skin = SKINS[surface];
  const anchor = `${resolveVerticalAnchor(barTop)} ${resolveHorizontalAnchor(barLeft)}`;

  return (
    <div
      role="dialog"
      aria-label={variant ? `${variant.label} variant notes` : 'Design lab notes'}
      data-testid="design-lab-notes"
      className={`absolute z-10 w-[284px] max-w-[calc(100vw-32px)] rounded-xl border ring-1 ring-inset backdrop-blur-md px-3 py-2.5 select-text ${anchor} ${skin.panel}`}
    >
      <div className="flex items-center gap-2">
        <span className={`font-heading text-xs font-semibold tracking-tight ${skin.heading}`}>
          {variant?.label ?? 'No variant selected'}
        </span>
        {variant?.recommended && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${skin.pill}`}
          >
            Recommended
          </span>
        )}
      </div>

      <p className={`mt-1 text-[11px] leading-relaxed ${skin.body}`}>
        {variant?.summary ?? 'No variant notes recorded for this lab yet.'}
      </p>

      {variant?.tradeoffs && variant.tradeoffs.length > 0 && (
        <ul className="mt-2 space-y-1">
          {variant.tradeoffs.map((tradeoff) => (
            <li key={tradeoff} className={`flex gap-1.5 text-[11px] leading-snug ${skin.body}`}>
              <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${skin.bullet}`} aria-hidden="true" />
              <span>{tradeoff}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={`mt-2.5 border-t pt-2 ${skin.divider}`}>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {SHORTCUTS.map((shortcut) => (
            <span key={shortcut.keys} className="flex items-center gap-1">
              <kbd
                className={`rounded px-1 py-0.5 font-mono text-[9px] font-medium tracking-tight ${skin.kbd}`}
              >
                {shortcut.keys}
              </kbd>
              <span className={`font-mono text-[9px] uppercase tracking-wider ${skin.meta}`}>
                {shortcut.label}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface DesignLabScenarioMenuProps<S extends string = string> {
  scenarios: readonly DesignLabScenario<S>[];
  activeScenario?: S;
  surface: DesignLabSurface;
  barTop: number;
  barLeft: number;
  onSelect: (scenario: S) => void;
}

export function DesignLabScenarioMenu<S extends string = string>({
  scenarios,
  activeScenario,
  surface,
  barTop,
  barLeft,
  onSelect,
}: DesignLabScenarioMenuProps<S>) {
  const skin = SKINS[surface];
  const anchor = `${resolveVerticalAnchor(barTop)} ${resolveHorizontalAnchor(barLeft)}`;

  return (
    <div
      role="menu"
      aria-label="Lab scenario presets"
      data-testid="design-lab-scenario-menu"
      className={`absolute z-10 w-60 max-w-[calc(100vw-32px)] rounded-xl border ring-1 ring-inset backdrop-blur-md p-1.5 ${anchor} ${skin.panel}`}
    >
      {scenarios.map((scenario) => {
        const isActive = scenario.id === activeScenario;

        return (
          <button
            key={scenario.id}
            type="button"
            role="menuitemradio"
            aria-checked={isActive}
            onClick={() => onSelect(scenario.id)}
            className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left select-none cursor-pointer transition-colors duration-150 motion-reduce:transition-none ${skin.itemHover}`}
          >
            <span className="min-w-0">
              <span className={`block text-[11px] font-semibold ${skin.heading}`}>
                {scenario.label}
              </span>
              {scenario.description && (
                <span className={`mt-0.5 block text-[10px] leading-snug ${skin.body}`}>
                  {scenario.description}
                </span>
              )}
            </span>
            {isActive && <Check className={`w-3 h-3 shrink-0 ${skin.meta}`} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
