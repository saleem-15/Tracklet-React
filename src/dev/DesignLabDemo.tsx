import { useState } from 'react';
import { Modal } from '../components/Modal';
import { CloseIconButton } from '../components/IconButton';
import { UI_TOKENS } from '../theme/tokens';
import { DesignLabBar, useDesignLabState, useDesignLabVariables } from './index';
import {
  DEMO_SCENARIOS,
  DEMO_VARIABLES,
  DEMO_VARIANTS,
  DemoVariantPreview,
  SCENARIO_DATA,
  type DemoScenarioId,
  type DemoVariantId,
} from './DesignLabDemoPreview';

export function DesignLabDemo() {
  const { variant, setVariant } = useDesignLabState<DemoVariantId>({
    labId: 'floating-bar-demo',
    variants: DEMO_VARIANTS,
    defaultVariant: 'compact',
  });
  const vars = useDesignLabVariables('floating-bar-demo', DEMO_VARIABLES);
  const [scenario, setScenario] = useState<DemoScenarioId>('interview');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const record = SCENARIO_DATA[scenario];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900">
            Design Lab Bar Playground
          </h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsModalOpen(true)} className={UI_TOKENS.btnPrimary}>
              Open Modal Overlay
            </button>
            <a href="/" className={UI_TOKENS.btnOutline}>
              Back to Tracklet
            </a>
          </div>
        </header>

        <section className="space-y-2.5">
          <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
            <span>
              LIVE PREVIEW · {variant.toUpperCase()} · {vars.values.density.toUpperCase()}
            </span>
            <span>SCENARIO: {DEMO_SCENARIOS.find((s) => s.id === scenario)?.label}</span>
          </div>
          <DemoVariantPreview variant={variant} record={record} vars={vars.values} />
        </section>

        <section className={`${UI_TOKENS.card} p-5 space-y-3`}>
          <h2 className="font-heading text-sm font-bold text-slate-900 tracking-tight">
            Interactive Test Checklist
          </h2>
          <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
            <li>
              Click <span className="font-semibold text-slate-900">Variables</span> (sliders icon) to
              tune Density, Show comp &amp; dwell, Corner radius (double-click readout to reset),
              Accent strip, pin controls onto the capsule, or save/apply Snapshots.
            </li>
            <li>
              Switch to Card or Ledger, then hold the <span className="font-semibold text-slate-900">Eye</span>{' '}
              button or <span className="font-mono text-slate-700">Alt+0</span> to peek the Compact
              baseline and release to snap back.
            </li>
            <li>
              Right-click any variant pill (or open Notes) to rule out/restore variants, and click{' '}
              <span className="font-semibold text-slate-900">Copy decision</span> to export your
              exact selection + variables snippet.
            </li>
            <li>
              Drag anywhere on the bar (subtle lift + magnetic edge snap near corners/center) and
              verify it floats cleanly above <span className="font-semibold text-slate-900">Open Modal Overlay</span>.
            </li>
          </ul>
        </section>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modal Layering Verification"
        maxWidthClassName="max-w-xl"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-base font-bold text-slate-900 tracking-tight">
              Modal Layering Test
            </h2>
            <CloseIconButton onClick={() => setIsModalOpen(false)} aria-label="Close modal" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Switch variants, variables, or scenarios while this modal is open—the preview updates
            live without closing the modal.
          </p>
          <DemoVariantPreview variant={variant} record={record} vars={vars.values} />
        </div>
      </Modal>

      <DesignLabBar
        labId="floating-bar-demo"
        title="Card Lab"
        variants={DEMO_VARIANTS}
        activeVariant={variant}
        onVariantChange={setVariant}
        baselineVariant="compact"
        variables={vars}
        scenarios={DEMO_SCENARIOS}
        activeScenario={scenario}
        onScenarioChange={setScenario}
      />
    </div>
  );
}

export default DesignLabDemo;
