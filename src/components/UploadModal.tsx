import React, { useEffect, useRef, useState } from 'react';
import { Check, CloudUpload, FileText, X } from 'lucide-react';
import { useEscapeKey } from '../lib/useEscapeKey';
import { formatFileSize, type UploadHandle } from '../lib/resumeStorage';

/**
 * UploadModal — file upload dialog on the transitions.dev motion stack.
 *
 * Composition of three transitions.dev snippets (timing verbatim):
 *   1. Modal open/close  — 250ms scale-in / 150ms scale-out, cubic-bezier(0.22,1,0.36,1)
 *   2. Text states swap  — blurred 4px vertical swap on the button label & status
 *   3. Icon swap         — document icon cross-fades into a check on completion
 * Plus button press scale and a progress bar eased by --ease-smooth-out.
 * All colors come from the --stage-* / Tracklet-mapped tokens in index.css.
 *
 * The transfer is REAL: progress percentages come from the caller's upload
 * implementation (e.g. `uploadResume` → Firebase `uploadBytesResumable`
 * state_changed events). Nothing here is simulated.
 *
 * Note: this dialog intentionally does NOT use the canonical `Modal`
 * (framer-motion variants) — its motion contract is the transitions.dev CSS
 * timing. Escape dismissal (useEscapeKey), backdrop press/release validation,
 * and focus capture/restoration still follow the registry conventions.
 */

export type UploadPhase = 'idle' | 'ready' | 'uploading' | 'done' | 'error';

export interface UploadModalProps<T = unknown> {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Starts the real transfer for the given file. Report progress (0–100)
   * through `onProgress`; return a cancellable handle. The modal awaits the
   * promise and passes the resolved value to `onUploaded`.
   */
  onUpload: (file: File, onProgress: (pct: number) => void) => UploadHandle<T>;
  /** Receives the upload result on successful completion. */
  onUploaded?: (result: T) => void;
  title?: string;
  metaCopy?: string;
  /** File input accept attribute (extensions or MIME types). */
  accept?: string;
  maxSizeMB?: number;
}

const CLOSE_MS = 150; // --modal-close-dur
const DONE_SETTLE_MS = 200; // demo settle delay between 100% and the Done swap

const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.txt';
const DEFAULT_MAX_MB = 10;

function SwapText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = ref.current;
    if (!el) return;
    el.classList.add('is-exit');
    const t = setTimeout(() => {
      setShown(text);
      el.classList.remove('is-exit');
      el.classList.add('is-enter-start');
      void el.offsetHeight;
      el.classList.remove('is-enter-start');
    }, 150);
    return () => clearTimeout(t);
  }, [text]);
  return <span ref={ref} className="t-text-swap">{shown}</span>;
}

export function UploadModal<T = unknown>({
  isOpen,
  onClose,
  onUpload,
  onUploaded,
  title = 'Upload file',
  metaCopy = 'PDF, DOC or TXT up to 10 MB',
  accept = DEFAULT_ACCEPT,
  maxSizeMB = DEFAULT_MAX_MB,
}: UploadModalProps<T>) {
  // ── State (all hooks first — no early returns above this line) ──────────
  const [uiState, setUiState] = useState<'closed' | 'open' | 'closing'>(isOpen ? 'open' : 'closed');
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [pct, setPct] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pressTargetRef = useRef<EventTarget | null>(null);
  const uploadRef = useRef<UploadHandle<T> | null>(null);
  const cancelledRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const addTimer = (id: number) => {
    timersRef.current.push(id);
  };
  const clearAllTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };
  const cancelInFlight = () => {
    if (uploadRef.current) {
      cancelledRef.current = true;
      uploadRef.current.cancel();
      uploadRef.current = null;
    }
  };

  const resetAll = () => {
    setPhase('idle');
    setPct(0);
    setFile(null);
    setErrorMsg(null);
    cancelledRef.current = false;
  };

  // Unmount cleanup: abort any in-flight transfer and clear pending timers.
  useEffect(() => () => {
    cancelInFlight();
    clearAllTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Controlled open/close: entering 'closing' plays the 150ms exit transition
  // before the dialog unmounts and internal state resets.
  useEffect(() => {
    if (isOpen) {
      setUiState('open');
    } else {
      setUiState((cur) => (cur === 'open' ? 'closing' : 'closed'));
      cancelInFlight();
    }
  }, [isOpen]);

  useEffect(() => {
    if (uiState !== 'closing') return;
    const t = window.setTimeout(() => {
      setUiState('closed');
      resetAll();
    }, CLOSE_MS);
    addTimer(t);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiState]);

  // Focus capture on open, restoration on dismissal.
  useEffect(() => {
    if (uiState !== 'open') return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      dialogRef.current?.focus({ preventScroll: true });
    }, 30);
    addTimer(t);
    return () => {
      window.clearTimeout(t);
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    };
  }, [uiState]);

  useEscapeKey(onClose, isOpen);

  const close = () => {
    if (uiState !== 'open') return;
    onClose();
  };

  // Backdrop press/release validation (drags across the dialog don't dismiss).
  const isBackdropTarget = (target: EventTarget | null) => {
    if (!target) return false;
    return !dialogRef.current?.contains(target as Node);
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    pressTargetRef.current = e.target;
  };
  const handleBackdropClick = (e: React.MouseEvent) => {
    const pressTarget = pressTargetRef.current;
    pressTargetRef.current = null;
    const isPressOnBackdrop = pressTarget === null ? isBackdropTarget(e.target) : isBackdropTarget(pressTarget);
    const isReleaseOnBackdrop = isBackdropTarget(e.target);
    if (isPressOnBackdrop && isReleaseOnBackdrop) {
      close();
    }
  };

  // Tab cycling within dialog bounds.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) {
      e.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeEl = document.activeElement;
    const isOutsideOrOnPanel = !activeEl || activeEl === dialogRef.current || !dialogRef.current.contains(activeEl);
    if (isOutsideOrOnPanel) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && activeEl === first) {
      e.preventDefault();
      last.focus();
    }
  };

  // ── File selection & validation ─────────────────────────────────────────
  const handleFileSelected = (selected: File | undefined | null) => {
    if (!selected) return;
    const accepted = accept.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const ext = `.${selected.name.split('.').pop()?.toLowerCase() ?? ''}`;
    const typeOk = accepted.some((a) => (a.startsWith('.') ? ext === a : selected.type === a));
    const maxBytes = maxSizeMB * 1024 * 1024;

    if (!typeOk) {
      setErrorMsg(`"${selected.name}" is not a supported file type.`);
      return;
    }
    if (selected.size > maxBytes) {
      setErrorMsg(`"${selected.name}" is ${formatFileSize(selected.size)} — the limit is ${maxSizeMB} MB.`);
      return;
    }
    setErrorMsg(null);
    setFile(selected);
    setPct(0);
    setPhase('ready');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (phase !== 'idle') return;
    handleFileSelected(e.dataTransfer.files?.[0]);
  };

  // ── Real transfer lifecycle ─────────────────────────────────────────────
  const beginUpload = (target: File) => {
    if (phase === 'uploading' || phase === 'done') return;
    cancelledRef.current = false;
    setErrorMsg(null);
    setPhase('uploading');
    setPct(0);

    const report = (raw: number) => setPct(Math.min(100, Math.max(0, Math.round(raw))));
    const handle = onUpload(target, report);
    uploadRef.current = handle;

    handle.promise
      .then((result) => {
        if (cancelledRef.current) return;
        uploadRef.current = null;
        const t = window.setTimeout(() => {
          setPhase('done');
          setPct(100);
          onUploaded?.(result);
        }, DONE_SETTLE_MS);
        addTimer(t);
      })
      .catch((err: unknown) => {
        uploadRef.current = null;
        if (cancelledRef.current) return;
        setPhase('error');
        setPct(0);
        setErrorMsg(err instanceof Error && err.message ? err.message : 'Upload failed. Please try again.');
      });
  };

  const handlePrimary = () => {
    if (phase === 'done') return close();
    if (phase === 'error' && file) return beginUpload(file);
    if (phase === 'ready' && file) return beginUpload(file);
  };

  const label = phase === 'uploading' ? 'Uploading' : phase === 'done' ? 'Done' : phase === 'error' ? 'Retry' : 'Upload';
  const statusText =
    phase === 'done' ? 'Uploaded' : phase === 'uploading' ? 'Uploading' : phase === 'error' ? 'Failed' : 'Ready';
  const primaryDisabled = phase === 'idle' || phase === 'uploading';

  const visible = uiState !== 'closed';

  return (
    <div className="up" aria-hidden={!visible}>
      {visible && (
        <div
          className={'scrim' + (uiState === 'open' ? ' is-open' : '')}
          onMouseDown={handleBackdropMouseDown}
          onClick={handleBackdropClick}
        >
          <div
            ref={dialogRef}
            className={'t-modal' + (uiState === 'open' ? ' is-open' : ' is-closing')}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="head">
              <div className="txt">
                <div className="title">{title}</div>
                <div className="meta">{metaCopy}</div>
              </div>
              <button type="button" className="x" aria-label="Close" onClick={close}>
                <X size={16} strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>

            <div className="zone" data-phase={phase}>
              <input
                type="file"
                ref={fileInputRef}
                accept={accept}
                className="file-input"
                onChange={(e) => {
                  handleFileSelected(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div
                className="drop"
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <CloudUpload size={32} strokeWidth={1.5} aria-hidden="true" />
                <span className="meta">Drop a file here</span>
                <span className="meta">or click to browse</span>
              </div>
              <div className="file">
                <div className="row">
                  <div className="ico">
                    <div className="t-icon-swap" data-state={phase === 'done' ? 'b' : 'a'}>
                      <span className="t-icon" data-icon="a">
                        <FileText size={16} strokeWidth={2} aria-hidden="true" />
                      </span>
                      <span className="t-icon" data-icon="b">
                        <span className="is-done">
                          <Check size={16} strokeWidth={3} aria-hidden="true" />
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="txt">
                    <div className="name">{file?.name ?? '—'}</div>
                    <div className="meta">
                      <SwapText text={statusText} />
                      {file ? ` · ${formatFileSize(file.size)}` : ''}
                    </div>
                  </div>
                  <span className="pct">{pct}%</span>
                </div>
                <div
                  className="bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <div className="fill" style={{ transform: `scaleX(${pct / 100})` }} />
                </div>
              </div>
            </div>

            {errorMsg && (
              <p className="err" role="alert">
                {errorMsg}
              </p>
            )}

            <div className="foot">
              <button type="button" className="btn is-secondary" onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handlePrimary}
                disabled={primaryDisabled}
              >
                <SwapText text={label} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
