import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { AttachmentDropzone } from '../../src/components/feedback/AttachmentDropzone';
import { TesterAttachment } from '../../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../src/lib/imageUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/imageUtils')>();
  return {
    ...actual,
    compressImageToDataUrl: vi.fn().mockImplementation((file: File) =>
      Promise.resolve({
        dataUrl: `data:image/webp;base64,mock_${file.name}`,
        width: 400,
        height: 300,
        sizeBytes: 2048,
        fileName: file.name,
        mediaType: 'image/webp',
      })
    ),
  };
});

let host: HTMLDivElement | null = null;
let root: Root | null = null;

describe('AttachmentDropzone Component', () => {
  beforeEach(() => {
    localStorage.clear();
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
  });

  function renderDropzone(props: {
    attachments: TesterAttachment[];
    onAddAttachment?: (att: TesterAttachment) => void;
    onAddAttachments?: (atts: TesterAttachment[]) => void;
    onRemoveAttachment?: (id: string) => void;
  }) {
    act(() => {
      root!.render(
        <AttachmentDropzone
          attachments={props.attachments}
          onAddAttachment={props.onAddAttachment || vi.fn()}
          onAddAttachments={props.onAddAttachments}
          onRemoveAttachment={props.onRemoveAttachment || vi.fn()}
        />
      );
    });
  }

  it('renders file input with multiple attribute and handles single file upload', async () => {
    const onAdd = vi.fn();
    renderDropzone({ attachments: [], onAddAttachment: onAdd });

    const fileInput = host!.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.hasAttribute('multiple')).toBe(true);

    const mockFile = new File(['fake content'], 'single-screenshot.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      configurable: true,
    });

    await act(async () => {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'single-screenshot.png',
        mediaType: 'image/webp',
      })
    );
  });

  it('accepts multiple files simultaneously in file explorer and calls onAddAttachments', async () => {
    const onAddBatch = vi.fn();
    renderDropzone({ attachments: [], onAddAttachments: onAddBatch });

    const fileInput = host!.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile1 = new File(['fake 1'], 'screen-a.png', { type: 'image/png' });
    const mockFile2 = new File(['fake 2'], 'screen-b.png', { type: 'image/png' });

    Object.defineProperty(fileInput, 'files', {
      value: [mockFile1, mockFile2],
      configurable: true,
    });

    await act(async () => {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onAddBatch).toHaveBeenCalledTimes(1);
    const addedFiles = onAddBatch.mock.calls[0][0];
    expect(addedFiles.length).toBe(2);
    expect(addedFiles[0].fileName).toBe('screen-a.png');
    expect(addedFiles[1].fileName).toBe('screen-b.png');
  });

  it('opens enlarged preview and dismisses it cleanly on Escape', async () => {
    const existingAttachment: TesterAttachment = {
      id: 'att-1',
      fileName: 'existing.png',
      mediaType: 'image/webp',
      fileSizeBytes: 1024,
      dataUrl: 'data:image/webp;base64,previewContent',
      source: 'file_upload',
    };

    renderDropzone({ attachments: [existingAttachment] });

    const previewBtn = host!.querySelector('button[title="Enlarge preview"]') as HTMLButtonElement;
    expect(previewBtn).not.toBeNull();

    act(() => {
      previewBtn.click();
    });

    expect(host!.querySelector('[aria-label="Image Preview"]')).not.toBeNull();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(host!.querySelector('[aria-label="Image Preview"]')).toBeNull();
  });
});
