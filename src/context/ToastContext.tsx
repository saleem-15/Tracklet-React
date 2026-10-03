import React, { createContext, useContext, useMemo } from 'react';
import { useToast, AddToastFn } from '../hooks/useToast';
import { ToastMessage } from '../components/Toast';

export interface ToastContextType {
  toasts: ToastMessage[];
  addToast: AddToastFn;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

/**
 * ToastProvider
 *
 * Scoped feature provider for application-wide notifications (snackbars).
 * Analogous to Flutter's ScaffoldMessenger / Global notification service.
 * Eliminates prop-drilling `addToast` / `onShowToast` across the component tree.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, addToast, dismissToast } = useToast();

  const value = useMemo<ToastContextType>(() => ({
    toasts,
    addToast,
    dismissToast,
  }), [toasts, addToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToastContext = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};
