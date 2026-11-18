/**
 * Design Lab Decision
 * Pure formatter & clipboard helper for 1-click decision prompt snippets.
 */

import type { DesignLabScenario, DesignLabVariant } from './designLabUtils';
import {
  normalizeChoiceOptions,
  validateVariableValue,
  type DesignLabVariablePrimitive,
  type DesignLabVariableSchema,
} from './designLabVariables';

export interface DesignLabDecisionInput<T extends string = string, S extends string = string> {
  readonly labId: string;
  readonly title: string;
  readonly variants: readonly DesignLabVariant<T>[];
  readonly activeVariant: T;
  readonly scenarios?: readonly DesignLabScenario<S>[];
  readonly activeScenario?: S;
  readonly eliminatedIds?: readonly string[];
  readonly variables?: {
    readonly schema: DesignLabVariableSchema;
    readonly values: Readonly<Record<string, DesignLabVariablePrimitive>>;
  };
}

export function formatDesignLabDecision<T extends string = string, S extends string = string>(
  input: DesignLabDecisionInput<T, S>
): string {
  const {
    labId,
    title,
    variants,
    activeVariant,
    scenarios,
    activeScenario,
    eliminatedIds,
    variables,
  } = input;

  const selected = variants.find((v) => v.id === activeVariant);
  const selectedLabel = selected?.label ?? activeVariant;
  const lines: string[] = [
    `## Design Lab Decision: ${title} (\`${labId}\`)`,
    `- **Selected Variant**: ${selectedLabel} (\`${activeVariant}\`)`,
  ];

  if (selected?.summary) {
    lines.push(`  - Summary: ${selected.summary}`);
  }
  if (selected?.tradeoffs && selected.tradeoffs.length > 0) {
    for (const tradeoff of selected.tradeoffs) {
      lines.push(`  - Tradeoff: ${tradeoff}`);
    }
  }

  if (activeScenario) {
    const scenario = scenarios?.find((s) => s.id === activeScenario);
    if (scenario) {
      lines.push(`- **Scenario**: ${scenario.label} (\`${scenario.id}\`)`);
      if (scenario.description) lines.push(`  - Description: ${scenario.description}`);
    } else {
      lines.push(`- **Scenario**: \`${activeScenario}\``);
    }
  }

  if (variables) {
    const entries = Object.entries(variables.schema);
    if (entries.length > 0) {
      lines.push('- **Variables**:');
      for (const [key, def] of entries) {
        const value = validateVariableValue(def, variables.values[key]);
        const defaultVal = validateVariableValue(def, def.default);
        let formatted: string;

        if (def.type === 'boolean') {
          formatted = value ? 'On' : 'Off';
        } else if (def.type === 'range') {
          formatted = `${value}${def.unit ?? ''}`;
        } else {
          const options = def.type === 'choice' ? normalizeChoiceOptions(def.options) : def.options;
          const match = options.find((opt) => opt.id === value);
          formatted = match ? match.label : String(value);
        }

        const suffix = value === defaultVal ? ' (default)' : '';
        lines.push(`  - ${def.label} (\`${key}\`): ${formatted}${suffix}`);
      }
    }
  }

  if (eliminatedIds && eliminatedIds.length > 0) {
    const ruledOut = variants.filter((v) => eliminatedIds.includes(v.id));
    if (ruledOut.length > 0) {
      lines.push('- **Ruled Out**:');
      for (const variant of ruledOut) {
        lines.push(`  - ${variant.label} (\`${variant.id}\`)`);
      }
    }
  }

  return lines.join('\n');
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback.
    }
  }

  if (typeof document === 'undefined' || !document.body) return false;

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}
