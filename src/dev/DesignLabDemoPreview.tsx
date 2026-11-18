import { StatusBadge } from '../components/StatusBadge';
import type { ApplicationStatus } from '../types';
import type { DesignLabScenario, DesignLabVariableValues, DesignLabVariant } from './index';

export type DemoVariantId = 'compact' | 'executive' | 'ledger';
export type DemoScenarioId = 'interview' | 'stale' | 'offer';

export interface ScenarioRecord {
  company: string;
  role: string;
  status: ApplicationStatus;
  location: string;
  comp: string;
  dwell: string;
  nextStep: string;
}

export const DEMO_VARIANTS: readonly DesignLabVariant<DemoVariantId>[] = [
  {
    id: 'compact',
    label: 'Compact Strip',
    shortLabel: 'Compact',
    summary: 'Single-row high-density glance strip optimized for fast scanning.',
    tradeoffs: ['Minimal vertical height', 'Secondary context revealed on demand'],
    recommended: true,
  },
  {
    id: 'executive',
    label: 'Executive Card',
    shortLabel: 'Card',
    summary: 'Structured two-tier card balancing stage clarity with next-action focus.',
    tradeoffs: ['Best for active Kanban lanes', 'Takes more vertical space'],
  },
  {
    id: 'ledger',
    label: 'Mono Ledger',
    shortLabel: 'Ledger',
    summary: 'Tabular data-first layout emphasizing dwell time and compensation.',
    tradeoffs: ['Crisp horizontal alignment', 'Less visual warmth for casual browsing'],
  },
];

export const DEMO_SCENARIOS: readonly DesignLabScenario<DemoScenarioId>[] = [
  { id: 'interview', label: 'Active Interview', description: 'Onsite loop scheduled in 2 days' },
  { id: 'stale', label: '40-Day Ghost', description: 'No recruiter response after screen' },
  { id: 'offer', label: 'Offer Received', description: 'Written offer awaiting negotiation' },
];

export const DEMO_VARIABLES = {
  density: {
    type: 'choice',
    label: 'Density',
    options: [
      { id: 'compact', label: 'Compact' },
      { id: 'default', label: 'Default' },
      { id: 'airy', label: 'Airy' },
    ],
    default: 'default',
    pinned: true,
  },
  showMeta: { type: 'boolean', label: 'Show comp & dwell', default: true },
  radius: { type: 'range', label: 'Corner radius', min: 8, max: 24, step: 4, unit: 'px', default: 16 },
  accent: {
    type: 'color',
    label: 'Accent strip',
    options: [
      { id: 'none', label: 'Neutral', swatchClass: 'bg-slate-300' },
      { id: 'blue', label: 'Blue', swatchClass: 'bg-blue-600' },
      { id: 'emerald', label: 'Emerald', swatchClass: 'bg-emerald-600' },
      { id: 'amber', label: 'Amber', swatchClass: 'bg-amber-500' },
    ],
    default: 'none',
  },
} as const;

export type DemoVarValues = DesignLabVariableValues<typeof DEMO_VARIABLES>;

export const SCENARIO_DATA: Record<DemoScenarioId, ScenarioRecord> = {
  interview: {
    company: 'Linear',
    role: 'Staff Product Engineer',
    status: 'Interview',
    location: 'Remote (US/EU)',
    comp: '$210k',
    dwell: '6d in stage',
    nextStep: 'System design panel · Thu 14:00',
  },
  stale: {
    company: 'Vercel',
    role: 'Senior Frontend Architect',
    status: 'Screening',
    location: 'San Francisco, CA',
    comp: '$195k',
    dwell: '41d silent',
    nextStep: 'Follow-up overdue — consider archiving',
  },
  offer: {
    company: 'Stripe',
    role: 'Senior UI Systems Engineer',
    status: 'Offer',
    location: 'Hybrid · Seattle',
    comp: '$245k',
    dwell: '2d to decide',
    nextStep: 'Review equity refresh & sign-on bonus',
  },
};

const DENSITY_PAD: Record<string, string> = {
  compact: 'px-3 py-2',
  default: 'px-4 py-3',
  airy: 'px-6 py-5',
};

const ACCENT_RING: Record<string, string> = {
  none: 'border-slate-200/90',
  blue: 'border-blue-500/60',
  emerald: 'border-emerald-500/60',
  amber: 'border-amber-500/60',
};

export function DemoVariantPreview({
  variant,
  record,
  vars,
}: {
  variant: DemoVariantId;
  record: ScenarioRecord;
  vars: DemoVarValues;
}) {
  const pad = DENSITY_PAD[vars.density] ?? DENSITY_PAD.default;
  const accent = ACCENT_RING[vars.accent] ?? ACCENT_RING.none;
  const surface = `bg-white border shadow-2xs ${accent}`;
  const radiusStyle = { borderRadius: `${vars.radius}px` };

  if (variant === 'compact') {
    return (
      <div style={radiusStyle} className={`${surface} ${pad} flex items-center justify-between gap-4`}>
        <div className="min-w-0 flex items-center gap-3">
          <span className="font-heading text-sm font-bold text-slate-900 tracking-tight truncate">
            {record.company}
          </span>
          <span className="text-xs text-slate-600 truncate">{record.role}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {vars.showMeta && (
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {record.comp} <span className="text-slate-300">·</span> {record.dwell}
            </span>
          )}
          <StatusBadge status={record.status} size="sm" />
        </div>
      </div>
    );
  }

  if (variant === 'executive') {
    return (
      <div style={radiusStyle} className={`${surface} ${pad} space-y-3`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="font-heading text-base font-bold text-slate-900 tracking-tight">
              {record.company}
            </h3>
            <p className="text-xs text-slate-600">{record.role}</p>
          </div>
          <StatusBadge status={record.status} size="md" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {vars.showMeta && (
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {record.location} <span className="text-slate-300">·</span> {record.comp}{' '}
              <span className="text-slate-300">·</span> {record.dwell}
            </span>
          )}
          <span className="text-xs font-medium text-slate-700">{record.nextStep}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={radiusStyle} className={`${surface} overflow-hidden`}>
      <div className="grid grid-cols-12 items-center px-4 py-2 border-b border-slate-100 bg-slate-50/70 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        <span className="col-span-4">Company &amp; Role</span>
        <span className="col-span-3">Stage</span>
        <span className="col-span-2">{vars.showMeta ? 'Comp' : 'Status'}</span>
        <span className="col-span-3 text-right">{vars.showMeta ? 'Dwell' : 'Location'}</span>
      </div>
      <div className={`grid grid-cols-12 items-center ${pad} text-xs`}>
        <div className="col-span-4 min-w-0 pr-2">
          <div className="font-heading font-bold text-slate-900 truncate">{record.company}</div>
          <div className="text-slate-500 truncate">{record.role}</div>
        </div>
        <div className="col-span-3">
          <StatusBadge status={record.status} size="sm" />
        </div>
        <div className="col-span-2 font-mono text-slate-700 tabular-nums">
          {vars.showMeta ? record.comp : record.status}
        </div>
        <div className="col-span-3 text-right font-mono text-slate-500 tabular-nums">
          {vars.showMeta ? record.dwell : record.location}
        </div>
      </div>
    </div>
  );
}
