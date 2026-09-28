import { useState, useCallback } from 'react';
import { ToastMessage } from '../components/Toast';
import { ApplicationStatus } from '../types';

export type AddToastFn = (
  type: 'success' | 'error' | 'info' | 'warning',
  title: string,
  description?: string,
  action?: { label: string; onClick: () => void },
  stage?: ApplicationStatus
) => void;

export interface UseToastReturn {
  toasts: ToastMessage[];
  addToast: AddToastFn;
  dismissToast: (id: string) => void;
}

/**
 * Custom hook to manage toast notifications.
 * Encapsulates notification queue, unique ID generation, and dismissal.
 */
export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback<AddToastFn>((
    type,
    title,
    description,
    action,
    stage
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, description, action, stage }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
