import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Eye, AlertCircle } from 'lucide-react';
import { TesterAttachment } from '../../types';
import { 
  validateImageFile, 
  extractImageFromClipboard, 
  extractImageFromDataTransfer, 
  compressImageToDataUrl, 
  formatFileSize 
} from '../../lib/imageUtils';

interface AttachmentDropzoneProps {
  attachments: TesterAttachment[];
  onAddAttachment: (attachment: TesterAttachment) => void;
  onRemoveAttachment: (id: string) => void;
  disabled?: boolean;
}

export const AttachmentDropzone: React.FC<AttachmentDropzoneProps> = ({
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setErrorMessage(null);
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      return;
    }

    if (attachments.length >= 2) {
      setErrorMessage('Maximum 2 screenshots allowed per report.');
      return;
    }

    try {
      const compressed = await compressImageToDataUrl(file);
      const newAttachment: TesterAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fileName: compressed.fileName,
        mediaType: compressed.mediaType,
        fileSizeBytes: compressed.sizeBytes,
        dataUrl: compressed.dataUrl,
        source: 'file_upload',
      };
      onAddAttachment(newAttachment);
    } catch (err) {
      console.error('Error compressing image:', err);
      setErrorMessage('Failed processing image. Please try another file.');
    }
  };

  // Clipboard paste listener on window/modal
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Ignore if user is currently pasting inside a text input or textarea
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' && target?.getAttribute('type') === 'text') return;

      const file = extractImageFromClipboard(e);
      if (file) {
        e.preventDefault();
        processFile(file);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [attachments.length]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = extractImageFromDataTransfer(e.dataTransfer);
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input so the same file can be re-selected if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
          Screenshots & Visual Evidence
          <span className="text-slate-500 font-normal text-[11px]">(Optional • Max 2)</span>
        </label>
        <span className="text-[11px] text-slate-500 font-mono">
          Paste with Ctrl+V anywhere
        </span>
      </div>

      {/* Dropzone Card */}
      {attachments.length < 2 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />

          <div className="flex items-center justify-center gap-2.5 text-slate-600">
            <div className="p-2 rounded-lg bg-white shadow-2xs border border-slate-200 text-blue-600">
              <Upload className="w-4 h-4" />
            </div>
            <div className="text-left text-xs">
              <span className="font-semibold text-slate-800">Click to upload</span> or drag image here
              <p className="text-[11px] text-slate-500">PNG, JPEG, WebP up to 2MB • Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">Ctrl+V</kbd> to paste</p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-rose-600 text-xs mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Attached thumbnails */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group rounded-lg border border-slate-200 bg-white p-1.5 flex items-center gap-2 shadow-2xs"
            >
              {att.dataUrl ? (
                <img
                  src={att.dataUrl}
                  alt={att.fileName}
                  className="w-12 h-12 object-cover rounded-md border border-slate-100 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-800 truncate" title={att.fileName}>
                  {att.fileName}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatFileSize(att.fileSizeBytes)}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {att.dataUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewModalUrl(att.dataUrl || null);
                    }}
                    title="Enlarge preview"
                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAttachment(att.id);
                  }}
                  title="Remove image"
                  className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full image preview overlay modal */}
      {previewModalUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image Preview"
          className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white transition-colors cursor-pointer z-10"
              aria-label="Close image preview"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewModalUrl}
              alt="Enlarged screenshot"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
