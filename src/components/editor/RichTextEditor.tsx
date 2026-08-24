import React, { useCallback } from 'react';
import { Link2, X } from 'lucide-react';
import { canonicalizeMarkdown } from '../../lib/richTextMarkdownUtils';
import { useRichTextEditor } from '../../lib/useRichTextEditor';
import { EDITOR_ACTIONS } from './editorActions';
import type { FormattingAction } from './editorActions';
import SlashMenu from './SlashMenu';
import SelectionBubble from './SelectionBubble';
import TemplatePills from './TemplatePills';
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
  placeholder = 'Start writing... ("/" for commands)',
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
  const isEmpty = isEmptyMarkdown(value);

  // Click-outside closes the slash menu
  useEffectWrapper(slash.open, wrapperRef.current, closeSlashMenu);

  const handleBubbleApply = useCallback(
    (action: FormattingAction) => {
      const editor = editorRef.current;
      if (!editor) return;
      // Bubble actions run with the live selection intact; the registry's
      // link action opens the shared dialog via requestLink.
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
      {/* Link insertion / update / remove dialog */}
      {linkDialog.open && (
        <div className="bg-blue-50/90 border-b border-blue-200 px-3 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <input
            type="url"
            value={linkDialog.url}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLinkFromDialog();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                closeLinkDialog();
              }
            }}
            placeholder={linkDialog.url === '' ? 'https://...' : 'https://... (clear to remove link)'}
            aria-label="Link URL"
            autoFocus
            className="flex-1 px-2.5 py-1 text-xs bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-800"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={applyLinkFromDialog}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded transition-colors cursor-pointer"
          >
            Apply
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={closeLinkDialog}
            className="p-1 text-slate-500 hover:text-slate-700 rounded cursor-pointer"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
          style={{ minHeight }}
          className="w-full p-3.5 bg-white text-slate-800 focus:outline-none font-sans text-xs leading-relaxed border-none block"
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
        />

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
