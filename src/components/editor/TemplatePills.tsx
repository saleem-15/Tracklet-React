import React from 'react';
import type { NoteTemplate } from '../../lib/editor/noteTemplates';

export interface TemplatePillsProps {
  templates: NoteTemplate[];
  onSelect: (template: NoteTemplate) => void;
}

/**
 * Empty-state starter template pills (FR-012). Rendered only while the
 * note is empty; any manual content naturally hides them.
 */
const TemplatePills: React.FC<TemplatePillsProps> = ({ templates, onSelect }) => {
  if (templates.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-2.5">
      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 select-none mr-0.5">
        Start with:
      </span>
      {templates.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          onClick={() => onSelect(tpl)}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-600 bg-slate-100/80 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200 rounded-full transition-colors cursor-pointer"
        >
          <span aria-hidden="true">{tpl.emoji}</span>
          {tpl.label}
        </button>
      ))}
    </div>
  );
};

export default TemplatePills;
