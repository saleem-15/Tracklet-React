import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, useState } from 'react';
import {
  registerDesignLab,
  getActiveDesignLab,
  useActiveDesignLab,
  useRegisterDesignLab,
  GlobalDesignLab,
  type RegisteredDesignLab,
} from '../../src/dev';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('designLabRegistry', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    // Clean up any registered lab
    const active = getActiveDesignLab();
    if (active) {
      registerDesignLab(active)();
    }
    document.body.innerHTML = '';
  });

  it('registers and unregisters an active lab', () => {
    const dummyLab: RegisteredDesignLab = {
      labId: 'test-lab',
      title: 'Test Lab',
      variants: [{ id: 'a', label: 'Variant A' }, { id: 'b', label: 'Variant B' }],
      activeVariant: 'a',
      onVariantChange: vi.fn(),
    };

    expect(getActiveDesignLab()).toBeNull();

    const unregister = registerDesignLab(dummyLab);
    expect(getActiveDesignLab()).toBe(dummyLab);

    unregister();
    expect(getActiveDesignLab()).toBeNull();
  });

  it('renders registered lab when present, and falls back to default lab when unmounted', () => {
    function HostComponent() {
      const [hasFeature, setHasFeature] = useState(false);
      const [featureVariant, setFeatureVariant] = useState('logo-ghost');

      const featureLab: RegisteredDesignLab<'logo-ghost' | 'logo-borderless'> = {
        labId: 'feature-logo-lab',
        title: 'Feature Logo Lab',
        variants: [
          { id: 'logo-ghost', label: 'Ghost Logo' },
          { id: 'logo-borderless', label: 'Borderless Logo' },
        ],
        activeVariant: featureVariant as any,
        onVariantChange: setFeatureVariant as any,
        forceRender: true,
      };

      return (
        <div>
          <button id="toggle-feature" onClick={() => setHasFeature((prev) => !prev)}>
            Toggle
          </button>
          {hasFeature && <FeatureLabChild lab={featureLab} />}
          <GlobalDesignLab forceRender />
        </div>
      );
    }

    function FeatureLabChild({ lab }: { lab: RegisteredDesignLab<any, any> }) {
      useRegisterDesignLab(lab);
      return <div id="feature-active">Feature Running</div>;
    }

    act(() => {
      root?.render(<HostComponent />);
    });

    // Default global lab initially
    expect(document.body.querySelector('[aria-label="Tracklet Lab design lab"]')).not.toBeNull();
    expect(document.body.textContent).toContain('Standard');
    expect(document.body.textContent).toContain('Dense');

    // Register feature lab by toggling
    const toggleBtn = container?.querySelector('#toggle-feature') as HTMLButtonElement;
    act(() => {
      toggleBtn.click();
    });

    // Now feature lab overrides global lab
    expect(document.body.querySelector('[aria-label="Feature Logo Lab design lab"]')).not.toBeNull();
    expect(document.body.textContent).toContain('Ghost Logo');
    expect(document.body.textContent).toContain('Borderless Logo');

    // Unregister feature lab by toggling off
    act(() => {
      toggleBtn.click();
    });

    // Reverts back to default global lab
    expect(document.body.querySelector('[aria-label="Tracklet Lab design lab"]')).not.toBeNull();
  });

  it('applies CSS properties and data attributes to root when default lab variables change', () => {
    act(() => {
      root?.render(<GlobalDesignLab forceRender />);
    });

    expect(document.documentElement.getAttribute('data-tracklet-density')).toBeDefined();
    expect(document.documentElement.style.getPropertyValue('--tracklet-radius')).toBe('8px');
  });
});
