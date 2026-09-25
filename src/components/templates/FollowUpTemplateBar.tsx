import React from 'react';
import { FollowUpTemplate } from '../../types';

export interface FollowUpTemplateBarProps {
  templates: FollowUpTemplate[];
  activeTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
}

export const FollowUpTemplateBar: React.FC<FollowUpTemplateBarProps> = ({
  templates,
  activeTemplateId,
  onSelectTemplate,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {templates.map((tpl) => {
        const isSelected = activeTemplateId === tpl.id;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelectTemplate(tpl.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isSelected
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <span>{tpl.title}</span>
          </button>
        );
      })}
    </div>
  );
};
