import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MilestoneSpineTimeline } from '../../src/components/detail/timeline/MilestoneSpineTimeline';
import { StatusHistoryTimeline } from '../../src/components/detail/StatusHistoryTimeline';
import { mockStandardHiringApp, mockAccidentalMisclickApp } from './statusHistoryTestFixtures';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mountComponent(component: React.ReactElement) {
  if (root) {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  }
  const currentHost = document.createElement('div');
  document.body.appendChild(currentHost);
  const currentRoot = createRoot(currentHost);
  host = currentHost;
  root = currentRoot;

  act(() => {
    currentRoot.render(component);
  });

  return {
    host: currentHost,
    getText: () => currentHost.textContent || '',
  };
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

describe('MilestoneSpineTimeline (Design A)', () => {
  it('renders correctly with presetStandardHiring milestones and dwell labels', () => {
    const { getText } = mountComponent(
      <MilestoneSpineTimeline
        history={mockStandardHiringApp.history}
        currentStatus={mockStandardHiringApp.status}
        createdAt={mockStandardHiringApp.createdAt}
        stageUpdatedAt={mockStandardHiringApp.stageUpdatedAt}
      />
    );

    const text = getText();
    expect(text).toContain('Offer');
    expect(text).toContain('Interview');
    expect(text).toContain('Screening');
    expect(text).toContain('Applied');
    expect(text).toContain('in stage');
  });

  it('renders initial empty state when history is empty', () => {
    const { getText } = mountComponent(
      <MilestoneSpineTimeline
        history={[]}
        currentStatus="Applied"
        createdAt={new Date().toISOString()}
      />
    );

    const text = getText();
    expect(text).toContain('Applied');
    expect(text).toContain('in stage');
  });

  it('triggers inline delete confirmation strip and calls onDeleteEntry and onRollbackStatus', () => {
    const onDelete = vi.fn();
    const onRollback = vi.fn();
    const { host } = mountComponent(
      <MilestoneSpineTimeline
        history={mockAccidentalMisclickApp.history}
        currentStatus={mockAccidentalMisclickApp.status}
        onDeleteEntry={onDelete}
        onRollbackStatus={onRollback}
        isInteractive={true}
      />
    );

    const deleteBtn = host.querySelector('button[aria-label^="Delete milestone"]') as HTMLButtonElement | null;
    expect(deleteBtn).toBeTruthy();

    act(() => {
      deleteBtn?.click();
    });

    // Inline delete confirmation button
    const confirmBtn = host.querySelector('button[aria-label="Confirm delete"]') as HTMLButtonElement | null;
    expect(confirmBtn).toBeTruthy();

    act(() => {
      confirmBtn?.click();
    });

    expect(onDelete).toHaveBeenCalled();
    expect(onRollback).toHaveBeenCalledWith('Interview');
  });

  it('triggers inline editing form and saves updates via onUpdateEntry', () => {
    const onUpdate = vi.fn();
    const { host } = mountComponent(
      <MilestoneSpineTimeline
        history={mockStandardHiringApp.history}
        currentStatus={mockStandardHiringApp.status}
        onUpdateEntry={onUpdate}
        isInteractive={true}
      />
    );

    const editBtn = host.querySelector('button[aria-label^="Edit milestone"]') as HTMLButtonElement | null;
    expect(editBtn).toBeTruthy();

    act(() => {
      editBtn?.click();
    });

    const noteInput = host.querySelector('input[placeholder="Brief reason or takeaway..."]') as HTMLInputElement | null;
    expect(noteInput).toBeTruthy();

    act(() => {
      if (noteInput) {
        noteInput.value = 'Updated note from unit test';
        noteInput.dispatchEvent(new Event('input', { bubbles: true }));
        noteInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const saveBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('Save Changes'));
    expect(saveBtn).toBeTruthy();

    act(() => {
      saveBtn?.click();
    });

    expect(onUpdate).toHaveBeenCalled();
  });

  it('deletes a milestone note when cleared in the inline edit form', () => {
    const onUpdate = vi.fn();
    const historyWithNote = [
      {
        id: 'note-1',
        fromStatus: 'Applied' as const,
        toStatus: 'Interview' as const,
        timestamp: '2026-09-10T10:00:00.000Z',
        note: 'Important note to delete',
      },
    ];

    const { host } = mountComponent(
      <MilestoneSpineTimeline
        history={historyWithNote}
        currentStatus="Interview"
        onUpdateEntry={onUpdate}
        isInteractive={true}
      />
    );

    // Initial note quote is displayed
    expect(host.textContent).toContain('Important note to delete');

    // Open inline edit
    const editBtn = host.querySelector('button[aria-label^="Edit milestone"]') as HTMLButtonElement | null;
    expect(editBtn).toBeTruthy();
    act(() => {
      editBtn?.click();
    });

    // Clear note button is visible and clears input
    const clearNoteBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Clear note')
    );
    expect(clearNoteBtn).toBeTruthy();
    act(() => {
      clearNoteBtn?.click();
    });

    const noteInput = host.querySelector('input[placeholder="Brief reason or takeaway..."]') as HTMLInputElement | null;
    expect(noteInput?.value).toBe('');

    // Save changes
    const saveBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('Save Changes'));
    act(() => {
      saveBtn?.click();
    });

    expect(onUpdate).toHaveBeenCalledWith('note-1', expect.objectContaining({ note: '' }));
  });

  it('renders quiet note quote without a direct delete button on the row', () => {
    const historyWithNote = [
      {
        id: 'note-1',
        fromStatus: 'Applied' as const,
        toStatus: 'Interview' as const,
        timestamp: '2026-09-10T10:00:00.000Z',
        note: 'Quiet note test',
      },
    ];

    const { host } = mountComponent(
      <MilestoneSpineTimeline
        history={historyWithNote}
        currentStatus="Interview"
        isInteractive={true}
      />
    );

    // Note quote text is present
    expect(host.textContent).toContain('Quiet note test');

    // No direct delete button on the note quote
    const deleteNoteBtn = host.querySelector('button[aria-label="Delete note for Interview"]');
    expect(deleteNoteBtn).toBeNull();
  });
});

describe('StatusHistoryTimeline Canonical Wrapper', () => {
  it('renders Design A MilestoneSpine correctly through StatusHistoryTimeline', () => {
    const { getText } = mountComponent(
      <StatusHistoryTimeline
        history={mockStandardHiringApp.history}
        currentStatus={mockStandardHiringApp.status}
        createdAt={mockStandardHiringApp.createdAt}
      />
    );

    const text = getText();
    expect(text).toContain('Status History');
    expect(text).toContain('Offer');
    expect(text).toContain('Interview');
    expect(text).toContain('Screening');
    expect(text).toContain('Applied');
  });
});
