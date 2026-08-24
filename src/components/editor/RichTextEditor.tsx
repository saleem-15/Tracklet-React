import React, { useCallback, useState } from 'react';
import { canonicalizeMarkdown } from '../../lib/richTextMarkdownUtils';
import { useRichTextEditor } from '../../lib/useRichTextEditor';
import { EDITOR_ACTIONS } from './editorActions';
import type { FormattingAction } from './editorActions';
import SlashMenu from './SlashMenu';
import SelectionBubble from './SelectionBubble';
import TemplatePills from './TemplatePills';
import LinkPopover from './LinkPopover';
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
}) => {
  const {
    editorRef,
    handleInput,
    handleKeyDown,
    handlePaste,
    handleClick,
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
  const isEmpty = isEmptyMarkdown(value);

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
          onClick={handleClick}
          onFocus={() => setEditorFocused(true)}
          onBlur={() => setEditorFocused(false)}
          style={{ minHeight }}
          className="w-full p-3.5 bg-white text-slate-800 focus:outline-none font-sans text-xs leading-relaxed border-none block"
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
        />

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
