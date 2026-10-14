import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApplicationDetailPanel } from '../../src/components/ApplicationDetailPanel';
import type { Application } from '../../src/types';

type UpdateAppFn = (id: string, updates: Partial<Application>) => Promise<void>;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function makeApp(overrides?: Partial<Application>): Application {
  return {
    id: 'app-1',
    userId: 'u1',
    company: 'Acme',
    role: 'Engineer',
    platform: 'LinkedIn',
    dateApplied: '2026-08-01',
    status: 'Applied',
    notes: 'older durable text',
    stageUpdatedAt: '2026-08-01T00:00:00Z',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

function mountPanel(app: Application, onUpdateApp: UpdateAppFn) {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const props = {
    app,
    onClose: vi.fn(),
    onUpdateApp,
    onDeleteApp: vi.fn().mockResolvedValue(undefined),
  };
  act(() => root!.render(<ApplicationDetailPanel {...props} />));
  return props;
}

function typeIntoNotes(markdownHtml: string) {
  const editable = host!.querySelector('[role="textbox"]') as HTMLElement;
  act(() => {
    editable.focus();
    editable.innerHTML = markdownHtml;
    const p = editable.querySelector('p') ?? editable;
    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(false);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);
    
    const inputEvent = new Event('input', { bubbles: true });
    editable.dispatchEvent(inputEvent);
    const reactKey = Object.keys(editable).find((k) => k.startsWith('__reactProps'));
    if (reactKey) {
      (editable as any)[reactKey]?.onInput?.(inputEvent);
    }
  });
}

function clickSaveButton() {
  const saveButton = Array.from(host!.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Save Changes')
  );
  expect(saveButton).toBeDefined();
  act(() => {
    saveButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  localStorage.clear();
});

describe('ApplicationDetailPanel note persistence', () => {
  it('serializes note writes so a close flush lands after an in-flight auto-save', async () => {
    const resolvers: (() => void)[] = [];
    const onUpdateApp = vi.fn(
      (_id: string, _updates: Partial<Application>): Promise<void> =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        })
    );

    mountPanel(makeApp(), onUpdateApp);

    typeIntoNotes('<p>first edit</p>');
    clickSaveButton();
    await act(async () => {});

    expect(onUpdateApp).toHaveBeenCalledTimes(1);
    expect(onUpdateApp.mock.calls[0][1].notes).toBe('first edit');

    // Keep editing while the auto-save is still in flight
    typeIntoNotes('<p>second newer edit</p>');

    // Close mid-flight: the close-flush must wait for write #1 to settle
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    // Write #2 has NOT started yet because write #1 is still in flight
    expect(onUpdateApp).toHaveBeenCalledTimes(1);

    // Resolve write #1 -> close-flush resumes and invokes write #2
    resolvers[0]();
    await act(async () => {});
    expect(onUpdateApp).toHaveBeenCalledTimes(2);

    expect(onUpdateApp.mock.calls[1][0]).toBe('app-1');
    expect(onUpdateApp.mock.calls[1][1].notes).toBe('second newer edit');

    resolvers[1]();
    await act(async () => {});

    const lastWrite = onUpdateApp.mock.calls[onUpdateApp.mock.calls.length - 1];
    expect(lastWrite[1].notes).toBe('second newer edit');
  });

  it('passes only unsaved-notes dirty state to the footer Save button', () => {
    const onUpdateApp = vi.fn().mockResolvedValue(undefined);
    mountPanel(makeApp(), onUpdateApp);

    const saveButton = Array.from(host!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save Changes')
    )!;
    expect(saveButton.disabled).toBe(true);

    typeIntoNotes('<p>dirty text</p>');
    const dirtyButton = Array.from(host!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save Changes')
    )!;
    expect(dirtyButton.disabled).toBe(false);
  });

  describe('Status History deletion & rollback', () => {
    it('deletes Offer milestone and reverts status to Interview without creating duplicate stage', async () => {
      const onUpdateApp = vi.fn().mockResolvedValue(undefined);
      const testApp = makeApp({
        status: 'Offer',
        history: [
          { id: 'h1', fromStatus: 'Saved', toStatus: 'Screening', timestamp: '2026-09-01T10:00:00.000Z' },
          { id: 'h2', fromStatus: 'Screening', toStatus: 'Interview', timestamp: '2026-09-10T10:00:00.000Z' },
          { id: 'h3', fromStatus: 'Interview', toStatus: 'Offer', timestamp: '2026-09-20T10:00:00.000Z' },
        ],
      });

      mountPanel(testApp, onUpdateApp);

      // Find delete button on milestones (sorted newest first: index 0 is Offer)
      const deleteButtons = host!.querySelectorAll('button[aria-label^="Delete milestone"]');
      expect(deleteButtons.length).toBe(3);

      act(() => {
        (deleteButtons[0] as HTMLButtonElement).click();
      });

      const confirmButton = host!.querySelector('button[aria-label="Confirm delete"]') as HTMLButtonElement;
      expect(confirmButton).toBeTruthy();

      await act(async () => {
        confirmButton.click();
      });

      expect(onUpdateApp).toHaveBeenCalledTimes(1);
      const [appId, updates] = onUpdateApp.mock.calls[0];
      expect(appId).toBe('app-1');
      expect(updates.status).toBe('Interview');
      expect(updates.history).toHaveLength(2);
      expect(updates.history.map((h: any) => h.toStatus)).toEqual(['Screening', 'Interview']);
      expect(updates.history.find((h: any) => h.id === 'h3')).toBeUndefined();
    });

    it('derives application status from the chronologically latest entry in updatedHistory when an edit shifts ordering', async () => {
      const onUpdateApp = vi.fn().mockResolvedValue(undefined);
      const testApp = makeApp({
        status: 'Interview',
        history: [
          { id: 'h1', fromStatus: 'Saved', toStatus: 'Screening', timestamp: '2026-09-01T10:00:00.000Z' },
          { id: 'h2', fromStatus: 'Screening', toStatus: 'Interview', timestamp: '2026-09-10T10:00:00.000Z' },
        ],
      });

      mountPanel(testApp, onUpdateApp);

      const editButtons = host!.querySelectorAll('button[aria-label^="Edit milestone"]');
      expect(editButtons.length).toBe(2);

      // In sortedHistory (newest first), index 1 is h1 (Screening)
      act(() => {
        (editButtons[1] as HTMLButtonElement).click();
      });

      const dateInput = host!.querySelector('input[type="datetime-local"]') as HTMLInputElement;
      expect(dateInput).toBeTruthy();
      act(() => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(dateInput, '2026-09-20T10:00');
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const saveBtn = Array.from(host!.querySelectorAll('button')).find((b) => b.textContent?.includes('Save Changes'));
      expect(saveBtn).toBeTruthy();

      await act(async () => {
        saveBtn!.click();
      });

      expect(onUpdateApp).toHaveBeenCalled();
      const [, updates] = onUpdateApp.mock.calls[0];
      expect(updates.status).toBe('Screening');
      expect(updates.stageUpdatedAt).toBe(new Date('2026-09-20T10:00').toISOString());
    });
  });
});
