import { Ban, Check, Copy, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { MOTION_EASE } from '../lib/motion';
import { LAB_FOCUS_RING, LAB_TRANSITION } from './DesignLabBarChrome';
import {
  LAB_POPOVER_SKINS,
  LabAppearanceToggle,
  LabPopoverPresence,
  getLabPopoverMotion,
  getLabPopoverPlacement,
  getSettingsPopoverPlacement,
} from './DesignLabPopoverChrome';
import {
  isActTestEnvironment,
  type DesignLabScenario,
  type DesignLabSurface,
  type DesignLabVariant,
} from './designLabUtils';

export interface DesignLabNotesPopoverProps {
  isOpen: boolean;
  variant?: DesignLabVariant;
  isEliminated?: boolean;
  copiedDecision?: boolean;
  onToggleEliminate?: () => void;
  onCopyDecision?: () => void;
  surface: DesignLabSurface;
  barTop: number;
  barLeft: number;
  reducedMotion: boolean;
}

export function DesignLabNotesPopover({
  isOpen,
  variant,
  isEliminated = false,
  copiedDecision = false,
  onToggleEliminate,
  onCopyDecision,
  surface,
  barTop,
  barLeft,
  reducedMotion,
}: DesignLabNotesPopoverProps) {
  const skin = LAB_POPOVER_SKINS[surface];
  const placement = getLabPopoverPlacement(barTop, barLeft);
  const instant = reducedMotion || isActTestEnvironment();
  const anim = getLabPopoverMotion(barTop, instant);

  return (
    <LabPopoverPresence instant={instant}>
      {isOpen && (
        <motion.div
          key="design-lab-notes"
          role="dialog"
          aria-label={variant ? `${variant.label} variant notes` : 'Design lab notes'}
          data-testid="design-lab-notes"
          data-lab-popover="true"
          initial={anim.initial}
          animate={anim.animate}
          exit={anim.exit}
          className={`absolute z-10 w-[280px] max-w-[calc(100vw-32px)] rounded-2xl px-3.5 py-3 select-text whitespace-normal break-words [overflow-wrap:anywhere] transition-[background-color,color,box-shadow] duration-250 ease-out motion-reduce:transition-none ${placement} ${skin.panel}`}
        >
          <motion.div
            key={variant?.id ?? 'empty'}
            initial={instant ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={instant ? { duration: 0 } : { duration: 0.14, ease: MOTION_EASE.command }}
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
              {isEliminated && (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${skin.pill}`}
                >
                  Ruled out
                </span>
              )}
            </div>

            <p className={`mt-1 text-[11px] leading-relaxed whitespace-normal break-words [overflow-wrap:anywhere] ${skin.body}`}>
              {variant?.summary ?? 'No variant notes recorded for this lab yet.'}
            </p>

            {variant?.tradeoffs && variant.tradeoffs.length > 0 && (
              <ul className="mt-2 space-y-1">
                {variant.tradeoffs.map((tradeoff) => (
                  <li key={tradeoff} className={`flex gap-1.5 text-[11px] leading-snug whitespace-normal break-words min-w-0 ${skin.body}`}>
                    <span
                      className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${skin.bullet}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">{tradeoff}</span>
                  </li>
                ))}
              </ul>
            )}

            {(onToggleEliminate || onCopyDecision) && (
              <div className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-2 select-none ${skin.divider}`}>
                {onToggleEliminate && (
                  <button
                    type="button"
                    data-testid="design-lab-eliminate-toggle"
                    onClick={onToggleEliminate}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold cursor-pointer active:scale-[0.92] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${skin.meta} ${skin.itemHover}`}
                  >
                    {isEliminated ? (
                      <>
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        <span>Restore</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-3 h-3" aria-hidden="true" />
                        <span>Rule out</span>
                      </>
                    )}
                  </button>
                )}
                {onCopyDecision && (
                  <button
                    type="button"
                    data-testid="design-lab-notes-copy-decision"
                    onClick={onCopyDecision}
                    className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold cursor-pointer active:scale-[0.92] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${skin.pill} ${skin.itemHover}`}
                  >
                    {copiedDecision ? (
                      <>
                        <Check className="w-3 h-3" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" aria-hidden="true" />
                        <span>Copy decision</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </LabPopoverPresence>
  );
}

export interface DesignLabScenarioMenuProps<S extends string = string> {
  isOpen: boolean;
  scenarios: readonly DesignLabScenario<S>[];
  activeScenario?: S;
  surface: DesignLabSurface;
  barTop: number;
  barLeft: number;
  reducedMotion: boolean;
  onSelect: (scenario: S) => void;
}

export function DesignLabScenarioMenu<S extends string = string>({
  isOpen,
  scenarios,
  activeScenario,
  surface,
  barTop,
  barLeft,
  reducedMotion,
  onSelect,
}: DesignLabScenarioMenuProps<S>) {
  const skin = LAB_POPOVER_SKINS[surface];
  const placement = getLabPopoverPlacement(barTop, barLeft);
  const instant = reducedMotion || isActTestEnvironment();
  const anim = getLabPopoverMotion(barTop, instant);

  return (
    <LabPopoverPresence instant={instant}>
      {isOpen && (
        <motion.div
          key="design-lab-scenario-menu"
          role="menu"
          aria-label="Lab scenario presets"
          data-testid="design-lab-scenario-menu"
          data-lab-popover="true"
          initial={anim.initial}
          animate={anim.animate}
          exit={anim.exit}
          className={`absolute z-10 w-60 max-w-[calc(100vw-32px)] rounded-2xl p-1.5 whitespace-normal transition-[background-color,color,box-shadow] duration-250 ease-out motion-reduce:transition-none ${placement} ${skin.panel}`}
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
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left select-none cursor-pointer transition-colors duration-150 ${LAB_FOCUS_RING} ${skin.itemHover}`}
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
                {isActive && (
                  <motion.span
                    initial={instant ? false : { opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={instant ? { duration: 0 } : { duration: 0.14, ease: MOTION_EASE.command }}
                    className="shrink-0"
                  >
                    <Check className={`w-3 h-3 ${skin.meta}`} aria-hidden="true" />
                  </motion.span>
                )}
              </button>
            );
          })}
        </motion.div>
      )}
    </LabPopoverPresence>
  );
}

export interface DesignLabSettingsPopoverProps {
  isOpen: boolean;
  title: string;
  surface: DesignLabSurface;
  barTop: number;
  reducedMotion: boolean;
  onSurfaceChange: (surface: DesignLabSurface) => void;
}

export function DesignLabSettingsPopover({
  isOpen,
  title,
  surface,
  barTop,
  reducedMotion,
  onSurfaceChange,
}: DesignLabSettingsPopoverProps) {
  const skin = LAB_POPOVER_SKINS[surface];
  const placement = getSettingsPopoverPlacement(barTop);
  const instant = reducedMotion || isActTestEnvironment();
  const anim = getLabPopoverMotion(barTop, instant, 200);

  return (
    <LabPopoverPresence instant={instant}>
      {isOpen && (
        <motion.div
          key="design-lab-settings"
          role="dialog"
          aria-label={`${title} lab settings`}
          data-testid="design-lab-settings"
          data-lab-popover="true"
          initial={anim.initial}
          animate={anim.animate}
          exit={anim.exit}
          className={`absolute z-10 w-[236px] max-w-[calc(100vw-32px)] rounded-2xl p-3 select-none whitespace-normal transition-[background-color,color,box-shadow] duration-250 ease-out motion-reduce:transition-none ${placement} ${skin.panel}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${skin.meta}`}>
              Appearance
            </span>
            <LabAppearanceToggle surface={surface} reducedMotion={instant} onChange={onSurfaceChange} />
          </div>
        </motion.div>
      )}
    </LabPopoverPresence>
  );
}
