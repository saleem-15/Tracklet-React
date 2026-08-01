import React from 'react';
import { ApplicationTask } from '../types';
import { Check, Calendar, Trash2 } from 'lucide-react';

interface TaskItemProps {
  task: ApplicationTask;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

/**
 * Smart due date helper:
 * Converts YYYY-MM-DD strings into human friendly relative labels like "Due Today", "Due Tomorrow", "Yesterday", "Dec 5, 2023", etc.
 */
export function formatSmartDueDate(dueDateStr?: string): { text: string; isUrgent: boolean; isOverdue: boolean } {
  if (!dueDateStr) {
    return { text: '', isUrgent: false, isOverdue: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  const utcDue = new Date(due.getTime() + due.getTimezoneOffset() * 60000);
  utcDue.setHours(0, 0, 0, 0);

  const diffTime = utcDue.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { text: 'Due Today', isUrgent: true, isOverdue: false };
  } else if (diffDays === 1) {
    return { text: 'Due Tomorrow', isUrgent: true, isOverdue: false };
  } else if (diffDays === -1) {
    return { text: 'Yesterday', isUrgent: false, isOverdue: true };
  } else if (diffDays < -1) {
    return { text: `${Math.abs(diffDays)} days ago`, isUrgent: false, isOverdue: true };
  } else if (diffDays <= 7) {
    return { text: `In ${diffDays} days`, isUrgent: false, isOverdue: false };
  }

  const dateObj = new Date(dueDateStr);
  const formatted = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: dateObj.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });

  return { text: formatted, isUrgent: false, isOverdue: false };
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onDelete,
  readOnly = false,
}) => {
  const { text: smartDate, isUrgent, isOverdue } = formatSmartDueDate(task.dueDate);

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100/60 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          disabled={readOnly || !onToggle}
          onClick={() => onToggle && onToggle(task.id)}
          className={`w-5 h-5 rounded border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
            task.completed
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 bg-white'
          }`}
          title={task.completed ? 'Mark as incomplete' : 'Mark as completed'}
        >
          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        <span
          className={`text-sm truncate font-medium ${
            task.completed
              ? 'line-through text-slate-400 opacity-75'
              : 'text-slate-900 font-semibold'
          }`}
        >
          {task.title}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {smartDate && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${
              isOverdue
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : isUrgent
                ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-extrabold'
                : 'bg-slate-100 text-slate-600 border border-slate-200 font-mono'
            }`}
          >
            <Calendar className="w-3 h-3 text-current shrink-0" />
            <span>{smartDate}</span>
          </div>
        )}

        {!readOnly && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
