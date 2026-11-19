import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  countModifiedVariables,
  getVariableDefaults,
  readVariablesFromUrl,
  readVariablesSession,
  resolvePinnedKeys,
  validateVariableValue,
  writeVariablesSession,
  writeVariablesToUrl,
  type DesignLabVariablePrimitive,
  type DesignLabVariableSchema,
  type DesignLabVariableSnapshot,
  type DesignLabVariableValues,
  type DesignLabVariablesController,
} from './designLabVariables';

export interface UseDesignLabVariablesOptions {
  /** Sync non-default variable values with URL query params (defaults to true). */
  syncUrl?: boolean;
}

/**
 * Manages declarative DesignLab variables with URL query-param persistence
 * (without clobbering `lab` or `variant`), sessionStorage snapshots, and pin overrides.
 */
export function useDesignLabVariables<S extends DesignLabVariableSchema>(
  labId: string,
  schema: S,
  options?: UseDesignLabVariablesOptions
): DesignLabVariablesController<S> {
  const syncUrl = options?.syncUrl ?? true;

  const [values, setValues] = useState<DesignLabVariableValues<S>>(() =>
    syncUrl ? readVariablesFromUrl(schema) : getVariableDefaults(schema)
  );

  const [pinnedOverrides, setPinnedOverrides] = useState<Record<string, boolean>>(
    () => readVariablesSession(labId, schema).pinnedOverrides ?? {}
  );

  const [snapshots, setSnapshots] = useState<DesignLabVariableSnapshot<S>[]>(
    () => readVariablesSession(labId, schema).snapshots ?? []
  );

  useEffect(() => {
    if (!syncUrl) return;
    writeVariablesToUrl(schema, values);
  }, [schema, syncUrl, values]);

  useEffect(() => {
    writeVariablesSession(labId, { pinnedOverrides, snapshots });
  }, [labId, pinnedOverrides, snapshots]);

  const setValue = useCallback(
    <K extends keyof S>(key: K, value: DesignLabVariableValues<S>[K]) => {
      const def = schema[key];
      if (!def) return;
      const validated = validateVariableValue(def, value);
      setValues((prev) => (prev[key] === validated ? prev : { ...prev, [key]: validated }));
    },
    [schema]
  );

  const resetAll = useCallback(() => {
    setValues(getVariableDefaults(schema));
  }, [schema]);

  const togglePin = useCallback(
    (key: keyof S & string) => {
      const def = schema[key];
      if (!def) return;
      setPinnedOverrides((prev) => {
        const current = key in prev ? prev[key] : Boolean(def.pinned);
        return { ...prev, [key]: !current };
      });
    },
    [schema]
  );

  const saveSnapshot = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const snapshot: DesignLabVariableSnapshot<S> = {
        id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        values: { ...values },
        createdAt: Date.now(),
      };
      setSnapshots((prev) => [...prev, snapshot]);
    },
    [values]
  );

  const applySnapshot = useCallback(
    (id: string) => {
      const target = snapshots.find((snap) => snap.id === id);
      if (!target) return;
      const next: Record<string, DesignLabVariablePrimitive> = {};
      for (const [key, def] of Object.entries(schema)) {
        next[key] = validateVariableValue(def, target.values[key]);
      }
      setValues(next as DesignLabVariableValues<S>);
    },
    [schema, snapshots]
  );

  const deleteSnapshot = useCallback((id: string) => {
    setSnapshots((prev) => prev.filter((snap) => snap.id !== id));
  }, []);

  const modifiedCount = useMemo(() => countModifiedVariables(schema, values), [schema, values]);
  const isDirty = modifiedCount > 0;
  const pinnedKeys = useMemo(
    () => resolvePinnedKeys(schema, pinnedOverrides),
    [pinnedOverrides, schema]
  );

  return {
    schema,
    values,
    setValue,
    resetAll,
    isDirty,
    modifiedCount,
    pinnedKeys,
    togglePin,
    snapshots,
    saveSnapshot,
    applySnapshot,
    deleteSnapshot,
  };
}
