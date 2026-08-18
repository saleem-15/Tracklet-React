import React, { useState, useRef, useEffect } from 'react';
import { ApplicationTask } from '../types';
import { Check, Calendar, Pencil } from 'lucide-react';
import { DeleteIconButton, IconButton } from './IconButton';

interface TaskItemProps {
  task: ApplicationTask;
  onToggle?: (id: string) => void;
  onEdit?: (id: string, updatedTask: Partial<ApplicationTask>) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

/**
 * Smart due date helper:
 * Converts YYYY-MM-DD strings into human friendly relative labels like "Due Today", "Due Tomorrow", "Yesterday", "Dec 5, 2023", etc.
 */
export interface SmartDueDateResult {
  text: string;
  styleClass: string;
  isBold: boolean;
}

export function formatSmartDueDate(dueDateStr?: string): SmartDueDateResult {
  if (!dueDateStr) {
    return { text: '', styleClass: '', isBold: false };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let dueObj: Date;
  try {
    const parsed = new Date(dueDateStr);
    if (isNaN(parsed.getTime())) {
      return {
        text: dueDateStr.toUpperCase(),
        styleClass: 'bg-slate-100 text-slate-600 border-slate-200 font-mono',
        isBold: false,
      };
    }
    const utcDue = new Date(parsed.getTime() + parsed.getTimezoneOffset() * 60000);
    dueObj = new Date(utcDue.getFullYear(), utcDue.getMonth(), utcDue.getDate());
  } catch {
    return {
      text: dueDateStr.toUpperCase(),
      styleClass: 'bg-slate-100 text-slate-600 border-slate-200 font-mono',
      isBold: false,
    };
  }

  const diffTime = dueObj.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return {
      text: 'DUE TODAY',
      styleClass: 'bg-blue-50 text-blue-600 border-blue-300/80',
      isBold: true,
    };
  } else if (diffDays === 1) {
    return {
      text: 'DUE TOMORROW',
      styleClass: 'bg-blue-50 text-blue-600 border-blue-200/80',
      isBold: false,
    };
  } else if (diffDays === -1) {
    return {
      text: 'YESTERDAY',
      styleClass: 'bg-rose-50 text-rose-600 border-rose-200',
      isBold: true,
    };
  } else if (diffDays < -1 && diffDays >= -7) {
    const daysAgo = Math.abs(diffDays);
    return {
      text: `${daysAgo} DAYS AGO`,
      styleClass: 'bg-rose-50 text-rose-600 border-rose-200',
      isBold: true,
    };
  }

  const formatted = dueObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  return {
    text: formatted,
    styleClass: 'bg-slate-100 text-slate-600 border-slate-200 font-mono',
    isBold: false,
  };
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onEdit,
  onDelete,
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [titleText, setTitleText] = useState(task.title);
  const [dueDateText, setDueDateText] = useState(task.dueDate || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const { text: smartDate, styleClass, isBold } = formatSmartDueDate(task.dueDate);

  useEffect(() => {
    setTitleText(task.title);
    setDueDateText(task.dueDate || '');
  }, [task.title, task.dueDate]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (!titleText.trim()) {
      setTitleText(task.title);
      setIsEditing(false);
      return;
    }
    if (onEdit) {
      onEdit(task.id, {
        title: titleText.trim(),
        dueDate: dueDateText || undefined,
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setTitleText(task.title);
      setDueDateText(task.dueDate || '');
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100/60 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          disabled={readOnly || !onToggle}
          onClick={() => onToggle && onToggle(task.id)}
          className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
            task.completed
              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
              : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 bg-white'
          }`}
          title={task.completed ? 'Mark as incomplete' : 'Mark as completed'}
        >
          {task.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
        </button>

        {isEditing ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title"
              className="flex-1 min-w-[120px] bg-white border border-blue-400 rounded-md px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
            />
            <input
              type="date"
              value={dueDateText}
              onChange={(e) => setDueDateText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-[11px] font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            />
            <button
              type="button"
              onClick={handleSave}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setTitleText(task.title);
                setDueDateText(task.dueDate || '');
                setIsEditing(false);
              }}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => !readOnly && onEdit && setIsEditing(true)}
            title={!readOnly && onEdit ? "Click to edit task title" : undefined}
          >
            <span className="relative inline-block max-w-full">
              <span
                className={`text-xs truncate font-semibold block transition-opacity duration-300 ${
                  task.completed
                    ? 'text-slate-500 opacity-70'
                    : 'text-slate-900 hover:text-blue-600'
                }`}
              >
                {task.title}
              </span>
              {/* Animated Cutting Strikethrough Line covering text width only */}
              <span
                className={`task-strike-line ${
                  task.completed ? 'task-strike-line-completed' : 'task-strike-line-incomplete'
                }`}
              />
            </span>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-1.5 shrink-0">
          {smartDate && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] tracking-tight uppercase border ${styleClass} ${
                isBold ? 'font-extrabold' : 'font-semibold'
              }`}
            >
              <Calendar className="w-3 h-3 text-current shrink-0" />
              <span>{smartDate}</span>
            </div>
          )}

          {!readOnly && onEdit && (
            <IconButton
              icon={Pencil}
              onClick={() => setIsEditing(true)}
              title="Edit task"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
          )}

          {!readOnly && onDelete && (
            <DeleteIconButton
              onClick={() => onDelete(task.id)}
              title="Delete task"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
          )}
        </div>
      )}
    </div>
  );
};
