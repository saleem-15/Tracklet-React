import { ChevronDown, Info, Moon, Sun } from 'lucide-react';
import { DesignLabNotesPopover, DesignLabScenarioMenu } from './DesignLabPopovers';
import {
  LabIconButton,
  LabScenarioTrigger,
  LabSeparator,
  LabTitleChip,
  VariantSwitcher,
} from './DesignLabBarChrome';
import type { DesignLabScenario, DesignLabSurface, DesignLabVariant } from './designLabUtils';

export interface DesignLabExpandedControlsProps<T extends string = string, S extends string = string> {
  labId: string;
  title: string;
  variants: readonly DesignLabVariant<T>[];
  activeVariant: T;
  onVariantChange: (variant: T) => void;
  scenarios?: readonly DesignLabScenario<S>[];
  activeScenario?: S;
  activeScenarioLabel: string;
  surface: DesignLabSurface;
  reducedMotion: boolean;
  isNotesOpen: boolean;
  isScenarioMenuOpen: boolean;
  onToggleNotes: () => void;
  onToggleScenarioMenu: () => void;
  onSelectScenario: (scenario: S) => void;
  onToggleSurface: () => void;
  onCollapse: () => void;
  barTop: number;
  barLeft: number;
}

export function DesignLabExpandedControls<T extends string, S extends string>({
  labId,
  title,
  variants,
  activeVariant,
  onVariantChange,
  scenarios,
  activeScenario,
  activeScenarioLabel,
  surface,
  reducedMotion,
  isNotesOpen,
  isScenarioMenuOpen,
  onToggleNotes,
  onToggleScenarioMenu,
  onSelectScenario,
  onToggleSurface,
  onCollapse,
  barTop,
  barLeft,
}: DesignLabExpandedControlsProps<T, S>) {
  const isDark = surface === 'dark';
  const hasScenarios = Boolean(scenarios && scenarios.length > 0);
  const notesVariant = variants.find((variant) => variant.id === activeVariant) ?? variants[0];

  return (
    <>
      <LabTitleChip title={title} surface={surface} />
      <LabSeparator surface={surface} />

      <VariantSwitcher
        labId={labId}
        variants={variants}
        activeVariant={activeVariant}
        onVariantChange={onVariantChange}
        surface={surface}
        reducedMotion={reducedMotion}
      />

      {hasScenarios && (
        <LabScenarioTrigger
          label={activeScenarioLabel}
          isOpen={isScenarioMenuOpen}
          surface={surface}
          onClick={onToggleScenarioMenu}
        >
          {isScenarioMenuOpen && scenarios && (
            <DesignLabScenarioMenu
              scenarios={scenarios}
              activeScenario={activeScenario}
              surface={surface}
              barTop={barTop}
              barLeft={barLeft}
              onSelect={onSelectScenario}
            />
          )}
        </LabScenarioTrigger>
      )}

      <LabSeparator surface={surface} />

      <div role="group" aria-label="Lab controls" className="flex items-center gap-0.5">
        <LabIconButton
          label={isNotesOpen ? 'Hide variant notes and shortcuts' : 'Show variant notes and shortcuts'}
          ariaExpanded={isNotesOpen}
          surface={surface}
          onClick={onToggleNotes}
        >
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
        </LabIconButton>

        <LabIconButton
          label={isDark ? 'Switch to light surface' : 'Switch to dark surface'}
          surface={surface}
          onClick={onToggleSurface}
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Moon className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </LabIconButton>

        <LabIconButton
          label="Collapse design lab bar (Alt+L)"
          ariaExpanded={true}
          surface={surface}
          onClick={onCollapse}
        >
          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
        </LabIconButton>
      </div>

      {isNotesOpen && (
        <DesignLabNotesPopover variant={notesVariant} surface={surface} barTop={barTop} barLeft={barLeft} />
      )}
    </>
  );
}
