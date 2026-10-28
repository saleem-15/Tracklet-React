import React, { useRef, useState, useEffect } from 'react';
import { Paperclip, X, Image as ImageIcon, Eye, AlertCircle } from 'lucide-react';
import { TesterAttachment } from '../../types';
import { 
  validateImageFile, 
  extractImageFromClipboard, 
  extractImageFromDataTransfer, 
  compressImageToDataUrl, 
  formatFileSize 
} from '../../lib/imageUtils';
import { useEscapeKey } from '../../lib/useEscapeKey';

interface AttachmentDropzoneProps {
  attachments: TesterAttachment[];
  onAddAttachment: (attachment: TesterAttachment) => void;
  onAddAttachments?: (attachments: TesterAttachment[]) => void;
  onRemoveAttachment: (id: string) => void;
  disabled?: boolean;
}

export const AttachmentDropzone: React.FC<AttachmentDropzoneProps> = ({
  attachments,
  onAddAttachment,
  onAddAttachments,
  onRemoveAttachment,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const processFiles = async (files: File[]) => {
    setErrorMessage(null);
    if (!files.length) return;

    const remainingSlots = 4 - attachments.length;
    if (remainingSlots <= 0) {
      setErrorMessage('Maximum 4 attachments allowed.');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    let limitNotice = '';
    if (files.length > remainingSlots) {
      limitNotice = `Maximum 4 attachments allowed. Only adding ${remainingSlots} of ${files.length} selected.`;
    }

    const newAttachments: TesterAttachment[] = [];
    const errors: string[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        errors.push(`${file.name}: ${validation.error}`);
        continue;
      }

      try {
        const compressed = await compressImageToDataUrl(file);
        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${i}`,
          fileName: compressed.fileName,
          mediaType: compressed.mediaType,
          fileSizeBytes: compressed.sizeBytes,
          dataUrl: compressed.dataUrl,
          source: 'file_upload',
        });
      } catch (err) {
        console.error('Error compressing image:', err);
        errors.push(`Failed processing ${file.name}.`);
      }
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
    } else if (limitNotice) {
      setErrorMessage(limitNotice);
    }

    if (newAttachments.length > 0) {
      if (onAddAttachments) {
        onAddAttachments(newAttachments);
      } else {
        newAttachments.forEach((att) => onAddAttachment(att));
      }
    }
  };

  // Clipboard paste listener on window/modal
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const file = extractImageFromClipboard(e);
      if (file) {
        e.preventDefault();
        processFiles([file]);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [attachments.length]);

  // Dismiss image preview overlay cleanly without closing parent modal
  useEscapeKey(() => {
    setPreviewModalUrl(null);
  }, !!previewModalUrl);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      processFiles(Array.from(fileList));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input supporting multiple files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* Compact attachment bar */}
      <div className="flex items-center justify-between gap-2">
        {attachments.length < 4 && (
          <button
            type="button"
            onClick={() => !disabled && fileInputRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Paperclip className="w-3.5 h-3.5 text-slate-500" />
            <span>Attach image</span>
          </button>
        )}

        {attachments.length > 0 && (
          <span className="text-[11px] text-slate-500 font-medium">
            {attachments.length}/4 attached
          </span>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-rose-600 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Attached image preview chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors text-xs shadow-2xs max-w-xs"
            >
              {att.dataUrl ? (
                <img
                  src={att.dataUrl}
                  alt={att.fileName}
                  className="w-7 h-7 object-cover rounded border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded bg-slate-200 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-800 truncate" title={att.fileName}>
                  {att.fileName}
                </p>
                <p className="text-[10px] text-slate-500">
                  {formatFileSize(att.fileSizeBytes)}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                {att.dataUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(att.dataUrl || null)}
                    title="Enlarge preview"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(att.id)}
                  title="Remove image"
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enlarged image preview overlay */}
      {previewModalUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image Preview"
          className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition-colors cursor-pointer z-10"
              aria-label="Close image preview"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewModalUrl}
              alt="Enlarged screenshot"
              className="max-h-[80vh] max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
