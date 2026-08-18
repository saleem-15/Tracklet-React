import React, { useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { ApplicationTask } from '../../types';
import { TaskItem } from '../TaskItem';

export interface TaskChecklistSectionProps {
  tasks?: ApplicationTask[];
  onToggleTask: (taskId: string) => Promise<void>;
  onEditTask: (taskId: string, updatedFields: Partial<ApplicationTask>) => Promise<void>;
  onAddTask: (title: string, dueDate?: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export const TaskChecklistSection: React.FC<TaskChecklistSectionProps> = ({
  tasks = [],
  onToggleTask,
  onEditTask,
  onAddTask,
  onDeleteTask,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const totalTasksCount = tasks.length;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setIsAdding(true);
    try {
      await onAddTask(newTaskTitle.trim(), newTaskDueDate || undefined);
      setNewTaskTitle('');
      setNewTaskDueDate('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
          Tasks
          {totalTasksCount > 0 && <span className="ml-1 text-slate-500 font-normal">({totalTasksCount})</span>}
        </h3>
        {totalTasksCount > 0 && (
          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold border border-blue-200/60">
            {completedTasksCount}/{totalTasksCount} done
          </span>
        )}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        <div className="divide-y divide-slate-100">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggleTask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))
          ) : (
            <div className="text-slate-500 font-mono text-[11px] text-center py-4">No tasks yet.</div>
          )}
        </div>

        <form onSubmit={handleFormSubmit} className="border-t border-slate-100 bg-slate-50/60 p-2.5 flex items-center gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task…"
            className="flex-1 bg-white text-slate-900 placeholder-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs transition-all"
          />
          <input
            type="date"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
            title="Due date (optional)"
            className="w-28 bg-white text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-[11px] cursor-pointer"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim() || isAdding}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </form>
      </div>
    </div>
  );
};
