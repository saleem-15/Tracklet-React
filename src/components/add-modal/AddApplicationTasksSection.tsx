import React, { useState } from 'react';
import { ListTodo, Plus } from 'lucide-react';
import { ApplicationTask } from '../../types';
import { TaskItem } from '../TaskItem';

export interface AddApplicationTasksSectionProps {
  tasks: ApplicationTask[];
  onAddTask: (task: { title: string; dueDate?: string }) => void;
  onToggleTask: (id: string) => void;
  onEditTask: (id: string, updates: Partial<ApplicationTask>) => void;
  onRemoveTask: (id: string) => void;
}

export const AddApplicationTasksSection: React.FC<AddApplicationTasksSectionProps> = ({
  tasks,
  onAddTask,
  onToggleTask,
  onEditTask,
  onRemoveTask,
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const handleAdd = () => {
    if (!taskTitle.trim()) return;
    onAddTask({ title: taskTitle.trim(), dueDate: taskDueDate || undefined });
    setTaskTitle('');
    setTaskDueDate('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <ListTodo className="w-3.5 h-3.5 text-blue-500" />
          Tasks
          {tasks.length > 0 && <span className="ml-1 text-slate-500 font-normal">({tasks.length})</span>}
        </h3>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        <div className="divide-y divide-slate-100">
          {tasks.length > 0 ? (
            tasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={onToggleTask}
                onEdit={onEditTask}
                onDelete={onRemoveTask}
              />
            ))
          ) : (
            <div className="text-slate-500 font-mono text-[11px] text-center py-3.5">
              No tasks added.
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 p-2.5 flex items-center gap-2">
          <input
            type="text"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add a task..."
            className="flex-1 bg-white text-slate-900 placeholder-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all"
          />
          <input
            type="date"
            value={taskDueDate}
            onChange={(e) => setTaskDueDate(e.target.value)}
            title="Due date (optional)"
            className="w-28 bg-white text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-[11px] cursor-pointer"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!taskTitle.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
