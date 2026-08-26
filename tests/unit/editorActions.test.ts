import { describe, it, expect } from 'vitest';
import {
  EDITOR_ACTIONS,
  filterActions,
  menuActions,
  getActionById,
  type EditorActionId,
} from '../../src/components/editor/editorActions';

const REQUIRED_IDS: EditorActionId[] = [
  'bold',
  'italic',
  'h1',
  'h2',
  'h3',
  'bullet',
  'numbered',
  'todo',
  'quote',
  'code',
  'link',
];

describe('editorActions registry (FR-007/FR-008)', () => {
  it('contains every FR-007 minimum action exactly once', () => {
    const ids = EDITOR_ACTIONS.map((a) => a.id);
    for (const required of REQUIRED_IDS) {
      expect(ids.filter((id) => id === required)).toHaveLength(1);
    }
  });

  it('has unique, non-empty labels', () => {
    const labels = EDITOR_ACTIONS.map((a) => a.label);
    expect(new Set(labels).size).toBe(labels.length);
    labels.forEach((l) => expect(l.trim().length).toBeGreaterThan(0));
  });

  it('uses valid scope values', () => {
    const scopes = ['block', 'inline', 'selection'];
    EDITOR_ACTIONS.forEach((a) => expect(scopes).toContain(a.scope));
  });

  it('exposes at least one keyword per action for slash filtering', () => {
    EDITOR_ACTIONS.forEach((a) => expect(a.keywords.length).toBeGreaterThan(0));
  });

  it('getActionById resolves known ids and rejects unknown ones', () => {
    expect(getActionById('bold')?.label).toBe('Bold');
    expect(getActionById('link' as EditorActionId)?.id).toBe('link');
    expect(getActionById('nonexistent' as EditorActionId)).toBeUndefined();
  });
});

describe('filterActions (FR-006)', () => {
  it('returns the full registry for an empty query', () => {
    expect(filterActions('').length).toBe(EDITOR_ACTIONS.length);
    expect(filterActions('   ').length).toBe(EDITOR_ACTIONS.length);
  });

  it('filters case-insensitively by label', () => {
    const result = filterActions('head');
    const ids = result.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['h1', 'h2', 'h3']));
    expect(ids).not.toContain('bold');
  });

  it('matches keywords too', () => {
    expect(filterActions('checkbox').map((a) => a.id)).toContain('todo');
    expect(filterActions('url').map((a) => a.id)).toContain('link');
    expect(filterActions('callout').map((a) => a.id)).toContain('quote');
  });

  it('returns empty array for garbage queries', () => {
    expect(filterActions('zzzznotfound')).toEqual([]);
  });

  it('menuActions hides Bold/Italic while keeping them in the registry', () => {
    const ids = menuActions('').map((a) => a.id);
    expect(ids).not.toContain('bold');
    expect(ids).not.toContain('italic');
    // FR-007 minimum set remains
    for (const required of ['h1','h2','h3','bullet','numbered','todo','quote','code','link'] as const) {
      expect(ids).toContain(required);
    }
    // Registry itself is untouched — shortcuts/bubble still work
    expect(EDITOR_ACTIONS.map((a) => a.id)).toContain('bold');
    expect(EDITOR_ACTIONS.map((a) => a.id)).toContain('italic');

    // Querying never resurrects them into the menu
    expect(menuActions('b').map((a) => a.id)).not.toContain('bold');
  });
});
