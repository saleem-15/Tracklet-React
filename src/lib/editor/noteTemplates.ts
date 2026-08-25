export type NoteTemplateId =
  | 'recruiter-screen'
  | 'tech-prep'
  | 'offer-breakdown';

export interface NoteTemplate {
  id: NoteTemplateId;
  label: string;
  emoji: string;
  skeleton: string;
}

/**
 * Starter templates for empty notes (spec Appendix A).
 * Skeletons are canonical Markdown — round-trip stable by construction.
 */
export const NOTE_TEMPLATES: readonly NoteTemplate[] = [
  {
    id: 'recruiter-screen',
    label: 'Recruiter Screen',
    emoji: '📋',
    skeleton: [
      '## Role Info',
      '- Company:',
      '- Role / Team:',
      '- Recruiter / Contact:',
      '- Source:',
      '',
      '## Compensation Band',
      '- Base:',
      '- Equity:',
      '- Bonus / PTO:',
      '',
      '## Next Steps',
      '- [ ] ',
    ].join('\n'),
  },
  {
    id: 'tech-prep',
    label: 'Tech Prep',
    emoji: '💻',
    skeleton: ['## Core Concepts', '- ', '', '## Questions Asked', '1. ', '', '## Code Snippets'].join('\n'),
  },
  {
    id: 'offer-breakdown',
    label: 'Offer Breakdown',
    emoji: '💰',
    skeleton: [
      '## Base Salary',
      '',
      '## Equity / Vesting',
      '',
      '## Benefits & Stipends',
      '',
      '## Negotiation Notes',
      '> ',
    ].join('\n'),
  },
] as const;

export function getTemplateById(id: NoteTemplateId): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((t) => t.id === id);
}
