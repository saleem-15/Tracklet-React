import { useState, type FormEvent } from 'react';
import { RotateCcw, Save, X } from 'lucide-react';
import { motion } from 'motion/react';
import { LAB_FOCUS_RING, LAB_TRANSITION } from './DesignLabBarChrome';
import {
  LAB_POPOVER_SKINS,
  LabPopoverPresence,
  getLabPopoverMotion,
  getSettingsPopoverPlacement,
} from './DesignLabPopoverChrome';
import { DesignLabVariableRow } from './DesignLabVariableRow';
import { isActTestEnvironment, type DesignLabSurface } from './designLabUtils';
import type { DesignLabVariablesBinding } from './designLabVariables';

export interface DesignLabVariablesPopoverProps {
  isOpen: boolean;
  variables: DesignLabVariablesBinding;
  surface: DesignLabSurface;
  barTop: number;
  reducedMotion: boolean;
}

export function DesignLabVariablesPopover({
  isOpen,
  variables,
  surface,
  barTop,
  reducedMotion,
}: DesignLabVariablesPopoverProps) {
  const [snapshotName, setSnapshotName] = useState('');
  const skin = LAB_POPOVER_SKINS[surface];
  const isDark = surface === 'dark';
  const placement = getSettingsPopoverPlacement(barTop);
  const instant = reducedMotion || isActTestEnvironment();
  const anim = getLabPopoverMotion(barTop, instant, 200);
  const entries = Object.entries(variables.schema);

  const handleSaveSnapshot = (event: FormEvent) => {
    event.preventDefault();
    const label = snapshotName.trim() || `Combo ${variables.snapshots.length + 1}`;
    variables.saveSnapshot(label);
    setSnapshotName('');
  };

  return (
    <LabPopoverPresence instant={instant}>
      {isOpen && (
        <motion.div
          key="design-lab-variables"
          role="dialog"
          aria-label="Design lab variables"
          data-testid="design-lab-variables"
          data-lab-popover="true"
          initial={anim.initial}
          animate={anim.animate}
          exit={anim.exit}
          className={`absolute z-10 w-[320px] max-w-[calc(100vw-32px)] rounded-2xl p-3 select-none whitespace-normal transition-[background-color,color,box-shadow] duration-250 ease-out motion-reduce:transition-none ${placement} ${skin.panel}`}
        >
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-1.5">
              <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${skin.meta}`}>
                Variables
              </span>
              <span
                data-testid="design-lab-variables-count"
                className={`rounded-full px-1.5 py-px font-mono text-[9px] font-semibold tabular-nums ${
                  isDark ? 'bg-white/[0.08] text-white/55' : 'bg-black/[0.06] text-neutral-500'
                }`}
              >
                {entries.length}
              </span>
            </div>
            {variables.isDirty && (
              <button
                type="button"
                data-testid="design-lab-vars-reset"
                onClick={variables.resetAll}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer active:scale-[0.92] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${skin.meta} ${skin.itemHover}`}
              >
                <RotateCcw className="w-2.5 h-2.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div
            data-testid="design-lab-variables-list"
            className={`-mx-2 px-2 py-0.5 max-h-[min(340px,45vh)] overflow-y-auto [scrollbar-width:thin] divide-y ${
              isDark
                ? 'divide-white/[0.07] [color-scheme:dark] [scrollbar-color:rgba(255,255,255,0.18)_transparent]'
                : 'divide-black/[0.07] [color-scheme:light] [scrollbar-color:rgba(0,0,0,0.18)_transparent]'
            }`}
          >
            {entries.map(([key, def]) => (
              <DesignLabVariableRow
                key={key}
                varKey={key}
                def={def}
                value={variables.values[key]}
                isPinned={variables.pinnedKeys.includes(key)}
                surface={surface}
                reducedMotion={reducedMotion}
                onChange={(next) => variables.setValue(key, next)}
                onTogglePin={() => variables.togglePin(key)}
              />
            ))}
          </div>

          <div className={`mt-1.5 pt-2 border-t space-y-1.5 ${skin.divider}`}>
            <span className={`block font-mono text-[10px] font-semibold uppercase tracking-wider ${skin.meta}`}>
              Snapshots
            </span>
            <form noValidate onSubmit={handleSaveSnapshot} className="flex items-center gap-1.5">
              <input
                type="text"
                value={snapshotName}
                onChange={(event) => setSnapshotName(event.target.value)}
                placeholder="Save current combo..."
                aria-label="Snapshot name"
                data-testid="design-lab-snapshot-input"
                className={`min-w-0 flex-1 rounded-lg px-2 py-1 text-[11px] outline-none ${
                  isDark
                    ? 'bg-white/[0.07] text-white placeholder-white/40 focus:ring-1 focus:ring-white/30'
                    : 'bg-black/[0.05] text-neutral-900 placeholder-neutral-500 focus:ring-1 focus:ring-neutral-400'
                }`}
              />
              <button
                type="submit"
                aria-label="Save variable snapshot"
                data-testid="design-lab-snapshot-save"
                className={`inline-flex h-6 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold cursor-pointer active:scale-[0.92] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
                  isDark
                    ? 'bg-white/[0.14] text-white hover:bg-white/[0.22]'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                <Save className="w-2.5 h-2.5" aria-hidden="true" />
                <span>Save</span>
              </button>
            </form>

            {variables.snapshots.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {variables.snapshots.map((snap) => (
                  <span
                    key={snap.id}
                    className={`inline-flex items-center gap-0.5 rounded-full pl-2 pr-1 py-0.5 text-[10px] font-medium ${skin.pill}`}
                  >
                    <button
                      type="button"
                      data-testid={`design-lab-snapshot-apply-${snap.id}`}
                      onClick={() => variables.applySnapshot(snap.id)}
                      className="cursor-pointer hover:underline"
                    >
                      {snap.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete snapshot ${snap.name}`}
                      data-testid={`design-lab-snapshot-delete-${snap.id}`}
                      onClick={() => variables.deleteSnapshot(snap.id)}
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full opacity-65 hover:opacity-100 cursor-pointer active:scale-[0.92]"
                    >
                      <X className="w-2.5 h-2.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </LabPopoverPresence>
  );
}
