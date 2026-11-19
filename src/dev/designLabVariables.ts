/**
 * Design Lab Variables
 * Pure types and framework-free helpers for the declarative multi-variable system.
 */

export interface ChoiceVariableOption {
  readonly id: string;
  readonly label: string;
}

export interface ColorVariableOption {
  readonly id: string;
  readonly label: string;
  readonly swatchClass: string;
}

export interface DesignLabChoiceVariable {
  readonly type: 'choice';
  readonly label: string;
  readonly options: readonly ChoiceVariableOption[] | readonly string[];
  readonly default: string;
  readonly pinned?: boolean;
}

export interface DesignLabBooleanVariable {
  readonly type: 'boolean';
  readonly label: string;
  readonly default: boolean;
  readonly pinned?: boolean;
}

export interface DesignLabRangeVariable {
  readonly type: 'range';
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly unit?: string;
  readonly default: number;
  readonly pinned?: boolean;
}

export interface DesignLabColorVariable {
  readonly type: 'color';
  readonly label: string;
  readonly options: readonly ColorVariableOption[];
  readonly default: string;
  readonly pinned?: boolean;
}

export type DesignLabVariableDef =
  | DesignLabChoiceVariable
  | DesignLabBooleanVariable
  | DesignLabRangeVariable
  | DesignLabColorVariable;

export type DesignLabVariableSchema = Record<string, DesignLabVariableDef>;
export type DesignLabVariablePrimitive = string | boolean | number;

export type DesignLabVariableValue<D extends DesignLabVariableDef> =
  D extends DesignLabBooleanVariable ? boolean : D extends DesignLabRangeVariable ? number : string;

export type DesignLabVariableValues<S extends DesignLabVariableSchema> = {
  [K in keyof S]: DesignLabVariableValue<S[K]>;
};

export interface DesignLabVariableSnapshot<
  S extends DesignLabVariableSchema = DesignLabVariableSchema,
> {
  readonly id: string;
  readonly name: string;
  readonly values: DesignLabVariableValues<S>;
  readonly createdAt: number;
}

export interface DesignLabVariablesBinding {
  readonly schema: DesignLabVariableSchema;
  readonly values: Readonly<Record<string, DesignLabVariablePrimitive>>;
  readonly setValue: (key: string, value: DesignLabVariablePrimitive) => void;
  readonly resetAll: () => void;
  readonly isDirty: boolean;
  readonly modifiedCount: number;
  readonly pinnedKeys: readonly string[];
  readonly togglePin: (key: string) => void;
  readonly snapshots: readonly DesignLabVariableSnapshot<DesignLabVariableSchema>[];
  readonly saveSnapshot: (name: string) => void;
  readonly applySnapshot: (id: string) => void;
  readonly deleteSnapshot: (id: string) => void;
}

export interface DesignLabVariablesController<S extends DesignLabVariableSchema> {
  readonly schema: S;
  readonly values: DesignLabVariableValues<S>;
  readonly setValue: <K extends keyof S>(key: K, value: DesignLabVariableValues<S>[K]) => void;
  readonly resetAll: () => void;
  readonly isDirty: boolean;
  readonly modifiedCount: number;
  readonly pinnedKeys: readonly string[];
  readonly togglePin: (key: keyof S & string) => void;
  readonly snapshots: readonly DesignLabVariableSnapshot<S>[];
  readonly saveSnapshot: (name: string) => void;
  readonly applySnapshot: (id: string) => void;
  readonly deleteSnapshot: (id: string) => void;
}

export interface StoredVariablesSession<
  S extends DesignLabVariableSchema = DesignLabVariableSchema,
> {
  readonly pinnedOverrides?: Record<string, boolean>;
  readonly snapshots?: DesignLabVariableSnapshot<S>[];
}

const RESERVED_URL_PARAMS = new Set(['lab', 'variant', 'scenario']);

export function normalizeChoiceOptions(
  options: readonly ChoiceVariableOption[] | readonly string[]
): readonly ChoiceVariableOption[] {
  return options.map((opt) => (typeof opt === 'string' ? { id: opt, label: opt } : opt));
}

function getDecimalPlaces(n: number): number {
  const dot = String(n).indexOf('.');
  return dot === -1 ? 0 : String(n).length - dot - 1;
}

export function clampRangeValue(def: DesignLabRangeVariable, raw: number): number {
  const low = Math.min(def.min, def.max);
  const high = Math.max(def.min, def.max);
  let clamped = Math.min(Math.max(raw, low), high);
  if (def.step && Number.isFinite(def.step) && def.step > 0) {
    const steps = Math.round((clamped - low) / def.step);
    const factor = 10 ** Math.max(getDecimalPlaces(def.step), getDecimalPlaces(low));
    clamped = Math.min(Math.max(Math.round((low + steps * def.step) * factor) / factor, low), high);
  }
  return clamped;
}

export function validateVariableValue<D extends DesignLabVariableDef>(
  def: D,
  raw: unknown
): DesignLabVariableValue<D> {
  if (def.type === 'boolean') {
    if (typeof raw === 'boolean') return raw as DesignLabVariableValue<D>;
    if (raw === 'true' || raw === '1' || raw === 1) return true as DesignLabVariableValue<D>;
    if (raw === 'false' || raw === '0' || raw === 0) return false as DesignLabVariableValue<D>;
    return def.default as DesignLabVariableValue<D>;
  }
  if (def.type === 'range') {
    const num =
      typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
    return clampRangeValue(def, Number.isFinite(num) ? num : def.default) as DesignLabVariableValue<D>;
  }
  const options = def.type === 'choice' ? normalizeChoiceOptions(def.options) : def.options;
  if (typeof raw === 'string' && options.some((opt) => opt.id === raw)) {
    return raw as DesignLabVariableValue<D>;
  }
  return def.default as DesignLabVariableValue<D>;
}

export function getVariableDefaults<S extends DesignLabVariableSchema>(
  schema: S
): DesignLabVariableValues<S> {
  const result: Record<string, DesignLabVariablePrimitive> = {};
  for (const [key, def] of Object.entries(schema)) {
    result[key] = validateVariableValue(def, def.default);
  }
  return result as DesignLabVariableValues<S>;
}

export function getVariableUrlParamName(key: string): string {
  return RESERVED_URL_PARAMS.has(key) ? `var_${key}` : key;
}

export function readVariablesFromUrl<S extends DesignLabVariableSchema>(
  schema: S
): DesignLabVariableValues<S> {
  const result: Record<string, DesignLabVariablePrimitive> = { ...getVariableDefaults(schema) };
  if (typeof window === 'undefined') return result as DesignLabVariableValues<S>;
  try {
    const params = new URLSearchParams(window.location.search);
    for (const [key, def] of Object.entries(schema)) {
      const raw = params.get(getVariableUrlParamName(key));
      if (raw !== null) result[key] = validateVariableValue(def, raw);
    }
  } catch {
    // Fall back to defaults when URL cannot be parsed.
  }
  return result as DesignLabVariableValues<S>;
}

export function writeVariablesToUrl<S extends DesignLabVariableSchema>(
  schema: S,
  values: DesignLabVariableValues<S>
): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    const defaults = getVariableDefaults(schema);
    for (const [key, def] of Object.entries(schema)) {
      const paramName = getVariableUrlParamName(key);
      const valid = validateVariableValue(def, values[key]);
      if (valid === defaults[key]) url.searchParams.delete(paramName);
      else url.searchParams.set(paramName, String(valid));
    }
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Sandboxed iframe or restricted history API: skip URL sync.
  }
}

export function countModifiedVariables<S extends DesignLabVariableSchema>(
  schema: S,
  values: DesignLabVariableValues<S>
): number {
  const defaults = getVariableDefaults(schema);
  return Object.keys(schema).reduce((n, key) => n + (values[key] !== defaults[key] ? 1 : 0), 0);
}

export function getVariablesStorageKey(labId: string): string {
  return `tracklet:design-lab:${labId}:vars`;
}

function readJsonStorageObject(key: string): Record<string, unknown> {
  try {
    const raw = typeof window !== 'undefined' ? window.sessionStorage?.getItem(key) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function readVariablesSession<S extends DesignLabVariableSchema>(
  labId: string,
  schema: S
): StoredVariablesSession<S> {
  const record = readJsonStorageObject(getVariablesStorageKey(labId));
  const pinnedOverrides: Record<string, boolean> = {};
  if (record.pinnedOverrides && typeof record.pinnedOverrides === 'object' && !Array.isArray(record.pinnedOverrides)) {
    for (const [k, v] of Object.entries(record.pinnedOverrides as Record<string, unknown>)) {
      if (k in schema && typeof v === 'boolean') pinnedOverrides[k] = v;
    }
  }
  const snapshots: DesignLabVariableSnapshot<S>[] = [];
  if (Array.isArray(record.snapshots)) {
    for (const item of record.snapshots) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      if (typeof entry.id !== 'string' || typeof entry.name !== 'string' || !entry.values || typeof entry.values !== 'object') continue;
      const rawValues = entry.values as Record<string, unknown>;
      const validated: Record<string, DesignLabVariablePrimitive> = {};
      for (const [key, def] of Object.entries(schema)) {
        validated[key] = validateVariableValue(def, rawValues[key]);
      }
      snapshots.push({
        id: entry.id,
        name: entry.name,
        values: validated as DesignLabVariableValues<S>,
        createdAt: typeof entry.createdAt === 'number' && Number.isFinite(entry.createdAt) ? entry.createdAt : 0,
      });
    }
  }
  return {
    ...(Object.keys(pinnedOverrides).length > 0 ? { pinnedOverrides } : {}),
    ...(snapshots.length > 0 ? { snapshots } : {}),
  };
}

export function writeVariablesSession<S extends DesignLabVariableSchema>(
  labId: string,
  patch: Partial<StoredVariablesSession<S>>
): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const key = getVariablesStorageKey(labId);
    const base = readJsonStorageObject(key);
    window.sessionStorage.setItem(key, JSON.stringify({ ...base, ...patch }));
  } catch {
    // Quota exceeded or storage blocked: keep working in-memory.
  }
}

export function resolvePinnedKeys<S extends DesignLabVariableSchema>(
  schema: S,
  overrides?: Record<string, boolean>
): string[] {
  return Object.entries(schema)
    .filter(([key, def]) => (overrides && key in overrides ? overrides[key] : Boolean(def.pinned)))
    .map(([key]) => key);
}
