import { Check, Copy, Eye, Info, Settings, SlidersHorizontal, X } from 'lucide-react';
import {
  DesignLabNotesPopover,
  DesignLabScenarioMenu,
  DesignLabSettingsPopover,
} from './DesignLabPopovers';
import { DesignLabPinnedVars } from './DesignLabPinnedVars';
import { DesignLabVariablesPopover } from './DesignLabVariablesPopover';
import {
  LabIconButton,
  LabScenarioTrigger,
  LabSeparator,
  VariantSwitcher,
} from './DesignLabBarChrome';
import type { DesignLabScenario, DesignLabSurface, DesignLabVariant } from './designLabUtils';
import type { DesignLabVariablesBinding } from './designLabVariables';

export interface DesignLabExpandedControlsProps<T extends string = string, S extends string = string> {
  title: string;
  variants: readonly DesignLabVariant<T>[];
  activeVariant: T;
  onVariantChange: (variant: T) => void;
  eliminatedIds: readonly string[];
  onToggleEliminate: (variant: T) => void;
  canPeekBaseline: boolean;
  isPeekingBaseline: boolean;
  baselineLabel?: string;
  onStartPeekBaseline: () => void;
  onStopPeekBaseline: () => void;
  variables?: DesignLabVariablesBinding;
  scenarios?: readonly DesignLabScenario<S>[];
  activeScenario?: S;
  activeScenarioLabel: string;
  surface: DesignLabSurface;
  reducedMotion: boolean;
  isNotesOpen: boolean;
  isVariablesOpen: boolean;
  isScenarioMenuOpen: boolean;
  isSettingsOpen: boolean;
  copiedDecision: boolean;
  onToggleNotes: () => void;
  onToggleVariables: () => void;
  onToggleScenarioMenu: () => void;
  onToggleSettings: () => void;
  onSelectScenario: (scenario: S) => void;
  onCopyDecision: () => void;
  onSurfaceChange: (surface: DesignLabSurface) => void;
  onCollapse: () => void;
  barTop: number;
  barLeft: number;
}

export function DesignLabExpandedControls<T extends string, S extends string>({
  title,
  variants,
  activeVariant,
  onVariantChange,
  eliminatedIds,
  onToggleEliminate,
  canPeekBaseline,
  isPeekingBaseline,
  baselineLabel,
  onStartPeekBaseline,
  onStopPeekBaseline,
  variables,
  scenarios,
  activeScenario,
  activeScenarioLabel,
  surface,
  reducedMotion,
  isNotesOpen,
  isVariablesOpen,
  isScenarioMenuOpen,
  isSettingsOpen,
  copiedDecision,
  onToggleNotes,
  onToggleVariables,
  onToggleScenarioMenu,
  onToggleSettings,
  onSelectScenario,
  onCopyDecision,
  onSurfaceChange,
  onCollapse,
  barTop,
  barLeft,
}: DesignLabExpandedControlsProps<T, S>) {
  const hasScenarios = Boolean(scenarios && scenarios.length > 0);
  const hasVariables = Boolean(variables && Object.keys(variables.schema).length > 0);
  const notesVariant = variants.find((variant) => variant.id === activeVariant) ?? variants[0];
  const isNotesVariantEliminated = notesVariant ? eliminatedIds.includes(notesVariant.id) : false;

  return (
    <>
      <VariantSwitcher
        variants={variants}
        activeVariant={activeVariant}
        onVariantChange={onVariantChange}
        eliminatedIds={eliminatedIds}
        onToggleEliminate={onToggleEliminate}
        surface={surface}
        barTop={barTop}
        reducedMotion={reducedMotion}
      />

      {hasVariables && variables && variables.pinnedKeys.length > 0 && (
        <DesignLabPinnedVars variables={variables} surface={surface} barTop={barTop} />
      )}

      {hasScenarios && scenarios && (
        <LabScenarioTrigger
          label={activeScenarioLabel}
          isOpen={isScenarioMenuOpen}
          surface={surface}
          barTop={barTop}
          onClick={onToggleScenarioMenu}
        >
          <DesignLabScenarioMenu
            isOpen={isScenarioMenuOpen}
            scenarios={scenarios}
            activeScenario={activeScenario}
            surface={surface}
            barTop={barTop}
            barLeft={barLeft}
            reducedMotion={reducedMotion}
            onSelect={onSelectScenario}
          />
        </LabScenarioTrigger>
      )}

      <LabSeparator surface={surface} />

      <div role="group" aria-label="Lab controls" className="flex items-center gap-0.5">
        {canPeekBaseline && (
          <LabIconButton
            label={baselineLabel ? `Hold to peek ${baselineLabel}` : 'Hold to peek baseline'}
            tooltip={baselineLabel ? `Hold to peek ${baselineLabel}` : 'Hold to peek baseline'}
            shortcut="Alt+0"
            barTop={barTop}
            isActive={isPeekingBaseline}
            surface={surface}
            onPointerDown={(event) => {
              event.stopPropagation();
              onStartPeekBaseline();
            }}
            onPointerUp={onStopPeekBaseline}
            onPointerLeave={onStopPeekBaseline}
            onPointerCancel={onStopPeekBaseline}
            testId="design-lab-peek-baseline"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          </LabIconButton>
        )}

        {hasVariables && variables && (
          <div data-lab-anchor="variables" className="relative inline-flex items-center">
            <LabIconButton
              label={isVariablesOpen ? 'Hide lab variables' : 'Show lab variables'}
              tooltip="Variables"
              barTop={barTop}
              isActive={isVariablesOpen}
              badge={variables.modifiedCount}
              ariaExpanded={isVariablesOpen}
              ariaHasPopup="dialog"
              surface={surface}
              onClick={onToggleVariables}
              testId="design-lab-variables-trigger"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            </LabIconButton>
            <DesignLabVariablesPopover
              isOpen={isVariablesOpen}
              variables={variables}
              surface={surface}
              barTop={barTop}
              reducedMotion={reducedMotion}
            />
          </div>
        )}

        <LabIconButton
          label={isNotesOpen ? 'Hide variant notes' : 'Show variant notes'}
          tooltip="Variant notes"
          barTop={barTop}
          isActive={isNotesOpen}
          ariaExpanded={isNotesOpen}
          ariaHasPopup="dialog"
          surface={surface}
          onClick={onToggleNotes}
          testId="design-lab-notes-trigger"
        >
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
        </LabIconButton>

        <LabIconButton
          label={copiedDecision ? 'Decision copied' : 'Copy decision prompt'}
          tooltip={copiedDecision ? 'Copied decision' : 'Copy decision'}
          barTop={barTop}
          isActive={copiedDecision}
          surface={surface}
          onClick={onCopyDecision}
          testId="design-lab-copy-decision"
        >
          {copiedDecision ? (
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </LabIconButton>

        <div data-lab-anchor="settings" className="relative inline-flex items-center">
          <LabIconButton
            label={isSettingsOpen ? 'Hide lab settings' : 'Show lab settings'}
            tooltip="Settings"
            barTop={barTop}
            isActive={isSettingsOpen}
            ariaExpanded={isSettingsOpen}
            ariaHasPopup="dialog"
            surface={surface}
            onClick={onToggleSettings}
            testId="design-lab-settings-trigger"
          >
            <Settings
              className={`w-3.5 h-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                isSettingsOpen ? 'rotate-45' : ''
              }`}
              aria-hidden="true"
            />
          </LabIconButton>
          <DesignLabSettingsPopover
            isOpen={isSettingsOpen}
            title={title}
            surface={surface}
            barTop={barTop}
            reducedMotion={reducedMotion}
            onSurfaceChange={onSurfaceChange}
          />
        </div>

        <LabIconButton
          label="Collapse design lab bar (Esc)"
          tooltip="Collapse"
          shortcut="Esc"
          barTop={barTop}
          ariaExpanded={true}
          surface={surface}
          onClick={onCollapse}
          testId="design-lab-collapse"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </LabIconButton>
      </div>

      <DesignLabNotesPopover
        isOpen={isNotesOpen}
        variant={notesVariant}
        isEliminated={isNotesVariantEliminated}
        copiedDecision={copiedDecision}
        onToggleEliminate={notesVariant ? () => onToggleEliminate(notesVariant.id) : undefined}
        onCopyDecision={onCopyDecision}
        surface={surface}
        barTop={barTop}
        barLeft={barLeft}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
