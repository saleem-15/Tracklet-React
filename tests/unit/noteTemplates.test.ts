import { describe, it, expect } from 'vitest';
import {
  NOTE_TEMPLATES,
  getTemplateById,
} from '../../src/lib/editor/noteTemplates';
import {
  markdownToHtml,
  htmlToMarkdown,
} from '../../src/lib/editor/richTextMarkdownUtils';

describe('noteTemplates (FR-012 / spec Appendix A)', () => {
  it('offers exactly the three starter templates', () => {
    expect(NOTE_TEMPLATES.map((t) => t.id)).toEqual([
      'recruiter-screen',
      'tech-prep',
      'offer-breakdown',
    ]);
  });

  it('every skeleton parses as Markdown without error', () => {
    for (const tpl of NOTE_TEMPLATES) {
      expect(() => markdownToHtml(tpl.skeleton)).not.toThrow();
    }
  });

  it('skeletons contain their required section headers', () => {
    const byId = Object.fromEntries(NOTE_TEMPLATES.map((t) => [t.id, t.skeleton]));
    expect(byId['recruiter-screen']).toContain('## Role Info');
    expect(byId['recruiter-screen']).toContain('## Compensation Band');
    expect(byId['recruiter-screen']).toContain('## Next Steps');

    expect(byId['tech-prep']).toContain('## Core Concepts');
    expect(byId['tech-prep']).toContain('## Questions Asked');
    expect(byId['tech-prep']).toContain('## Code Snippets');

    expect(byId['offer-breakdown']).toContain('## Base Salary');
    expect(byId['offer-breakdown']).toContain('## Equity / Vesting');
    expect(byId['offer-breakdown']).toContain('## Benefits & Stipends');
  });

  it('skeletons are round-trip stable (canonical form)', () => {
    for (const tpl of NOTE_TEMPLATES) {
      const once = htmlToMarkdown(markdownToHtml(tpl.skeleton));
      const twice = htmlToMarkdown(markdownToHtml(once));
      expect(twice).toBe(once);
    }
  });

  it('recruiter screen ends with an actionable first task', () => {
    const tpl = getTemplateById('recruiter-screen')!;
    expect(tpl.skeleton.trimEnd().endsWith('- [ ]')).toBe(true);
  });
});
