import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { UploadModal } from '../../src/components/UploadModal';
import type { UploadHandle } from '../../src/lib/resumeStorage';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

interface DeferredHandle<T> {
  handle: UploadHandle<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
}

function makeDeferred<T>(): DeferredHandle<T> {
  let resolveFn!: (value: T) => void;
  let rejectFn!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolveFn = res;
    rejectFn = rej;
  });
  return { handle: { promise, cancel: vi.fn((): void => {}) }, resolve: resolveFn, reject: rejectFn };
}

interface Bundle {
  /** One deferred per onUpload call — a fresh pending transfer each time. */
  deferreds: DeferredHandle<void>[];
  onClose: ReturnType<typeof vi.fn<() => void>>;
  onUpload: ReturnType<typeof vi.fn<(file: File, onProgress: (pct: number) => void) => UploadHandle<void>>>;
  onUploaded: ReturnType<typeof vi.fn<(result: void) => void>>;
  maxSizeMB?: number;
  accept?: string;
  isOpen: boolean;
}

function makeBundle(overrides: Partial<Omit<Bundle, 'deferreds' | 'onClose' | 'onUpload' | 'onUploaded'>> = {}): Bundle {
  const deferreds: DeferredHandle<void>[] = [];
  const bundle: Bundle = {
    deferreds,
    isOpen: true,
    onClose: vi.fn((): void => {}),
    onUploaded: vi.fn((_result: void): void => {}),
    onUpload: vi.fn((file: File, onProgress: (pct: number) => void): UploadHandle<void> => {
      onProgress(40);
      const deferred = makeDeferred<void>();
      deferreds.push(deferred);
      return deferred.handle;
    }),
    ...overrides,
  };
  return bundle;
}

function latestDeferred(bundle: Bundle): DeferredHandle<void> {
  expect(bundle.deferreds.length).toBeGreaterThan(0);
  return bundle.deferreds[bundle.deferreds.length - 1];
}

function render(bundle: Bundle) {
  act(() => {
    root!.render(
      <UploadModal
        isOpen={bundle.isOpen}
        onClose={bundle.onClose}
        onUpload={bundle.onUpload}
        onUploaded={bundle.onUploaded}
        maxSizeMB={bundle.maxSizeMB}
        accept={bundle.accept}
      />
    );
  });
}

function selectFile(file: File) {
  const fileInput = host!.querySelector('input[type="file"]') as HTMLInputElement;
  expect(fileInput).not.toBeNull();
  Object.defineProperty(fileInput, 'files', {
    value: [file],
    configurable: true,
  });
  act(() => {
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function findButtonByText(...texts: string[]): HTMLButtonElement {
  const btn = Array.from(host!.querySelectorAll('button')).find((b) =>
    texts.some((t) => b.textContent?.includes(t))
  );
  expect(btn).not.toBeNull();
  return btn!;
}

/**
 * Deterministically drains the animation cascade under fake timers:
 * advance in slices, each inside its own act boundary so React commits and
 * schedules the next wave of SwapText timers before the next slice fires.
 */
async function settle(totalMs = 600) {
  for (let i = 0; i < Math.ceil(totalMs / 100); i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
      await Promise.resolve();
    });
  }
}

describe('UploadModal (transitions.dev motion + real upload wiring)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root!.unmount());
    root = null;
    host?.remove();
    host = null;
    vi.useRealTimers();
  });

  it('renders nothing when closed', () => {
    render(makeBundle({ isOpen: false }));
    expect(host!.querySelector('.t-modal')).toBeNull();
  });

  it('opens with the dropzone, stages a real file, and starts the real upload on Upload', async () => {
    const bundle = makeBundle();
    render(bundle);

    expect(host!.querySelector('.t-modal[role="dialog"]')).not.toBeNull();
    expect(host!.querySelector('.drop')).not.toBeNull();
    expect(host!.textContent).toContain('Drop a file here');

    const file = new File(['resume body'], 'resume.pdf', { type: 'application/pdf' });
    selectFile(file);

    // Staged preview row replaces the dropzone (zone cross-blur, data-phase != idle)
    expect(host!.querySelector('.zone')!.getAttribute('data-phase')).toBe('ready');
    expect(host!.textContent).toContain('resume.pdf');
    expect(host!.textContent).toContain('Ready');
    expect(bundle.onUpload).not.toHaveBeenCalled();

    // Press Upload → real transfer begins, label swaps to Uploading, real pct reported
    await act(async () => {
      findButtonByText('Upload').click();
    });
    await settle();

    expect(bundle.onUpload).toHaveBeenCalledTimes(1);
    expect(bundle.onUpload.mock.calls[0][0]).toBe(file);
    expect(host!.querySelector('.zone')!.getAttribute('data-phase')).toBe('uploading');
    expect(host!.textContent).toContain('40%');
    expect(host!.textContent).toContain('Uploading');
  });

  it('swaps to Done with the check icon and fires onUploaded after the transfer completes', async () => {
    const bundle = makeBundle();
    render(bundle);

    selectFile(new File(['resume body'], 'resume.pdf', { type: 'application/pdf' }));
    await act(async () => {
      findButtonByText('Upload').click();
    });
    await settle();

    await act(async () => {
      latestDeferred(bundle).resolve(undefined);
    });
    await settle(); // DONE_SETTLE_MS (200) + status/label swaps (150)

    expect(host!.querySelector('.zone')!.getAttribute('data-phase')).toBe('done');
    expect(host!.textContent).toContain('Uploaded');
    expect(host!.textContent).toContain('100%');
    expect(host!.querySelector('.t-icon-swap')!.getAttribute('data-state')).toBe('b');
    expect(bundle.onUploaded).toHaveBeenCalledTimes(1);
  });

  it('surfaces upload failures with a Retry affordance', async () => {
    const bundle = makeBundle();
    render(bundle);

    selectFile(new File(['resume body'], 'resume.pdf', { type: 'application/pdf' }));
    await act(async () => {
      findButtonByText('Upload').click();
    });
    await settle();

    await act(async () => {
      latestDeferred(bundle).reject(new Error('Storage quota exceeded'));
    });
    await settle(); // status/label swaps (150ms)

    expect(host!.querySelector('.zone')!.getAttribute('data-phase')).toBe('error');
    expect(host!.textContent).toContain('Failed');
    expect(host!.textContent).toContain('Storage quota exceeded');
    expect(host!.querySelector('.err[role="alert"]')).not.toBeNull();
    expect(host!.textContent).toContain('Retry');
  });

  it('rejects unsupported file types and oversized files without starting an upload', () => {
    const bundle = makeBundle({ maxSizeMB: 1 });
    render(bundle);

    selectFile(new File(['x'], 'malware.exe', { type: 'application/octet-stream' }));
    expect(host!.textContent).toContain('not a supported file type');
    expect(bundle.onUpload).not.toHaveBeenCalled();

    const bigFile = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: 2 * 1024 * 1024, configurable: true });
    selectFile(bigFile);
    expect(host!.textContent).toContain('the limit is 1 MB');
    expect(bundle.onUpload).not.toHaveBeenCalled();
  });

  it('dismisses via Escape and cancels an in-flight transfer on close', async () => {
    const bundle = makeBundle();
    render(bundle);

    selectFile(new File(['resume body'], 'resume.pdf', { type: 'application/pdf' }));
    await act(async () => {
      findButtonByText('Upload').click();
    });
    expect(bundle.onUpload).toHaveBeenCalledTimes(1);

    // Escape → onClose (in-flight cancel happens when isOpen flips false)
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(bundle.onClose).toHaveBeenCalledTimes(1);

    render({ ...bundle, isOpen: false });
    expect(latestDeferred(bundle).handle.cancel).toHaveBeenCalledTimes(1);

    // Exit transition (150ms) completes → dialog fully unmounts
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(host!.querySelector('.t-modal')).toBeNull();
  });

  it('retries after a failure by restarting the same file', async () => {
    const bundle = makeBundle();
    render(bundle);

    selectFile(new File(['resume body'], 'resume.pdf', { type: 'application/pdf' }));

    await act(async () => {
      findButtonByText('Upload').click();
    });
    await settle();

    await act(async () => {
      bundle.deferreds[0].reject(new Error('Network lost'));
    });
    await settle();

    expect(host!.textContent).toContain('Retry');
    await act(async () => {
      findButtonByText('Retry').click();
    });
    expect(bundle.onUpload).toHaveBeenCalledTimes(2);
    expect(bundle.deferreds.length).toBe(2); // fresh pending transfer
    expect(host!.querySelector('.zone')!.getAttribute('data-phase')).toBe('uploading');
  });

  it('reopens clean when isOpen flips back true before the closing transition finishes', async () => {
    const bundle = makeBundle();
    render(bundle);

    selectFile(new File(['resume body'], 'resume.pdf', { type: 'application/pdf' }));
    await act(async () => {
      findButtonByText('Upload').click();
    });
    await settle();
    expect(host!.querySelector('.zone')!.getAttribute('data-phase')).toBe('uploading');

    // Close mid-upload, then reopen before the 150ms exit completes —
    // the aborted upload phase must not survive into the reopened dialog.
    render({ ...bundle, isOpen: false });
    await act(async () => {
      latestDeferred(bundle).reject(new Error('Upload canceled'));
    });
    render({ ...bundle, isOpen: true });

    expect(host!.querySelector('.zone')!.getAttribute('data-phase')).toBe('idle');
    expect(host!.querySelector('.err[role="alert"]')).toBeNull();

    // The dialog is fully usable: staging a file enables Upload again
    selectFile(new File(['resume body'], 'resume3.pdf', { type: 'application/pdf' }));
    await act(async () => {
      findButtonByText('Upload').click();
    });
    expect(bundle.onUpload).toHaveBeenCalledTimes(2);
    expect(host!.querySelector('.zone')!.getAttribute('data-phase')).toBe('uploading');
  });

  it('a stale upload attempt cannot corrupt a newer attempt after cancel + retry', async () => {
    const bundle = makeBundle();
    render(bundle);

    selectFile(new File(['resume body'], 'resume.pdf', { type: 'application/pdf' }));
    await act(async () => {
      findButtonByText('Upload').click();
    });
    await settle();

    // Close (cancels upload A), reopen, start upload B
    render({ ...bundle, isOpen: false });
    render({ ...bundle, isOpen: true });
    selectFile(new File(['resume body'], 'resume2.pdf', { type: 'application/pdf' }));
    await act(async () => {
      findButtonByText('Upload').click();
    });
    await settle();
    expect(bundle.deferreds.length).toBe(2);

    // A's rejection arrives late — it must not clear B's state or show errors
    await act(async () => {
      bundle.deferreds[0].reject(new Error('Upload canceled'));
    });
    await settle();
    expect(host!.querySelector('.zone')!.getAttribute('data-phase')).toBe('uploading');
    expect(host!.textContent).not.toContain('Upload canceled');

    // B still completes normally
    await act(async () => {
      latestDeferred(bundle).resolve(undefined);
    });
    await settle();
    expect(host!.querySelector('.zone')!.getAttribute('data-phase')).toBe('done');
    expect(bundle.onUploaded).toHaveBeenCalledTimes(1);
  });

  it('opens the file picker with Enter on the dropzone for keyboard users', () => {
    const bundle = makeBundle();
    render(bundle);

    const input = host!.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    const clickSpy = vi.spyOn(input, 'click');

    act(() => {
      host!.querySelector('.drop')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
