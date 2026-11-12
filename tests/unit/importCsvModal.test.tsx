import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { ImportCSVModal } from '../../src/components/ImportCSVModal';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

const onClose = vi.fn<() => void>();
const onImport = vi.fn<(apps: unknown[]) => Promise<boolean>>(async () => true);

function renderModal() {
  act(() => {
    root!.render(<ImportCSVModal isOpen onClose={onClose} onImport={onImport} />);
  });
}

function dropzone(): HTMLElement {
  const el = host!.querySelector<HTMLElement>('.csv-drop');
  expect(el).not.toBeNull();
  return el!;
}

function findButtonByText(...texts: string[]): HTMLButtonElement {
  const btn = Array.from(host!.querySelectorAll('button')).find((b) =>
    texts.some((t) => b.textContent?.includes(t))
  );
  expect(btn).not.toBeNull();
  return btn!;
}

interface DragPayload {
  /** Real-browser shape: during dragover the data store is in protected
   *  mode — only `kind` and MIME `type` are readable; names are hidden. */
  items?: Array<{ kind: string; name?: string; type?: string }>;
  files?: File[];
}

/** Dispatch a drag event with a mock dataTransfer (items + files). */
function fireDrag(type: 'dragenter' | 'dragover' | 'dragleave' | 'drop', data: DragPayload) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      items: (data.items ?? []).map(({ kind, name, type }) => ({ kind, name, type })),
      files: data.files ?? [],
    },
    configurable: true,
  });
  act(() => {
    dropzone().dispatchEvent(event);
  });
}

/** Drop a file and flush the async FileReader → state → mapping-step render. */
async function dropFile(file: File) {
  fireDrag('drop', { files: [file] });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  onClose.mockClear();
  onImport.mockClear();
});

afterEach(() => {
  act(() => {
    root!.unmount();
  });
  host?.remove();
  host = null;
  root = null;
});

describe('ImportCSVModal — dropzone live drag validation', () => {
  it('renders the quiet upload step with the sample CSV link', () => {
    renderModal();

    expect(host!.textContent).toContain('Drop your CSV here');
    expect(host!.textContent).toContain('or click to browse');
    expect(host!.textContent).toContain('Download the sample CSV');
  });

  it('lights up red while a recognizable non-CSV hovers — live, before the drop', () => {
    renderModal();

    fireDrag('dragover', { items: [{ kind: 'file', type: 'application/pdf' }] });

    expect(dropzone().classList.contains('is-error')).toBe(true);
    expect(dropzone().classList.contains('is-hover')).toBe(true);
    expect(host!.textContent).toContain('Invalid format');

    // Clearing on leave restores the neutral zone
    fireDrag('dragleave', {});
    expect(dropzone().classList.contains('is-error')).toBe(false);
    expect(dropzone().classList.contains('is-hover')).toBe(false);
    expect(host!.textContent).toContain('Drop your CSV here');
  });

  it('lights up blue while a recognized CSV hovers', () => {
    renderModal();

    fireDrag('dragover', { items: [{ kind: 'file', type: 'text/csv' }] });

    expect(dropzone().classList.contains('is-armed')).toBe(true);
    expect(dropzone().classList.contains('is-error')).toBe(false);
    expect(host!.textContent).toContain('Drop your CSV here');

    fireDrag('dragleave', {});
    expect(dropzone().classList.contains('is-armed')).toBe(false);
  });

  it('lifts without color judgment when the item type is unknown', () => {
    renderModal();

    fireDrag('dragover', { items: [{ kind: 'file', type: '' }] });

    expect(dropzone().classList.contains('is-hover')).toBe(true);
    expect(dropzone().classList.contains('is-armed')).toBe(false);
    expect(dropzone().classList.contains('is-error')).toBe(false);
  });

  it('uses file names as a bonus signal when a browser exposes them', () => {
    renderModal();

    fireDrag('dragover', { items: [{ kind: 'file', name: 'resume.pdf' }] });
    expect(dropzone().classList.contains('is-error')).toBe(true);

    fireDrag('dragover', { items: [{ kind: 'file', name: 'sample.csv' }] });
    expect(dropzone().classList.contains('is-armed')).toBe(true);
  });

  it('ignores dragleave fired while moving between child elements (flicker guard)', () => {
    renderModal();

    fireDrag('dragover', { items: [{ kind: 'file', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }] });
    expect(dropzone().classList.contains('is-error')).toBe(true);

    // relatedTarget inside the zone → the leave is a child hop, not a real exit
    const event = new Event('dragleave', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { items: [], files: [] }, configurable: true });
    Object.defineProperty(event, 'relatedTarget', { value: dropzone().firstElementChild, configurable: true });
    act(() => {
      dropzone().dispatchEvent(event);
    });

    expect(dropzone().classList.contains('is-error')).toBe(true);
  });

  it('keeps the error sticky after an invalid drop, then clears on a valid CSV', async () => {
    renderModal();

    await dropFile(new File(['id,company'], 'resume.xlsx', { type: 'application/vnd.ms-excel' }));
    expect(host!.textContent).toContain('Invalid format');
    expect(dropzone().classList.contains('is-error')).toBe(true);
    // A dropped-file error is sticky: no hover scale once the drag is gone
    expect(dropzone().classList.contains('is-hover')).toBe(false);

    // Leaving the zone must NOT clear a dropped-file error
    fireDrag('dragleave', {});
    expect(host!.textContent).toContain('Invalid format');

    await dropFile(
      new File(
        ['Company,Role,Date Applied,Status\nLinear,Frontend Engineer,2026-07-20,Applied'],
        'sample.csv',
        { type: 'text/csv' }
      )
    );
    expect(host!.textContent).toContain('ready for import');
    expect(host!.textContent).toContain('Linear');
    expect(host!.textContent).not.toContain('Invalid format');
  });

  it('advances to the mapping preview after a valid drop', async () => {
    renderModal();

    await dropFile(
      new File(
        ['Company,Role,Date Applied,Status\nStripe,Full Stack Developer,2026-07-18,Applied'],
        'sample.csv',
        { type: 'text/csv' }
      )
    );

    expect(host!.textContent).toContain('ready for import');
    expect(host!.textContent).toContain('Stripe');
    expect(host!.textContent).toContain('Change file');
  });

  it('closes on completion instead of showing a success screen', async () => {
    renderModal();

    await dropFile(
      new File(
        ['Company,Role,Date Applied,Status\nStripe,Designer,2026-07-18,Applied'],
        'sample.csv',
        { type: 'text/csv' }
      )
    );
    const importBtn = findButtonByText('Import 1 Applications');

    await act(async () => {
      importBtn.click();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(host!.textContent).not.toContain('Import complete');
  });

  it('closes even when the quota guard rejected the import — parent owns the messaging', async () => {
    onImport.mockResolvedValue(false);
    renderModal();

    await dropFile(
      new File(
        ['Company,Role,Date Applied,Status\nStripe,Designer,2026-07-18,Applied'],
        'sample.csv',
        { type: 'text/csv' }
      )
    );
    const importBtn = findButtonByText('Import 1 Applications');

    await act(async () => {
      importBtn.click();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open with an error when the import fails', async () => {
    onImport.mockRejectedValue(new Error('network down'));
    renderModal();

    await dropFile(
      new File(
        ['Company,Role,Date Applied,Status\nStripe,Designer,2026-07-18,Applied'],
        'sample.csv',
        { type: 'text/csv' }
      )
    );
    const importBtn = findButtonByText('Import 1 Applications');

    await act(async () => {
      importBtn.click();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(host!.textContent).toContain('Import failed. Please verify your CSV format and try again.');
  });

  it('starts clean on reopen after a stale invalid drop', async () => {
    renderModal();
    await dropFile(new File(['id,company'], 'resume.xlsx', { type: 'application/vnd.ms-excel' }));
    expect(host!.textContent).toContain('Invalid format');

    // The component instance stays mounted — the parent only toggles isOpen
    act(() => {
      root!.render(<ImportCSVModal isOpen={false} onClose={onClose} onImport={onImport} />);
    });
    act(() => {
      root!.render(<ImportCSVModal isOpen onClose={onClose} onImport={onImport} />);
    });

    expect(host!.textContent).toContain('Drop your CSV here');
    expect(host!.textContent).not.toContain('Invalid format');
  });

  it('opens the file picker with Enter for keyboard users', () => {
    renderModal();

    const input = host!.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    const clickSpy = vi.spyOn(input, 'click');

    act(() => {
      dropzone().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('opens the file picker with Space for keyboard users', () => {
    renderModal();

    const input = host!.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    act(() => {
      dropzone().dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
