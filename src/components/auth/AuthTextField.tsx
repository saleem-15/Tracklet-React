import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AuthTextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon: React.ComponentType<{ className?: string }>;
  isPassword?: boolean;
  rightAction?: React.ReactNode;
}

export const AuthTextField: React.FC<AuthTextFieldProps> = ({
  id,
  label,
  error,
  icon: Icon,
  isPassword = false,
  rightAction,
  disabled,
  value,
  onChange,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = isPassword ? (showPassword ? 'text' : 'password') : props.type || 'text';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700 cursor-pointer">
          {label}
        </label>
        {rightAction}
      </div>
      <div className="relative">
        <Icon
          className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
            error ? 'text-rose-500' : 'text-slate-400'
          }`}
        />
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full pl-9 ${isPassword ? 'pr-10' : 'pr-3'} h-[38px] border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all font-sans disabled:opacity-60 ${
            error
              ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
          } ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1 pt-0.5 animate-in fade-in">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
