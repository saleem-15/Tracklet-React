import React, { useCallback, useState } from 'react';
import { canonicalizeMarkdown } from '../../lib/richTextMarkdownUtils';
import { useRichTextEditor } from '../../lib/useRichTextEditor';
import { EDITOR_ACTIONS } from './editorActions';
import type { FormattingAction } from './editorActions';
import SlashMenu from './SlashMenu';
import SelectionBubble from './SelectionBubble';
import TemplatePills from './TemplatePills';
import LinkPopover from './LinkPopover';
import LinkHoverTooltip from './LinkHoverTooltip';
import type { NoteTemplate, NoteTemplateId } from '../../lib/noteTemplates';

export interface RichTextEditorProps {
  /** Markdown source of truth. */
  value: string;
  /** Fired on user mutations with the new canonical Markdown. */
  onChange: (markdown: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  minRows?: number;
  /** Empty-state starter templates (opt-in; pass [] or null to disable). */
  templates?: readonly NoteTemplate[] | null;
  /** Called when a template pill is picked — host decides how to persist. */
  onTemplateSelect?: (id: NoteTemplateId, skeleton: string) => void;
  /** Shows a drag handle on the bottom edge for manual height control. */
  resizable?: boolean;
}

const isEmptyMarkdown = (md: string): boolean => !canonicalizeMarkdown(md);

/**
 * Shared, generic WYSIWYG Markdown editor (contracts §1).
 * Reusable far beyond notes: hosts provide a value and receive
 * canonical Markdown back. Caret-safe across background saves.
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  ariaLabel = 'Rich text editor',
  minRows = 8,
  templates = null,
  onTemplateSelect,
  resizable = false,
}) => {
  const {
    editorRef,
    handleInput,
    handleKeyDown,
    handlePaste,
    handleClick,
    handleCopy,
    slash,
    setSlashSelectedIndex,
    applySlashAction,
    closeSlashMenu,
    openLinkDialog,
    linkDialog,
    setLinkUrl,
    applyLinkFromDialog,
    closeLinkDialog,
  } = useRichTextEditor({ value, onChange });

  const wrapperRef = useRefBridge();
  const [editorFocused, setEditorFocused] = useState(false);
  const [userHeight, setUserHeight] = useState<number | null>(null);
  const isEmpty = isEmptyMarkdown(value);

  // Drag-to-resize (bottom edge). Double-click resets to auto height.
  React.useEffect(() => {
    if (!resizable) return;
    const handle = wrapperRef.current?.querySelector('[data-resize-handle]');
    if (!handle || !editorRef.current) return;

    let startY = 0;
    let startH = 0;
    const minH = Math.max(4, minRows) * 20 + 28;
    const maxH = () => Math.max(minH + 60, window.innerHeight * 0.8);

    const onMove = (ev: MouseEvent) => {
      const next = Math.min(maxH(), Math.max(minH, startH + (ev.clientY - startY)));
      setUserHeight(Math.round(next));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
    const onDown = (ev: MouseEvent) => {
      ev.preventDefault();
      startY = ev.clientY;
      startH =
        userHeight ??
        editorRef.current!.getBoundingClientRect().height;
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    const onReset = (ev: MouseEvent) => {
      if (ev.detail >= 2) setUserHeight(null); // double-click
    };

    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('dblclick', onReset);
    return () => {
      handle.removeEventListener('mousedown', onDown);
      handle.removeEventListener('dblclick', onReset);
      onUp();
    };
  }, [resizable, userHeight, minRows, wrapperRef, editorRef]);

  // Click-outside closes the slash menu
  useEffectWrapper(slash.open, wrapperRef.current, closeSlashMenu);

  const handleBubbleApply = useCallback(
    (action: FormattingAction) => {
      const editor = editorRef.current;
      if (!editor) return;
      // Bubble actions run with the live selection intact; the registry's
      // link action opens the shared popover via requestLink.
      action.apply({ editor, requestLink: openLinkDialog });
      handleInput();
    },
    [editorRef, handleInput, openLinkDialog]
  );

  const handleTemplateSelectInternal = (tpl: NoteTemplate) => {
    if (onTemplateSelect) onTemplateSelect(tpl.id, tpl.skeleton);
    else onChange(tpl.skeleton);
    requestAnimationFrame(() => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  };

  const minHeight = `${Math.max(4, minRows) * 20 + 28}px`;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Empty-state starter templates */}
      {isEmpty && templates && templates.length > 0 && (
        <div className="border-b border-slate-100">
          <TemplatePills templates={[...templates]} onSelect={handleTemplateSelectInternal} />
        </div>
      )}

      {/* Editable surface */}
      <div className="relative">
        {isEmpty && (
          <div className="absolute top-3.5 left-3.5 text-slate-400 text-xs pointer-events-none select-none font-sans leading-relaxed">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCopy={handleCopy}
          onClick={handleClick}
          onFocus={() => setEditorFocused(true)}
          onBlur={() => setEditorFocused(false)}
          style={{ minHeight: userHeight ? `${userHeight}px` : minHeight }}
          className="w-full p-3.5 bg-white text-slate-800 focus:outline-none font-sans text-xs leading-relaxed border-none block"
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
        />

        {/* Manual resize handle */}
        {resizable && (
          <div
            data-resize-handle
            title="Drag to resize · double-click to reset"
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize group/h flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
          >
            <span className="h-0.5 w-10 rounded-full bg-slate-200 group-hover/h:bg-slate-400" />
          </div>
        )}

        {/* Discoverability hint: press / for commands (focused + empty) */}
        <div
          aria-hidden="true"
          data-hint-pill="true"
          className={`pointer-events-none absolute bottom-2 right-3 flex items-center gap-1.5 text-[11px] text-slate-400 select-none transition-opacity duration-200 ${
            editorFocused && isEmpty ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Press
          <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-slate-300 bg-slate-50 text-slate-500 font-mono text-[10px] shadow-sm">
            /
          </kbd>
          for commands
        </div>

        {/* Linear-style "/" command menu */}
        <SlashMenu
          open={slash.open}
          items={slash.items}
          selectedIndex={slash.selectedIndex}
          rect={slash.rect}
          onSelect={(action) => applySlashAction(action.id)}
          onHover={setSlashSelectedIndex}
        />

        {/* Floating selection bubble */}
        <SelectionBubble editorRef={editorRef} actions={EDITOR_ACTIONS} onApply={handleBubbleApply} />

        {/* Hover preview for linked text */}
        <LinkHoverTooltip editorRef={editorRef} />

        {/* Floating link insert / edit / remove popover */}
        <LinkPopover
          open={linkDialog.open}
          url={linkDialog.url}
          editingExisting={linkDialog.editingExisting}
          rect={linkDialog.rect}
          onUrlChange={setLinkUrl}
          onApply={applyLinkFromDialog}
          onClose={closeLinkDialog}
        />
      </div>
    </div>
  );
};

/** Tiny helpers kept local so the component stays declarative above. */
function useRefBridge(): React.RefObject<HTMLDivElement | null> {
  return React.useRef<HTMLDivElement | null>(null);
}

function useEffectWrapper(
  open: boolean,
  wrapper: HTMLElement | null,
  close: () => void
): void {
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapper?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, wrapper, close]);
}
